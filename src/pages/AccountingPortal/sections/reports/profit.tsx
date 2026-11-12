import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg, fetchAllRows, fetchTotals } from '../../lib/api';
import { downloadCsv, money, rangeLabel, type DateRange } from '../../lib/format';
import { DateRangeBar, ErrorBanner, Loading, Tabs } from '../../components/ui';
import { initialRange, ReportFrame, type ReportProps } from './ReportFrame';

interface CustProfit { company_id: string; company_name: string; income: number; cogs: number; fees: number }

function useCustomerProfit(range: DateRange) {
  const { refreshKey } = usePortal();
  const [rows, setRows] = useState<CustProfit[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setRows(null);
    supabase.rpc('acct_customer_profit', { p_from: range.from, p_to: range.to }).then(({ data, error }) => {
      if (error) { setError(errMsg(error)); return; }
      setRows(((data ?? []) as CustProfit[]).map(r => ({ ...r, income: Number(r.income), cogs: Number(r.cogs), fees: Number(r.fees) })));
    });
  }, [range, refreshKey]);
  return { rows, error };
}

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : '-');

export function ProfitByCustomer({ onBack, params }: ReportProps) {
  const { onViewCustomer } = usePortal();
  const [range, setRange] = useState<DateRange>(initialRange(params));
  const [sort, setSort] = useState<'profit' | 'income' | 'margin'>('profit');
  const { rows, error } = useCustomerProfit(range);

  const list = useMemo(() => (rows ?? []).map(r => ({ ...r, profit: r.income - r.cogs - r.fees })).sort((a, b) =>
    sort === 'margin' ? (b.income ? b.profit / b.income : -1) - (a.income ? a.profit / a.income : -1) : b[sort] - a[sort]), [rows, sort]);
  const t = list.reduce((s, r) => ({ income: s.income + r.income, cogs: s.cogs + r.cogs, fees: s.fees + r.fees, profit: s.profit + r.profit }), { income: 0, cogs: 0, fees: 0, profit: 0 });

  return (
    <ReportFrame
      title="Profit by Customer"
      period={rangeLabel(range)}
      onBack={onBack}
      controls={<>
        <DateRangeBar range={range} onChange={setRange} />
        <Tabs value={sort} onChange={setSort} tabs={[{ id: 'profit', label: 'Most profit' }, { id: 'income', label: 'Most income' }, { id: 'margin', label: 'Best margin' }]} />
      </>}
      onCsv={rows ? () => downloadCsv(`profit-by-customer-${range.from}-${range.to}`, [['Customer', 'Income', 'Job costs', 'Card fees', 'Profit', 'Margin'], ...list.map(r => [r.company_name, r.income.toFixed(2), r.cogs.toFixed(2), r.fees.toFixed(2), r.profit.toFixed(2), pct(r.profit, r.income)])]) : undefined}
      note="Job costs include equipment cost and subcontractor bills tagged to the customer. Card fees are processing fees on their payments."
    >
      <ErrorBanner message={error} />
      {!rows ? <Loading /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="text-left px-6 py-2.5">Customer</th><th className="text-right px-4 py-2.5">Income</th><th className="text-right px-4 py-2.5">Job costs</th><th className="text-right px-4 py-2.5">Card fees</th><th className="text-right px-4 py-2.5">Profit</th><th className="text-right px-6 py-2.5 w-48">Margin</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(r => {
                const m = r.income ? r.profit / r.income : 0;
                return (
                  <tr key={r.company_id} className="hover:bg-gray-50">
                    <td className="px-6 py-2 text-sm"><button onClick={() => onViewCustomer(r.company_id)} className="font-medium text-gray-900 hover:text-blue-700 hover:underline text-left">{r.company_name}</button></td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums">{money(r.income)}</td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums text-gray-600">{money(r.cogs)}</td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums text-gray-600">{money(r.fees)}</td>
                    <td className={`px-4 py-2 text-sm text-right tabular-nums font-semibold ${r.profit < 0 ? 'text-red-600' : 'text-gray-900'}`}>{money(r.profit)}</td>
                    <td className="px-6 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden no-print"><div className={`h-full rounded-full ${m < 0 ? 'bg-red-500' : m < 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.abs(m) * 100)}%` }} /></div>
                        <span className="text-sm tabular-nums text-gray-700 w-14 text-right">{pct(r.profit, r.income)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-500">No customer activity in this period.</td></tr>}
            </tbody>
            <tfoot><tr className="bg-gray-50 text-sm font-bold">
              <td className="px-6 py-2.5">Total ({list.length} customers)</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{money(t.income)}</td><td className="px-4 py-2.5 text-right tabular-nums">{money(t.cogs)}</td><td className="px-4 py-2.5 text-right tabular-nums">{money(t.fees)}</td><td className="px-4 py-2.5 text-right tabular-nums">{money(t.profit)}</td><td className="px-6 py-2.5 text-right tabular-nums">{pct(t.profit, t.income)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </ReportFrame>
  );
}

const SERVICES: { name: string; income: string[]; costs: string[] }[] = [
  { name: 'Equipment sales', income: ['4000'], costs: ['5000'] },
  { name: 'Installation and service labor', income: ['4100'], costs: ['5100', '5200'] },
  { name: 'Monitoring and service plans', income: ['4200'], costs: [] },
  { name: 'Card surcharges', income: ['4300'], costs: ['6100'] },
  { name: 'Other income', income: ['4800'], costs: [] },
  { name: 'Discounts and refunds', income: ['4900'], costs: [] },
];

export function ProfitByService({ onBack, drill, params }: ReportProps) {
  const { byCode, refreshKey } = usePortal();
  const [range, setRange] = useState<DateRange>(initialRange(params));
  const [rows, setRows] = useState<{ name: string; income: number; costs: number; incomeId?: string; costId?: string }[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    fetchTotals(range.from, range.to).then(t => {
      const val = (code: string, credit: boolean) => { const a = byCode.get(code); const r = a && t.get(a.id); return r ? (credit ? r.credit - r.debit : r.debit - r.credit) : 0; };
      setRows(SERVICES.map(s => ({
        name: s.name,
        income: s.income.reduce((x, c) => x + val(c, true), 0),
        costs: s.costs.reduce((x, c) => x + val(c, false), 0),
        incomeId: byCode.get(s.income[0])?.id,
        costId: s.costs[0] ? byCode.get(s.costs[0])?.id : undefined,
      })));
    }).catch(e => setError(errMsg(e)));
  }, [range, byCode, refreshKey]);

  const totalIncome = (rows ?? []).reduce((s, r) => s + r.income, 0);
  const totalCosts = (rows ?? []).reduce((s, r) => s + r.costs, 0);

  return (
    <ReportFrame
      title="Profit by Service"
      period={rangeLabel(range)}
      onBack={onBack}
      controls={<DateRangeBar range={range} onChange={setRange} />}
      onCsv={rows ? () => downloadCsv(`profit-by-service-${range.from}-${range.to}`, [['Service', 'Income', 'Direct costs', 'Profit', 'Margin', 'Share of income'], ...rows.map(r => [r.name, r.income.toFixed(2), r.costs.toFixed(2), (r.income - r.costs).toFixed(2), pct(r.income - r.costs, r.income), pct(r.income, totalIncome)])]) : undefined}
      note="Direct costs are the costs tied to each kind of work: equipment cost for equipment, subcontractors and job supplies for labor, and processing fees for surcharges."
    >
      <ErrorBanner message={error} />
      {!rows ? <Loading /> : (
        <table className="w-full">
          <thead><tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="text-left px-6 py-2.5">Service</th><th className="text-right px-4 py-2.5">Income</th><th className="text-right px-4 py-2.5">Direct costs</th><th className="text-right px-4 py-2.5">Profit</th><th className="text-right px-4 py-2.5">Margin</th><th className="text-right px-6 py-2.5">Share</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => (
              <tr key={r.name} className="hover:bg-gray-50">
                <td className="px-6 py-2.5 text-sm font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-2.5 text-sm text-right tabular-nums">{r.incomeId ? <button onClick={() => drill(r.incomeId!, range.from, range.to)} className="text-blue-700 hover:underline">{money(r.income)}</button> : money(r.income)}</td>
                <td className="px-4 py-2.5 text-sm text-right tabular-nums">{r.costId ? <button onClick={() => drill(r.costId!, range.from, range.to)} className="text-blue-700 hover:underline">{money(r.costs)}</button> : <span className="text-gray-400">-</span>}</td>
                <td className={`px-4 py-2.5 text-sm text-right tabular-nums font-semibold ${r.income - r.costs < 0 ? 'text-red-600' : 'text-gray-900'}`}>{money(r.income - r.costs)}</td>
                <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-600">{pct(r.income - r.costs, r.income)}</td>
                <td className="px-6 py-2.5 text-sm text-right tabular-nums text-gray-600">{pct(r.income, totalIncome)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-gray-50 text-sm font-bold">
            <td className="px-6 py-2.5">Total</td><td className="px-4 py-2.5 text-right tabular-nums">{money(totalIncome)}</td><td className="px-4 py-2.5 text-right tabular-nums">{money(totalCosts)}</td><td className="px-4 py-2.5 text-right tabular-nums">{money(totalIncome - totalCosts)}</td><td className="px-4 py-2.5 text-right tabular-nums">{pct(totalIncome - totalCosts, totalIncome)}</td><td className="px-6 py-2.5" />
          </tr></tfoot>
        </table>
      )}
    </ReportFrame>
  );
}

export function ProfitByOffice({ onBack, params }: ReportProps) {
  const [range, setRange] = useState<DateRange>(initialRange(params));
  const { rows, error } = useCustomerProfit(range);
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);
  const [assign, setAssign] = useState<Map<string, string> | null>(null);
  const [err2, setErr2] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('offices').select('id, name').order('name'),
      fetchAllRows<{ company_id: string; office_id: string }>((f, t) => supabase.from('revenue_entries').select('company_id, office_id').not('office_id', 'is', null).not('company_id', 'is', null).range(f, t) as unknown as PromiseLike<{ data: { company_id: string; office_id: string }[] | null; error: unknown }>),
    ]).then(([o, re]) => {
      if (o.error) { setErr2(errMsg(o.error)); return; }
      setOffices(o.data ?? []);
      const counts = new Map<string, Map<string, number>>();
      for (const r of re) {
        const m = counts.get(r.company_id) ?? new Map<string, number>();
        m.set(r.office_id, (m.get(r.office_id) ?? 0) + 1);
        counts.set(r.company_id, m);
      }
      const a = new Map<string, string>();
      for (const [c, m] of counts) a.set(c, [...m.entries()].sort((x, y) => y[1] - x[1])[0][0]);
      setAssign(a);
    }).catch(e => setErr2(errMsg(e)));
  }, []);

  const list = useMemo(() => {
    if (!rows || !assign) return null;
    const m = new Map<string, { name: string; customers: number; income: number; costs: number }>();
    const nameOf = new Map(offices.map(o => [o.id, o.name]));
    for (const r of rows) {
      const id = assign.get(r.company_id) ?? 'none';
      const g = m.get(id) ?? { name: nameOf.get(id) ?? 'Not tied to an office', customers: 0, income: 0, costs: 0 };
      g.customers++; g.income += r.income; g.costs += r.cogs + r.fees;
      m.set(id, g);
    }
    return [...m.entries()].sort((a, b) => (a[0] === 'none' ? 1 : b[0] === 'none' ? -1 : b[1].income - a[1].income));
  }, [rows, assign, offices]);

  const t = (list ?? []).reduce((s, [, g]) => ({ income: s.income + g.income, costs: s.costs + g.costs, customers: s.customers + g.customers }), { income: 0, costs: 0, customers: 0 });

  return (
    <ReportFrame
      title="Profit by Office"
      period={rangeLabel(range)}
      onBack={onBack}
      controls={<DateRangeBar range={range} onChange={setRange} />}
      onCsv={list ? () => downloadCsv(`profit-by-office-${range.from}-${range.to}`, [['Office', 'Customers', 'Income', 'Job costs', 'Profit', 'Margin'], ...list.map(([, g]) => [g.name, g.customers, g.income.toFixed(2), g.costs.toFixed(2), (g.income - g.costs).toFixed(2), pct(g.income - g.costs, g.income)])]) : undefined}
      note="Each customer is counted under the office that has booked most of their sales. Overhead like rent and payroll is not split between offices."
    >
      <ErrorBanner message={error || err2} />
      {!list ? <Loading /> : (
        <table className="w-full">
          <thead><tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="text-left px-6 py-2.5">Office</th><th className="text-right px-4 py-2.5">Customers</th><th className="text-right px-4 py-2.5">Income</th><th className="text-right px-4 py-2.5">Job costs</th><th className="text-right px-4 py-2.5">Profit</th><th className="text-right px-6 py-2.5">Margin</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(([id, g]) => (
              <tr key={id} className="hover:bg-gray-50">
                <td className={`px-6 py-2.5 text-sm font-medium ${id === 'none' ? 'text-gray-500 italic' : 'text-gray-900'}`}>{g.name}</td>
                <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-600">{g.customers}</td>
                <td className="px-4 py-2.5 text-sm text-right tabular-nums">{money(g.income)}</td>
                <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-600">{money(g.costs)}</td>
                <td className="px-4 py-2.5 text-sm text-right tabular-nums font-semibold">{money(g.income - g.costs)}</td>
                <td className="px-6 py-2.5 text-sm text-right tabular-nums text-gray-600">{pct(g.income - g.costs, g.income)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-gray-50 text-sm font-bold">
            <td className="px-6 py-2.5">Total</td><td className="px-4 py-2.5 text-right tabular-nums">{t.customers}</td><td className="px-4 py-2.5 text-right tabular-nums">{money(t.income)}</td><td className="px-4 py-2.5 text-right tabular-nums">{money(t.costs)}</td><td className="px-4 py-2.5 text-right tabular-nums">{money(t.income - t.costs)}</td><td className="px-6 py-2.5 text-right tabular-nums">{pct(t.income - t.costs, t.income)}</td>
          </tr></tfoot>
        </table>
      )}
    </ReportFrame>
  );
}
