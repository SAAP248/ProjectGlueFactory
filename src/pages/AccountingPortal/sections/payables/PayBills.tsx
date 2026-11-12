import { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Landmark, Printer, Wallet } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg } from '../../lib/api';
import { daysBetween, fmtDate, money, round2, todayISO } from '../../lib/format';
import type { Bill, Vendor } from '../../lib/types';
import { Badge, btnPrimary, Card, EmptyState, ErrorBanner, Field, inputCls } from '../../components/ui';

type Method = 'check' | 'ach' | 'card';

export default function PayBills({ bills, vendorById, onChanged }: { bills: Bill[]; vendorById: Map<string, Vendor>; onChanged: () => void }) {
  const { accounts, byCode, notify, go } = usePortal();
  const open = useMemo(() => bills.filter(b => b.kind === 'bill' && (b.status === 'open' || b.status === 'partial')).sort((a, b) => a.due_date.localeCompare(b.due_date)), [bills]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [payDate, setPayDate] = useState(todayISO());
  const [method, setMethod] = useState<Method>('check');
  const banks = accounts.filter(a => a.subtype === 'bank' && a.is_active);
  const cards = accounts.filter(a => a.subtype === 'credit_card' && a.is_active);
  const [bankId, setBankId] = useState(byCode.get('1000')?.id ?? banks[0]?.id ?? '');
  const [startCheck, setStartCheck] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ count: number; total: number; method: Method } | null>(null);

  const credits = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bills) if (b.kind === 'credit' && b.status !== 'void' && b.status !== 'paid') m.set(b.vendor_id, (m.get(b.vendor_id) ?? 0) + b.total - b.amount_paid);
    return m;
  }, [bills]);

  const items = Object.entries(picked).map(([bill_id, amt]) => ({ bill_id, amount: round2(Number(amt) || 0) })).filter(i => i.amount > 0);
  const total = round2(items.reduce((s, i) => s + i.amount, 0));
  const payees = new Set(items.map(i => bills.find(b => b.id === i.bill_id)?.vendor_id)).size;
  const sourceId = method === 'card' ? (cards.find(c => c.id === bankId)?.id ?? cards[0]?.id ?? '') : bankId;

  function toggle(b: Bill) {
    setPicked(p => {
      const n = { ...p };
      if (n[b.id] != null) delete n[b.id]; else n[b.id] = (b.total - b.amount_paid).toFixed(2);
      return n;
    });
  }

  function selectDue(days: number) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + days);
    const iso = cutoff.toISOString().slice(0, 10);
    const n: Record<string, string> = {};
    for (const b of open) if (b.due_date <= iso) n[b.id] = (b.total - b.amount_paid).toFixed(2);
    setPicked(n);
  }

  async function pay() {
    setBusy(true);
    setError('');
    const over = items.find(i => { const b = bills.find(x => x.id === i.bill_id)!; return i.amount > round2(b.total - b.amount_paid) + 0.001; });
    if (over) { setBusy(false); setError('One payment is more than what is left on its bill.'); return; }
    const { data, error } = await supabase.rpc('acct_pay_bills', {
      p: { pay_date: payDate, method, bank_account_id: sourceId, start_check: method === 'check' && startCheck ? Number(startCheck) : null, is_demo: false, items },
    });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    setDone({ count: Number(data) || payees, total, method });
    setPicked({});
    notify(`Paid ${money(total)}`);
    onChanged();
  }

  if (done) {
    return (
      <Card className="p-10 text-center max-w-lg mx-auto">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">{money(done.total)} paid</h3>
        <p className="mt-1 text-sm text-gray-500">{done.method === 'check' ? `${done.count} check${done.count === 1 ? '' : 's'} recorded. They will match to the bank feed when they clear.` : done.method === 'ach' ? 'ACH payments recorded and waiting to match the bank feed.' : 'Charged to the business card.'}</p>
        <div className="mt-6 flex justify-center gap-2">
          {done.method === 'check' && <button onClick={() => go('payables', { tab: 'payments' })} className={btnPrimary}><Printer className="w-4 h-4" /> View checks</button>}
          <button onClick={() => setDone(null)} className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3">Pay more bills</button>
        </div>
      </Card>
    );
  }

  if (open.length === 0) return <Card><EmptyState icon={<Wallet className="w-5 h-5" />} title="Nothing to pay" message="Every bill is paid. Nice work." /></Card>;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 text-sm">
          <span className="text-gray-500">Select:</span>
          <button onClick={() => selectDue(0)} className="font-medium text-blue-600 hover:text-blue-800">Overdue</button>
          <span className="text-gray-300">·</span>
          <button onClick={() => selectDue(7)} className="font-medium text-blue-600 hover:text-blue-800">Due in 7 days</button>
          <span className="text-gray-300">·</span>
          <button onClick={() => selectDue(3650)} className="font-medium text-blue-600 hover:text-blue-800">All</button>
          <span className="text-gray-300">·</span>
          <button onClick={() => setPicked({})} className="font-medium text-gray-500 hover:text-gray-800">None</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="w-10 px-5" /><th className="text-left px-3 py-2.5">Vendor</th><th className="text-left px-3 py-2.5">Due</th><th className="text-right px-3 py-2.5">Owed</th><th className="text-right px-5 py-2.5 w-40">Pay</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {open.map(b => {
                const on = picked[b.id] != null;
                const late = daysBetween(b.due_date, todayISO());
                const credit = credits.get(b.vendor_id);
                return (
                  <tr key={b.id} className={`text-sm transition ${on ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-2.5"><input type="checkbox" checked={on} onChange={() => toggle(b)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></td>
                    <td className="px-3 py-2.5 cursor-pointer" onClick={() => toggle(b)}>
                      <p className="font-medium text-gray-900">{vendorById.get(b.vendor_id)?.name}</p>
                      <p className="text-xs text-gray-500">{b.bill_number ? `#${b.bill_number} · ` : ''}{b.memo}{credit ? <span className="ml-1 text-blue-600">· {money(credit)} credit available</span> : null}</p>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{late > 0 ? <Badge tone="red">{late}d late</Badge> : <span className="text-gray-600">{fmtDate(b.due_date)}</span>}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(b.total - b.amount_paid)}</td>
                    <td className="px-5 py-2">
                      <input type="number" step="0.01" min="0" value={picked[b.id] ?? ''} onChange={e => setPicked(p => ({ ...p, [b.id]: e.target.value }))} placeholder="0.00" className={`${inputCls} text-right py-1.5`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 h-fit xl:sticky xl:top-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Payment</h3>
        <ErrorBanner message={error} />
        <div className="grid grid-cols-3 gap-2">
          {([['check', 'Check', Printer], ['ach', 'ACH', Landmark], ['card', 'Card', CreditCard]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => { setMethod(id); setBankId(id === 'card' ? cards[0]?.id ?? '' : byCode.get('1000')?.id ?? ''); }}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition ${method === id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        <Field label={method === 'card' ? 'Card' : 'Pay from'}>
          <select value={sourceId} onChange={e => setBankId(e.target.value)} className={inputCls}>
            {(method === 'card' ? cards : banks).map(a => <option key={a.id} value={a.id}>{a.name}{a.last4 ? ` ••${a.last4}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Payment date"><input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={inputCls} /></Field>
        {method === 'check' && <Field label="First check number" hint="Leave blank to continue from the last check"><input type="number" value={startCheck} onChange={e => setStartCheck(e.target.value)} className={inputCls} /></Field>}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex justify-between text-sm text-gray-600"><span>{items.length} bill{items.length === 1 ? '' : 's'} · {payees} vendor{payees === 1 ? '' : 's'}</span></div>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{money(total)}</p>
        </div>
        <button onClick={pay} disabled={busy || total <= 0 || !sourceId} className={`${btnPrimary} w-full`}>{busy ? 'Paying...' : `Pay ${money(total)}`}</button>
      </Card>
    </div>
  );
}
