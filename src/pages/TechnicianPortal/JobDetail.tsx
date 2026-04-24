import { useState } from 'react';
import {
  ArrowLeft, MapPin, Clock, CheckCircle, Car,
  DollarSign, PenLine, Building2, Calendar, Pause
} from 'lucide-react';
import type { TechWO, TechAction } from './types';
import { PRIORITY_COLORS, WOT_STATUS_COLORS, WOT_STATUS_LABELS, getTechActions } from './constants';
import { useElapsedTime } from './useElapsedTime';
import CompleteJobModal from './CompleteJobModal';
import PauseReasonSheet from './PauseReasonSheet';
import SystemAccessPanel from './SystemAccessPanel';
import SiteInventoryPanel from './SiteInventoryPanel';
import PartsUsedPanel from './PartsUsedPanel';
import WorkOrderPhotos from '../WorkOrders/WorkOrderPhotos';
import { Camera } from 'lucide-react';

interface Props {
  job: TechWO;
  onBack: () => void;
  onAction: (job: TechWO, action: TechAction, extraData?: {
    resolutionNotes?: string;
    signature?: string | null;
    paymentCollected?: number | null;
    paymentMethod?: string | null;
    pauseReason?: string | null;
    pauseNotes?: string | null;
  }) => Promise<void>;
  onSaveNotes: (jobId: string, wotId: string, notes: string) => Promise<void>;
}

export default function JobDetail({ job, onBack, onAction, onSaveNotes }: Props) {
  const [acting, setActing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPauseSheet, setShowPauseSheet] = useState(false);
  const [confirmDanger, setConfirmDanger] = useState<null | 'cannot_complete' | 'go_back'>(null);
  const [techNotes, setTechNotes] = useState(job.technician_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const isWorking = job.wot_status === 'working' || job.wot_status === 'onsite';
  const isPaused = job.wot_status === 'on_break';
  const isEnroute = job.wot_status === 'enroute';

  const activeStart = isEnroute ? job.wot_enroute_at :
    isWorking ? job.wot_onsite_at :
    isPaused ? job.wot_paused_at : null;
  const elapsed = useElapsedTime(activeStart);

  const actions = getTechActions(job.wot_status);
  const isCompleted = job.wot_status === 'completed';

  async function handleAction(action: TechAction) {
    if (action === 'complete') {
      setShowCompleteModal(true);
      return;
    }
    if (action === 'take_break') {
      setShowPauseSheet(true);
      return;
    }
    if (action === 'cannot_complete' || action === 'go_back') {
      setConfirmDanger(action);
      return;
    }
    setActing(true);
    await onAction(job, action);
    setActing(false);
  }

  async function handlePauseConfirm(reason: string, notes: string) {
    setShowPauseSheet(false);
    setActing(true);
    await onAction(job, 'take_break', { pauseReason: reason, pauseNotes: notes || null });
    setActing(false);
  }

  async function handleDangerConfirm() {
    if (!confirmDanger) return;
    const a = confirmDanger;
    setConfirmDanger(null);
    setActing(true);
    await onAction(job, a);
    setActing(false);
  }

  async function handleComplete(data: {
    resolutionNotes: string;
    signature: string | null;
    paymentCollected: number | null;
    paymentMethod: string | null;
  }) {
    setShowCompleteModal(false);
    await onAction(job, 'complete', data);
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    await onSaveNotes(job.id, job.wot_id, techNotes);
    setSavingNotes(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2500);
  }

  return (
    <>
      <div className="min-h-full bg-gray-50 pb-32">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-bold text-gray-500">{job.wo_number}</p>
                <h1 className="text-base font-bold text-gray-900 truncate">{job.title}</h1>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${WOT_STATUS_COLORS[job.wot_status] || 'bg-gray-100 text-gray-600'}`}>
                {WOT_STATUS_LABELS[job.wot_status] || job.wot_status}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Time tracker banner */}
          {elapsed && !isCompleted && (
            isPaused ? (
              <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                    <span className="text-sm font-bold text-amber-900">
                      Paused{job.wot_current_pause_reason ? ` — ${job.wot_current_pause_reason}` : ''}
                    </span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-amber-700">{elapsed}</span>
                </div>
                {job.wot_current_pause_notes && (
                  <p className="text-xs text-amber-800/80 pl-5">“{job.wot_current_pause_notes}”</p>
                )}
              </div>
            ) : (
              <div className={`rounded-2xl p-4 flex items-center justify-between ${
                isWorking ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Clock className={`h-5 w-5 ${isWorking ? 'text-emerald-600' : 'text-blue-600'}`} />
                  <span className={`text-sm font-semibold ${isWorking ? 'text-emerald-800' : 'text-blue-800'}`}>
                    {isWorking ? 'On the clock' : 'Driving'}
                  </span>
                  {isWorking && (job.wot_total_paused_minutes ?? 0) > 0 && (
                    <span className="text-xs text-emerald-700/70 font-medium">
                      · {job.wot_total_paused_minutes}m paused today
                    </span>
                  )}
                </div>
                <span className={`text-2xl font-mono font-bold ${isWorking ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {elapsed}
                </span>
              </div>
            )
          )}

          {/* Job Info Card */}
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {/* Customer / Site */}
            <div className="px-4 py-3 flex items-start gap-3">
              <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500">Customer</p>
                <p className="text-sm font-semibold text-gray-900">{job.companies?.name}</p>
                {job.sites && (
                  <p className="text-xs text-gray-500 mt-0.5">{job.sites.name}</p>
                )}
              </div>
            </div>
            {job.sites?.address && (
              <div className="px-4 py-3 flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Address</p>
                  <p className="text-sm text-gray-900">{job.sites.address}</p>
                </div>
              </div>
            )}
            {job.scheduled_date && (
              <div className="px-4 py-3 flex items-start gap-3">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Scheduled</p>
                  <p className="text-sm text-gray-900">
                    {new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                    {job.scheduled_time && ` at ${job.scheduled_time.slice(0, 5)}`}
                  </p>
                </div>
              </div>
            )}
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[job.priority] || 'bg-gray-100 text-gray-600'}`}>
                  {job.priority}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                  {job.work_order_type?.replace(/_/g, ' ')}
                </span>
                {job.billing_type !== 'not_billable' && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1">
                    <DollarSign className="h-2.5 w-2.5" />
                    {job.billing_type === 'fixed' ? `$${job.fixed_amount}` : `$${job.billing_rate}/hr`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reason / Scope */}
          {(job.reason_for_visit || job.scope_of_work) && (
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              {job.reason_for_visit && (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reason for Visit</p>
                  <p className="text-sm text-gray-800">{job.reason_for_visit}</p>
                </div>
              )}
              {job.scope_of_work && (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Scope of Work</p>
                  <p className="text-sm text-gray-800">{job.scope_of_work}</p>
                </div>
              )}
            </div>
          )}

          {/* Timeline + Durations */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Enroute', value: job.wot_enroute_at ? new Date(job.wot_enroute_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—', active: !!job.wot_enroute_at, Icon: Car, activeColor: 'bg-blue-50 text-blue-700' },
                { label: 'Arrived', value: job.wot_onsite_at ? new Date(job.wot_onsite_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—', active: !!job.wot_onsite_at, Icon: MapPin, activeColor: 'bg-emerald-50 text-emerald-700' },
                { label: 'Paused', value: (job.wot_total_paused_minutes ?? 0) > 0 || isPaused ? `${job.wot_total_paused_minutes ?? 0}m` : '—', active: (job.wot_total_paused_minutes ?? 0) > 0 || isPaused, Icon: Pause, activeColor: 'bg-amber-50 text-amber-700' },
                { label: 'Done', value: job.wot_completed_at ? new Date(job.wot_completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—', active: !!job.wot_completed_at, Icon: CheckCircle, activeColor: 'bg-emerald-50 text-emerald-700' },
              ].map(({ label, value, active, Icon, activeColor }) => (
                <div key={label} className={`text-center py-3 rounded-xl ${active ? activeColor : 'bg-gray-50'}`}>
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${active ? '' : 'text-gray-300'}`} />
                  <p className={`text-xs font-semibold ${active ? '' : 'text-gray-400'}`}>{label}</p>
                  <p className="text-xs mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Duration breakdown */}
            {(job.wot_drive_minutes != null || job.wot_onsite_at) && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Drive Time</p>
                  <p className="text-lg font-mono font-bold text-blue-900">
                    {job.wot_drive_minutes != null ? `${job.wot_drive_minutes}m` : '—'}
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Working</p>
                  <p className="text-lg font-mono font-bold text-emerald-900">
                    {job.wot_onsite_at ? computeWorkingDuration(job.wot_onsite_at, job.wot_completed_at, job.wot_total_paused_minutes) : '—'}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Paused</p>
                  <p className="text-lg font-mono font-bold text-amber-900">
                    {(job.wot_total_paused_minutes ?? 0) > 0 || isPaused ? `${job.wot_total_paused_minutes ?? 0}m` : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* System Access */}
          {job.customer_systems && (
            <SystemAccessPanel job={job} />
          )}

          {/* Site Inventory */}
          {job.site_id && (
            <SiteInventoryPanel siteId={job.site_id} systemId={job.system_id} />
          )}

          {/* Parts Used / Profitability */}
          <PartsUsedPanel job={job} />

          {/* Photos */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">Photos</p>
            </div>
            <WorkOrderPhotos workOrderId={job.id} readOnly={isCompleted} compact />
          </div>

          {/* Completed Summary */}
          {isCompleted && (job.resolution_notes || job.customer_signature || job.payment_collected != null) && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-900">Job Completed</p>
              </div>
              {job.resolution_notes && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Resolution</p>
                  <p className="text-sm text-emerald-900">{job.resolution_notes}</p>
                </div>
              )}
              {job.payment_collected != null && job.payment_collected > 0 && (
                <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-900">Payment Collected</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-700">${job.payment_collected.toFixed(2)}</span>
                    {job.payment_method && (
                      <span className="block text-xs text-gray-500 capitalize">{job.payment_method.replace('_', ' ')}</span>
                    )}
                  </div>
                </div>
              )}
              {job.customer_signature && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Customer Signature</p>
                  <div className="bg-white rounded-xl border border-emerald-200 p-2">
                    <img src={job.customer_signature} alt="Customer signature" className="max-h-20 w-auto" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tech Notes */}
          {!isCompleted && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">Tech Notes</p>
                </div>
                {techNotes !== (job.technician_notes || '') && (
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
                  >
                    {notesSaved ? 'Saved!' : savingNotes ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
              <textarea
                value={techNotes}
                onChange={e => setTechNotes(e.target.value)}
                rows={3}
                placeholder="Add notes about this job..."
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-400 bg-gray-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Action Bar */}
      {!isCompleted && actions.length > 0 && (() => {
        const primary = actions.find(a => a.variant === 'primary') || actions[0];
        const secondary = actions.filter(a => a !== primary && a.variant === 'secondary');
        const danger = actions.filter(a => a !== primary && a.variant === 'danger');
        return (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30">
            <div className="max-w-2xl mx-auto space-y-2">
              <button
                onClick={() => handleAction(primary.action)}
                disabled={acting}
                className={`w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.98] ${primary.color} ${acting ? 'opacity-60' : ''}`}
              >
                <primary.icon className="h-5 w-5" />
                {acting ? '...' : primary.label}
              </button>

              {(secondary.length > 0 || danger.length > 0) && (
                <div className={`grid gap-2 ${(secondary.length + danger.length) === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {secondary.map(a => (
                    <button
                      key={a.action}
                      onClick={() => handleAction(a.action)}
                      disabled={acting}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 ${a.color} ${acting ? 'opacity-60' : ''}`}
                    >
                      <a.icon className="h-4 w-4" />
                      {a.label}
                    </button>
                  ))}
                  {danger.map(a => (
                    <button
                      key={a.action}
                      onClick={() => handleAction(a.action)}
                      disabled={acting}
                      className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <a.icon className="h-4 w-4" />
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-bold">
              <CheckCircle className="h-4 w-4" />
              Job Completed
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <CompleteJobModal
          job={job}
          onConfirm={handleComplete}
          onCancel={() => setShowCompleteModal(false)}
        />
      )}

      {showPauseSheet && (
        <PauseReasonSheet
          onConfirm={handlePauseConfirm}
          onCancel={() => setShowPauseSheet(false)}
        />
      )}

      {confirmDanger && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {confirmDanger === 'cannot_complete' ? 'Mark as Cannot Complete?' : 'Mark as Go-Back?'}
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              {confirmDanger === 'cannot_complete'
                ? 'The ticket will close out on your end and move to On Hold for the office to follow up.'
                : 'The ticket will close out on your end and be flagged as a Go-Back for dispatch to reschedule.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDanger(null)}
                disabled={acting}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDangerConfirm}
                disabled={acting}
                className={`flex-1 py-3 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${
                  confirmDanger === 'cannot_complete' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {acting ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function computeWorkingDuration(onsiteAt: string, completedAt: string | null, pausedMinutes: number | null): string {
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const start = new Date(onsiteAt).getTime();
  const mins = Math.max(0, Math.round((end - start) / 60000) - (pausedMinutes ?? 0));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
