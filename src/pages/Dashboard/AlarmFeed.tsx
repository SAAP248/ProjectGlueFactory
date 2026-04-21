import { Siren, CheckCircle2 } from 'lucide-react';
import { AlarmEventRow } from './useDashboardData';

interface Props {
  alarms: AlarmEventRow[];
  unackedCount: number;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const severityStyles = (s: string) => {
  const sev = (s || '').toLowerCase();
  if (sev === 'critical') return { dot: 'bg-red-500 animate-pulse', badge: 'bg-red-100 text-red-700' };
  if (sev === 'high') return { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' };
  if (sev === 'medium') return { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' };
  return { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' };
};

export default function AlarmFeed({ alarms, unackedCount }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Siren className="h-4 w-4 text-red-600" />
          <h3 className="text-sm font-semibold text-gray-900">Live Alarm Events</h3>
        </div>
        {unackedCount > 0 ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
            {unackedCount} unacked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            All acknowledged
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {alarms.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recent alarm events</p>
          </div>
        ) : (
          alarms.map((a) => {
            const s = severityStyles(a.severity);
            return (
              <div key={a.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-900 truncate">{a.company}</p>
                      <span className="text-xs text-gray-500 shrink-0">
                        {timeAgo(a.event_timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>
                        {a.severity}
                      </span>
                      <p className="text-sm text-gray-600 truncate">{a.event_type}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
