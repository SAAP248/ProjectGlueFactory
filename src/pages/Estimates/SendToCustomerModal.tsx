import { useEffect, useState } from 'react';
import { X, FileText, BookOpen, Layers, LayoutGrid, Eye, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { customerEstimateLink } from './useEstimates';

type ViewMode = 'estimate' | 'proposal';
type Grouping = 'by_system' | 'by_room';

interface SendableEstimate {
  id: string;
  estimate_number: string;
  status: string;
  view_mode: ViewMode;
  grouping_mode: Grouping | null;
  public_token: string;
  sent_at: string | null;
  deal_id: string | null;
}

interface Props {
  estimateId: string;
  onClose: () => void;
  onSent?: (mode: ViewMode) => void | Promise<void>;
}

const VIEW_OPTIONS: { mode: ViewMode; label: string; desc: string; Icon: typeof FileText }[] = [
  { mode: 'estimate', label: 'Estimate', desc: 'A single clean page with line items, totals and Accept / Decline. Best for quick quotes and service work.', Icon: FileText },
  { mode: 'proposal', label: 'Proposal', desc: 'A multi-page book: cover, About Us, scope of work, the estimate, then terms with Accept / Decline.', Icon: BookOpen },
];

export default function SendToCustomerModal({ estimateId, onClose, onSent }: Props) {
  const [est, setEst] = useState<SendableEstimate | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hasSystems, setHasSystems] = useState(false);
  const [hasRooms, setHasRooms] = useState(false);
  const [mode, setMode] = useState<ViewMode>('estimate');
  const [grouping, setGrouping] = useState<Grouping>('by_system');
  const [busy, setBusy] = useState<'preview' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('estimates')
        .select('id, estimate_number, status, view_mode, grouping_mode, public_token, sent_at, deal_id')
        .eq('id', estimateId)
        .maybeSingle();
      if (!active) return;
      if (err || !data) { setLoadError(true); return; }
      const record = data as SendableEstimate;
      const [rooms, systems] = await Promise.all([
        supabase.from('proposal_rooms').select('id', { count: 'exact', head: true }).eq('estimate_id', estimateId),
        record.deal_id
          ? supabase.from('deal_systems').select('id', { count: 'exact', head: true }).eq('deal_id', record.deal_id)
          : Promise.resolve({ count: 0 }),
      ]);
      if (!active) return;
      const roomsAvailable = (rooms.count ?? 0) > 0;
      setHasRooms(roomsAvailable);
      setHasSystems((systems.count ?? 0) > 0);
      setEst(record);
      setMode(record.view_mode === 'proposal' ? 'proposal' : 'estimate');
      setGrouping(record.grouping_mode === 'by_room' && roomsAvailable ? 'by_room' : 'by_system');
    })();
    return () => { active = false; };
  }, [estimateId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const link = est ? customerEstimateLink(est.public_token) : '';
  const showGrouping = hasSystems && hasRooms;

  const saveChoices = async (markSent: boolean) => {
    if (!est) return false;
    const updates: Record<string, unknown> = { view_mode: mode, grouping_mode: grouping, updated_at: new Date().toISOString() };
    if (markSent) {
      updates.sent_at = new Date().toISOString();
      if (est.status === 'draft') updates.status = 'sent';
    }
    const { error: err } = await supabase.from('estimates').update(updates).eq('id', est.id);
    if (err) { setError('Your choices could not be saved. Please try again.'); return false; }
    return true;
  };

  const preview = async () => {
    setBusy('preview');
    setError(null);
    const ok = await saveChoices(false);
    setBusy(null);
    if (ok) window.open(`${link}?preview=1`, '_blank', 'noopener');
  };

  const send = async () => {
    setBusy('send');
    setError(null);
    const ok = await saveChoices(true);
    if (!ok) { setBusy(null); return; }
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      setError('Saved and marked as sent, but the link could not be copied automatically. Copy it from the box above.');
    }
    await onSent?.(mode);
    setBusy(null);
    setSent(true);
  };

  const label = mode === 'proposal' ? 'Proposal' : 'Estimate';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="send-modal-title" className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-fade-in">
        <header className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div>
            <h2 id="send-modal-title" className="text-base font-semibold text-gray-900">Send to Customer</h2>
            <p className="text-xs text-gray-500">{est ? `Estimate #${est.estimate_number}` : 'Loading...'}{est?.sent_at && ` · last sent ${new Date(est.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="w-5 h-5" /></button>
        </header>

        {loadError ? (
          <p className="p-10 text-center text-sm text-red-600">This estimate could not be loaded. Close this window and try again.</p>
        ) : !est ? (
          <div className="p-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : sent ? (
          <div className="p-10 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Sent as {label}</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{error ? error : 'The customer link is copied to your clipboard. Paste it into an email or text to your customer.'}</p>
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="mt-5 w-full max-w-md px-3 py-2 text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded-lg" />
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={() => window.open(`${link}?preview=1`, '_blank', 'noopener')} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">Done</button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <fieldset>
              <legend className="text-sm font-semibold text-gray-900 mb-1">How should the customer see it?</legend>
              <p className="text-xs text-gray-500 mb-3">Same prices and items either way. Only the presentation changes.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
                {VIEW_OPTIONS.map(({ mode: m, label: l, desc, Icon }) => {
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMode(m)}
                      className={`group text-left rounded-xl border-2 p-4 transition-all ${active ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                    >
                      <ViewThumbnail mode={m} active={active} />
                      <div className="mt-3 flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${active ? 'text-blue-700' : 'text-gray-500'}`} />
                        <span className={`text-sm font-semibold ${active ? 'text-blue-900' : 'text-gray-900'}`}>{l}</span>
                        <span className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-blue-600' : 'border-gray-300'}`}>
                          {active && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {showGrouping && (
              <fieldset>
                <legend className="text-sm font-semibold text-gray-900 mb-2">Group items by</legend>
                <div className="inline-flex p-1 bg-gray-100 rounded-lg text-sm font-medium" role="radiogroup">
                  {([['by_system', 'System', Layers], ['by_room', 'Room', LayoutGrid]] as const).map(([k, l, Icon]) => (
                    <button
                      key={k}
                      role="radio"
                      aria-checked={grouping === k}
                      onClick={() => setGrouping(k)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md transition-all ${grouping === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      <Icon className="w-4 h-4" /> {l}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Customer link</p>
              <input readOnly value={link} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded-lg" />
              <p className="mt-1.5 text-xs text-gray-500">The link stays the same. Changing the view later updates what the customer sees.</p>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={preview} disabled={busy !== null} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                {busy === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview as Customer
              </button>
              <button onClick={send} disabled={busy !== null} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors">
                {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Copy Link & Send as {label}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ViewThumbnail({ mode, active }: { mode: ViewMode; active: boolean }) {
  const line = active ? 'bg-blue-200' : 'bg-gray-200';
  if (mode === 'estimate') {
    return (
      <div className="h-24 rounded-lg bg-white border border-gray-200 p-2.5 flex flex-col gap-1.5 overflow-hidden">
        <div className="flex justify-between"><div className={`h-2 w-10 rounded ${active ? 'bg-blue-600' : 'bg-gray-400'}`} /><div className={`h-2 w-8 rounded ${line}`} /></div>
        <div className={`h-1.5 w-full rounded ${active ? 'bg-gray-800' : 'bg-gray-500'}`} />
        {[0, 1, 2].map((i) => <div key={i} className="flex gap-1"><div className={`h-1.5 flex-1 rounded ${line}`} /><div className={`h-1.5 w-6 rounded ${line}`} /></div>)}
        <div className="mt-auto flex justify-end gap-1"><div className="h-2.5 w-8 rounded bg-emerald-400" /><div className="h-2.5 w-6 rounded bg-gray-200" /></div>
      </div>
    );
  }
  return (
    <div className="h-24 flex items-end justify-center gap-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-20 w-12 rounded-md border bg-white p-1.5 flex flex-col gap-1 transition-transform ${active ? 'border-blue-200' : 'border-gray-200'} ${i === 0 ? '-rotate-6' : i === 3 ? 'rotate-6' : ''}`}
        >
          {i === 0 ? (
            <div className={`flex-1 rounded ${active ? 'bg-gradient-to-br from-blue-600 to-teal-500' : 'bg-gray-300'}`} />
          ) : (
            <>
              <div className={`h-1.5 w-2/3 rounded ${active ? 'bg-blue-500' : 'bg-gray-400'}`} />
              <div className={`h-1 w-full rounded ${line}`} />
              <div className={`h-1 w-full rounded ${line}`} />
              <div className={`h-1 w-3/4 rounded ${line}`} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
