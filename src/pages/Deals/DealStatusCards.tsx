import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clock, Lock, X } from 'lucide-react';
import type { Deal, StatusField, StatusGroup } from './types';
import { STATUS_GROUPS, getDaysInStage, getStageColor, isOffPath } from './types';

interface Props {
  deal: Deal;
  onChange: (field: StatusField, value: string, reason?: string) => Promise<void>;
}

const ENTERED_AT: Record<StatusField, keyof Deal> = {
  sales_stage: 'stage_entered_at',
  install_status: 'install_status_entered_at',
  office_status: 'office_status_entered_at',
};

const REASON_PROMPTS: Record<string, string> = {
  'Lost': 'Why was this deal lost?',
  'Did not sell': 'Why did this deal not sell?',
  'Purchased From Another': 'Who did they buy from, and why?',
  'Customer Cancelled': 'Why did the customer cancel?',
};

function StatusCard({ group, deal, onChange, onAskReason }: {
  group: StatusGroup;
  deal: Deal;
  onChange: Props['onChange'];
  onAskReason: (field: StatusField, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = deal[group.field] as string | null;
  const locked = current == null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = async (value: string) => {
    setOpen(false);
    if (value === current) return;
    if (group.needsReason.includes(value)) { onAskReason(group.field, value); return; }
    setSaving(true);
    await onChange(group.field, value);
    setSaving(false);
  };

  const enteredAt = deal[ENTERED_AT[group.field]] as string | null | undefined;
  const days = enteredAt ? getDaysInStage(enteredAt) : null;
  const pathIdx = current ? group.mainPath.indexOf(current) : -1;
  const offPath = isOffPath(current);
  const extras = group.options.filter(o => !group.mainPath.includes(o));

  return (
    <div ref={ref} className={`relative rounded-xl border p-3 transition-all ${
      locked ? 'border-dashed border-gray-200 bg-gray-50/60' : offPath ? 'border-red-200 bg-red-50/40' : 'border-gray-200 bg-white hover:shadow-sm'
    }`}>
      <button
        disabled={locked || saving}
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between text-left group disabled:cursor-default"
      >
        <span className={`text-xs font-semibold uppercase tracking-wider ${locked ? 'text-gray-400' : 'text-gray-600 group-hover:text-blue-600'}`}>
          {group.label}
        </span>
        {locked ? <Lock className="h-3 w-3 text-gray-300" /> : (
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {locked ? (
        <p className="mt-2.5 text-xs text-gray-400">Starts when sold</p>
      ) : (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            disabled={saving}
            className={`mt-2 inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity ${getStageColor(current ?? '')} ${saving ? 'opacity-50' : ''}`}
          >
            <span className="truncate">{current}</span>
          </button>
          <div className="mt-2.5 flex gap-0.5" aria-hidden>
            {group.mainPath.map((s, i) => (
              <span
                key={s}
                title={s}
                className={`h-1 flex-1 rounded-full ${offPath ? 'bg-red-200' : i <= pathIdx ? 'bg-blue-500' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          {days !== null && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-500">
              <Clock className="h-3 w-3" /> {days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'}`} in status
            </p>
          )}
        </>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 min-w-[200px] rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          {group.mainPath.map(o => (
            <button key={o} onClick={() => pick(o)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50">
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${o === current ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                {o === current && <Check className="h-3 w-3 text-white" />}
              </span>
              {o}
            </button>
          ))}
          {extras.length > 0 && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Other outcomes</p>
              {extras.map(o => (
                <button key={o} onClick={() => pick(o)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-700 hover:bg-red-50">
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${o === current ? 'border-red-600 bg-red-600' : 'border-red-200'}`}>
                    {o === current && <Check className="h-3 w-3 text-white" />}
                  </span>
                  {o}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DealStatusCards({ deal, onChange }: Props) {
  const [reasonFor, setReasonFor] = useState<{ field: StatusField; value: string } | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submitReason = async () => {
    if (!reasonFor || !reason.trim()) return;
    setSaving(true);
    await onChange(reasonFor.field, reasonFor.value, reason.trim());
    setSaving(false);
    setReasonFor(null);
    setReason('');
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STATUS_GROUPS.map(g => (
          <StatusCard key={g.field} group={g} deal={deal} onChange={onChange} onAskReason={(field, value) => setReasonFor({ field, value })} />
        ))}
      </div>
      {deal.lost_reason && isOffPath(deal.sales_stage) && (
        <p className="mt-2 text-xs text-red-700"><span className="font-semibold">Reason:</span> {deal.lost_reason}</p>
      )}

      {reasonFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={() => setReasonFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Mark as "{reasonFor.value}"</h3>
                <p className="mt-0.5 text-sm text-gray-500">{REASON_PROMPTS[reasonFor.value] ?? 'Add a reason'}</p>
              </div>
              <button onClick={() => setReasonFor(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="mt-4 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Price was too high"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReasonFor(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
              <button
                onClick={submitReason}
                disabled={!reason.trim() || saving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
