import { Users, TrendingDown, TrendingUp } from 'lucide-react';
import type { Deal, Employee } from './types';
import { SALES_STAGES, formatCurrency } from './types';

interface Props {
  deals: Deal[];
  employees: Employee[];
}

export default function AnalyticsView({ deals, employees }: Props) {
  const wonDeals = deals.filter(d => d.sales_stage === 'Sold');
  const lostDeals = deals.filter(d =>
    ['Lost', 'Did not sell', 'Purchased From Another', 'Sold & Failed'].includes(d.sales_stage)
  );

  const winRate = wonDeals.length + lostDeals.length > 0
    ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
    : 0;

  const avgDealSize = deals.length > 0
    ? deals.reduce((s, d) => s + d.value, 0) / deals.length
    : 0;

  const activeStages = SALES_STAGES.filter(s => !['Sold & Failed', 'Did not sell', 'Purchased From Another'].includes(s));
  const funnelData = activeStages.map(stage => ({
    stage,
    count: deals.filter(d => d.sales_stage === stage).length,
    value: deals.filter(d => d.sales_stage === stage).reduce((s, d) => s + d.value, 0),
  }));
  const maxFunnelCount = Math.max(...funnelData.map(f => f.count), 1);

  const lostReasons = lostDeals
    .filter(d => d.lost_reason)
    .reduce<Record<string, number>>((acc, d) => {
      const key = d.lost_reason!.length > 40 ? d.lost_reason!.slice(0, 40) + '…' : d.lost_reason!;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  const lostReasonsList = Object.entries(lostReasons).sort((a, b) => b[1] - a[1]);

  const employeeRows = employees.map(emp => {
    const empDeals = deals;
    const total = empDeals.reduce((s, d) => s + d.value, 0) / employees.length;
    const won = wonDeals.reduce((s, d) => s + d.value, 0) / employees.length;
    const active = empDeals.length / employees.length;
    const wr = wonDeals.length + lostDeals.length > 0
      ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
      : 0;
    return { emp, total, won, active: Math.round(active), winRate: wr };
  });

  const maxEmpValue = Math.max(...employeeRows.map(e => e.total), 1);

  const staleDeals = deals.filter(d => {
    const days = Math.floor((Date.now() - new Date(d.stage_entered_at).getTime()) / 86_400_000);
    return days > 30 && !['Sold', 'Lost', 'Did not sell', 'Purchased From Another', 'Sold & Failed'].includes(d.sales_stage);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, sub: `${wonDeals.length} won / ${lostDeals.length} lost`, good: winRate >= 40 },
          { label: 'Avg Deal Size', value: formatCurrency(avgDealSize), sub: `across ${deals.length} deals`, good: true },
          { label: 'Stale Deals', value: String(staleDeals.length), sub: 'no activity in 30+ days', good: staleDeals.length === 0 },
          { label: 'Active Pipeline', value: String(deals.filter(d => !['Sold', 'Lost', 'Did not sell', 'Purchased From Another', 'Sold & Failed'].includes(d.sales_stage)).length), sub: 'open opportunities', good: true },
        ].map(({ label, value, sub, good }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {good
                ? <TrendingUp className="h-4 w-4 text-green-500" />
                : <TrendingDown className="h-4 w-4 text-red-500" />
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Stage Conversion Funnel</h3>
          <div className="space-y-2.5">
            {funnelData.map(({ stage, count, value }) => (
              <div key={stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 w-36 truncate">{stage}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-900">{count}</span>
                    <span className="text-gray-400">{formatCurrency(value)}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${(count / maxFunnelCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Loss Reasons</h3>
          {lostReasonsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <p className="text-sm">No lost deal data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lostReasonsList.map(([reason, count]) => (
                <div key={reason}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{reason}</span>
                    <span className="text-xs font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-red-400 transition-all"
                      style={{ width: `${(count / (lostDeals.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-800">Team Performance</h3>
        </div>
        <div className="space-y-4">
          {employeeRows.map(({ emp, total, won, active, winRate: wr }) => (
            <div key={emp.id} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600">
                  {emp.first_name[0]}{emp.last_name[0]}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{emp.first_name} {emp.last_name}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{formatCurrency(total)}</span>
                    <span className="text-green-600 font-medium">{wr.toFixed(0)}% WR</span>
                    <span>{active} deals</span>
                  </div>
                </div>
                <div className="flex gap-1 h-2.5">
                  <div
                    className="bg-emerald-500 rounded-l-full"
                    style={{ width: `${(won / maxEmpValue) * 100}%` }}
                  />
                  <div
                    className="bg-blue-300 rounded-r-full"
                    style={{ width: `${((total - won) / maxEmpValue) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Won</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-blue-300 inline-block" /> Pipeline</span>
        </div>
      </div>

      {staleDeals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <h3 className="text-sm font-bold text-gray-800">Stale Deals — No Activity in 30+ Days</h3>
          </div>
          <div className="space-y-2">
            {staleDeals.map(deal => {
              const days = Math.floor((Date.now() - new Date(deal.stage_entered_at).getTime()) / 86_400_000);
              return (
                <div key={deal.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{deal.title}</p>
                    <p className="text-xs text-gray-500">{deal.companies?.name} · {deal.sales_stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(deal.value)}</p>
                    <p className="text-xs text-orange-600 font-medium">{days} days stale</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
