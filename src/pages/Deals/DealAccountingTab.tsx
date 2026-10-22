import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, Package, FileText, Receipt, CreditCard, BadgeDollarSign,
  ChevronDown, ChevronRight, AlertTriangle, Save, Check, ExternalLink,
} from 'lucide-react';
import { useDealAccounting, type DealAccounting } from '../../lib/useDealAccounting';
import { formatMoney, formatHours, formatShortDate } from '../../lib/jobCosting';

interface Props {
  dealId: string;
  onSaveCommission: (amount: number, payrollDate: string | null) => Promise<boolean>;
  onOpenInvoice?: (invoiceId: string) => void;
  onOpenWorkOrder?: (workOrderId: string) => void;
  onOpenEstimate?: (estimateId: string) => void;
  refreshKey?: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-sky-100 text-sky-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function Section({ icon: Icon, title, meta, children, tone = 'blue' }: {
  icon: typeof Users; title: string; meta?: string; children: React.ReactNode; tone?: 'blue' | 'teal' | 'amber' | 'emerald' | 'gray';
}) {
  const tones = { blue: 'bg-blue-50 text-blue-600', teal: 'bg-teal-50 text-teal-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600', gray: 'bg-gray-100 text-gray-600' };
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
        <h3 className="text-sm font-semibold text-gray-900 flex-1">{title}</h3>
        {meta && <span className="text-xs text-gray-500">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-6 text-center text-sm text-gray-400">{text}</p>;
}

function ProfitSummary({ a }: { a: DealAccounting }) {
  const positive = a.netProfit >= 0;
  const segments = [
    { label: 'Products', value: a.productCost, color: 'bg-teal-400' },
    { label: 'Labor', value: a.laborCost, color: 'bg-blue-400' },
    { label: 'Commission', value: a.commission, color: 'bg-amber-400' },
    { label: 'Profit', value: Math.max(0, a.netProfit), color: 'bg-emerald-400' },
  ];
  const base = Math.max(a.soldFor, a.productCost + a.laborCost + a.commission, 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Sold For</p>
          <p className="text-lg font-bold text-blue-900 mt-1">{formatMoney(a.soldFor)}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Collected</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatMoney(a.collected)}</p>
        </div>
        <div className={`p-3 rounded-xl border ${a.balanceDue > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${a.balanceDue > 0 ? 'text-amber-700' : 'text-gray-500'}`}>Balance Due</p>
          <p className={`text-lg font-bold mt-1 ${a.balanceDue > 0 ? 'text-amber-900' : 'text-gray-900'}`}>{formatMoney(a.balanceDue)}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Sold for</span><span className="font-semibold text-gray-900">{formatMoney(a.soldFor)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Product cost</span><span className="text-gray-900">− {formatMoney(a.productCost)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Labor ({formatHours(a.laborMinutes)})</span><span className="text-gray-900">− {formatMoney(a.laborCost)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Sales commission</span><span className="text-gray-900">− {formatMoney(a.commission)}</span></div>
        <div className={`flex justify-between items-center pt-2 border-t border-gray-100 ${positive ? 'text-emerald-700' : 'text-red-700'}`}>
          <span className="font-semibold">Net profit</span>
          <span className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${positive ? 'bg-emerald-100' : 'bg-red-100'}`}>{a.marginPct.toFixed(1)}%</span>
            <span className="text-base font-bold">{formatMoney(a.netProfit)}</span>
          </span>
        </div>
      </div>

      <div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
          {segments.map(s => s.value > 0 && (
            <div key={s.label} className={`h-full ${s.color} transition-all duration-500`} style={{ width: `${(s.value / base) * 100}%` }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-2">
          {segments.map(s => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-gray-500"><span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />{s.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommissionCard({ a, onSave }: { a: DealAccounting; onSave: Props['onSaveCommission'] }) {
  const [amount, setAmount] = useState(String(a.deal.commission_amount || ''));
  const [date, setDate] = useState(a.deal.commission_payroll_date ?? '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setAmount(String(a.deal.commission_amount || ''));
    setDate(a.deal.commission_payroll_date ?? '');
  }, [a.deal.commission_amount, a.deal.commission_payroll_date]);

  const parsed = amount.trim() === '' ? 0 : Number(amount);
  const invalid = Number.isNaN(parsed) || parsed < 0;
  const dirty = parsed !== (Number(a.deal.commission_amount) || 0) || date !== (a.deal.commission_payroll_date ?? '');
  const rep = a.deal.assigned_employee;

  async function save() {
    if (invalid) return;
    setSaving(true);
    const ok = await onSave(parsed, date || null);
    setSaving(false);
    setStatus(ok ? 'saved' : 'error');
    if (ok) setTimeout(() => setStatus('idle'), 2000);
  }

  return (
    <Section icon={BadgeDollarSign} title="Sales Commission" tone="amber" meta={rep ? `${rep.first_name} ${rep.last_name}` : 'No salesperson assigned'}>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Commission amount</span>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input
              type="number" min="0" step="0.01" value={amount} onChange={e => { setAmount(e.target.value); setStatus('idle'); }}
              placeholder="0.00"
              className={`w-full pl-7 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${invalid ? 'border-red-300' : 'border-gray-300'}`}
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Payroll date</span>
          <input
            type="date" value={date} onChange={e => { setDate(e.target.value); setStatus('idle'); }}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </label>
        <button
          onClick={save} disabled={!dirty || invalid || saving}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 transition-colors"
        >
          {status === 'saved' ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save'}
        </button>
      </div>
      {status === 'error' && <p className="px-5 pb-4 -mt-2 text-xs text-red-600">Could not save the commission. Please try again.</p>}
      {invalid && <p className="px-5 pb-4 -mt-2 text-xs text-red-600">Enter a valid amount of zero or more.</p>}
    </Section>
  );
}

function LaborSection({ a, onOpenWorkOrder }: { a: DealAccounting; onOpenWorkOrder?: (id: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(a.workOrders.map(w => w.id)));
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Section icon={Users} title="Work Orders & Labor" meta={`${formatHours(a.laborMinutes)} · ${formatMoney(a.laborCost)}`}>
      {a.workOrders.length === 0 ? <Empty text="No work orders are assigned to this deal yet." /> : (
        <div className="divide-y divide-gray-100">
          {a.workOrders.map(wo => (
            <div key={wo.id}>
              <div className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <button onClick={() => toggle(wo.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  {open.has(wo.id) ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                  <span className="text-xs font-mono text-gray-400 shrink-0">{wo.wo_number}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">{wo.title}</span>
                  <StatusPill status={wo.status} />
                </button>
                <span className="text-xs text-gray-500 shrink-0">{formatHours(wo.laborMinutes)}</span>
                <span className="text-sm font-semibold text-gray-900 w-24 text-right shrink-0">{formatMoney(wo.laborCost)}</span>
                {onOpenWorkOrder && (
                  <button onClick={() => onOpenWorkOrder(wo.id)} title="Open work order" className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {open.has(wo.id) && (
                <div className="bg-gray-50/60 px-5 pb-3">
                  {wo.labor.length === 0 ? <p className="py-2 pl-6 text-xs text-gray-400">No technicians assigned.</p> : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left font-medium py-1.5 pl-6">Technician</th>
                          <th className="text-left font-medium">Date worked</th>
                          <th className="text-right font-medium">Hours</th>
                          <th className="text-right font-medium">Burdened rate</th>
                          <th className="text-right font-medium">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wo.labor.map(l => (
                          <tr key={l.id} className="border-t border-gray-100">
                            <td className="py-1.5 pl-6 text-gray-900 font-medium">{l.employeeName}</td>
                            <td className="text-gray-600">{formatShortDate(l.workDate)}</td>
                            <td className="text-right text-gray-700">{(l.minutes / 60).toFixed(2)}</td>
                            <td className="text-right">
                              {l.rate > 0 ? <span className="text-gray-700">{formatMoney(l.rate)}/hr</span> : (
                                <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" />Not set</span>
                              )}
                            </td>
                            <td className="text-right font-semibold text-gray-900">{formatMoney(l.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="px-5 py-3 flex justify-between bg-gray-50 text-sm">
            <span className="font-semibold text-gray-700">Total man-hours: {(a.laborMinutes / 60).toFixed(2)}</span>
            <span className="font-bold text-gray-900">{formatMoney(a.laborCost)}</span>
          </div>
        </div>
      )}
    </Section>
  );
}

function ProductsSection({ a }: { a: DealAccounting }) {
  const sell = a.products.reduce((s, p) => s + p.unitPrice * p.quantity, 0);
  const meta = a.productsSource === 'estimate' ? 'From proposal' : a.productsSource === 'work_orders' ? 'From work orders' : undefined;
  return (
    <Section icon={Package} title="Products" tone="teal" meta={meta}>
      {a.products.length === 0 ? <Empty text="No products on this job yet." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left font-medium px-5 py-2">Product</th>
                <th className="text-right font-medium">Qty</th>
                <th className="text-right font-medium">Our cost</th>
                <th className="text-right font-medium">Sell price</th>
                <th className="text-right font-medium pr-5">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {a.products.map(p => {
                const lineSell = p.unitPrice * p.quantity;
                const lineCost = p.unitCost * p.quantity;
                const margin = lineSell > 0 ? ((lineSell - lineCost) / lineSell) * 100 : 0;
                return (
                  <tr key={p.id}>
                    <td className="px-5 py-2 text-gray-900 max-w-[220px] truncate">{p.description}</td>
                    <td className="text-right text-gray-700">{p.quantity}</td>
                    <td className="text-right text-gray-700">{formatMoney(lineCost)}</td>
                    <td className="text-right text-gray-700">{formatMoney(lineSell)}</td>
                    <td className={`text-right pr-5 font-semibold ${margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{margin.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 text-sm">
              <tr>
                <td className="px-5 py-2 font-semibold text-gray-700" colSpan={2}>Total</td>
                <td className="text-right font-bold text-gray-900">{formatMoney(a.productCost)}</td>
                <td className="text-right font-bold text-gray-900">{formatMoney(sell)}</td>
                <td className="pr-5" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Section>
  );
}

export default function DealAccountingTab({ dealId, onSaveCommission, onOpenInvoice, onOpenWorkOrder, onOpenEstimate, refreshKey }: Props) {
  const { data: a, loading, error, refetch } = useDealAccounting(dealId);

  useEffect(() => {
    if (refreshKey) refetch();
  }, [refreshKey, refetch]);

  if (loading && !a) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" /></div>;
  }
  if (error || !a) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>We couldn't load this deal's accounting details.</span>
          <button onClick={refetch} className="font-semibold underline">Try again</button>
        </div>
      </div>
    );
  }

  const invoiceNumber = new Map(a.invoices.map(i => [i.id, i.invoice_number]));

  return (
    <div className="p-6 space-y-4 bg-gray-50/50 min-h-full">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <h3 className="font-bold text-gray-900">Job Profitability</h3>
      </div>
      <ProfitSummary a={a} />
      <CommissionCard a={a} onSave={async (amt, d) => { const ok = await onSaveCommission(amt, d); if (ok) refetch(); return ok; }} />
      <LaborSection a={a} onOpenWorkOrder={onOpenWorkOrder} />
      <ProductsSection a={a} />

      <Section icon={FileText} title="Estimates" tone="gray" meta={`${a.estimates.length}`}>
        {a.estimates.length === 0 ? <Empty text="No estimates on this deal." /> : (
          <div className="divide-y divide-gray-100">
            {a.estimates.map(e => (
              <button
                key={e.id} onClick={() => onOpenEstimate?.(e.id)} disabled={!onOpenEstimate}
                className="w-full text-left px-5 py-2.5 flex items-center gap-3 text-sm hover:bg-blue-50/50 disabled:hover:bg-transparent transition-colors group"
              >
                <span className="font-mono text-xs text-gray-500 w-24 shrink-0">{e.estimate_number}</span>
                <StatusPill status={e.status} />
                <span className="text-xs text-gray-500 flex-1">{formatShortDate(e.estimate_date)}</span>
                <span className="font-semibold text-gray-900">{formatMoney(e.total)}</span>
                {onOpenEstimate && <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-600 transition-colors" />}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Receipt} title="Invoices" tone="blue" meta={`${a.invoices.length}`}>
        {a.invoices.length === 0 ? <Empty text="No invoices yet." /> : (
          <div className="divide-y divide-gray-100">
            {a.invoices.map(i => (
              <button
                key={i.id} onClick={() => onOpenInvoice?.(i.id)} disabled={!onOpenInvoice}
                className="w-full px-5 py-2.5 flex items-center gap-3 text-sm text-left hover:bg-blue-50/50 transition-colors disabled:hover:bg-transparent"
              >
                <span className="font-mono text-xs text-gray-500 w-24 shrink-0">{i.invoice_number}</span>
                <StatusPill status={i.status} />
                <span className="text-xs text-gray-500 flex-1">{formatShortDate(i.invoice_date)}</span>
                <span className="text-xs text-gray-500">Paid {formatMoney(i.amount_paid)}</span>
                <span className="font-semibold text-gray-900 w-24 text-right">{formatMoney(i.total)}</span>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section icon={CreditCard} title="Payments" tone="emerald" meta={formatMoney(a.payments.reduce((s, p) => s + Number(p.amount), 0))}>
        {a.payments.length === 0 ? <Empty text="No payments received yet." /> : (
          <div className="divide-y divide-gray-100">
            {a.payments.map(p => (
              <div key={p.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                <span className="text-xs text-gray-500 w-24 shrink-0">{formatShortDate(p.transaction_date)}</span>
                <span className="capitalize text-gray-700">{(p.payment_method ?? 'payment').replace(/_/g, ' ')}</span>
                <span className="text-xs text-gray-400 flex-1 truncate">
                  {p.invoice_id && invoiceNumber.get(p.invoice_id)}{p.reference_number ? ` · Ref ${p.reference_number}` : ''}
                </span>
                <span className="font-semibold text-emerald-700">{formatMoney(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
