import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Download, RefreshCw, CreditCard, Search, Loader2, AlertTriangle, CheckCircle2, ChevronRight, Receipt,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { saveAppSetting, useAppSetting } from '../../lib/useAppSettings';
import {
  computeInvoicePnl, fetchPaymentsForInvoices, feeKind, methodLabel, syncWithForte, useFeeRates,
  FEE_SETTING_KEYS, type FeePayment,
} from '../../lib/merchantFees';

type MethodFilter = 'all' | 'card' | 'ach';
type Preset = 'this_month' | 'last_month' | 'last_90' | 'this_year' | 'all' | 'custom';

interface Row {
  invoiceId: string;
  invoiceNumber: string;
  customer: string;
  paidDate: string | null;
  method: string;
  charged: number;
  fee: number;
  surcharge: number;
  grossProfit: number;
  feeStatus: 'actual' | 'estimated' | 'mixed' | 'none';
  unknownCost: boolean;
  payments: FeePayment[];
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function iso(d: Date) {
  return d.toISOString().split('T')[0];
}

function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (p) {
    case 'this_month': return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case 'last_month': return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case 'last_90': return { from: iso(new Date(now.getTime() - 90 * 86400000)), to: iso(now) };
    case 'this_year': return { from: `${y}-01-01`, to: `${y}-12-31` };
    default: return { from: '', to: '' };
  }
}

function fmtDate(d: string | null) {
  if (!d) return '--';
  return new Date(d.length <= 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function fetchInChunks<T>(table: string, cols: string, ids: string[]): Promise<{ data: T[]; error: string | null }> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from(table).select(cols).in('invoice_id', ids.slice(i, i + 200));
    if (error) return { data: [], error: error.message };
    out.push(...((data || []) as T[]));
  }
  return { data: out, error: null };
}

export default function MerchantFeeReport({ onBack, onOpenInvoice }: { onBack: () => void; onOpenInvoice?: (id: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>('all');
  const [range, setRange] = useState({ from: '', to: '' });
  const [method, setMethod] = useState<MethodFilter>('all');
  const [customer, setCustomer] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const { rates } = useFeeRates();
  const [lastSync] = useAppSetting(FEE_SETTING_KEYS.lastSync);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, subtotal, surcharge_amount, invoice_date, updated_at, companies(name)')
      .eq('status', 'paid');
    if (invErr) { setError('Could not load paid invoices.'); setLoading(false); return; }
    const list = (invoices || []) as any[];
    const ids = list.map((i) => i.id);
    const [lines, pays] = await Promise.all([
      fetchInChunks<any>('invoice_line_items', 'id, invoice_id, description, quantity, unit_price, total, unit_cost', ids),
      fetchPaymentsForInvoices(ids),
    ]);
    if (lines.error || pays.error) { setError('Could not load invoice details.'); setLoading(false); return; }

    const linesBy = new Map<string, any[]>();
    lines.data.forEach((l) => { const a = linesBy.get(l.invoice_id) || []; a.push(l); linesBy.set(l.invoice_id, a); });
    const paysBy = new Map<string, FeePayment[]>();
    pays.data.forEach((p) => { if (!p.invoice_id) return; const a = paysBy.get(p.invoice_id) || []; a.push(p); paysBy.set(p.invoice_id, a); });

    const built: Row[] = list.map((inv) => {
      const payments = paysBy.get(inv.id) || [];
      const pnl = computeInvoicePnl(inv, linesBy.get(inv.id) || [], payments);
      const methods = Array.from(new Set(payments.map((p) => methodLabel(p.payment_method))));
      const feeBearing = payments.filter((p) => feeKind(p.payment_method) !== 'none');
      const sources = new Set(feeBearing.map((p) => (p.fee_source === 'actual' ? 'actual' : 'estimated')));
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        customer: inv.companies?.name || 'Unknown customer',
        paidDate: payments.length ? payments[payments.length - 1].paid_on : (inv.updated_at || inv.invoice_date),
        method: methods.length === 0 ? '--' : methods.length === 1 ? methods[0] : 'Mixed',
        charged: Number(inv.total) || 0,
        fee: pnl.merchantFees,
        surcharge: pnl.surcharge,
        grossProfit: pnl.grossProfit,
        feeStatus: feeBearing.length === 0 ? 'none' : sources.size > 1 ? 'mixed' : (Array.from(sources)[0] as 'actual' | 'estimated'),
        unknownCost: pnl.unknownCostCount > 0,
        payments,
      };
    });
    built.sort((a, b) => (b.paidDate || '').localeCompare(a.paidDate || ''));
    setRows(built);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = customer.trim().toLowerCase();
    return rows.filter((r) => {
      const day = (r.paidDate || '').slice(0, 10);
      if (range.from && day < range.from) return false;
      if (range.to && day > range.to) return false;
      if (method !== 'all' && !r.payments.some((p) => feeKind(p.payment_method) === method)) return false;
      if (q && !r.customer.toLowerCase().includes(q) && !r.invoiceNumber.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, range, method, customer]);

  const totals = useMemo(() => {
    const t = filtered.reduce((acc, r) => ({
      charged: acc.charged + r.charged,
      fee: acc.fee + r.fee,
      surcharge: acc.surcharge + r.surcharge,
      profit: acc.profit + r.grossProfit,
    }), { charged: 0, fee: 0, surcharge: 0, profit: 0 });
    const feeBase = filtered.reduce((s, r) => s + r.payments.filter((p) => feeKind(p.payment_method) !== 'none').reduce((x, p) => x + p.amount, 0), 0);
    return { ...t, avgRate: feeBase > 0 ? (t.fee / feeBase) * 100 : 0 };
  }, [filtered]);

  const pendingSync = useMemo(
    () => filtered.flatMap((r) => r.payments).filter((p) => p.fee_source === 'estimated' && feeKind(p.payment_method) !== 'none' && p.amount > 0),
    [filtered]
  );

  function choosePreset(p: Preset) {
    setPreset(p);
    if (p !== 'custom') setRange(presetRange(p));
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    const { synced, error: syncErr } = await syncWithForte(pendingSync, rates);
    if (syncErr) {
      setSyncMsg({ tone: 'error', text: `Sync stopped after ${synced} payments. Please try again.` });
    } else {
      await saveAppSetting(FEE_SETTING_KEYS.lastSync, new Date().toISOString()).catch(() => undefined);
      setSyncMsg({ tone: 'ok', text: synced === 0 ? 'Everything in this view already has actual fees.' : `Updated ${synced} payment${synced === 1 ? '' : 's'} with actual fees from CSG Forte.` });
    }
    setSyncing(false);
    load();
  }

  function exportCsv() {
    const headers = ['Customer', 'Invoice #', 'Paid Date', 'Payment Method', 'Amount Charged', 'Merchant Fee', 'Fee Status', 'Surcharge Collected', 'Gross Profit', 'Cost Missing'];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = filtered.map((r) => [
      r.customer, r.invoiceNumber, (r.paidDate || '').slice(0, 10), r.method,
      r.charged.toFixed(2), r.fee.toFixed(2), r.feeStatus, r.surcharge.toFixed(2), r.grossProfit.toFixed(2), r.unknownCost ? 'Yes' : 'No',
    ].map(esc).join(','));
    lines.push(['TOTAL', '', '', '', totals.charged.toFixed(2), totals.fee.toFixed(2), '', totals.surcharge.toFixed(2), totals.profit.toFixed(2), ''].map(esc).join(','));
    const blob = new Blob([[headers.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant-service-fees-${range.from || 'all'}-to-${range.to || 'today'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusPill = (s: Row['feeStatus']) => {
    const map = {
      actual: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      estimated: 'bg-amber-50 text-amber-700 ring-amber-200',
      mixed: 'bg-sky-50 text-sky-700 ring-sky-200',
      none: 'bg-gray-50 text-gray-500 ring-gray-200',
    };
    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ${map[s]}`}>{s === 'none' ? 'no fee' : s}</span>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-1 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Merchant Service Fee Report</h1>
            <p className="mt-1 text-sm text-gray-500">Paid invoices with processing fees and gross profit.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-right text-xs text-gray-500">
            <p className="font-medium text-gray-700">CSG Forte</p>
            <p>{lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}` : 'Never synced'}</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : `Sync with CSG Forte${pendingSync.length ? ` (${pendingSync.length})` : ''}`}
          </button>
          <button
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${syncMsg.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {syncMsg.tone === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {syncMsg.text}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
          {([['all', 'All time'], ['this_month', 'This month'], ['last_month', 'Last month'], ['last_90', 'Last 90 days'], ['this_year', 'This year'], ['custom', 'Custom']] as [Preset, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => choosePreset(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${preset === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
            <span className="text-gray-400">to</span>
            <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
          </div>
        )}
        <select value={method} onChange={(e) => setMethod(e.target.value as MethodFilter)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          <option value="all">All methods</option>
          <option value="card">Credit card</option>
          <option value="ach">ACH</option>
        </select>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Search customer or invoice #"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: 'Amount charged', value: money.format(totals.charged), tone: 'text-gray-900' },
          { label: 'Merchant fees', value: money.format(totals.fee), tone: 'text-red-600' },
          { label: 'Avg. fee rate', value: `${totals.avgRate.toFixed(2)}%`, tone: 'text-gray-900' },
          { label: 'Surcharges collected', value: money.format(totals.surcharge), tone: 'text-amber-700' },
          { label: 'Gross profit', value: money.format(totals.profit), tone: totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className={`mt-1 text-xl font-semibold ${s.tone}`}>{loading ? '--' : s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-sm text-red-600">
            <AlertTriangle className="h-6 w-6" /> {error}
            <button onClick={load} className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-gray-500">
            <Receipt className="h-8 w-8 text-gray-300" /> No paid invoices match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Charged</th>
                  <th className="px-4 py-3 text-right">Merchant fee</th>
                  <th className="px-4 py-3 text-right">Surcharge</th>
                  <th className="px-4 py-3 text-right">Gross profit</th>
                  <th className="w-8 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr
                    key={r.invoiceId}
                    onClick={() => onOpenInvoice?.(r.invoiceId)}
                    className="group cursor-pointer text-gray-700 transition-colors hover:bg-blue-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{r.customer}</td>
                    <td className="px-4 py-3 text-blue-700">{r.invoiceNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.paidDate)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {r.method === 'Credit Card' && <CreditCard className="h-3.5 w-3.5 text-gray-400" />}
                        {r.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{money.format(r.charged)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {statusPill(r.feeStatus)}
                        <span>{money.format(r.fee)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{r.surcharge > 0 ? money.format(r.surcharge) : '--'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      <span className="inline-flex items-center gap-1">
                        {r.unknownCost && <span title="Some lines have no cost on file"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /></span>}
                        {money.format(r.grossProfit)}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-300 group-hover:text-gray-500"><ChevronRight className="h-4 w-4" /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold text-gray-900">
                <tr>
                  <td className="px-4 py-3" colSpan={4}>{filtered.length} invoice{filtered.length === 1 ? '' : 's'}</td>
                  <td className="px-4 py-3 text-right">{money.format(totals.charged)}</td>
                  <td className="px-4 py-3 text-right">{money.format(totals.fee)}</td>
                  <td className="px-4 py-3 text-right">{money.format(totals.surcharge)}</td>
                  <td className="px-4 py-3 text-right">{money.format(totals.profit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Gross profit = sales minus product cost minus merchant fees. Surcharges are shown separately and not counted as profit.
        <AlertTriangle className="mx-1 inline h-3 w-3 text-amber-500" />marks invoices with lines missing a cost.
      </p>
    </div>
  );
}
