import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { percentChange } from '../lib/dateRange';

interface Props {
  cur: number;
  prev: number | undefined;
  invert?: boolean;
}

export default function DeltaBadge({ cur, prev, invert = false }: Props) {
  if (prev === undefined) return null;
  const pct = percentChange(cur, prev);
  if (pct === null) return <span className="text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">New</span>;
  const flat = Math.abs(pct) < 0.05;
  const good = invert ? pct < 0 : pct > 0;
  const tone = flat ? 'text-gray-600 bg-gray-100' : good ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50';
  const Icon = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      title="Compared with the previous period"
      className={`inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${tone}`}
    >
      {!flat && <Icon className="h-3 w-3" />}
      {flat ? '0%' : `${Math.abs(pct) >= 1000 ? '999+' : Math.abs(pct).toFixed(1)}%`}
    </span>
  );
}
