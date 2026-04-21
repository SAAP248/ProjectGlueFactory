import { TrendingUp } from 'lucide-react';
import { RevenuePoint } from './useDashboardData';

interface Props {
  data: RevenuePoint[];
}

const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString('en-US', { month: 'short' });
};

export default function RevenueChart({ data }: Props) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  const total = data.reduce((s, d) => s + d.amount, 0);
  const latest = data[data.length - 1]?.amount || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">Revenue Trend</h3>
          </div>
          <p className="text-xs text-gray-500">Last 6 months payments</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            ${(total / 1000).toFixed(1)}k
          </p>
          <p className="text-xs text-gray-500">
            {latest > 0 ? `$${(latest / 1000).toFixed(1)}k this month` : 'No revenue this month'}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 h-32">
        {data.map((d, i) => {
          const h = (d.amount / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex items-end h-full">
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all group-hover:from-emerald-600 group-hover:to-emerald-500"
                  style={{ height: `${Math.max(h, 2)}%` }}
                />
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  ${d.amount.toLocaleString()}
                </div>
              </div>
              <span className="text-xs text-gray-500">{monthLabel(d.month)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
