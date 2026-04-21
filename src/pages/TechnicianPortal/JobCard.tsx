import { useState } from 'react';
import { MapPin, Clock, CheckCircle, ChevronRight, Star } from 'lucide-react';
import type { TechWO, TechAction } from './types';
import { getTechActions, PRIORITY_COLORS, WOT_STATUS_COLORS, WOT_STATUS_LABELS } from './constants';
import { useElapsedTime } from './useElapsedTime';

interface Props {
  job: TechWO;
  onAction: (job: TechWO, action: TechAction) => Promise<void>;
  onOpenDetail: (job: TechWO) => void;
}

export default function JobCard({ job, onAction, onOpenDetail }: Props) {
  const [acting, setActing] = useState(false);

  const activeStart = job.wot_status === 'enroute' ? job.wot_enroute_at :
    job.wot_status === 'working' ? job.wot_onsite_at : null;
  const elapsed = useElapsedTime(activeStart);

  const actions = getTechActions(job.wot_status);
  const isCompleted = job.wot_status === 'completed';

  async function handleAction(e: React.MouseEvent, action: TechAction) {
    e.stopPropagation();
    setActing(true);
    await onAction(job, action);
    setActing(false);
  }

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
      isCompleted ? 'border-emerald-200 opacity-75' :
      job.wot_status === 'working' ? 'border-emerald-400 shadow-lg shadow-emerald-100' :
      job.wot_status === 'enroute' ? 'border-blue-300 shadow-md' :
      'border-gray-200'
    }`}>
      <div
        className="p-4 cursor-pointer active:bg-gray-50 transition-colors"
        onClick={() => onOpenDetail(job)}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono font-bold text-gray-500">{job.wo_number}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[job.priority] || 'bg-gray-100 text-gray-600'}`}>
                {job.priority}
              </span>
              {job.wot_is_lead && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                  <Star className="h-2.5 w-2.5 fill-blue-600 text-blue-600" />
                  LEAD
                </span>
              )}
              {elapsed && (
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  job.wot_status === 'working' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Clock className="h-3 w-3" />
                  {elapsed}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">{job.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{job.companies?.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${WOT_STATUS_COLORS[job.wot_status] || 'bg-gray-100 text-gray-600'}`}>
              {WOT_STATUS_LABELS[job.wot_status] || job.wot_status}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {job.sites && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{job.sites.address || job.sites.name}</span>
          </div>
        )}
        {(job.wot_scheduled_start_time || job.scheduled_time) && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {(job.wot_scheduled_start_time || job.scheduled_time || '').slice(0, 5)}
              {job.wot_scheduled_end_time && ` - ${job.wot_scheduled_end_time.slice(0, 5)}`}
            </span>
          </div>
        )}
        {job.wot_assignment_notes && (
          <p className="text-xs text-gray-500 italic mt-1 truncate">
            "{job.wot_assignment_notes}"
          </p>
        )}
      </div>

      {!isCompleted && actions.length > 0 && (
        <div className="px-4 pb-4">
          <div className={`grid gap-2 ${actions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {actions.slice(0, 2).map(a => (
              <button
                key={a.action}
                onClick={e => handleAction(e, a.action)}
                disabled={acting}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all active:scale-95 ${a.color} ${acting ? 'opacity-60' : ''}`}
              >
                <a.icon className="h-4 w-4" />
                {acting ? '...' : a.label}
              </button>
            ))}
          </div>
          {actions.length > 2 && (
            <button
              onClick={() => onOpenDetail(job)}
              className="mt-2 w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
            >
              More options — tap to open job
            </button>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">
            <CheckCircle className="h-4 w-4" />
            Job Completed
          </div>
        </div>
      )}
    </div>
  );
}
