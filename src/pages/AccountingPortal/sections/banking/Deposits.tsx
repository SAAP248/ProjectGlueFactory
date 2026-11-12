import { useEffect, useMemo, useState } from 'react';
import { Inbox, Landmark } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg } from '../../lib/api';
import { fmtDate, money, round2 } from '../../lib/format';
import type { BankTxn } from '../../lib/types';
import { Badge, btnPrimary, Card, CardHeader, EmptyState, ErrorBanner, Loading } from '../../components/ui';

interface Undeposited { entry_id: string; entry_date: string; memo: string; source_ref: string | null; company_name: string | null; amount: number }

export default function Deposits({ txns, initialTxn, onChanged }: { txns: BankTxn[]; initialTxn?: string; onChanged: () => void }) {
  const { byId, refreshKey, notify, openEntry } = usePortal();
  const [rows, setRows] = useState<Undeposited[] | null>(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(initialTxn ?? '');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.rpc('acct_undeposited_payments').then(({ data, error }) => {
      if (error) setError(errMsg(error));
      else setRows(((data ?? []) as Undeposited[]).map(r => ({ ...r, amount: Number(r.amount) })).sort((a, b) => a.entry_date.localeCompare(b.entry_date)));
    });
  }, [refreshKey]);

  const deposits = useMemo(() => txns.filter(t => t.status === 'pending' && t.amount > 0 && byId.get(t.account_id)?.subtype === 'bank'), [txns, byId]);
  const txn = deposits.find(t => t.id === target);
  const sum = round2((rows ?? []).filter(r => picked.has(r.entry_id)).reduce((s, r) => s + r.amount, 0));
  const diff = txn ? round2(txn.amount - sum) : 0;
  const total = round2((rows ?? []).reduce((s, r) => s + r.amount, 0));

  function toggle(id: string) {
    setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function record() {
    if (!txn) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.rpc('acct_bank_deposit', { p_txn_id: txn.id, p_payment_entry_ids: [...picked] });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    setPicked(new Set());
    setTarget('');
    notify(`Deposit of ${money(txn.amount)} recorded`);
    onChanged();
  }

  if (!rows) return error ? <ErrorBanner message={error} /> : <Loading />;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="overflow-hidden">
        <CardHeader title="Payments waiting to be deposited" subtitle={`${rows.length} payments · ${money(total)}. Card and ACH payments from CSG Forte land here until the bank deposit arrives.`} />
        {rows.length === 0 ? <EmptyState icon={<Inbox className="w-5 h-5" />} title="Everything has been deposited" message="New customer payments recorded in WorkHorse will appear here until they are matched to a bank deposit." /> : (
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="w-10 px-5" /><th className="text-left px-3 py-2.5">Received</th><th className="text-left px-3 py-2.5">Customer</th><th className="text-left px-3 py-2.5">Reference</th><th className="text-right px-5 py-2.5">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.entry_id} className={`text-sm ${picked.has(r.entry_id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                  <td className="px-5 py-2.5"><input type="checkbox" checked={picked.has(r.entry_id)} onChange={() => toggle(r.entry_id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                  <td className="px-3 py-2.5"><p className="font-medium text-gray-900">{r.company_name ?? 'Customer'}</p><p className="text-xs text-gray-500 truncate max-w-xs">{r.memo}</p></td>
                  <td className="px-3 py-2.5"><button onClick={() => openEntry(r.entry_id)} className="text-blue-600 hover:underline">{r.source_ref ?? 'View'}</button></td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-medium">{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-5 h-fit xl:sticky xl:top-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Match to a bank deposit</h3>
        <ErrorBanner message={error} />
        {deposits.length === 0 ? <p className="text-sm text-gray-500">No incoming bank deposits are waiting for review.</p> : (
          <div className="space-y-2">
            {deposits.map(d => (
              <button key={d.id} onClick={() => setTarget(d.id)} className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${target === d.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center justify-between"><span className="text-sm font-semibold tabular-nums text-emerald-700">+{money(d.amount)}</span><span className="text-xs text-gray-500">{fmtDate(d.txn_date)}</span></div>
                <p className="mt-0.5 text-xs text-gray-600 truncate"><Landmark className="inline w-3 h-3 mr-1" />{byId.get(d.account_id)?.name} · {d.description}</p>
              </button>
            ))}
          </div>
        )}
        {txn && (
          <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Bank deposit</span><span className="tabular-nums">{money(txn.amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Selected payments ({picked.size})</span><span className="tabular-nums">{money(sum)}</span></div>
            <div className="flex justify-between font-semibold"><span>Difference</span>{Math.abs(diff) < 0.005 ? <Badge tone="emerald">Matches</Badge> : <span className="tabular-nums text-red-600">{money(diff)}</span>}</div>
          </div>
        )}
        <button onClick={record} disabled={!txn || busy || picked.size === 0 || Math.abs(diff) >= 0.005} className={`${btnPrimary} w-full`}>Record deposit</button>
      </Card>
    </div>
  );
}
