import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg, fetchAllRows } from '../../lib/api';
import { endOfMonth, fmtDate, money, naturalBalance, parseISO, round2, toISO } from '../../lib/format';
import type { Account, BankTxn, Reconciliation } from '../../lib/types';
import { Badge, btnGhost, btnPrimary, Card, CardHeader, EmptyState, ErrorBanner, Field, inputCls, Loading } from '../../components/ui';

interface Line { id: string; debit: number; credit: number; description: string | null; entry_id: string; acct_entries: { entry_date: string; memo: string; source_ref: string | null } }

export default function Reconcile({ account, txns, onChanged }: { account: Account; txns: BankTxn[]; onChanged: () => void }) {
  const { refreshKey } = usePortal();
  const [recons, setRecons] = useState<Reconciliation[] | null>(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setRecons(null);
    supabase.from('acct_reconciliations').select('*').eq('account_id', account.id).order('statement_date', { ascending: false })
      .then(({ data, error }) => { if (error) setError(errMsg(error)); else setRecons((data ?? []) as Reconciliation[]); });
  }, [account.id, refreshKey]);

  if (!recons) return error ? <ErrorBanner message={error} /> : <Loading />;
  const last = recons.find(r => r.status === 'completed');

  if (working) {
    return <Workspace account={account} txns={txns} last={last} reconIds={recons.map(r => r.id)} onBack={() => setWorking(false)} onDone={() => { setWorking(false); onChanged(); }} />;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader title={`${account.name} statements`} subtitle={last ? `Matched through ${fmtDate(last.statement_date)} · ending balance ${money(last.statement_balance)}` : 'Not matched to a statement yet'}
        actions={<button onClick={() => setWorking(true)} className={btnPrimary}><ClipboardCheck className="w-4 h-4" /> Match next statement</button>} />
      {recons.length === 0 ? <EmptyState icon={<ClipboardCheck className="w-5 h-5" />} title="No statements matched yet" /> : (
        <table className="w-full">
          <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="text-left px-5 py-2.5">Statement date</th><th className="text-right px-3 py-2.5">Beginning</th><th className="text-right px-3 py-2.5">Ending</th><th className="text-left px-3 py-2.5">Status</th><th className="text-right px-5 py-2.5">Finished</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {recons.map(r => (
              <tr key={r.id} className="text-sm">
                <td className="px-5 py-2.5 font-medium text-gray-900">{fmtDate(r.statement_date)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">{money(r.beginning_balance)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{money(r.statement_balance)}</td>
                <td className="px-3 py-2.5">{r.status === 'completed' ? <Badge tone="emerald">Matched</Badge> : <Badge tone="amber">In progress</Badge>}</td>
                <td className="px-5 py-2.5 text-right text-gray-500">{r.completed_at ? fmtDate(r.completed_at.slice(0, 10)) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function Workspace({ account, txns, last, reconIds, onBack, onDone }: {
  account: Account; txns: BankTxn[]; last?: Reconciliation; reconIds: string[]; onBack: () => void; onDone: () => void;
}) {
  const { notify, openEntry } = usePortal();
  const nextDate = toISO(endOfMonth(last ? new Date(parseISO(last.statement_date).getFullYear(), parseISO(last.statement_date).getMonth() + 1, 1) : new Date()));
  const [stmtDate, setStmtDate] = useState(nextDate);
  const [ending, setEnding] = useState('');
  const [lines, setLines] = useState<Line[] | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const beginning = Number(last?.statement_balance ?? 0);

  useEffect(() => {
    setLines(null);
    (async () => {
      try {
        const done = reconIds.length
          ? await fetchAllRows<{ line_id: string }>((f, t) => supabase.from('acct_recon_items').select('line_id').in('reconciliation_id', reconIds).range(f, t) as unknown as PromiseLike<{ data: { line_id: string }[] | null; error: unknown }>)
          : [];
        const cleared = new Set(done.map(d => d.line_id));
        const all = await fetchAllRows<Line>((f, t) => supabase.from('acct_entry_lines')
          .select('id, debit, credit, description, entry_id, acct_entries!inner(entry_date, memo, source_ref)')
          .eq('account_id', account.id).lte('acct_entries.entry_date', stmtDate).order('id').range(f, t) as unknown as PromiseLike<{ data: Line[] | null; error: unknown }>);
        const open = all.filter(l => !cleared.has(l.id)).sort((a, b) => a.acct_entries.entry_date.localeCompare(b.acct_entries.entry_date));
        const bankSeen = new Set(txns.filter(t => t.account_id === account.id && t.txn_date <= stmtDate && t.matched_entry_id && t.status !== 'pending').map(t => t.matched_entry_id!));
        setLines(open);
        setTicked(new Set(open.filter(l => bankSeen.has(l.entry_id)).map(l => l.id)));
      } catch (e) { setError(errMsg(e)); }
    })();
  }, [account.id, stmtDate, reconIds, txns]);

  const amt = (l: Line) => naturalBalance(account.type, Number(l.debit), Number(l.credit));
  const clearedBal = round2(beginning + (lines ?? []).filter(l => ticked.has(l.id)).reduce((s, l) => s + amt(l), 0));
  const diff = ending === '' ? null : round2(Number(ending) - clearedBal);
  const ins = useMemo(() => (lines ?? []).filter(l => amt(l) >= 0), [lines]); // eslint-disable-line react-hooks/exhaustive-deps
  const outs = useMemo(() => (lines ?? []).filter(l => amt(l) < 0), [lines]); // eslint-disable-line react-hooks/exhaustive-deps
  const isCard = account.type === 'liability';

  function toggle(id: string) { setTicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }

  async function finish() {
    setBusy(true);
    setError('');
    const { data, error } = await supabase.from('acct_reconciliations').insert({
      account_id: account.id, statement_date: stmtDate, beginning_balance: beginning, statement_balance: Number(ending), status: 'completed', completed_at: new Date().toISOString(),
    }).select('id').single();
    if (error || !data) { setBusy(false); setError(errMsg(error)); return; }
    const { error: e2 } = ticked.size ? await supabase.from('acct_recon_items').insert([...ticked].map(line_id => ({ reconciliation_id: data.id, line_id }))) : { error: null };
    setBusy(false);
    if (e2) { setError(errMsg(e2)); return; }
    notify(`${account.name} matched through ${fmtDate(stmtDate)}`);
    onDone();
  }

  const List = ({ title, rows }: { title: string; rows: Line[] }) => (
    <Card className="overflow-hidden">
      <CardHeader title={title} subtitle={`${rows.filter(r => ticked.has(r.id)).length} of ${rows.length} cleared`} actions={
        <button onClick={() => setTicked(p => { const n = new Set(p); const all = rows.every(r => n.has(r.id)); rows.forEach(r => (all ? n.delete(r.id) : n.add(r.id))); return n; })} className="text-xs font-medium text-blue-600 hover:text-blue-800">Toggle all</button>} />
      <ul className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
        {rows.map(l => (
          <li key={l.id} className={`flex items-center gap-3 px-5 py-2 text-sm ${ticked.has(l.id) ? 'bg-emerald-50/40' : ''}`}>
            <input type="checkbox" checked={ticked.has(l.id)} onChange={() => toggle(l.id)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="w-24 text-gray-500 whitespace-nowrap">{fmtDate(l.acct_entries.entry_date)}</span>
            <button onClick={() => openEntry(l.entry_id)} className="flex-1 min-w-0 text-left truncate text-gray-800 hover:text-blue-700">{l.acct_entries.memo}</button>
            <span className="tabular-nums font-medium">{money(Math.abs(amt(l)))}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="px-5 py-6 text-center text-sm text-gray-400">None</li>}
      </ul>
    </Card>
  );

  return (
    <div className="space-y-5">
      <button onClick={onBack} className={`${btnGhost} -ml-2`}><ArrowLeft className="w-4 h-4" /> Statements</button>
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <Field label="Statement ending date"><input type="date" value={stmtDate} onChange={e => setStmtDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Statement ending balance"><input type="number" step="0.01" value={ending} onChange={e => setEnding(e.target.value)} className={`${inputCls} text-right`} placeholder="From your statement" autoFocus /></Field>
          <div><p className="text-xs text-gray-500">Beginning balance</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(beginning)}</p></div>
          <div><p className="text-xs text-gray-500">Cleared balance</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(clearedBal)}</p></div>
          <div className={`rounded-lg px-4 py-2 ${diff === null ? 'bg-gray-50' : Math.abs(diff) < 0.005 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-500">Difference</p>
            <p className={`text-lg font-bold tabular-nums ${diff === null ? 'text-gray-400' : Math.abs(diff) < 0.005 ? 'text-emerald-700' : 'text-red-600'}`}>{diff === null ? '-' : money(diff)}</p>
          </div>
        </div>
        <ErrorBanner message={error} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Items already seen in the bank feed are ticked for you. Tick anything else that appears on the statement until the difference is zero.</p>
          <button onClick={finish} disabled={busy || diff === null || Math.abs(diff) >= 0.005} className={btnPrimary}><CheckCircle2 className="w-4 h-4" /> Finish</button>
        </div>
      </Card>
      {!lines ? <Loading /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          <List title={isCard ? 'Charges' : 'Deposits & money in'} rows={ins} />
          <List title={isCard ? 'Payments & credits' : 'Checks & money out'} rows={outs} />
        </div>
      )}
    </div>
  );
}
