import { useState, useEffect, useRef } from 'react';
import { Timer, Navigation, MapPin, Briefcase, CheckCircle2, Pause, Play, XCircle } from 'lucide-react';
import { SalesCallStatus, SalesCallAction, SalesCallOutcome, runSalesCallAction, getOutcomeLabel } from '../../lib/dealLifecycle';

interface Props {
  dealId: string | null;
  employeeId: string;
  currentStatus: SalesCallStatus;
  startedAt: string | null;
  onStatusChange: (status: SalesCallStatus) => void;
}

const OUTCOMES: SalesCallOutcome[] = ['proposal_sent', 'verbal_yes', 'follow_up_needed', 'customer_declined', 'rescheduled', 'other'];

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SalesCallTracker({ dealId, employeeId, currentStatus, startedAt, onStatusChange }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [outcome, setOutcome] = useState<SalesCallOutcome>('proposal_sent');
  const [notes, setNotes] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer for active states
  useEffect(() => {
    if (startedAt && currentStatus !== 'none' && currentStatus !== 'completed' && currentStatus !== 'cancelled') {
      const start = new Date(startedAt).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      setElapsed(0);
    }
  }, [startedAt, currentStatus]);

  async function handleAction(action: SalesCallAction, actionNotes?: string, actionOutcome?: SalesCallOutcome) {
    if (!dealId) return;
    setBusy(true);
    try {
      const newStatus = await runSalesCallAction({
        dealId,
        employeeId,
        action,
        notes: actionNotes,
        outcome: actionOutcome,
      });
      onStatusChange(newStatus);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    await handleAction('complete', notes || undefined, outcome);
    setShowComplete(false);
  }

  if (!dealId) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
        <Timer className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">Sales call timer will start after the deal is created</span>
        <button
          type="button"
          disabled
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-400 cursor-not-allowed"
        >
          Start Driving
        </button>
      </div>
    );
  }

  if (currentStatus === 'completed') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-800">Sales call completed</span>
        <span className="text-xs text-green-600 ml-auto">{formatElapsed(elapsed)}</span>
      </div>
    );
  }

  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
        <XCircle className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">Sales call cancelled</span>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: typeof Timer; bg: string; label: string }> = {
    none: { icon: Timer, bg: 'bg-gray-50 border-gray-200', label: 'Ready' },
    enroute: { icon: Navigation, bg: 'bg-blue-50 border-blue-200', label: 'En Route' },
    onsite: { icon: MapPin, bg: 'bg-teal-50 border-teal-200', label: 'On Site' },
    working: { icon: Briefcase, bg: 'bg-emerald-50 border-emerald-200', label: 'Working' },
    paused: { icon: Pause, bg: 'bg-amber-50 border-amber-200', label: 'Paused' },
  };

  const cfg = statusConfig[currentStatus] || statusConfig.none;
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-3 px-4 py-2.5 border rounded-xl ${cfg.bg}`}>
        <StatusIcon className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-semibold">{cfg.label}</span>

        {currentStatus !== 'none' && (
          <span className="font-mono text-sm font-bold tabular-nums">{formatElapsed(elapsed)}</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {currentStatus === 'none' && (
            <button onClick={() => handleAction('start_driving')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5" /> Start Driving
            </button>
          )}
          {currentStatus === 'enroute' && (
            <button onClick={() => handleAction('arrived')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 transition-colors flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Arrived
            </button>
          )}
          {currentStatus === 'onsite' && (
            <button onClick={() => handleAction('begin_work')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5" /> Start Working
            </button>
          )}
          {currentStatus === 'working' && (
            <>
              <button onClick={() => handleAction('pause')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60 transition-colors flex items-center gap-1.5">
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
              <button onClick={() => setShowComplete(true)} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Complete
              </button>
            </>
          )}
          {currentStatus === 'paused' && (
            <button onClick={() => handleAction('resume')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          )}

          {currentStatus !== 'none' && (
            <button onClick={() => handleAction('cancel')} disabled={busy} className="px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 border border-red-200 transition-colors">
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {showComplete && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-green-900">Complete Sales Call</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Outcome</label>
            <div className="flex flex-wrap gap-1.5">
              {OUTCOMES.map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    outcome === o ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-300'
                  }`}
                >
                  {getOutcomeLabel(o)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="How did it go?" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleComplete} disabled={busy} className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">
              {busy ? 'Saving...' : 'Mark Complete'}
            </button>
            <button onClick={() => setShowComplete(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
