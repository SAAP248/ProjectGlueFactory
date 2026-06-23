import { useState } from 'react';
import { Navigation, MapPin, Play, Pause, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  SalesCallStatus, SalesCallAction, SalesCallOutcome,
  runSalesCallAction, getStatusLabel, getStatusColor, getOutcomeLabel,
} from '../../lib/dealLifecycle';

interface Props {
  dealId: string;
  employeeId: string;
  currentStatus: SalesCallStatus;
  onChanged: (newStatus: SalesCallStatus) => void;
  compact?: boolean;
}

const OUTCOMES: SalesCallOutcome[] = ['proposal_sent', 'verbal_yes', 'follow_up_needed', 'customer_declined', 'rescheduled', 'other'];

export default function SalesCallActions({ dealId, employeeId, currentStatus, onChanged, compact }: Props) {
  const [busy, setBusy] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeOutcome, setCompleteOutcome] = useState<SalesCallOutcome>('proposal_sent');

  async function handleAction(action: SalesCallAction) {
    setBusy(true);
    try {
      const newStatus = await runSalesCallAction({ dealId, employeeId, action });
      onChanged(newStatus);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    try {
      const newStatus = await runSalesCallAction({
        dealId,
        employeeId,
        action: 'complete',
        notes: completeNotes || undefined,
        outcome: completeOutcome,
      });
      setShowComplete(false);
      onChanged(newStatus);
    } finally {
      setBusy(false);
    }
  }

  function getActions(): Array<{ action: SalesCallAction; label: string; icon: typeof Navigation; color: string }> {
    switch (currentStatus) {
      case 'none':
        return [{ action: 'start_driving', label: 'Start Driving', icon: Navigation, color: 'bg-blue-600 hover:bg-blue-700 text-white' }];
      case 'enroute':
        return [{ action: 'arrived', label: 'Arrived', icon: MapPin, color: 'bg-teal-600 hover:bg-teal-700 text-white' }];
      case 'onsite':
        return [{ action: 'begin_work', label: 'Start Working', icon: Play, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' }];
      case 'working':
        return [
          { action: 'pause', label: 'Pause', icon: Pause, color: 'bg-amber-500 hover:bg-amber-600 text-white' },
        ];
      case 'paused':
        return [{ action: 'resume', label: 'Resume', icon: Play, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' }];
      default:
        return [];
    }
  }

  const actions = getActions();
  const showCompleteButton = currentStatus === 'working' || currentStatus === 'onsite';
  const showCancelButton = currentStatus !== 'none' && currentStatus !== 'completed' && currentStatus !== 'cancelled';

  if (currentStatus === 'completed') {
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'p-3 bg-green-50 border border-green-200 rounded-xl'}`}>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-800">Sales Call Completed</span>
      </div>
    );
  }

  if (currentStatus === 'cancelled') {
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'p-3 bg-gray-50 border border-gray-200 rounded-xl'}`}>
        <XCircle className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-600">Cancelled</span>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentStatus)}`}>
          {getStatusLabel(currentStatus)}
        </span>
        {currentStatus !== 'none' && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" /> Active
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className={`flex flex-wrap gap-2 ${compact ? '' : ''}`}>
        {actions.map(({ action, label, icon: Icon, color }) => (
          <button
            key={action}
            onClick={() => handleAction(action)}
            disabled={busy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${color}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}

        {showCompleteButton && (
          <button
            onClick={() => setShowComplete(true)}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </button>
        )}

        {showCancelButton && (
          <button
            onClick={() => handleAction('cancel')}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}
      </div>

      {/* Complete modal */}
      {showComplete && (
        <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-green-900">Complete Sales Call</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Outcome</label>
            <div className="flex flex-wrap gap-1.5">
              {OUTCOMES.map(o => (
                <button
                  key={o}
                  onClick={() => setCompleteOutcome(o)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    completeOutcome === o
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-300'
                  }`}
                >
                  {getOutcomeLabel(o)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={completeNotes}
              onChange={e => setCompleteNotes(e.target.value)}
              rows={2}
              placeholder="How did the call go? Any follow-up needed?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleComplete}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              {busy ? 'Saving...' : 'Mark Complete'}
            </button>
            <button
              onClick={() => setShowComplete(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
