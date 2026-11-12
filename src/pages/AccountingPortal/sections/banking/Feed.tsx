import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, EyeOff, Link2, Plus, Search, Undo2, Wand2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg } from '../../lib/api';
import { fmtDate, money, parseISO, sourceLabel, toISO } from '../../lib/format';
import type { Account, BankRule, BankTxn, Entry, Vendor } from '../../lib/types';
import { AccountSelect, Badge, btnPrimary, btnSecondary, Card, EmptyState, ErrorBanner, inputCls, Loading, Tabs } from '../../components/ui';

type View = 'review' | 'done' | 'excluded';
type Cand = Pick<Entry, 'id' | 'entry_date' | 'memo' | 'source_type' | 'source_ref'>;

function shiftDays(iso: string, n: number) {
  const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d);
}

export default function Feed({ account, txns, rules, vendors, onChanged, onDeposit }: {
  account: Account; txns: BankTxn[]; rules: BankRule[]; vendors: Vendor[]; onChanged: () => void; onDeposit: (txnId: string) => void;
}) {
  const { accounts, byId, openEntry, notify } = usePortal();
  const [view, setView] = useState<View>('review');
  const [q, setQ] = useState('');
  const [hints, setHints] = useState<Map<string, Cand>>(new Map());
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState<Record<string, string>>({});

  const mine = txns.filter(t => t.account_id === account.id);
  const counts = { review: mine.filter(t => t.status === 'pending').length, done: mine.filter(t => t.status === 'matched' || t.status === 'added').length, excluded: mine.filter(t => t.status === 'excluded').length };
  const list = mine
    .filter(t => (view === 'review' ? t.status === 'pending' : view === 'done' ? t.status === 'matched' || t.status === 'added' : t.status === 'excluded'))
    .filter(t => !q || t.description.toLowerCase().includes(q.toLowerCase()) || String(Math.abs(t.amount)).includes(q))
    .sort((a, b) => (view === 'review' ? a.txn_date.localeCompare(b.txn_date) : b.txn_date.localeCompare(a.txn_date)));

  useEffect(() => {
    const ids = [...new Set(mine.flatMap(t => (t.status === 'pending' ? t.hint_entry_ids ?? [] : t.matched_entry_id ? [t.matched_entry_id] : [])))].slice(0, 300);
    if (!ids.length) { setHints(new Map()); return; }
    supabase.from('acct_entries').select('id, entry_date, memo, source_type, source_ref').in('id', ids)
      .then(({ data, error }) => { if (error) setError(errMsg(error)); else setHints(new Map(((data ?? []) as Cand[]).map(e => [e.id, e]))); });
  }, [txns, account.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const ruleFor = useCallback((t: BankTxn) => rules.find(r => r.is_active && t.description.toUpperCase().includes(r.match_text.toUpperCase())), [rules]);

  async function run(id: string, fn: () => PromiseLike<{ error: unknown }>, msg: string) {
    setBusy(id);
    setError('');
    const { error } = await fn();
    setBusy(null);
    if (error) { setError(errMsg(error)); return; }
    setOpen(null);
    notify(msg);
    onChanged();
  }

  const match = (t: BankTxn, entryId: string) => run(t.id, () => supabase.rpc('acct_bank_match', { p_txn_id: t.id, p_entry_id: entryId }), 'Matched');
  const add = (t: BankTxn, accountId: string, memo = '', vendorId: string | null = null) =>
    run(t.id, () => supabase.rpc('acct_bank_add', { p_txn_id: t.id, p_account_id: accountId, p_memo: memo, p_vendor_id: vendorId }), `Added to ${byId.get(accountId)?.name}`);
  const undo = (t: BankTxn) => run(t.id, () => supabase.rpc('acct_bank_undo', { p_txn_id: t.id }), 'Moved back to review');
  const exclude = (t: BankTxn, on: boolean) => run(t.id, () => supabase.from('acct_bank_txns').update({ status: on ? 'excluded' : 'pending' }).eq('id', t.id), on ? 'Excluded' : 'Moved back to review');

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <Tabs value={view} onChange={v => { setView(v); setOpen(null); }} tabs={[{ id: 'review', label: 'To review', count: counts.review }, { id: 'done', label: 'Categorized', count: counts.done }, { id: 'excluded', label: 'Excluded', count: counts.excluded }]} />
        <div className="relative w-full sm:w-64"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search description or amount" className={`${inputCls} pl-9`} /></div>
      </div>
      <ErrorBanner message={error} onClose={() => setError('')} />
      {list.length === 0 ? (
        <EmptyState icon={<Check className="w-5 h-5" />} title={view === 'review' ? 'All caught up' : 'Nothing here'} message={view === 'review' ? `Every ${account.name} transaction has been reviewed.` : undefined} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {list.slice(0, 250).map(t => {
            const hint = (t.hint_entry_ids ?? []).map(id => hints.get(id)).find(Boolean);
            const rule = ruleFor(t);
            const linked = t.matched_entry_id ? hints.get(t.matched_entry_id) : undefined;
            const isOpen = open === t.id;
            const sel = choice[t.id] ?? rule?.account_id ?? '';
            return (
              <li key={t.id} className={isOpen ? 'bg-gray-50/70' : ''}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <div className={`p-1.5 rounded-full ${t.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{t.amount >= 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}</div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium text-gray-900">{t.description}</p>
                    <p className="text-xs text-gray-500">{fmtDate(t.txn_date)}</p>
                  </div>
                  <p className={`w-28 text-right text-sm font-semibold tabular-nums ${t.amount >= 0 ? 'text-emerald-700' : 'text-gray-900'}`}>{t.amount >= 0 ? '+' : ''}{money(t.amount)}</p>

                  {view === 'review' && (
                    <div className="flex items-center gap-2 w-full lg:w-auto lg:min-w-[380px] justify-end">
                      {hint ? (
                        <>
                          <span className="hidden md:block text-xs text-gray-500 truncate max-w-[180px]" title={hint.memo}><Link2 className="inline w-3.5 h-3.5 mr-1 text-blue-500" />{sourceLabel(hint.source_type)} · {fmtDate(hint.entry_date)}</span>
                          <button onClick={() => match(t, hint.id)} disabled={busy === t.id} className={`${btnPrimary} py-1.5`}>Match</button>
                        </>
                      ) : (
                        <>
                          {rule && !choice[t.id] && <Wand2 className="w-4 h-4 text-blue-500 shrink-0" aria-label="Suggested by a rule" />}
                          <AccountSelect accounts={accounts} value={sel} onChange={id => setChoice(c => ({ ...c, [t.id]: id }))} className="py-1.5 lg:w-56" placeholder="Choose category" />
                          <button onClick={() => add(t, sel, '', rule?.vendor_id ?? null)} disabled={!sel || busy === t.id} className={`${btnPrimary} py-1.5`}>Add</button>
                        </>
                      )}
                      <button onClick={() => setOpen(isOpen ? null : t.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"><ChevronDown className={`w-4 h-4 transition ${isOpen ? 'rotate-180' : ''}`} /></button>
                    </div>
                  )}
                  {view === 'done' && (
                    <div className="flex items-center gap-2">
                      <Badge tone={t.status === 'matched' ? 'blue' : 'emerald'}>{t.status === 'matched' ? 'Matched' : 'Added'}</Badge>
                      {t.matched_entry_id && <button onClick={() => openEntry(t.matched_entry_id!)} className="text-xs text-blue-600 hover:underline max-w-[200px] truncate">{linked?.memo ?? 'View entry'}</button>}
                      <button onClick={() => undo(t)} disabled={busy === t.id} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Undo"><Undo2 className="w-4 h-4" /></button>
                    </div>
                  )}
                  {view === 'excluded' && <button onClick={() => exclude(t, false)} className={`${btnSecondary} py-1.5`}><Undo2 className="w-4 h-4" /> Include</button>}
                </div>
                {isOpen && <TxnDetail txn={t} account={account} vendors={vendors} busy={busy === t.id} onMatch={id => match(t, id)} onAdd={(a, m, v) => add(t, a, m, v)} onExclude={() => exclude(t, true)} onDeposit={() => onDeposit(t.id)} />}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function TxnDetail({ txn, account, vendors, busy, onMatch, onAdd, onExclude, onDeposit }: {
  txn: BankTxn; account: Account; vendors: Vendor[]; busy: boolean;
  onMatch: (entryId: string) => void; onAdd: (accountId: string, memo: string, vendorId: string | null) => void; onExclude: () => void; onDeposit: () => void;
}) {
  const { accounts, notify } = usePortal();
  const [cands, setCands] = useState<Cand[] | null>(null);
  const [acct, setAcct] = useState('');
  const [memo, setMemo] = useState('');
  const [vendor, setVendor] = useState('');
  const [makeRule, setMakeRule] = useState(false);
  const [ruleText, setRuleText] = useState(txn.description.replace(/\d{3,}.*$/, '').trim());

  useEffect(() => {
    const amt = Math.abs(txn.amount);
    const col = txn.amount >= 0 ? 'debit' : 'credit';
    (async () => {
      const { data } = await supabase.from('acct_entry_lines')
        .select('entry_id, acct_entries!inner(id, entry_date, memo, source_type, source_ref)')
        .eq('account_id', account.id).eq(col, amt)
        .gte('acct_entries.entry_date', shiftDays(txn.txn_date, -21)).lte('acct_entries.entry_date', shiftDays(txn.txn_date, 10)).limit(20);
      const found = ((data ?? []) as unknown as { acct_entries: Cand }[]).map(r => r.acct_entries);
      const ids = found.map(f => f.id);
      const taken = ids.length ? (await supabase.from('acct_bank_txns').select('matched_entry_id').in('matched_entry_id', ids)).data ?? [] : [];
      const used = new Set(taken.map(r => r.matched_entry_id));
      setCands(found.filter(f => !used.has(f.id) && f.source_type !== 'bank'));
    })();
  }, [txn, account]);

  async function addWithRule() {
    if (makeRule && ruleText.trim()) {
      const { error } = await supabase.from('acct_bank_rules').insert({ match_text: ruleText.trim(), account_id: acct, vendor_id: vendor || null, is_active: true });
      if (!error) notify('Rule saved');
    }
    onAdd(acct, memo, vendor || null);
  }

  return (
    <div className="grid gap-5 px-5 pb-5 pt-1 md:grid-cols-2 animate-[fadeIn_.15s_ease-out]">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Match to something already in the books</p>
        {!cands ? <Loading label="Looking for matches..." /> : cands.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No unmatched entries for {money(Math.abs(txn.amount))} near this date.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100">
            {cands.map(c => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0"><p className="text-sm text-gray-900 truncate">{c.memo}</p><p className="text-xs text-gray-500">{sourceLabel(c.source_type)} · {fmtDate(c.entry_date)}{c.source_ref ? ` · ${c.source_ref}` : ''}</p></div>
                <button onClick={() => onMatch(c.id)} disabled={busy} className={`${btnSecondary} py-1 px-3`}>Match</button>
              </li>
            ))}
          </ul>
        )}
        {txn.amount > 0 && account.type === 'asset' && (
          <button onClick={onDeposit} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800">Match to customer payments waiting to be deposited</button>
        )}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Or record it as new</p>
        <AccountSelect accounts={accounts} value={acct} onChange={setAcct} placeholder="Category" />
        <div className="grid grid-cols-2 gap-2">
          <select value={vendor} onChange={e => setVendor(e.target.value)} className={inputCls}><option value="">No vendor</option>{vendors.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
          <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="Memo (optional)" className={inputCls} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={makeRule} onChange={e => setMakeRule(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          Always categorize bank items containing
        </label>
        {makeRule && <input value={ruleText} onChange={e => setRuleText(e.target.value)} className={inputCls} />}
        <div className="flex justify-between pt-1">
          <button onClick={onExclude} disabled={busy} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"><EyeOff className="w-4 h-4" /> Exclude (duplicate or personal)</button>
          <button onClick={addWithRule} disabled={!acct || busy} className={`${btnPrimary} py-1.5`}><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>
    </div>
  );
}

export function useFeedMemo(txns: BankTxn[]) {
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) if (t.status === 'pending') m.set(t.account_id, (m.get(t.account_id) ?? 0) + 1);
    return m;
  }, [txns]);
}
