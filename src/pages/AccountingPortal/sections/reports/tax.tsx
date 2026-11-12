import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg, fetchAllRows } from '../../lib/api';
import { downloadCsv, money, rangeLabel, type DateRange } from '../../lib/format';
import type { Vendor } from '../../lib/types';
import { Badge, DateRangeBar, ErrorBanner, inputCls, Loading } from '../../components/ui';
import { initialRange, ReportFrame, type ReportProps } from './ReportFrame';

interface TaxInv { tax_county: string | null; subtotal: number; taxable_amount: number; exempt_amount: number; tax_state_amount: number; tax_county_amount: number; tax_city_amount: number; tax: number; tax_county_rate: number; tax_exempt: boolean }

export function TaxByCounty({ onBack, params }: ReportProps) {
  const { refreshKey } = usePortal();
  const [range, setRange] = useState<DateRange>(initialRange(params, 'last_month'));
  const [rows, setRows] = useState<TaxInv[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    fetchAllRows<TaxInv>((f, t) => supabase
      .from('invoices')
      .select('tax_county, subtotal, taxable_amount, exempt_amount, tax_state_amount, tax_county_amount, tax_city_amount, tax, tax_county_rate, tax_exempt')
      .gte('invoice_date', range.from).lte('invoice_date', range.to)
      .not('status', 'in', '(draft,void)')
      .order('id').range(f, t) as unknown as PromiseLike<{ data: TaxInv[] | null; error: unknown }>)
      .then(setRows).catch(e => setError(errMsg(e)));
  }, [range, refreshKey]);

  const groups = useMemo(() => {
    const m = new Map<string, { county: string; count: number; exemptCustomers: number; sales: number; taxable: number; exempt: number; state: number; countyTax: number; city: number; total: number; rate: number }>();
    for (const r of rows ?? []) {
      const k = r.tax_county ?? 'No county on file';
      const g = m.get(k) ?? { county: k, count: 0, exemptCustomers: 0, sales: 0, taxable: 0, exempt: 0, state: 0, countyTax: 0, city: 0, total: 0, rate: 0 };
      g.count++;
      if (r.tax_exempt) g.exemptCustomers++;
      g.taxable += Number(r.taxable_amount); g.exempt += Number(r.exempt_amount);
      g.sales += Number(r.taxable_amount) + Number(r.exempt_amount);
      g.state += Number(r.tax_state_amount); g.countyTax += Number(r.tax_county_amount); g.city += Number(r.tax_city_amount); g.total += Number(r.tax);
      g.rate = Math.max(g.rate, Number(r.tax_county_rate));
      m.set(k, g);
    }
    return [...m.values()].sort((a, b) => b.total - a.total || b.sales - a.sales);
  }, [rows]);

  const t = groups.reduce((s, g) => ({ sales: s.sales + g.sales, taxable: s.taxable + g.taxable, exempt: s.exempt + g.exempt, state: s.state + g.state, county: s.county + g.countyTax, city: s.city + g.city, total: s.total + g.total }), { sales: 0, taxable: 0, exempt: 0, state: 0, county: 0, city: 0, total: 0 });

  return (
    <ReportFrame
      title="Sales Tax by County"
      period={rangeLabel(range)}
      onBack={onBack}
      controls={<DateRangeBar range={range} onChange={setRange} />}
      onCsv={rows ? () => downloadCsv(`sales-tax-by-county-${range.from}-${range.to}`, [['County', 'Invoices', 'Sales', 'Exempt sales', 'Taxable sales', 'County rate %', 'State tax', 'County surtax', 'City tax', 'Total tax'], ...groups.map(g => [g.county, g.count, g.sales.toFixed(2), g.exempt.toFixed(2), g.taxable.toFixed(2), g.rate, g.state.toFixed(2), g.countyTax.toFixed(2), g.city.toFixed(2), g.total.toFixed(2)])]) : undefined}
      note="County surtax applies to the first $5,000 of each taxable item. This matches what is reported on the Florida DR-15 return, county by county."
    >
      <ErrorBanner message={error} />
      {!rows ? <Loading /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {['County', 'Invoices', 'Sales', 'Exempt', 'Taxable', 'Rate', 'State 6%', 'County', 'City', 'Total tax'].map((h, i) => <th key={h} className={`${i ? 'text-right' : 'text-left'} ${i === 0 ? 'px-6' : i === 9 ? 'px-6' : 'px-3'} py-2.5 whitespace-nowrap`}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map(g => (
                <tr key={g.county} className="hover:bg-gray-50 text-sm">
                  <td className={`px-6 py-2 font-medium ${g.county === 'No county on file' ? 'text-amber-700' : 'text-gray-900'}`}>{g.county}{g.exemptCustomers > 0 && <span className="ml-2"><Badge>{g.exemptCustomers} exempt</Badge></span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{g.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(g.sales)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{money(g.exempt)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(g.taxable)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{g.rate ? `${g.rate}%` : '-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(g.state)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(g.countyTax)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.city ? money(g.city) : '-'}</td>
                  <td className="px-6 py-2 text-right tabular-nums font-semibold">{money(g.total)}</td>
                </tr>
              ))}
              {groups.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-sm text-gray-500">No invoices in this period.</td></tr>}
            </tbody>
            <tfoot><tr className="bg-gray-50 text-sm font-bold">
              <td className="px-6 py-2.5">Total</td><td className="px-3 py-2.5 text-right">{rows.length}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{money(t.sales)}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(t.exempt)}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(t.taxable)}</td><td />
              <td className="px-3 py-2.5 text-right tabular-nums">{money(t.state)}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(t.county)}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(t.city)}</td><td className="px-6 py-2.5 text-right tabular-nums">{money(t.total)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </ReportFrame>
  );
}

export const threshold1099 = (year: number) => (year >= 2026 ? 2000 : 600);

export interface Row1099 { vendor: Vendor; paid: number; card: number; form: 'NEC' | 'MISC' }

export function use1099(year: number) {
  const { refreshKey } = usePortal();
  const [rows, setRows] = useState<Row1099[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setRows(null);
    Promise.all([
      supabase.from('acct_vendors').select('*').eq('is_1099', true).order('name'),
      fetchAllRows<{ vendor_id: string; amount: number; method: string }>((f, t) => supabase
        .from('acct_bill_payments').select('vendor_id, amount, method')
        .gte('pay_date', `${year}-01-01`).lte('pay_date', `${year}-12-31`)
        .order('id').range(f, t) as unknown as PromiseLike<{ data: { vendor_id: string; amount: number; method: string }[] | null; error: unknown }>),
    ]).then(([v, p]) => {
      if (v.error) { setError(errMsg(v.error)); return; }
      const paid = new Map<string, { paid: number; card: number }>();
      for (const r of p) {
        if (r.method === 'credit') continue;
        const x = paid.get(r.vendor_id) ?? { paid: 0, card: 0 };
        if (r.method === 'card') x.card += Number(r.amount); else x.paid += Number(r.amount);
        paid.set(r.vendor_id, x);
      }
      setRows(((v.data ?? []) as Vendor[]).map(vendor => ({
        vendor, ...(paid.get(vendor.id) ?? { paid: 0, card: 0 }),
        form: (vendor.vendor_type === 'landlord' ? 'MISC' : 'NEC') as Row1099['form'],
      })).sort((a, b) => b.paid - a.paid));
    }).catch(e => setError(errMsg(e)));
  }, [year, refreshKey]);
  return { rows, error };
}

export function Vendor1099Table({ year, rows }: { year: number; rows: Row1099[] }) {
  const min = threshold1099(year);
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <th className="text-left px-6 py-2.5">Vendor</th><th className="text-left px-3 py-2.5">Tax ID</th><th className="text-left px-3 py-2.5">Form</th><th className="text-right px-3 py-2.5">Paid by check / ACH</th><th className="text-right px-3 py-2.5">Paid by card</th><th className="text-right px-6 py-2.5">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(r => {
            const needs = r.paid >= min;
            return (
              <tr key={r.vendor.id} className="text-sm hover:bg-gray-50">
                <td className="px-6 py-2.5"><p className="font-medium text-gray-900">{r.vendor.name}</p><p className="text-xs text-gray-500 capitalize">{r.vendor.entity_type ?? ''}{r.vendor.city ? ` · ${r.vendor.city}, ${r.vendor.state ?? ''}` : ''}</p></td>
                <td className="px-3 py-2.5 font-mono text-xs">{r.vendor.tax_id ? `•••-••-${r.vendor.tax_id.slice(-4)}` : <span className="inline-flex items-center gap-1 text-amber-700 font-sans"><AlertTriangle className="w-3.5 h-3.5" /> Missing W-9</span>}</td>
                <td className="px-3 py-2.5 text-gray-600">1099-{r.form}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">{money(r.paid)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{r.card ? money(r.card) : '-'}</td>
                <td className="px-6 py-2.5 text-right">{needs ? (r.vendor.tax_id ? <Badge tone="blue">File 1099</Badge> : <Badge tone="red">File 1099 · need W-9</Badge>) : <Badge>Under {money(min).replace('.00', '')}</Badge>}</td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-500">No vendors are marked for 1099 reporting.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function csv1099(year: number, rows: Row1099[]) {
  downloadCsv(`1099-summary-${year}`, [['Vendor', 'Tax ID', 'Entity', 'Address', 'City', 'State', 'ZIP', 'Form', 'Box 1 amount', 'Paid by card (not reported)', 'Must file'],
    ...rows.map(r => [r.vendor.name, r.vendor.tax_id, r.vendor.entity_type, r.vendor.address, r.vendor.city, r.vendor.state, r.vendor.zip, `1099-${r.form}`, r.paid.toFixed(2), r.card.toFixed(2), r.paid >= threshold1099(year) ? 'Yes' : 'No'])]);
}

export function Summary1099({ onBack, params }: ReportProps) {
  const [year, setYear] = useState(Number(params.year) || new Date().getFullYear() - (new Date().getMonth() < 2 ? 1 : 0));
  const { rows, error } = use1099(year);
  const years = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);
  return (
    <ReportFrame
      title="1099 Summary"
      period={`Calendar year ${year}`}
      onBack={onBack}
      controls={<select value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-auto`}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>}
      onCsv={rows ? () => csv1099(year, rows) : undefined}
      note={`Vendors paid ${money(threshold1099(year))} or more by check or ACH in ${year} need a 1099. Card payments are reported by the card company, so they are left out.`}
    >
      <ErrorBanner message={error} />
      {!rows ? <Loading /> : <Vendor1099Table year={year} rows={rows} />}
    </ReportFrame>
  );
}
