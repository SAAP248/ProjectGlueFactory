import { DollarSign, TrendingUp, Target, Award } from 'lucide-react';
import type { Deal, Employee } from './types';
import { FORECAST_CATEGORIES, formatCurrency } from './types';

interface Props {
  deals: Deal[];
  employees: Employee[];
}

export default function ForecastView({ deals, employees }: Props) {
  const activeDeals = deals.filter(d =>
    !['Lost', 'Did not sell', 'Purchased From Another', 'Sold & Failed'].includes(d.sales_stage)
  );

  const wonDeals = deals.filter(d => d.sales_stage === 'Sold');
  const lostDeals = deals.filter(d =>
    ['Lost', 'Did not sell', 'Purchased From Another', 'Sold & Failed'].includes(d.sales_stage)
  );

  const totalPipeline = activeDeals.reduce((s, d) => s + d.value, 0);
  const weightedForecast = activeDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const closedWon = wonDeals.reduce((s, d) => s + d.value, 0);
  const closedLost = lostDeals.reduce((s, d) => s + d.value, 0);

  const commitDeals = activeDeals.filter(d => d.forecast_category === 'commit');
  const bestCaseDeals = activeDeals.filter(d => d.forecast_category === 'best_case');
  const pipelineDeals = activeDeals.filter(d => d.forecast_category === 'pipeline');

  const commitValue = commitDeals.reduce((s, d) => s + d.value, 0);
  const bestCaseValue = bestCaseDeals.reduce((s, d) => s + d.value, 0);
  const pipelineValue = pipelineDeals.reduce((s, d) => s + d.value, 0);

  const maxBar = Math.max(commitValue + bestCaseValue + pipelineValue + closedWon, 1);

  const categoryRows = FORECAST_CATEGORIES.map(fc => {
    const catDeals = deals.filter(d => d.forecast_category === fc.value);
    const catValue = catDeals.reduce((s, d) => s + d.value, 0);
    const catWeighted = catDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
    return { ...fc, deals: catDeals, value: catValue, weighted: catWeighted };
  });

  const employeeStats = employees.map(emp => {
    const empDeals = deals.filter(d => d.company_id);
    const empWon = wonDeals.filter(d => d.probability === 100);
    const empPipeline = activeDeals.reduce((s, d) => s + d.value, 0);
    return {
      emp,
      pipeline: empPipeline / employees.length,
      won: closedWon / employees.length,
      weighted: weightedForecast / employees.length,
    };
  });

  const monthlyData = (() => {
    const months: { month: string; closed: number; pipeline: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const closedThisMonth = deals
        .filter(deal => {
          if (!deal.close_date) return false;
          const cd = new Date(deal.close_date);
          return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth() && deal.sales_stage === 'Sold';
        })
        .reduce((s, deal) => s + deal.value, 0);
      const pipelineThisMonth = deals
        .filter(deal => {
          if (!deal.expected_close_date) return false;
          const ecd = new Date(deal.expected_close_date);
          return ecd.getFullYear() === d.getFullYear() && ecd.getMonth() === d.getMonth();
        })
        .reduce((s, deal) => s + deal.value, 0);
      months.push({ month: label, closed: closedThisMonth, pipeline: pipelineThisMonth });
    }
    return months;
  })();

  const maxMonthly = Math.max(...monthlyData.flatMap(m => [m.closed, m.pipeline]), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pipeline', value: formatCurrency(totalPipeline), sub: `${activeDeals.length} active deals`, icon: DollarSign, color: 'text-blue-600 bg-blue-100' },
          { label: 'Weighted Forecast', value: formatCurrency(weightedForecast), sub: 'probability-adjusted', icon: TrendingUp, color: 'text-green-600 bg-green-100' },
          { label: 'Closed Won', value: formatCurrency(closedWon), sub: `${wonDeals.length} deals`, icon: Award, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'Closed Lost', value: formatCurrency(closedLost), sub: `${lostDeals.length} deals`, icon: Target, color: 'text-red-600 bg-red-100' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
              <span className={`p-1.5 rounded-lg ${color}`}><Icon className="h-4 w-4" /></span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Revenue Waterfall</h3>
        <div className="flex items-end gap-3 h-40">
          {[
            { label: 'Closed Won', value: closedWon, color: 'bg-emerald-500' },
            { label: 'Commit', value: commitValue, color: 'bg-blue-500' },
            { label: 'Best Case', value: bestCaseValue, color: 'bg-blue-300' },
            { label: 'Pipeline', value: pipelineValue, color: 'bg-gray-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-600">{formatCurrency(value)}</span>
              <div className="w-full flex items-end justify-center">
                <div
                  className={`w-full rounded-t-md ${color} transition-all`}
                  style={{ height: `${Math.max((value / maxBar) * 128, value > 0 ? 4 : 0)}px` }}
                />
              </div>
              <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-800 mb-4">6-Month Trend</h3>
        <div className="flex items-end gap-2 h-32">
          {monthlyData.map(({ month, closed, pipeline }) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-sm bg-emerald-400 transition-all"
                  style={{ height: `${Math.max((closed / maxMonthly) * 96, closed > 0 ? 3 : 0)}px` }}
                />
                <div
                  className="w-full bg-blue-200 transition-all"
                  style={{ height: `${Math.max((pipeline / maxMonthly) * 96, pipeline > 0 ? 3 : 0)}px` }}
                />
              </div>
              <span className="text-xs text-gray-400">{month}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Closed Won</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" /> Expected Pipeline</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Forecast Category Breakdown</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-right">Deals</th>
              <th className="px-6 py-3 text-right">Total Value</th>
              <th className="px-6 py-3 text-right">Weighted Value</th>
              <th className="px-6 py-3 text-left">Breakdown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categoryRows.map(row => (
              <tr key={row.value} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${row.color}`}>
                    {row.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">{row.deals.length}</td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(row.value)}</td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">{formatCurrency(row.weighted)}</td>
                <td className="px-6 py-4">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${totalPipeline > 0 ? (row.value / totalPipeline) * 100 : 0}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
