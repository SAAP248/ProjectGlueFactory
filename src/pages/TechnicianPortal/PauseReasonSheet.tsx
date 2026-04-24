import { useEffect, useState } from 'react';
import { Coffee, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PauseReason } from './types';

interface Props {
  initialReason?: string | null;
  initialNotes?: string | null;
  title?: string;
  confirmLabel?: string;
  onConfirm: (reason: string, notes: string) => Promise<void>;
  onCancel: () => void;
}

export default function PauseReasonSheet({
  initialReason,
  initialNotes,
  title = 'Pause Job',
  confirmLabel = 'Pause',
  onConfirm,
  onCancel,
}: Props) {
  const [reasons, setReasons] = useState<PauseReason[]>([]);
  const [reason, setReason] = useState<string>(initialReason || '');
  const [notes, setNotes] = useState<string>(initialNotes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('pause_reasons')
        .select('id, label, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order');
      if (data) setReasons(data);
    })();
  }, []);

  async function handleConfirm() {
    if (!reason) return;
    setSaving(true);
    await onConfirm(reason, notes.trim());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Coffee className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">Select a reason to keep the timeline accurate.</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Reason
            </label>
            <div className="flex flex-wrap gap-2">
              {reasons.map(r => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.label)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    reason === r.label
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
              {reasons.length === 0 && (
                <span className="text-xs text-gray-400 italic">Loading reasons…</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any extra context for dispatch or the office..."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none placeholder-gray-400 bg-gray-50"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!reason || saving}
              className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Coffee className="h-4 w-4" />
              {saving ? 'Saving…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
