import { useState } from 'react';
import { MapPin, Clock, CheckCircle, ChevronRight, Star, Coffee } from 'lucide-react';
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

  const isPaused = job.wot_status === 'on_break';
  const isWorking = job.wot_status === 'working' || job.wot_status === 'onsite';
  const isEnroute = job.wot_status === 'enroute';

  const activeStart = isEnroute ? job.wot_enroute_at :
    isWorking ? job.wot_onsite_at :
    isPaused ? job.wot_paused_at : null;
  const elapsed = useElapsedTime(activeStart);

  const actions = getTechActions(job.wot_status);
  const isCompleted = job.wot_status === 'completed';

  const primary = actions.find(a => a.variant === 'primary') || actions[0];

  async function handlePrimary(e: React.MouseEvent) {
    e.stopPropagation();
    if (!primary) return;
    // Pause and Complete both need extra UI — defer to detail view.
    if (primary.action === 'take_break' || primary.action === 'complete') {
      onOpenDetail(job);
      return;
    }
    setActing(true);
    await onAction(job, primary.action);
    setActing(false);
  }

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
      isCompleted ? 'border-emerald-200 opacity-75' :
      isPaused ? 'border-amber-300 shadow-md shadow-amber-100' :
      isWorking ? 'border-emerald-400 shadow-lg shadow-emerald-100' :
      isEnroute ? 'border-blue-300 shadow-md' :
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
                  isPaused ? 'bg-amber-100 text-amber-700' :
                  isWorking ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
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

        {isPaused && job.wot_current_pause_reason && (
          <div className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-2">
            <Coffee className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-semibold">Paused:</span>
            <span className="truncate">{job.wot_current_pause_reason}</span>
          </div>
        )}

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

      {!isCompleted && primary && (
        <div className="px-4 pb-4 space-y-2">
          <button
            onClick={handlePrimary}
            disabled={acting}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all active:scale-95 ${primary.color} ${acting ? 'opacity-60' : ''}`}
          >
            <primary.icon className="h-4 w-4" />
            {acting ? '...' : primary.label}
          </button>
          {actions.length > 1 && (
            <button
              onClick={() => onOpenDetail(job)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
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
