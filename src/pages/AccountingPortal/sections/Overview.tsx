import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Banknote, BookOpen, CalendarCheck, CreditCard, FileSpreadsheet, HandCoins, Inbox,
  Landmark, Lock, Receipt, TrendingUp, Unlock,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePortal, type Section } from '../lib/context';
import { errMsg, fetchMonthly, fetchTotals } from '../lib/api';
import { addMonths, money, money0, monthLabel, naturalBalance, startOfMonth, toISO, todayISO } from '../lib/format';
import type { Period } from '../lib/types';
import { Card, CardHeader, ErrorBanner, Loading, PageHeader, StatCard } from '../components/ui';

interface Snapshot {
  balances: Map<string, number>;
  months: { month: string; income: number; costs: number }[];
  ytdIncome: number;
  ytdCosts: number;
  bankToReview: number;
  undeposited: number;
  undepositedTotal: number;
  billsDue: number;
  billsDueTotal: number;
  billsOverdue: number;
  periods: Period[];
}

export default function Overview() {
  const { accounts, go, refreshKey } = usePortal();
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const today = todayISO();
        const now = new Date();
        const from12 = toISO(addMonths(startOfMonth(now), -11));
        const yStart = `${now.getFullYear()}-01-01`;
        const in7 = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
        const [totals, monthly, bank, undep, bills, periods] = await Promise.all([
          fetchTotals(null, today),
          fetchMonthly(from12 < yStart ? from12 : yStart, today),
          supabase.from('acct_bank_txns').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.rpc('acct_undeposited_payments'),
          supabase.from('acct_bills').select('total, amount_paid, due_date').eq('kind', 'bill').in('status', ['open', 'partial']),
          supabase.from('acct_periods').select('*').order('period_start', { ascending: false }).limit(6),
        ]);
        for (const r of [bank, undep, bills, periods]) if (r.error) throw r.error;

        const balances = new Map<string, number>();
        for (const a of accounts) {
          const t = totals.get(a.id);
          balances.set(a.code, t ? naturalBalance(a.type, t.debit, t.credit) : 0);
        }
        const typeOf = new Map(accounts.map(a => [a.id, a.type]));
        const byMonth = new Map<string, { income: number; costs: number }>();
        let ytdIncome = 0, ytdCosts = 0;
        for (const m of monthly) {
          const t = typeOf.get(m.account_id);
          if (!t || !['income', 'cogs', 'expense'].includes(t)) continue;
          const key = m.month.slice(0, 7);
          const row = byMonth.get(key) ?? { income: 0, costs: 0 };
          const inc = t === 'income' ? m.credit - m.debit : 0;
          const cost = t !== 'income' ? m.debit - m.credit : 0;
          row.income += inc; row.costs += cost;
          byMonth.set(key, row);
          if (m.month >= yStart) { ytdIncome += inc; ytdCosts += cost; }
        }
        const months = [];
        for (let i = 11; i >= 0; i--) {
          const d = addMonths(startOfMonth(now), -i);
          const key = toISO(d).slice(0, 7);
          months.push({ month: `${key}-01`, ...(byMonth.get(key) ?? { income: 0, costs: 0 }) });
        }
        const openBills = (bills.data ?? []).map(b => ({ bal: Number(b.total) - Number(b.amount_paid), due: b.due_date as string }));
        const dueSoon = openBills.filter(b => b.due <= in7);
        const undepRows = (undep.data ?? []) as { amount: number }[];
        setData({
          balances, months, ytdIncome, ytdCosts,
          bankToReview: bank.count ?? 0,
          undeposited: undepRows.length,
          undepositedTotal: undepRows.reduce((s, r) => s + Number(r.amount), 0),
          billsDue: dueSoon.length,
          billsDueTotal: dueSoon.reduce((s, b) => s + b.bal, 0),
          billsOverdue: openBills.filter(b => b.due < today).length,
          periods: (periods.data ?? []) as Period[],
        });
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, [accounts, refreshKey]);

  const banks = useMemo(() => accounts.filter(a => a.subtype === 'bank' || a.subtype === 'credit_card'), [accounts]);
  const maxBar = useMemo(() => Math.max(1, ...(data?.months ?? []).flatMap(m => [m.income, m.costs])), [data]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Loading />;

  const bal = (code: string) => data.balances.get(code) ?? 0;
  const cash = ['1000', '1010', '1020'].reduce((s, c) => s + bal(c), 0);
  const net = data.ytdIncome - data.ytdCosts;
  const openPeriod = [...data.periods].reverse().find(p => p.status === 'open');

  const todo: { icon: typeof Inbox; label: string; detail: string; tone: string; to: Section; params?: Record<string, string> }[] = [];
  if (data.bankToReview) todo.push({ icon: Inbox, label: `${data.bankToReview} bank items to review`, detail: 'Match or add them to the books', tone: 'text-blue-600 bg-blue-50', to: 'banking' });
  if (data.undeposited) todo.push({ icon: HandCoins, label: `${data.undeposited} payments waiting to be deposited`, detail: `${money(data.undepositedTotal)} in undeposited funds`, tone: 'text-emerald-600 bg-emerald-50', to: 'banking', params: { tab: 'deposits' } });
  if (data.billsDue) todo.push({ icon: Receipt, label: `${data.billsDue} bills due this week`, detail: `${money(data.billsDueTotal)}${data.billsOverdue ? ` · ${data.billsOverdue} overdue` : ''}`, tone: data.billsOverdue ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50', to: 'payables', params: { tab: 'pay' } });
  if (openPeriod) todo.push({ icon: CalendarCheck, label: `Close ${monthLabel(openPeriod.period_start, true)}`, detail: `${Object.values(openPeriod.checklist ?? {}).filter(Boolean).length} of 7 checklist steps done`, tone: 'text-gray-600 bg-gray-100', to: 'close' });

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" subtitle={`Where the business stands today, ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Cash in bank" value={money0(cash)} hint="Operating, payroll and savings" icon={<Landmark className="w-5 h-5" />} tone="blue" onClick={() => go('reports', { report: 'balance' })} />
        <StatCard label="Customers owe you" value={money0(bal('1100'))} hint="Open invoices" icon={<Banknote className="w-5 h-5" />} tone="emerald" onClick={() => go('reports', { report: 'aging' })} />
        <StatCard label="You owe vendors" value={money0(bal('2000'))} hint={`Card balance ${money0(bal('2100'))}`} icon={<CreditCard className="w-5 h-5" />} tone="amber" onClick={() => go('payables', { tab: 'pay' })} />
        <StatCard label="Profit this year" value={money0(net)} hint={`${money0(data.ytdIncome)} income`} icon={<TrendingUp className="w-5 h-5" />} tone={net >= 0 ? 'emerald' : 'red'} onClick={() => go('reports', { report: 'pl' })} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Income vs. costs" subtitle="Last 12 months" actions={
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> Costs</span>
            </div>
          } />
          <div className="p-5">
            <div className="flex items-end gap-2 h-56">
              {data.months.map(m => (
                <button
                  key={m.month}
                  onClick={() => go('reports', { report: 'pl', from: m.month, to: toISO(new Date(Number(m.month.slice(0, 4)), Number(m.month.slice(5, 7)), 0)) })}
                  className="group flex-1 h-full flex flex-col justify-end items-center gap-1"
                  title={`${monthLabel(m.month)}: ${money(m.income)} income, ${money(m.costs)} costs`}
                >
                  <div className="w-full flex items-end justify-center gap-0.5 h-full">
                    <div className="w-1/2 max-w-4 rounded-t bg-blue-600 group-hover:bg-blue-700 transition-all duration-500" style={{ height: `${(m.income / maxBar) * 100}%` }} />
                    <div className="w-1/2 max-w-4 rounded-t bg-gray-300 group-hover:bg-gray-400 transition-all duration-500" style={{ height: `${(Math.max(0, m.costs) / maxBar) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{monthLabel(m.month).slice(0, 3)}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Needs attention" />
          <div className="divide-y divide-gray-100">
            {todo.length === 0 && <p className="p-5 text-sm text-gray-500">Everything is caught up.</p>}
            {todo.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.label} onClick={() => go(t.to, t.params)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition group">
                  <div className={`p-2 rounded-lg ${t.tone}`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-500 truncate">{t.detail}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition" />
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Bank and card accounts" actions={<button onClick={() => go('banking')} className="text-sm font-medium text-blue-600 hover:text-blue-700">Open banking</button>} />
          <div className="divide-y divide-gray-100">
            {banks.map(a => (
              <button key={a.id} onClick={() => go('accounts', { account: a.id })} className="w-full flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition text-left">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${a.subtype === 'credit_card' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    {a.subtype === 'credit_card' ? <CreditCard className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.institution ?? 'Bank'}{a.last4 ? ` ···${a.last4}` : ''}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">{money(bal(a.code))}</span>
              </button>
            ))}
            {banks.length === 0 && <p className="p-5 text-sm text-gray-500">No bank accounts set up.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent months" actions={<button onClick={() => go('close')} className="text-sm font-medium text-blue-600 hover:text-blue-700">Month close</button>} />
          <div className="divide-y divide-gray-100">
            {data.periods.map(p => (
              <div key={p.period_start} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-900">{monthLabel(p.period_start, true)}</span>
                {p.status === 'locked'
                  ? <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><Lock className="w-3.5 h-3.5" /> Locked</span>
                  : <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><Unlock className="w-3.5 h-3.5" /> Open</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {[
          { icon: BookOpen, label: 'New journal entry', to: 'journal' as Section, params: { edit: 'new' } },
          { icon: Receipt, label: 'Enter a bill', to: 'payables' as Section, params: { tab: 'bills', new: '1' } },
          { icon: FileSpreadsheet, label: 'Profit & loss', to: 'reports' as Section, params: { report: 'pl' } },
          { icon: AlertTriangle, label: 'Overdue customers', to: 'reports' as Section, params: { report: 'aging' } },
        ].map(q => {
          const Icon = q.icon;
          return (
            <button key={q.label} onClick={() => go(q.to, q.params)} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition text-left">
              <Icon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">{q.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
