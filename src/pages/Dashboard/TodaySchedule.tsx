import { CalendarClock, User, Wrench } from 'lucide-react';
import { ScheduledJob } from './useDashboardData';

interface Props {
  jobs: ScheduledJob[];
  jobsToday: number;
  completedToday: number;
}

const statusStyles = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (s === 'in_progress') return 'bg-blue-100 text-blue-700';
  if (s === 'scheduled') return 'bg-gray-100 text-gray-700';
  if (s === 'cancelled') return 'bg-rose-100 text-rose-700';
  return 'bg-gray-100 text-gray-700';
};

const fmtTime = (t: string | null) => {
  if (!t) return 'Any time';
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m || 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function TodaySchedule({ jobs, jobsToday, completedToday }: Props) {
  const completionPct = jobsToday > 0 ? (completedToday / jobsToday) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Today's Schedule</h3>
          </div>
          <span className="text-xs text-gray-500">
            {completedToday} of {jobsToday} completed
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarClock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No jobs scheduled for today</p>
          </div>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="text-center bg-blue-50 rounded-lg px-2 py-1 min-w-[52px]">
                  <p className="text-xs font-bold text-blue-700">{fmtTime(j.scheduled_time)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">{j.company}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles(j.status)}`}>
                      {j.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{j.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {j.work_order_type || 'Service'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {j.technician}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
