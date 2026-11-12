import { useEffect, useMemo, useState } from 'react';
import { Receipt, Search, Tag } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg, fetchAllRows } from '../../lib/api';
import { downloadCsv, fmtDate, money, round2 } from '../../lib/format';
import type { Bill, BillPayment, Vendor } from '../../lib/types';
import { Badge, btnPrimary, btnSecondary, Card, EmptyState, ErrorBanner, Field, inputCls, Loading, Modal, ReportActions } from '../../components/ui';
import { METHOD_LABEL } from './data';

export function Payments({ vendorById, bills }: { vendorById: Map<string, Vendor>; bills: Bill[] }) {
  const { refreshKey, byId } = usePortal();
  const [rows, setRows] = useState<BillPayment[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('');
  const billById = useMemo(() => new Map(bills.map(b => [b.id, b])), [bills]);

  useEffect(() => {
    fetchAllRows<BillPayment>((f, t) => supabase.from('acct_bill_payments').select('*').order('pay_date', { ascending: false }).order('check_number', { ascending: false }).range(f, t) as unknown as PromiseLike<{ data: BillPayment[] | null; error: unknown }>)
      .then(setRows).catch(e => setError(errMsg(e)));
  }, [refreshKey]);

  const list = (rows ?? []).filter(p => (!method || p.method === method) && (!q || `${vendorById.get(p.vendor_id)?.name} ${p.check_number ?? ''}`.toLowerCase().includes(q.toLowerCase())));

  if (!rows) return error ? <ErrorBanner message={error} /> : <Loading />;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex flex-wrap gap-2">
          <div className="relative w-60"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Vendor or check #" className={`${inputCls} pl-9`} /></div>
          <select value={method} onChange={e => setMethod(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="">All methods</option>{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex gap-2"><ReportActions onCsv={() => downloadCsv('bill-payments', [['Date', 'Vendor', 'Method', 'Check #', 'Bill #', 'Paid from', 'Amount'], ...list.map(p => [p.pay_date, vendorById.get(p.vendor_id)?.name, METHOD_LABEL[p.method], p.check_number, billById.get(p.bill_id)?.bill_number, p.bank_account_id ? byId.get(p.bank_account_id)?.name : '', Number(p.amount).toFixed(2)])])} /></div>
      </div>
      {list.length === 0 ? <EmptyState icon={<Receipt className="w-5 h-5" />} title="No payments found" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="text-left px-5 py-2.5">Date</th><th className="text-left px-3 py-2.5">Vendor</th><th className="text-left px-3 py-2.5">Method</th><th className="text-left px-3 py-2.5">Bill</th><th className="text-left px-3 py-2.5">Paid from</th><th className="text-right px-5 py-2.5">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {list.slice(0, 400).map(p => (
                <tr key={p.id} className="text-sm hover:bg-gray-50">
                  <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(p.pay_date)}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{vendorById.get(p.vendor_id)?.name}</td>
                  <td className="px-3 py-2.5">{p.method === 'check' ? <span className="font-mono text-gray-800">Check #{p.check_number}</span> : <Badge tone={p.method === 'credit' ? 'blue' : 'gray'}>{METHOD_LABEL[p.method]}</Badge>}</td>
                  <td className="px-3 py-2.5 text-gray-600">{billById.get(p.bill_id)?.bill_number ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{p.bank_account_id ? byId.get(p.bank_account_id)?.name : '-'}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-medium">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function Credits({ bills, vendorById, onChanged }: { bills: Bill[]; vendorById: Map<string, Vendor>; onChanged: () => void }) {
  const { notify } = usePortal();
  const credits = bills.filter(b => b.kind === 'credit' && b.status !== 'void');
  const [applying, setApplying] = useState<Bill | null>(null);
  const [billId, setBillId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const targets = applying ? bills.filter(b => b.kind === 'bill' && b.vendor_id === applying.vendor_id && (b.status === 'open' || b.status === 'partial')) : [];
  const left = applying ? round2(applying.total - applying.amount_paid) : 0;

  function start(c: Bill) {
    setApplying(c);
    setError('');
    const first = bills.find(b => b.kind === 'bill' && b.vendor_id === c.vendor_id && (b.status === 'open' || b.status === 'partial'));
    setBillId(first?.id ?? '');
    setAmount(first ? Math.min(round2(c.total - c.amount_paid), round2(first.total - first.amount_paid)).toFixed(2) : '');
  }

  async function apply() {
    if (!applying) return;
    setBusy(true);
    const { error } = await supabase.rpc('acct_apply_vendor_credit', { p_credit_id: applying.id, p_bill_id: billId, p_amount: Number(amount) });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    setApplying(null);
    notify('Credit applied');
    onChanged();
  }

  return (
    <Card className="overflow-hidden">
      {credits.length === 0 ? <EmptyState icon={<Tag className="w-5 h-5" />} title="No vendor credits" message="When a vendor issues a credit memo, enter it from the Bills tab and choose Vendor credit." /> : (
        <table className="w-full">
          <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="text-left px-5 py-2.5">Vendor</th><th className="text-left px-3 py-2.5">Credit #</th><th className="text-left px-3 py-2.5">Date</th><th className="text-right px-3 py-2.5">Original</th><th className="text-right px-3 py-2.5">Available</th><th className="px-5 py-2.5" />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {credits.map(c => {
              const avail = round2(c.total - c.amount_paid);
              return (
                <tr key={c.id} className="text-sm hover:bg-gray-50">
                  <td className="px-5 py-2.5"><p className="font-medium text-gray-900">{vendorById.get(c.vendor_id)?.name}</p><p className="text-xs text-gray-500">{c.memo}</p></td>
                  <td className="px-3 py-2.5 text-gray-600">{c.bill_number ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{fmtDate(c.bill_date)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(c.total)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{avail > 0 ? money(avail) : <Badge tone="emerald">Used</Badge>}</td>
                  <td className="px-5 py-2.5 text-right">{avail > 0 && <button onClick={() => start(c)} className="text-sm font-medium text-blue-600 hover:text-blue-800">Apply to bill</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Modal open={!!applying} onClose={() => setApplying(null)} title="Apply vendor credit" subtitle={applying ? `${vendorById.get(applying.vendor_id)?.name} · ${money(left)} available` : ''} size="sm"
        footer={<><button onClick={() => setApplying(null)} className={btnSecondary}>Cancel</button><button onClick={apply} disabled={busy || !billId || !(Number(amount) > 0) || Number(amount) > left} className={btnPrimary}>Apply {money(Number(amount) || 0)}</button></>}>
        <div className="space-y-4">
          <ErrorBanner message={error} />
          {targets.length === 0 ? <p className="text-sm text-gray-600">This vendor has no unpaid bills right now. The credit stays available for their next bill.</p> : (
            <>
              <Field label="Bill"><select value={billId} onChange={e => setBillId(e.target.value)} className={inputCls}>{targets.map(b => <option key={b.id} value={b.id}>{b.bill_number ?? 'No #'} · {fmtDate(b.bill_date)} · {money(b.total - b.amount_paid)} owed</option>)}</select></Field>
              <Field label="Amount to apply"><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputCls} text-right`} /></Field>
            </>
          )}
        </div>
      </Modal>
    </Card>
  );
}
