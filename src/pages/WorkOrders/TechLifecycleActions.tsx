import { useState } from 'react';
import { Car, MapPin, Coffee, Play, CheckCircle, AlertCircle, RotateCcw, X as XIcon } from 'lucide-react';
import { runLifecycleAction, type LifecycleAction } from '../../lib/workOrderLifecycle';

export interface LifecycleTech {
  wotId: string;
  workOrderId: string;
  employeeId: string;
  wotStatus: string;
  enrouteAt: string | null;
  onsiteAt: string | null;
  pausedAt: string | null;
  totalPausedMinutes: number | null;
  employeeName: string;
}

interface Props {
  tech: LifecycleTech;
  onChanged: () => void;
  size?: 'sm' | 'md';
}

interface ActionDef {
  label: string;
  action: LifecycleAction;
  color: string;
  icon: React.ElementType;
  needsCompleteModal?: boolean;
}

function getActions(status: string): ActionDef[] {
  switch (status) {
    case 'assigned':
      return [{ label: 'Start Driving', action: 'start_driving', color: 'bg-blue-600 hover:bg-blue-700', icon: Car }];
    case 'enroute':
      return [{ label: 'Arrived', action: 'arrived', color: 'bg-teal-600 hover:bg-teal-700', icon: MapPin }];
    case 'onsite':
    case 'working':
      return [
        { label: 'Complete', action: 'complete', color: 'bg-emerald-600 hover:bg-emerald-700', icon: CheckCircle, needsCompleteModal: true },
        { label: 'Pause', action: 'take_break', color: 'bg-amber-500 hover:bg-amber-600', icon: Coffee },
        { label: 'Cannot Complete', action: 'cannot_complete', color: 'bg-red-500 hover:bg-red-600', icon: AlertCircle },
        { label: 'Go-Back', action: 'go_back', color: 'bg-orange-500 hover:bg-orange-600', icon: RotateCcw },
      ];
    case 'on_break':
      return [{ label: 'Resume', action: 'resume_work', color: 'bg-emerald-600 hover:bg-emerald-700', icon: Play }];
    default:
      return [];
  }
}

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Assigned',
  enroute: 'Enroute',
  onsite: 'Working',
  working: 'Working',
  on_break: 'On Break',
  completed: 'Completed',
};

const STATUS_COLOR: Record<string, string> = {
  assigned: 'bg-gray-100 text-gray-700',
  enroute: 'bg-blue-100 text-blue-700',
  onsite: 'bg-teal-100 text-teal-700',
  working: 'bg-emerald-100 text-emerald-700',
  on_break: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export default function TechLifecycleActions({ tech, onChanged, size = 'md' }: Props) {
  const [busy, setBusy] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const actions = getActions(tech.wotStatus);
  const btnPad = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  async function run(action: LifecycleAction, extras?: { resolutionNotes?: string; paymentCollected?: number | null; paymentMethod?: string | null }) {
    setBusy(true);
    await runLifecycleAction(
      {
        wotId: tech.wotId,
        workOrderId: tech.workOrderId,
        employeeId: tech.employeeId,
        currentStatus: tech.wotStatus,
        enrouteAt: tech.enrouteAt,
        onsiteAt: tech.onsiteAt,
        pausedAt: tech.pausedAt,
        totalPausedMinutes: tech.totalPausedMinutes,
      },
      action,
      extras
    );
    setBusy(false);
    setCompleteModal(false);
    setResolutionNotes('');
    setPaymentAmount('');
    setPaymentMethod('');
    onChanged();
  }

  async function handleClick(a: ActionDef) {
    if (a.needsCompleteModal) {
      setCompleteModal(true);
      return;
    }
    await run(a.action);
  }

  async function handleCompleteConfirm() {
    const amt = parseFloat(paymentAmount);
    await run('complete', {
      resolutionNotes: resolutionNotes || undefined,
      paymentCollected: !isNaN(amt) && amt > 0 ? amt : null,
      paymentMethod: paymentMethod || null,
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[tech.wotStatus] || 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABEL[tech.wotStatus] || tech.wotStatus}
        </span>
        {actions.map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.action}
              onClick={() => handleClick(a)}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 ${btnPad} rounded-lg font-semibold text-white shadow-sm transition-colors disabled:opacity-60 ${a.color}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {a.label}
            </button>
          );
        })}
        {actions.length === 0 && tech.wotStatus !== 'completed' && (
          <span className="text-xs text-gray-400 italic">No actions available</span>
        )}
      </div>

      {completeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !busy && setCompleteModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Complete Job</h3>
                <p className="text-xs text-gray-500 mt-0.5">{tech.employeeName}</p>
              </div>
              <button onClick={() => !busy && setCompleteModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="What was done on this job?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">None</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-gray-500">Resolution and payment are optional. Job will be marked completed immediately.</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCompleteModal(false)}
                disabled={busy}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteConfirm}
                disabled={busy}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {busy ? 'Saving...' : 'Complete Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
