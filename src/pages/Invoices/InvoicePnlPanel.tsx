import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, ChevronDown, AlertTriangle, CreditCard, Pencil, Check, X, Loader2, Percent, EyeOff,
} from 'lucide-react';
import type { Invoice, InvoiceLineItem } from './useInvoices';
import { setInvoiceSurcharge, updateLineItemCost } from './useInvoices';
import {
  computeInvoicePnl, fetchPaymentsForInvoices, setManualFee, methodLabel, useFeeRates, type FeePayment,
} from '../../lib/merchantFees';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const SOURCE_STYLE: Record<string, string> = {
  actual: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  estimated: 'bg-amber-50 text-amber-700 ring-amber-200',
  manual: 'bg-sky-50 text-sky-700 ring-sky-200',
};

function InlineMoney({ value, onSave, placeholder }: {
  value: number | null; onSave: (v: number | null) => Promise<void>; placeholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value === null ? '' : value.toFixed(2)); setEditing(true); }}
        className="group inline-flex items-center gap-1 rounded px-1 py-0.5 text-right hover:bg-gray-100"
      >
        {value === null ? <span className="text-amber-600">{placeholder}</span> : fmt.format(value)}
        <Pencil className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
      </button>
    );
  }

  const commit = async () => {
    setSaving(true);
    const n = draft.trim() === '' ? null : Math.max(0, parseFloat(draft) || 0);
    await onSave(n);
    setSaving(false);
    setEditing(false);
  };

  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        type="number"
        step="0.01"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
      />
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" /> : (
        <>
          <button onClick={commit} className="text-emerald-600 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </>
      )}
    </span>
  );
}

function Stat({ label, value, tone = 'text-gray-900', sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

interface Props {
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
  onChanged: () => void;
}

export default function InvoicePnlPanel({ invoice, lineItems, onChanged }: Props) {
  const [open, setOpen] = useState(true);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingSurcharge, setTogglingSurcharge] = useState(false);
  const { rates } = useFeeRates();

  const loadPayments = useCallback(async () => {
    const { data, error } = await fetchPaymentsForInvoices([invoice.id]);
    setLoadError(error);
    setPayments(data);
  }, [invoice.id]);

  useEffect(() => { loadPayments(); }, [loadPayments, invoice.amount_paid]);

  const pnl = useMemo(() => computeInvoicePnl(invoice, lineItems, payments), [invoice, lineItems, payments]);
  const surchargeOn = !!invoice.surcharge_enabled;

  async function toggleSurcharge() {
    setTogglingSurcharge(true);
    setActionError(null);
    const { error } = await setInvoiceSurcharge(invoice.id, !surchargeOn, rates.surchargePct);
    if (error) setActionError('Could not update the surcharge. Please try again.');
    setTogglingSurcharge(false);
    onChanged();
  }

  async function saveCost(id: string, v: number | null) {
    setActionError(null);
    const { error } = await updateLineItemCost(id, v);
    if (error) setActionError('Could not save the cost. Please try again.');
    onChanged();
  }

  async function saveFee(p: FeePayment, v: number | null) {
    setActionError(null);
    const { error } = await setManualFee(p, v ?? 0);
    if (error) setActionError('Could not save the fee. Please try again.');
    loadPayments();
  }

  const profitTone = pnl.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600';

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm print:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Profit &amp; Loss</p>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <EyeOff className="h-3 w-3" /> Internal only. Customers never see this.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-semibold ${profitTone}`}>
            {fmt.format(pnl.grossProfit)} <span className="font-normal text-gray-500">({pnl.margin.toFixed(1)}%)</span>
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="space-y-6 border-t border-gray-100 px-6 py-5">
          {(loadError || actionError) && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" /> {actionError || 'Could not load payments for this invoice.'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Sales" value={fmt.format(pnl.sales)} sub={pnl.discount > 0 ? `after ${fmt.format(pnl.discount)} discount` : undefined} />
            <Stat label="Product cost" value={`-${fmt.format(pnl.productCost)}`} />
            <Stat label="Merchant fees" value={`-${fmt.format(pnl.merchantFees)}`} />
            <Stat label="Gross profit" value={fmt.format(pnl.grossProfit)} tone={profitTone} />
            <Stat label="Margin" value={`${pnl.margin.toFixed(1)}%`} tone={profitTone} />
          </div>

          {pnl.unknownCostCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {pnl.unknownCostCount} line{pnl.unknownCostCount === 1 ? ' has' : 's have'} no cost on file, so profit may be overstated. Click "Add cost" to enter it.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Sold</th>
                  <th className="py-2 pr-4 text-right">Unit cost</th>
                  <th className="py-2 pr-4 text-right">Total cost</th>
                  <th className="py-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pnl.lines.map((l) => (
                  <tr key={l.id} className="text-gray-700">
                    <td className="py-2 pr-4">{l.description}</td>
                    <td className="py-2 pr-4 text-right">{l.quantity}</td>
                    <td className="py-2 pr-4 text-right">{fmt.format(l.revenue)}</td>
                    <td className="py-2 pr-4 text-right">
                      <InlineMoney value={l.unitCost} placeholder="Add cost" onSave={(v) => saveCost(l.id, v)} />
                    </td>
                    <td className="py-2 pr-4 text-right">{l.unitCost === null ? '--' : fmt.format(l.cost)}</td>
                    <td className={`py-2 text-right font-medium ${l.profit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{fmt.format(l.profit)}</td>
                  </tr>
                ))}
                {pnl.lines.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-gray-400">No line items yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CreditCard className="h-4 w-4 text-blue-600" /> Payments &amp; merchant fees
              </p>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-400">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-gray-50 text-sm">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <p className="font-medium text-gray-800">{fmt.format(p.amount)} <span className="font-normal text-gray-500">via {methodLabel(p.payment_method)}</span></p>
                        <p className="text-xs text-gray-500">{p.paid_on ? new Date(p.paid_on.length <= 10 ? p.paid_on + 'T00:00:00' : p.paid_on).toLocaleDateString() : '--'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ${SOURCE_STYLE[p.fee_source]}`}>{p.fee_source}</span>
                        <InlineMoney value={p.merchant_fee} placeholder="$0.00" onSave={(v) => saveFee(p, v)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Percent className="h-4 w-4 text-amber-600" /> Card fee surcharge
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Adds {surchargeOn ? Number(invoice.surcharge_pct) : rates.surchargePct}% to the customer's total as a separate line. Not counted toward profit.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={surchargeOn}
                  disabled={togglingSurcharge}
                  onClick={toggleSurcharge}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${surchargeOn ? 'bg-amber-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${surchargeOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="mt-4 flex justify-between rounded-lg bg-amber-50/60 px-3 py-2 text-sm">
                <span className="text-gray-600">Surcharge collected</span>
                <span className="font-semibold text-gray-900">{fmt.format(pnl.surcharge)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
