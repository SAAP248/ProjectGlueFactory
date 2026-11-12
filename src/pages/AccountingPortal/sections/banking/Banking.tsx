import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, CreditCard, Landmark, Trash2, Wand2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg, fetchAllRows, fetchTotals } from '../../lib/api';
import { money, naturalBalance, todayISO } from '../../lib/format';
import type { AccountTotal, BankRule, BankTxn } from '../../lib/types';
import { btnPrimary, btnSecondary, Card, EmptyState, ErrorBanner, Field, inputCls, Loading, Modal, PageHeader, Tabs } from '../../components/ui';
import { useVendors } from '../payables/data';
import Feed, { useFeedMemo } from './Feed';
import Deposits from './Deposits';
import Reconcile from './Reconcile';

type Tab = 'feed' | 'deposits' | 'reconcile' | 'rules';

export default function Banking() {
  const { accounts, byId, params, refreshKey, refresh, actor, notify } = usePortal();
  const feedAccounts = accounts.filter(a => a.is_active && (a.subtype === 'bank' || a.subtype === 'credit_card'));
  const [accountId, setAccountId] = useState(params.account ?? feedAccounts[0]?.id ?? '');
  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'feed');
  const [txns, setTxns] = useState<BankTxn[] | null>(null);
  const [rules, setRules] = useState<BankRule[]>([]);
  const [totals, setTotals] = useState<Map<string, AccountTotal>>(new Map());
  const [error, setError] = useState('');
  const [depositTxn, setDepositTxn] = useState(params.txn);
  const [transfer, setTransfer] = useState(false);
  const { vendors } = useVendors();
  const pending = useFeedMemo(txns ?? []);

  const load = useCallback(async () => {
    try {
      const [t, r, tot] = await Promise.all([
        fetchAllRows<BankTxn>((f, to) => supabase.from('acct_bank_txns').select('id, account_id, txn_date, description, amount, status, matched_entry_id, hint_entry_ids').order('txn_date', { ascending: false }).order('id').range(f, to) as unknown as PromiseLike<{ data: BankTxn[] | null; error: unknown }>),
        supabase.from('acct_bank_rules').select('*').order('match_text'),
        fetchTotals(null, todayISO()),
      ]);
      setTxns(t.map(x => ({ ...x, amount: Number(x.amount) })));
      setRules((r.data ?? []) as BankRule[]);
      setTotals(tot);
    } catch (e) { setError(errMsg(e)); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const account = byId.get(accountId);
  if (!txns) return error ? <ErrorBanner message={error} /> : <Loading />;

  async function toggleRule(r: BankRule) {
    const { error } = await supabase.from('acct_bank_rules').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) setError(errMsg(error)); else load();
  }
  async function deleteRule(r: BankRule) {
    const { error } = await supabase.from('acct_bank_rules').delete().eq('id', r.id);
    if (error) setError(errMsg(error)); else { notify('Rule removed'); load(); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Banking" subtitle="Review what hit the bank and card, deposit customer payments, and match monthly statements."
        actions={<button onClick={() => setTransfer(true)} className={btnSecondary}><ArrowLeftRight className="w-4 h-4" /> Transfer money</button>} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {feedAccounts.map(a => {
          const t = totals.get(a.id);
          const bal = t ? naturalBalance(a.type, t.debit, t.credit) : 0;
          const n = pending.get(a.id) ?? 0;
          const Icon = a.subtype === 'credit_card' ? CreditCard : Landmark;
          const on = a.id === accountId;
          return (
            <button key={a.id} onClick={() => setAccountId(a.id)} className={`text-left rounded-xl border p-4 transition ${on ? 'border-blue-500 bg-white ring-2 ring-blue-500/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900"><Icon className="w-4 h-4 text-gray-400" />{a.name}</span>
                {n > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{n} to review</span>}
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-gray-900">{money(bal)}</p>
              <p className="text-xs text-gray-500">{a.institution ?? ''}{a.last4 ? ` ••${a.last4}` : ''} · {a.subtype === 'credit_card' ? 'balance owed' : 'in the books'}</p>
            </button>
          );
        })}
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'feed', label: 'Bank feed', count: account ? pending.get(account.id) ?? 0 : 0 },
        { id: 'deposits', label: 'Deposits' },
        { id: 'reconcile', label: 'Statements' },
        { id: 'rules', label: 'Rules', count: rules.length },
      ]} />

      {tab === 'feed' && account && <Feed account={account} txns={txns} rules={rules} vendors={vendors ?? []} onChanged={refresh} onDeposit={id => { setDepositTxn(id); setTab('deposits'); }} />}
      {tab === 'deposits' && <Deposits key={depositTxn} txns={txns} initialTxn={depositTxn} onChanged={refresh} />}
      {tab === 'reconcile' && account && <Reconcile key={account.id} account={account} txns={txns} onChanged={refresh} />}
      {tab === 'rules' && (
        <Card className="overflow-hidden">
          {rules.length === 0 ? <EmptyState icon={<Wand2 className="w-5 h-5" />} title="No rules yet" message="Open any bank item and tick 'Always categorize' to create one." /> : (
            <table className="w-full">
              <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500"><th className="text-left px-5 py-2.5">When the description contains</th><th className="text-left px-3 py-2.5">Categorize as</th><th className="text-left px-3 py-2.5">Vendor</th><th className="px-5 py-2.5" /></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {rules.map(r => (
                  <tr key={r.id} className={`text-sm ${r.is_active ? '' : 'opacity-50'}`}>
                    <td className="px-5 py-2.5 font-mono text-xs text-gray-800">{r.match_text}</td>
                    <td className="px-3 py-2.5 text-gray-700">{byId.get(r.account_id)?.code} · {byId.get(r.account_id)?.name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{(vendors ?? []).find(v => v.id === r.vendor_id)?.name ?? '-'}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => toggleRule(r)} className="text-xs font-medium text-blue-600 hover:text-blue-800 mr-3">{r.is_active ? 'Pause' : 'Turn on'}</button>
                      <button onClick={() => deleteRule(r)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {transfer && <TransferModal actor={actor} onClose={() => setTransfer(false)} onDone={() => { setTransfer(false); notify('Transfer recorded'); refresh(); }} />}
    </div>
  );
}

function TransferModal({ actor, onClose, onDone }: { actor: string; onClose: () => void; onDone: () => void }) {
  const { accounts } = usePortal();
  const list = accounts.filter(a => a.is_active && (a.subtype === 'bank' || a.subtype === 'credit_card'));
  const [from, setFrom] = useState(list[0]?.id ?? '');
  const [to, setTo] = useState(list[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError('');
    const amt = Number(amount);
    const { error } = await supabase.rpc('acct_save_entry', {
      p_entry_id: null, p_date: date, p_memo: memo || 'Transfer',
      p_lines: [{ account_id: to, debit: amt, credit: 0, description: memo || 'Transfer in' }, { account_id: from, debit: 0, credit: amt, description: memo || 'Transfer out' }],
      p_actor: actor,
    });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    onDone();
  }

  return (
    <Modal open onClose={onClose} title="Transfer money" subtitle="Move money between accounts, or pay down the business card." size="sm"
      footer={<><button onClick={onClose} className={btnSecondary}>Cancel</button><button onClick={save} disabled={busy || !from || !to || from === to || !(Number(amount) > 0)} className={btnPrimary}>Record transfer</button></>}>
      <div className="space-y-4">
        <ErrorBanner message={error} />
        <Field label="From"><select value={from} onChange={e => setFrom(e.target.value)} className={inputCls}>{list.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="To"><select value={to} onChange={e => setTo(e.target.value)} className={inputCls}>{list.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount"><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputCls} text-right`} /></Field>
          <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Memo"><input value={memo} onChange={e => setMemo(e.target.value)} className={inputCls} placeholder="e.g. Move to savings" /></Field>
      </div>
    </Modal>
  );
}
