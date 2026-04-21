import { Target, TrendingUp } from 'lucide-react';
import { DashboardData } from './useDashboardData';

interface Props {
  pipeline: DashboardData['pipeline'];
  topDeals: DashboardData['topDeals'];
}

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-sky-500',
  qualified: 'bg-blue-500',
  proposal: 'bg-cyan-500',
  negotiation: 'bg-amber-500',
  contract: 'bg-orange-500',
  closed_won: 'bg-emerald-500',
  closed_lost: 'bg-gray-400',
};

const stageLabel = (s: string) =>
  s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function SalesPipeline({ pipeline, topDeals }: Props) {
  const active = pipeline.filter((p) => !['closed_won', 'closed_lost'].includes(p.stage));
  const maxValue = Math.max(1, ...active.map((p) => p.value));
  const totalValue = active.reduce((s, p) => s + p.value, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">Sales Pipeline</h3>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          ${(totalValue / 1000).toFixed(1)}k
        </span>
      </div>

      <div className="p-5 space-y-3">
        {active.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No active deals</p>
        ) : (
          active.map((p) => {
            const w = (p.value / maxValue) * 100;
            return (
              <div key={p.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{stageLabel(p.stage)}</span>
                  <span className="text-xs text-gray-500">
                    {p.count} • ${(p.value / 1000).toFixed(1)}k
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${STAGE_COLORS[p.stage] || 'bg-gray-400'} rounded-full transition-all`}
                    style={{ width: `${Math.max(w, 3)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {topDeals.length > 0 && (
        <div className="border-t border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-gray-500" />
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Top Open Deals
            </h4>
          </div>
          <div className="space-y-2">
            {topDeals.slice(0, 4).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between text-sm hover:bg-gray-50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{d.title}</p>
                  <p className="text-xs text-gray-500 truncate">{d.company}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="font-semibold text-gray-900">
                    ${(d.value / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-gray-500">{d.probability}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
