import { useEffect, useMemo, useState } from 'react';
import { usePortal } from '../../lib/context';
import { errMsg, fetchMonthly, fetchTotals } from '../../lib/api';
import { downloadCsv, fmtDate, monthLabel, parseISO, rangeLabel, toISO, todayISO, type DateRange } from '../../lib/format';
import type { Account, AccountTotal } from '../../lib/types';
import { DateRangeBar, ErrorBanner, inputCls, Loading, Tabs } from '../../components/ui';
import { initialRange, ReportFrame, statementCsv, StatementTable, type ReportProps, type StatementRow } from './ReportFrame';

type Totals = Map<string, AccountTotal>;
const cr = (t: Totals, id: string) => { const r = t.get(id); return r ? r.credit - r.debit : 0; };
const dr = (t: Totals, id: string) => -cr(t, id);
const nz = (vals: number[]) => vals.some(v => Math.abs(v) >= 0.005);
const dayBefore = (iso: string) => toISO(new Date(parseISO(iso).getTime() - 86400000));

function plRows(accounts: Account[], cols: Totals[]): StatementRow[] {
  const rows: StatementRow[] = [];
  const sum = (list: Account[], f: (t: Totals, id: string) => number) => cols.map(t => list.reduce((s, a) => s + f(t, a.id), 0));
  const block = (label: string, list: Account[], f: (t: Totals, id: string) => number) => {
    rows.push({ kind: 'section', label });
    for (const a of list) {
      const values = cols.map(t => f(t, a.id));
      if (nz(values)) rows.push({ kind: 'row', label: `${a.code} ${a.name}`, values, accountId: a.id, indent: 1 });
    }
    const total = sum(list, f);
    rows.push({ kind: 'total', label: `Total ${label}`, values: total, indent: 1 });
    return total;
  };
  const inc = accounts.filter(a => a.type === 'income' && a.subtype !== 'other_income');
  const cogs = accounts.filter(a => a.type === 'cogs');
  const exp = accounts.filter(a => a.type === 'expense' && a.subtype !== 'other_expense');
  const oi = accounts.filter(a => a.type === 'income' && a.subtype === 'other_income');
  const oe = accounts.filter(a => a.type === 'expense' && a.subtype === 'other_expense');
  const ti = block('Income', inc, cr);
  const tc = block('Cost of Goods Sold', cogs, dr);
  const gp = ti.map((v, i) => v - tc[i]);
  rows.push({ kind: 'total', label: 'Gross Profit', values: gp, strong: true });
  const te = block('Expenses', exp, dr);
  const noi = gp.map((v, i) => v - te[i]);
  rows.push({ kind: 'total', label: 'Net Operating Income', values: noi, strong: true });
  const toi = block('Other Income', oi, cr);
  const toe = block('Other Expenses', oe, dr);
  rows.push({ kind: 'total', label: 'Net Income', values: noi.map((v, i) => v + toi[i] - toe[i]), strong: true });
  return rows;
}

export function ProfitLoss({ onBack, drill, params }: ReportProps) {
  const { accounts, refreshKey } = usePortal();
  const [range, setRange] = useState<DateRange>(initialRange(params));
  const [mode, setMode] = useState<'total' | 'month' | 'compare'>('total');
  const [data, setData] = useState<{ columns: string[]; ranges: [string, string][]; rows: StatementRow[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    (async () => {
      try {
        if (mode === 'total') {
          const t = await fetchTotals(range.from, range.to);
          setData({ columns: ['Total'], ranges: [[range.from, range.to]], rows: plRows(accounts, [t]) });
        } else if (mode === 'compare') {
          const py = (s: string) => `${Number(s.slice(0, 4)) - 1}${s.slice(4)}`;
          const [t, p] = await Promise.all([fetchTotals(range.from, range.to), fetchTotals(py(range.from), py(range.to))]);
          const rows = plRows(accounts, [t, p]).map(r => (r.kind === 'section' ? r : { ...r, values: [...r.values, r.values[0] - r.values[1]] }));
          setData({ columns: ['This period', 'Prior year', 'Change'], ranges: [[range.from, range.to], [py(range.from), py(range.to)]], rows });
        } else {
          const monthly = await fetchMonthly(range.from, range.to);
          const months: string[] = [];
          for (let d = new Date(parseISO(range.from).getFullYear(), parseISO(range.from).getMonth(), 1); toISO(d) <= range.to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(toISO(d));
          const cols: Totals[] = months.map(() => new Map());
          const all: Totals = new Map();
          for (const m of monthly) {
            const i = months.indexOf(m.month.slice(0, 10));
            if (i < 0) continue;
            cols[i].set(m.account_id, m);
            const prev = all.get(m.account_id) ?? { account_id: m.account_id, debit: 0, credit: 0 };
            all.set(m.account_id, { ...prev, debit: prev.debit + m.debit, credit: prev.credit + m.credit });
          }
          const ranges = months.map(m => { const d = parseISO(m); return [m, toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))] as [string, string]; });
          ranges.push([range.from, range.to]);
          setData({ columns: [...months.map(m => monthLabel(m)), 'Total'], ranges, rows: plRows(accounts, [...cols, all]) });
        }
      } catch (e) { setError(errMsg(e)); }
    })();
  }, [accounts, range, mode, refreshKey]);

  return (
    <ReportFrame
      title="Profit and Loss"
      period={rangeLabel(range)}
      onBack={onBack}
      onCsv={data ? () => downloadCsv(`profit-and-loss-${range.from}-${range.to}`, statementCsv(data.columns, data.rows)) : undefined}
      controls={<>
        <DateRangeBar range={range} onChange={setRange} />
        <Tabs value={mode} onChange={setMode} tabs={[{ id: 'total', label: 'Total' }, { id: 'month', label: 'By month' }, { id: 'compare', label: 'vs. prior year' }]} />
      </>}
    >
      <ErrorBanner message={error} />
      {!data ? <Loading /> : (
        <StatementTable columns={data.columns} rows={data.rows} onDrill={(id, j) => { const r = data.ranges[j]; if (r) drill(id, r[0], r[1]); }} />
      )}
    </ReportFrame>
  );
}

async function loadBalances(asOf: string) {
  const fyStart = `${asOf.slice(0, 4)}-01-01`;
  const [all, prior] = await Promise.all([fetchTotals(null, asOf), fetchTotals(null, dayBefore(fyStart))]);
  return { all, prior, fyStart };
}

function plAccounts(accounts: Account[]) {
  return accounts.filter(a => ['income', 'cogs', 'expense'].includes(a.type));
}

export function BalanceSheet({ onBack, drill, params }: ReportProps) {
  const { accounts, refreshKey } = usePortal();
  const [asOf, setAsOf] = useState(params.to ?? todayISO());
  const [data, setData] = useState<{ rows: StatementRow[]; fyStart: string; balanced: boolean } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    loadBalances(asOf).then(({ all, prior, fyStart }) => {
      const rows: StatementRow[] = [];
      const pl = plAccounts(accounts);
      const priorNI = pl.reduce((s, a) => s + cr(prior, a.id), 0);
      const netIncome = pl.reduce((s, a) => s + cr(all, a.id), 0) - priorNI;
      const group = (label: string, list: Account[], f: (t: Totals, id: string) => number, indent = 1) => {
        if (!list.length) return 0;
        rows.push({ kind: 'section', label });
        let total = 0;
        for (const a of list) {
          const v = f(all, a.id);
          total += v;
          if (Math.abs(v) >= 0.005) rows.push({ kind: 'row', label: `${a.code} ${a.name}`, values: [v], accountId: a.id, indent });
        }
        rows.push({ kind: 'total', label: `Total ${label}`, values: [total], indent });
        return total;
      };
      const of = (type: string, subs: string[]) => accounts.filter(a => a.type === type && subs.includes(a.subtype ?? ''));
      rows.push({ kind: 'section', label: 'ASSETS' });
      const ta = group('Bank Accounts', of('asset', ['bank']), dr)
        + group('Current Assets', of('asset', ['current', 'receivable']), dr)
        + group('Fixed Assets', of('asset', ['fixed']), dr);
      rows.push({ kind: 'total', label: 'TOTAL ASSETS', values: [ta], strong: true });
      rows.push({ kind: 'section', label: 'LIABILITIES AND EQUITY' });
      const tl = group('Current Liabilities', of('liability', ['payable', 'credit_card', 'current']), cr)
        + group('Long-Term Liabilities', of('liability', ['long_term']), cr);
      rows.push({ kind: 'total', label: 'Total Liabilities', values: [tl], indent: 1 });
      rows.push({ kind: 'section', label: 'Equity' });
      let te = 0;
      for (const a of accounts.filter(x => x.type === 'equity')) {
        const v = a.code === '3900' ? cr(all, a.id) + priorNI : cr(all, a.id);
        te += v;
        if (Math.abs(v) >= 0.005 || a.code === '3900') rows.push({ kind: 'row', label: `${a.code} ${a.name}`, values: [v], accountId: a.code === '3900' ? undefined : a.id, indent: 1 });
      }
      rows.push({ kind: 'row', label: 'Net Income', values: [netIncome], indent: 1, muted: true });
      te += netIncome;
      rows.push({ kind: 'total', label: 'Total Equity', values: [te], indent: 1 });
      rows.push({ kind: 'total', label: 'TOTAL LIABILITIES AND EQUITY', values: [tl + te], strong: true });
      setData({ rows, fyStart, balanced: Math.abs(ta - tl - te) < 0.01 });
    }).catch(e => setError(errMsg(e)));
  }, [accounts, asOf, refreshKey]);

  return (
    <ReportFrame
      title="Balance Sheet"
      period={`As of ${fmtDate(asOf)}`}
      onBack={onBack}
      onCsv={data ? () => downloadCsv(`balance-sheet-${asOf}`, statementCsv(['Total'], data.rows)) : undefined}
      controls={<label className="flex items-center gap-2 text-sm text-gray-600">As of <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className={`${inputCls} w-auto`} /></label>}
      note={data && <>Retained earnings includes all profit from years before {data.fyStart.slice(0, 4)}. {data.balanced ? 'Assets equal liabilities plus equity.' : <span className="text-red-600 font-medium">The books are out of balance. Review the trial balance.</span>}</>}
    >
      <ErrorBanner message={error} />
      {!data ? <Loading /> : <StatementTable columns={['Total']} rows={data.rows} onDrill={id => drill(id, '2000-01-01', asOf)} />}
    </ReportFrame>
  );
}

export function CashFlow({ onBack, drill, params }: ReportProps) {
  const { accounts, refreshKey } = usePortal();
  const [range, setRange] = useState<DateRange>(initialRange(params));
  const [data, setData] = useState<{ rows: StatementRow[]; check: boolean } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    Promise.all([fetchTotals(range.from, range.to), fetchTotals(null, dayBefore(range.from)), fetchTotals(null, range.to)]).then(([t, before, after]) => {
      const rows: StatementRow[] = [];
      const ni = plAccounts(accounts).reduce((s, a) => s + cr(t, a.id), 0);
      const banks = accounts.filter(a => a.subtype === 'bank');
      const isOperating = (a: Account) =>
        (a.type === 'asset' && ['current', 'receivable'].includes(a.subtype ?? '')) || a.code === '1590' ||
        (a.type === 'liability' && ['payable', 'credit_card', 'current'].includes(a.subtype ?? ''));
      const isInvesting = (a: Account) => a.type === 'asset' && a.subtype === 'fixed' && a.code !== '1590';
      const isFinancing = (a: Account) => a.type === 'equity' || (a.type === 'liability' && a.subtype === 'long_term');
      const section = (label: string, list: Account[], lead?: { label: string; value: number }) => {
        rows.push({ kind: 'section', label });
        let total = lead?.value ?? 0;
        if (lead) rows.push({ kind: 'row', label: lead.label, values: [lead.value], indent: 1 });
        for (const a of list) {
          const v = cr(t, a.id);
          total += v;
          if (Math.abs(v) >= 0.005) rows.push({ kind: 'row', label: a.code === '1590' ? `${a.code} Depreciation (non-cash)` : `${a.code} ${a.name}`, values: [v], accountId: a.id, indent: 1 });
        }
        rows.push({ kind: 'total', label: `Net cash from ${label.toLowerCase()}`, values: [total], indent: 1 });
        return total;
      };
      const op = section('Operating Activities', accounts.filter(isOperating), { label: 'Net Income', value: ni });
      const inv = section('Investing Activities', accounts.filter(isInvesting));
      const fin = section('Financing Activities', accounts.filter(isFinancing));
      const change = op + inv + fin;
      const begin = banks.reduce((s, a) => s + dr(before, a.id), 0);
      const end = banks.reduce((s, a) => s + dr(after, a.id), 0);
      rows.push({ kind: 'total', label: 'Net change in cash', values: [change], strong: true });
      rows.push({ kind: 'row', label: 'Cash at beginning of period', values: [begin] });
      rows.push({ kind: 'total', label: 'Cash at end of period', values: [begin + change], strong: true });
      setData({ rows, check: Math.abs(begin + change - end) < 0.01 });
    }).catch(e => setError(errMsg(e)));
  }, [accounts, range, refreshKey]);

  return (
    <ReportFrame
      title="Statement of Cash Flows"
      period={rangeLabel(range)}
      onBack={onBack}
      onCsv={data ? () => downloadCsv(`cash-flow-${range.from}-${range.to}`, statementCsv(['Total'], data.rows)) : undefined}
      controls={<DateRangeBar range={range} onChange={setRange} />}
      note={data && (data.check ? 'Ending cash agrees with the bank account balances.' : <span className="text-red-600">Ending cash does not agree with bank balances.</span>)}
    >
      <ErrorBanner message={error} />
      {!data ? <Loading /> : <StatementTable columns={['Total']} rows={data.rows} onDrill={id => drill(id, range.from, range.to)} />}
    </ReportFrame>
  );
}

export function TrialBalance({ onBack, drill, params }: ReportProps) {
  const { accounts, refreshKey } = usePortal();
  const [asOf, setAsOf] = useState(params.to ?? todayISO());
  const [data, setData] = useState<{ rows: { a: Account; d: number; c: number }[]; fyStart: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    loadBalances(asOf).then(({ all, prior, fyStart }) => {
      const priorNI = plAccounts(accounts).reduce((s, a) => s + cr(prior, a.id), 0);
      const rows = accounts.map(a => {
        const isPl = ['income', 'cogs', 'expense'].includes(a.type);
        let net = dr(all, a.id) - (isPl ? dr(prior, a.id) : 0);
        if (a.code === '3900') net -= priorNI;
        return { a, d: net > 0 ? net : 0, c: net < 0 ? -net : 0 };
      }).filter(r => r.d >= 0.005 || r.c >= 0.005);
      setData({ rows, fyStart });
    }).catch(e => setError(errMsg(e)));
  }, [accounts, asOf, refreshKey]);

  const totals = useMemo(() => data?.rows.reduce((s, r) => ({ d: s.d + r.d, c: s.c + r.c }), { d: 0, c: 0 }), [data]);
  const fmt = (v: number) => (v ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

  return (
    <ReportFrame
      title="Trial Balance"
      period={`As of ${fmtDate(asOf)}`}
      onBack={onBack}
      onCsv={data ? () => downloadCsv(`trial-balance-${asOf}`, [['Account', 'Debit', 'Credit'], ...data.rows.map(r => [`${r.a.code} ${r.a.name}`, r.d.toFixed(2), r.c.toFixed(2)]), ['Total', totals!.d.toFixed(2), totals!.c.toFixed(2)]]) : undefined}
      controls={<label className="flex items-center gap-2 text-sm text-gray-600">As of <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className={`${inputCls} w-auto`} /></label>}
      note={data && totals && (Math.abs(totals.d - totals.c) < 0.01 ? 'Debits equal credits.' : <span className="text-red-600 font-medium">Debits and credits do not match.</span>)}
    >
      <ErrorBanner message={error} />
      {!data || !totals ? <Loading /> : (
        <table className="w-full">
          <thead><tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500"><th className="text-left px-6 py-2.5">Account</th><th className="text-right px-6 py-2.5">Debit</th><th className="text-right px-6 py-2.5">Credit</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {data.rows.map(r => {
              const isPl = ['income', 'cogs', 'expense'].includes(r.a.type);
              const from = isPl ? data.fyStart : '2000-01-01';
              return (
                <tr key={r.a.id} className="hover:bg-blue-50/40">
                  <td className="px-6 py-1.5 text-sm text-gray-700">{r.a.code} {r.a.name}</td>
                  <td className="px-6 py-1.5 text-sm text-right tabular-nums"><button onClick={() => drill(r.a.id, from, asOf)} className="text-blue-700 hover:underline">{fmt(r.d)}</button></td>
                  <td className="px-6 py-1.5 text-sm text-right tabular-nums"><button onClick={() => drill(r.a.id, from, asOf)} className="text-blue-700 hover:underline">{fmt(r.c)}</button></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="bg-gray-50 font-bold text-sm"><td className="px-6 py-2.5">Total</td><td className="px-6 py-2.5 text-right tabular-nums border-t-2 border-double border-gray-300">{fmt(totals.d)}</td><td className="px-6 py-2.5 text-right tabular-nums border-t-2 border-double border-gray-300">{fmt(totals.c)}</td></tr></tfoot>
        </table>
      )}
    </ReportFrame>
  );
}
