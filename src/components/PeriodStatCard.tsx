import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  sub?: ReactNode;
  icon: LucideIcon;
  iconColor: string;
  bgLight: string;
  delta?: ReactNode;
}

export default function PeriodStatCard({ label, value, sub, icon: Icon, iconColor, bgLight, delta }: Props) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums tracking-tight truncate">{value}</p>
        </div>
        <div className={`${bgLight} w-11 h-11 shrink-0 rounded-xl flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      {(sub || delta) && (
        <div className="flex items-center justify-between gap-2 mt-3 min-h-[20px]">
          <span className="text-xs text-gray-500 truncate">{sub}</span>
          {delta}
        </div>
      )}
    </div>
  );
}
