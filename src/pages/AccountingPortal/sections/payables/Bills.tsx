import { useEffect, useMemo, useState } from 'react';
import { Ban, FileText, Lock, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg } from '../../lib/api';
import { daysBetween, fmtDate, money, parseISO, round2, toISO, todayISO } from '../../lib/format';
import type { Bill, BillLine, Vendor } from '../../lib/types';
import { AccountSelect, Badge, btnDanger, btnPrimary, btnSecondary, Card, EmptyState, ErrorBanner, Field, inputCls, Loading, Modal, Tabs } from '../../components/ui';
import { termsDays } from './data';

type Filter = 'open' | 'overdue' | 'paid' | 'all';

function statusBadge(b: Bill) {
  if (b.status === 'void') return <Badge>Void</Badge>;
  if (b.status === 'paid') return <Badge tone="emerald">{b.kind === 'credit' ? 'Used' : 'Paid'}</Badge>;
  if (b.kind === 'credit') return <Badge tone="blue">Credit available</Badge>;
  const late = daysBetween(b.due_date, todayISO());
  if (late > 0) return <Badge tone="red">{late} days late</Badge>;
  if (b.status === 'partial') return <Badge tone="amber">Partly paid</Badge>;
  return <Badge tone="gray">Due {fmtDate(b.due_date)}</Badge>;
}

export default function Bills({ bills, vendors, vendorById, onChanged, startNew, vendorFilter }: {
  bills: Bill[]; vendors: Vendor[]; vendorById: Map<string, Vendor>; onChanged: () => void; startNew: boolean; vendorFilter?: string;
}) {
  const [filter, setFilter] = useState<Filter>(vendorFilter ? 'all' : 'open');
  const [vendor, setVendor] = useState(vendorFilter ?? '');
  const [editing, setEditing] = useState<Bill | 'new' | null>(startNew ? 'new' : null);

  const today = todayISO();
  const list = useMemo(() => bills.filter(b => {
    if (vendor && b.vendor_id !== vendor) return false;
    const open = b.status === 'open' || b.status === 'partial';
    if (filter === 'open') return open;
    if (filter === 'overdue') return open && b.kind === 'bill' && b.due_date < today;
    if (filter === 'paid') return b.status === 'paid';
    return true;
  }), [bills, filter, vendor, today]);

  const counts = {
    open: bills.filter(b => b.status === 'open' || b.status === 'partial').length,
    overdue: bills.filter(b => (b.status === 'open' || b.status === 'partial') && b.kind === 'bill' && b.due_date < today).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={filter} onChange={setFilter} tabs={[{ id: 'open', label: 'Unpaid', count: counts.open }, { id: 'overdue', label: 'Overdue', count: counts.overdue }, { id: 'paid', label: 'Paid' }, { id: 'all', label: 'All' }]} />
          <select value={vendor} onChange={e => setVendor(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="">All vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <button onClick={() => setEditing('new')} className={btnPrimary}><Plus className="w-4 h-4" /> Enter bill</button>
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? <EmptyState icon={<FileText className="w-5 h-5" />} title="No bills here" message="Bills you enter, and purchase orders received in WorkHorse, show up in this list." /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="text-left px-5 py-2.5">Vendor</th><th className="text-left px-3 py-2.5">Bill #</th><th className="text-left px-3 py-2.5">Bill date</th><th className="text-left px-3 py-2.5">Status</th><th className="text-right px-3 py-2.5">Total</th><th className="text-right px-5 py-2.5">Left to pay</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {list.slice(0, 300).map(b => (
                  <tr key={b.id} onClick={() => setEditing(b)} className="cursor-pointer hover:bg-gray-50 text-sm">
                    <td className="px-5 py-2.5"><p className="font-medium text-gray-900">{vendorById.get(b.vendor_id)?.name ?? 'Unknown vendor'}</p><p className="text-xs text-gray-500 truncate max-w-xs">{b.memo}</p></td>
                    <td className="px-3 py-2.5 text-gray-600">{b.kind === 'credit' && <span className="mr-1 text-xs font-semibold text-blue-600">CREDIT</span>}{b.bill_number || '-'}{b.purchase_order_id && <span className="ml-1.5 text-xs text-gray-400">PO</span>}</td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(b.bill_date)}</td>
                    <td className="px-3 py-2.5">{statusBadge(b)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(b.kind === 'credit' ? -b.total : b.total)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-medium">{b.status === 'void' ? '-' : money((b.total - b.amount_paid) * (b.kind === 'credit' ? -1 : 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length > 300 && <p className="px-5 py-3 text-xs text-gray-500 border-t border-gray-100">Showing the 300 most recent. Pick a vendor to narrow the list.</p>}
          </div>
        )}
      </Card>
      {editing && (
        <BillEditor bill={editing === 'new' ? null : editing} vendors={vendors} vendorById={vendorById} defaultVendor={vendor}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />
      )}
    </div>
  );
}

interface LineDraft { account_id: string; description: string; amount: string }

function BillEditor({ bill, vendors, vendorById, defaultVendor, onClose, onSaved }: {
  bill: Bill | null; vendors: Vendor[]; vendorById: Map<string, Vendor>; defaultVendor: string; onClose: () => void; onSaved: () => void;
}) {
  const { accounts, notify } = usePortal();
  const [vendorId, setVendorId] = useState(bill?.vendor_id ?? defaultVendor);
  const [kind, setKind] = useState<'bill' | 'credit'>(bill?.kind ?? 'bill');
  const [number, setNumber] = useState(bill?.bill_number ?? '');
  const [billDate, setBillDate] = useState(bill?.bill_date ?? todayISO());
  const [dueDate, setDueDate] = useState(bill?.due_date ?? todayISO());
  const [memo, setMemo] = useState(bill?.memo ?? '');
  const [lines, setLines] = useState<LineDraft[] | null>(bill ? null : [{ account_id: '', description: '', amount: '' }]);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);

  const readOnly = !!bill && (bill.status === 'void' || bill.amount_paid > 0 || locked);

  useEffect(() => {
    if (!bill) return;
    Promise.all([
      supabase.from('acct_bill_lines').select('*').eq('bill_id', bill.id).order('sort_order'),
      supabase.rpc('acct_is_locked', { p_date: bill.bill_date }),
    ]).then(([l, lk]) => {
      if (l.error) { setError(errMsg(l.error)); return; }
      setLines(((l.data ?? []) as BillLine[]).map(x => ({ account_id: x.account_id, description: x.description, amount: String(x.amount) })));
      setLocked(!!lk.data);
    });
  }, [bill]);

  function pickVendor(id: string) {
    setVendorId(id);
    const v = vendorById.get(id);
    if (!v) return;
    const d = parseISO(billDate);
    d.setDate(d.getDate() + termsDays(v.payment_terms));
    setDueDate(toISO(d));
    if (v.default_account_id) setLines(ls => ls?.map(l => (l.account_id ? l : { ...l, account_id: v.default_account_id! })) ?? ls);
  }

  const total = round2((lines ?? []).reduce((s, l) => s + (Number(l.amount) || 0), 0));
  const valid = vendorId && total > 0 && (lines ?? []).every(l => l.account_id && Number(l.amount) > 0);

  async function save() {
    setBusy(true);
    setError('');
    const { error } = await supabase.rpc('acct_save_bill', {
      p: {
        id: bill?.id ?? null, vendor_id: vendorId, kind, bill_number: number || null, bill_date: billDate, due_date: kind === 'credit' ? billDate : dueDate,
        memo, purchase_order_id: bill?.purchase_order_id ?? null, is_demo: false,
        lines: (lines ?? []).map(l => ({ account_id: l.account_id, description: l.description, amount: Number(l.amount), company_id: null })),
      },
    });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    notify(bill ? 'Bill updated' : kind === 'credit' ? 'Vendor credit saved' : 'Bill saved');
    onSaved();
  }

  async function voidBill() {
    if (!bill) return;
    setBusy(true);
    const { error } = await supabase.rpc('acct_void_bill', { p_bill_id: bill.id });
    setBusy(false);
    if (error) { setError(errMsg(error)); setConfirmVoid(false); return; }
    notify('Bill voided');
    onSaved();
  }

  const setLine = (i: number, k: keyof LineDraft, v: string) => setLines(ls => ls?.map((l, j) => (j === i ? { ...l, [k]: v } : l)) ?? ls);

  return (
    <Modal open onClose={onClose} size="lg"
      title={bill ? `${kind === 'credit' ? 'Vendor credit' : 'Bill'} ${bill.bill_number ?? ''}`.trim() : 'Enter a bill'}
      subtitle={bill ? vendorById.get(bill.vendor_id)?.name : 'Record what you owe a vendor. It is paid later from Pay Bills.'}
      footer={readOnly
        ? <>{bill && bill.status !== 'void' && bill.amount_paid === 0 && !locked && <button onClick={() => setConfirmVoid(true)} className={btnSecondary}>Void</button>}<button onClick={onClose} className={btnSecondary}>Close</button></>
        : <>{bill && <button onClick={() => setConfirmVoid(true)} className={`${btnSecondary} mr-auto`}><Ban className="w-4 h-4" /> Void</button>}<button onClick={onClose} className={btnSecondary}>Cancel</button><button onClick={save} disabled={busy || !valid} className={btnPrimary}>Save {money(total)}</button></>}>
      {!lines ? <Loading /> : (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          {bill && readOnly && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-600">
              <Lock className="w-4 h-4" />
              {bill.status === 'void' ? 'This bill was voided.' : locked ? 'This bill is in a locked month. Unlock the month to change it.' : 'Payments have been made on this bill, so it can no longer be edited.'}
            </div>
          )}
          {!bill && (
            <Tabs value={kind} onChange={setKind} tabs={[{ id: 'bill', label: 'Bill' }, { id: 'credit', label: 'Vendor credit' }]} />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vendor">
              <select value={vendorId} onChange={e => pickVendor(e.target.value)} disabled={readOnly} className={inputCls}>
                <option value="">Choose vendor</option>
                {vendors.filter(v => v.is_active || v.id === vendorId).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label={kind === 'credit' ? 'Credit memo #' : 'Vendor invoice #'}><input value={number} onChange={e => setNumber(e.target.value)} disabled={readOnly} className={inputCls} /></Field>
            <Field label="Date"><input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} disabled={readOnly} className={inputCls} /></Field>
            {kind === 'bill' && <Field label="Due date"><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={readOnly} className={inputCls} /></Field>}
          </div>
          <Field label="Memo"><input value={memo} onChange={e => setMemo(e.target.value)} disabled={readOnly} className={inputCls} placeholder="What was this for?" /></Field>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">What it was for</p>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_120px_32px] gap-2 items-center">
                  {readOnly
                    ? <p className="text-sm text-gray-800 px-1">{accounts.find(a => a.id === l.account_id)?.name ?? ''}</p>
                    : <AccountSelect accounts={accounts} value={l.account_id} onChange={id => setLine(i, 'account_id', id)} types={['expense', 'cogs', 'asset', 'liability']} />}
                  <input value={l.description} onChange={e => setLine(i, 'description', e.target.value)} disabled={readOnly} placeholder="Description" className={inputCls} />
                  <input type="number" step="0.01" min="0" value={l.amount} onChange={e => setLine(i, 'amount', e.target.value)} disabled={readOnly} placeholder="0.00" className={`${inputCls} text-right`} />
                  {!readOnly && lines.length > 1
                    ? <button onClick={() => setLines(ls => ls?.filter((_, j) => j !== i) ?? ls)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    : <span />}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              {!readOnly ? <button onClick={() => setLines(ls => [...(ls ?? []), { account_id: vendorById.get(vendorId)?.default_account_id ?? '', description: '', amount: '' }])} className="text-sm font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Add line</button> : <span />}
              <p className="text-sm text-gray-600">Total <span className="ml-2 text-base font-bold text-gray-900 tabular-nums">{money(total)}</span></p>
            </div>
          </div>
        </div>
      )}
      <Modal open={confirmVoid} onClose={() => setConfirmVoid(false)} title="Void this bill?" size="sm"
        footer={<><button onClick={() => setConfirmVoid(false)} className={btnSecondary}>Keep it</button><button onClick={voidBill} disabled={busy} className={btnDanger}>Void bill</button></>}>
        <p className="text-sm text-gray-600">The bill stays on record marked void and its amount comes off what you owe.</p>
      </Modal>
    </Modal>
  );
}
