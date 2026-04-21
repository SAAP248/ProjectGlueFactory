import { UserCheck, Clock } from 'lucide-react';
import { TechOnClock } from './useDashboardData';

interface Props {
  techs: TechOnClock[];
}

const elapsed = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
};

export default function TeamActivity({ techs }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-900">Team on the Clock</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          {techs.length} active
        </span>
      </div>
      <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {techs.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No one currently clocked in</div>
        ) : (
          techs.map((t) => {
            const initials = t.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            return (
              <div key={t.id} className="p-3 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-semibold text-xs">
                  {initials || 'NA'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{t.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {t.work_order ? `On ${t.work_order}` : 'No active job'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                  <Clock className="h-3 w-3" />
                  {elapsed(t.clock_in_time)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
