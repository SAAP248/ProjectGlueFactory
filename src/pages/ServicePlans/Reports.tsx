import { useMemo } from 'react';
import { Download, Radio, TrendingDown, TrendingUp, Users } from 'lucide-react';
import {
  CADENCES, CADENCE_LABELS, computeBalance, formatCents, monthlyEquivalentCents, normalizedMonthlyRevenueCents, toCsv,
} from './lib/domain';
import type { ModuleData } from './useModuleData';
import { benefitsById } from './useModuleData';
import { Btn, Card, PlanChip, StatCard, planColor } from './ui';

const LIVE = new Set(['active', 'past_due', 'pending_renewal']);

function download(name: string, rows: (string | number | null)[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports({ data, today }: { data: ModuleData; today: string }) {
  const live = data.agreements.filter(a => LIVE.has(a.status));
  const mrr = normalizedMonthlyRevenueCents(data.agreements);
  const monitoringMrr = data.monitoring.reduce((s, m) => s + m.monthly_cents, 0);
  const ended = data.agreements.filter(a => a.status === 'canceled' || a.status === 'expired').length;
  const churnBase = live.length + ended;
  const churnPct = churnBase ? Math.round((ended / churnBase) * 1000) / 10 : 0;

  const byPlan = useMemo(() => data.plans.map(p => {
    const rows = live.filter(a => a.plan_id === p.id);
    return { plan: p, count: rows.length, mrr: rows.reduce((s, a) => s + monthlyEquivalentCents(a.period_amount_cents, a.cadence), 0) };
  }).filter(r => r.count > 0).sort((a, b) => b.mrr - a.mrr), [data.plans, live]);

  const byCadence = CADENCES.map(c => {
    const rows = live.filter(a => a.cadence === c);
    return { cadence: c, count: rows.length, mrr: rows.reduce((s, a) => s + monthlyEquivalentCents(a.period_amount_cents, a.cadence), 0) };
  });

  const utilization = useMemo(() => {
    const benefits = benefitsById(data.plans);
    const groups = new Map<string, typeof data.ledger>();
    for (const e of data.ledger) {
      const b = benefits.get(e.benefit_id);
      if (!b || b.benefit_type === 'perk') continue;
      const list = groups.get(b.name) ?? [];
      list.push(e);
      groups.set(b.name, list);
    }
    return [...groups.entries()].map(([name, entries]) => {
      const bal = computeBalance(entries);
      const pool = bal.granted + bal.rolledOver + bal.adjusted;
      return { name, pool, consumed: bal.consumed, reserved: bal.reserved, pct: pool ? Math.round((bal.consumed / pool) * 100) : 0 };
    }).sort((a, b) => b.pool - a.pool);
  }, [data]);

  const maxPlan = Math.max(1, ...byPlan.map(r => r.mrr));

  function exportAgreements() {
    download(`service-plan-agreements-${today}.csv`, [
      ['Agreement', 'Customer', 'Plan', 'Status', 'Cadence', 'Period amount', 'Monthly equivalent', 'Start', 'End', 'Auto renew'],
      ...data.agreements.map(a => [
        a.agreement_number, a.companies?.name ?? '', a.sp_plans?.name ?? '', a.status, a.cadence,
        (a.period_amount_cents / 100).toFixed(2), (monthlyEquivalentCents(a.period_amount_cents, a.cadence) / 100).toFixed(2),
        a.start_date, a.end_date, a.auto_renew ? 'yes' : 'no',
      ]),
    ]);
  }

  function exportRevenue() {
    download(`service-plan-revenue-${today}.csv`, [
      ['Group', 'Name', 'Agreements', 'Normalized monthly revenue'],
      ...byPlan.map(r => ['Plan', r.plan.name, r.count, (r.mrr / 100).toFixed(2)]),
      ...byCadence.map(r => ['Billing', CADENCE_LABELS[r.cadence], r.count, (r.mrr / 100).toFixed(2)]),
      ['Monitoring (separate)', 'Monitoring accounts', data.monitoring.length, (monitoringMrr / 100).toFixed(2)],
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} tone="emerald" label="Plan revenue (monthly)" value={formatCents(mrr)} sub={`${formatCents(mrr * 12)} per year`} />
        <StatCard icon={Users} tone="blue" label="Live agreements" value={live.length} />
        <StatCard icon={TrendingDown} tone="red" label="Churn" value={`${churnPct}%`} sub={`${ended} canceled or expired`} />
        <StatCard icon={Radio} tone="gray" label="Monitoring (kept separate)" value={formatCents(monitoringMrr)} sub="Billed in Subscriptions" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Monthly revenue by plan" action={<Btn variant="ghost" className="!py-1 text-xs" onClick={exportRevenue}><Download className="h-3.5 w-3.5" /> CSV</Btn>}>
          <div className="p-5 space-y-4">
            {byPlan.length === 0 && <p className="text-sm text-gray-500">No live agreements yet.</p>}
            {byPlan.map(r => (
              <div key={r.plan.id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <PlanChip name={r.plan.name} color={r.plan.color} />
                  <span className="tabular-nums font-medium text-gray-900">{formatCents(r.mrr)} <span className="text-gray-400 font-normal">· {r.count}</span></span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${planColor(r.plan.color).solid} transition-all duration-700`} style={{ width: `${(r.mrr / maxPlan) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="By billing frequency">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {byCadence.map(r => (
                <tr key={r.cadence}>
                  <td className="px-5 py-3 text-gray-700">{CADENCE_LABELS[r.cadence]}</td>
                  <td className="px-5 py-3 text-right text-gray-500 tabular-nums">{r.count} agreements</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">{formatCents(r.mrr)}/mo</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-3 text-xs text-gray-500 border-t border-gray-100">Every payment is converted to a monthly figure so plans billed at different frequencies compare fairly.</p>
        </Card>
      </div>

      <Card title="Benefit usage">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-5 py-2.5 font-medium">Benefit</th>
                <th className="px-5 py-2.5 font-medium text-right">Included</th>
                <th className="px-5 py-2.5 font-medium text-right">Used</th>
                <th className="px-5 py-2.5 font-medium text-right">Booked</th>
                <th className="px-5 py-2.5 font-medium w-1/3">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {utilization.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-500">No usage recorded yet.</td></tr>}
              {utilization.map(u => (
                <tr key={u.name}>
                  <td className="px-5 py-2.5 font-medium text-gray-900">{u.name}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{u.pool}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{u.consumed}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-gray-500">{u.reserved}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${u.pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums w-9 text-right">{u.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end">
        <Btn onClick={exportAgreements}><Download className="h-4 w-4" /> Export all agreements</Btn>
      </div>
    </div>
  );
}
