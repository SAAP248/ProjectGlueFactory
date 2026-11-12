import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Target } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePortal } from '../lib/context';
import { errMsg, fetchMonthly } from '../lib/api';
import { money0, round2 } from '../lib/format';
import type { Account, Budget, MonthlyTotal } from '../lib/types';
import { btnSecondary, Card, ErrorBanner, Loading, PageHeader, StatCard, Tabs } from '../components/ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GROUPS: { type: Account['type']; label: string; sign: 1 | -1 }[] = [
  { type: 'income', label: 'Income', sign: 1 },
  { type: 'cogs', label: 'Cost of jobs', sign: -1 },
  { type: 'expense', label: 'Operating expenses', sign: -1 },
];

export default function Budgets() {
  const { accounts, go, notify, refreshKey } = usePortal();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [view, setView] = useState<'compare' | 'edit'>('compare');
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [actuals, setActuals] = useState<MonthlyTotal[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, m] = await Promise.all([
        supabase.from('acct_budgets').select('*').eq('fiscal_year', year),
        fetchMonthly(`${year}-01-01`, `${year}-12-31`),
      ]);
      if (b.error) throw b.error;
      setBudgets(((b.data ?? []) as Budget[]).map(x => ({ ...x, amount: Number(x.amount) })));
      setActuals(m);
    } catch (e) { setError(errMsg(e)); }
  }, [year]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const lastMonth = year < thisYear ? 12 : year > thisYear ? 0 : new Date().getMonth() + 1;
  const plAccounts = accounts.filter(a => GROUPS.some(g => g.type === a.type) && a.is_active);

  const { bud, act } = useMemo(() => {
    const bud = new Map<string, number[]>();
    const act = new Map<string, number[]>();
    for (const b of budgets ?? []) {
      const arr = bud.get(b.account_id) ?? Array(12).fill(0);
      arr[b.month - 1] = b.amount;
      bud.set(b.account_id, arr);
    }
    const byId = new Map(accounts.map(a => [a.id, a]));
    for (const m of actuals) {
      const a = byId.get(m.account_id);
      if (!a) continue;
      const arr = act.get(a.id) ?? Array(12).fill(0);
      const v = a.type === 'income' ? m.credit - m.debit : m.debit - m.credit;
      arr[Number(m.month.slice(5, 7)) - 1] += v;
      act.set(a.id, arr);
    }
    return { bud, act };
  }, [budgets, actuals, accounts]);

  if (!budgets) return error ? <ErrorBanner message={error} /> : <Loading />;

  const sum = (arr: number[] | undefined, n = 12) => (arr ?? []).slice(0, n).reduce((s, v) => s + v, 0);
  const net = (src: Map<string, number[]>, n: number) => plAccounts.reduce((s, a) => s + (a.type === 'income' ? 1 : -1) * sum(src.get(a.id), n), 0);
  const budNetYtd = net(bud, lastMonth);
  const actNetYtd = net(act, lastMonth);
  const incomeYtd = (src: Map<string, number[]>) => plAccounts.filter(a => a.type === 'income').reduce((s, a) => s + sum(src.get(a.id), lastMonth), 0);

  async function saveCell(accountId: string, month: number, amount: number) {
    const { error } = await supabase.from('acct_budgets').upsert({ fiscal_year: year, account_id: accountId, month, amount: round2(amount) }, { onConflict: 'fiscal_year,account_id,month' });
    if (error) { setError(errMsg(error)); return; }
    setBudgets(prev => {
      const rest = (prev ?? []).filter(b => !(b.account_id === accountId && b.month === month));
      return [...rest, { id: '', fiscal_year: year, account_id: accountId, month, amount: round2(amount) }];
    });
  }

  async function spread(accountId: string, annual: number) {
    const per = round2(annual / 12);
    const rows = MONTHS.map((_, i) => ({ fiscal_year: year, account_id: accountId, month: i + 1, amount: i === 11 ? round2(annual - per * 11) : per }));
    const { error } = await supabase.from('acct_budgets').upsert(rows, { onConflict: 'fiscal_year,account_id,month' });
    if (error) setError(errMsg(error)); else { notify('Budget spread across the year'); load(); }
  }

  const ytdLabel = lastMonth === 12 ? 'Full year' : lastMonth === 0 ? 'Not started' : `Jan - ${MONTHS[lastMonth - 1]}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Budgets" subtitle="Set a monthly plan for income and spending, then see how the real numbers compare."
        actions={<select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg">{[thisYear - 1, thisYear, thisYear + 1].map(y => <option key={y}>{y}</option>)}</select>} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={`Income vs plan · ${ytdLabel}`} value={money0(incomeYtd(act))} hint={`Plan ${money0(incomeYtd(bud))}`} tone={incomeYtd(act) >= incomeYtd(bud) ? 'emerald' : 'amber'} icon={<Target className="w-5 h-5" />} />
        <StatCard label={`Net profit · ${ytdLabel}`} value={money0(actNetYtd)} hint={`Plan ${money0(budNetYtd)}`} tone={actNetYtd >= budNetYtd ? 'emerald' : 'red'} icon={<Target className="w-5 h-5" />} />
        <StatCard label={`Planned profit · ${year}`} value={money0(net(bud, 12))} hint={`${budgets.length ? 'Across the full year' : 'No budget set yet'}`} tone="blue" icon={<Target className="w-5 h-5" />} />
      </div>

      <Tabs value={view} onChange={setView} tabs={[{ id: 'compare', label: 'Plan vs actual' }, { id: 'edit', label: 'Edit budget' }]} />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {view === 'compare' ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="text-left px-5 py-2.5">Account</th><th className="text-right px-3 py-2.5">Plan {ytdLabel}</th><th className="text-right px-3 py-2.5">Actual</th><th className="text-right px-3 py-2.5">Difference</th><th className="px-5 py-2.5 w-48">Used of plan</th><th className="text-right px-5 py-2.5">Full-year plan</th>
              </tr></thead>
              {GROUPS.map(g => {
                const rows = plAccounts.filter(a => a.type === g.type);
                return (
                  <tbody key={g.type} className="divide-y divide-gray-50">
                    <tr className="bg-gray-50/70"><td colSpan={6} className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{g.label}</td></tr>
                    {rows.map(a => {
                      const p = sum(bud.get(a.id), lastMonth), r = sum(act.get(a.id), lastMonth);
                      const diff = g.sign * (r - p);
                      const pct = p ? Math.min(150, Math.round((r / p) * 100)) : 0;
                      const good = diff >= 0;
                      return (
                        <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => go('reports', { report: 'ledger', account: a.id, from: `${year}-01-01`, to: `${year}-12-31` })}>
                          <td className="px-5 py-2"><span className="text-gray-400 mr-2 tabular-nums">{a.code}</span>{a.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-600">{money0(p)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{money0(r)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-medium ${!p && !r ? 'text-gray-400' : good ? 'text-emerald-700' : 'text-red-600'}`}>{diff >= 0 ? '+' : ''}{money0(diff)}</td>
                          <td className="px-5 py-2">
                            {p ? <div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full rounded-full ${g.sign === 1 ? (pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500') : pct > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct)}%` }} /></div><span className="w-10 text-right text-xs tabular-nums text-gray-500">{pct}%</span></div> : <span className="text-xs text-gray-400">No plan</span>}
                          </td>
                          <td className="px-5 py-2 text-right tabular-nums text-gray-500">{money0(sum(bud.get(a.id)))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
              <tfoot><tr className="border-t-2 border-gray-200 font-semibold">
                <td className="px-5 py-3">Net profit</td><td className="px-3 py-3 text-right tabular-nums">{money0(budNetYtd)}</td><td className="px-3 py-3 text-right tabular-nums">{money0(actNetYtd)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${actNetYtd >= budNetYtd ? 'text-emerald-700' : 'text-red-600'}`}>{actNetYtd - budNetYtd >= 0 ? '+' : ''}{money0(actNetYtd - budNetYtd)}</td><td /><td className="px-5 py-3 text-right tabular-nums">{money0(net(bud, 12))}</td>
              </tr></tfoot>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="text-left px-5 py-2.5 sticky left-0 bg-white min-w-[220px]">Account</th>{MONTHS.map(m => <th key={m} className="text-right px-1.5 py-2.5">{m}</th>)}<th className="text-right px-3 py-2.5">Year</th><th className="px-5 py-2.5" />
              </tr></thead>
              {GROUPS.map(g => (
                <tbody key={g.type} className="divide-y divide-gray-50">
                  <tr className="bg-gray-50/70"><td colSpan={15} className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 sticky left-0">{g.label}</td></tr>
                  {plAccounts.filter(a => a.type === g.type).map(a => {
                    const arr = bud.get(a.id) ?? Array(12).fill(0);
                    return (
                      <tr key={`${a.id}-${year}`}>
                        <td className="px-5 py-1.5 sticky left-0 bg-white whitespace-nowrap"><span className="text-gray-400 mr-2 tabular-nums">{a.code}</span>{a.name}</td>
                        {arr.map((v: number, i: number) => <td key={i} className="px-0.5 py-1"><BudgetCell value={v} onSave={n => saveCell(a.id, i + 1, n)} /></td>)}
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">{money0(sum(arr))}</td>
                        <td className="px-5 py-1.5"><SpreadButton onSpread={n => spread(a.id, n)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

function BudgetCell({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  const [v, setV] = useState(value ? String(Math.round(value)) : '');
  useEffect(() => { setV(value ? String(Math.round(value)) : ''); }, [value]);
  return (
    <input inputMode="decimal" value={v} onChange={e => setV(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0"
      onBlur={() => { if (Number(v || 0) !== Math.round(value)) onSave(Number(v || 0)); }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className="w-[72px] px-1.5 py-1 text-right text-sm tabular-nums rounded-md border border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-transparent" />
  );
}

function SpreadButton({ onSpread }: { onSpread: (annual: number) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState('');
  if (!open) return <button onClick={() => setOpen(true)} title="Enter a yearly amount and split it evenly" className={`${btnSecondary} !px-2 !py-1 text-xs`}><Pencil className="w-3 h-3" /> Yearly</button>;
  return (
    <form className="flex items-center gap-1" onSubmit={e => { e.preventDefault(); if (Number(v) >= 0) onSpread(Number(v)); setOpen(false); setV(''); }}>
      <input autoFocus inputMode="decimal" value={v} onChange={e => setV(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Per year" className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button type="submit" className="text-xs font-semibold text-blue-600">Split</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400">Cancel</button>
    </form>
  );
}
