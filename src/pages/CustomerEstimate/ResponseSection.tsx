import { useState } from 'react';
import { CheckCircle2, XCircle, PenLine, Type, Loader2, Clock, Eye } from 'lucide-react';
import SignaturePad from '../Inspections/SignaturePad';
import type { CustomerEstimate } from './api';
import { formatLongDate, formatMoney, isExpired } from './api';

const SIGNATURE_FONT = { fontFamily: "'Dancing Script', 'Brush Script MT', cursive" };

interface Props {
  estimate: CustomerEstimate;
  preview: boolean;
  onAccept: (f: { name: string; email: string; signatureType: 'typed' | 'drawn'; signatureData: string | null }) => Promise<string | null>;
  onDecline: (reason: string) => Promise<string | null>;
  onAskQuestion: () => void;
}

export default function ResponseSection({ estimate: est, preview, onAccept, onDecline, onAskQuestion }: Props) {
  const [mode, setMode] = useState<'idle' | 'accept' | 'decline'>('idle');
  const [sigType, setSigType] = useState<'typed' | 'drawn'>('typed');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [drawn, setDrawn] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (est.status === 'approved' && est.accepted_at) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 animate-fade-in">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-emerald-950">Accepted. Thank you!</h3>
            <p className="text-sm text-emerald-800 mt-1">Accepted on {formatLongDate(est.accepted_at)}. Our team will reach out shortly to schedule your project.</p>
            <div className="mt-5 rounded-xl bg-white border border-emerald-100 p-4">
              <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-400 mb-2">Signature</p>
              {est.signature_type === 'drawn' && est.signature_data ? (
                <img src={est.signature_data} alt={`Signature of ${est.customer_name_signed || 'customer'}`} className="h-16 object-contain" />
              ) : (
                <p className="text-3xl text-slate-900" style={SIGNATURE_FONT}>{est.customer_name_signed}</p>
              )}
              <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">{est.customer_name_signed}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (est.status === 'declined' && est.declined_at) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
        <XCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-900">You declined this on {formatLongDate(est.declined_at)}</h3>
        {est.declined_reason && <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">"{est.declined_reason}"</p>}
        <p className="text-sm text-slate-500 mt-4">Changed your mind or want adjustments?</p>
        <button onClick={onAskQuestion} className="mt-3 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Message our team</button>
      </section>
    );
  }

  if (isExpired(est)) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8 text-center">
        <Clock className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-amber-950">This estimate expired on {formatLongDate(est.expiration_date)}</h3>
        <p className="text-sm text-amber-800 mt-1">Pricing may have changed. Ask us for an updated version.</p>
        <button onClick={onAskQuestion} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors">Request an update</button>
      </section>
    );
  }

  const signatureReady = sigType === 'typed' ? name.trim().length >= 2 : !!drawn && name.trim().length >= 2;

  const submitAccept = async () => {
    if (!signatureReady || !agreed) return;
    setBusy(true);
    setError(null);
    const err = await onAccept({ name: name.trim(), email: email.trim(), signatureType: sigType, signatureData: sigType === 'drawn' ? drawn : null });
    setBusy(false);
    if (err) setError(err);
  };

  const submitDecline = async () => {
    setBusy(true);
    setError(null);
    const err = await onDecline(reason.trim());
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden print:hidden">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Ready to move forward?</h3>
            <p className="text-sm text-slate-500 mt-1">Total investment <span className="font-semibold text-slate-900">{formatMoney(est.total)}</span></p>
          </div>
          {mode === 'idle' && (
            <div className="flex gap-2">
              <button onClick={() => setMode('decline')} className="px-5 py-3 text-sm font-medium text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">Decline</button>
              <button onClick={() => setMode('accept')} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm hover:shadow transition-all">
                <CheckCircle2 className="w-4 h-4" /> Accept & Sign
              </button>
            </div>
          )}
        </div>

        {preview && mode !== 'idle' && (
          <p className="mt-5 flex items-center gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <Eye className="w-3.5 h-3.5" /> Preview mode: responses are disabled so nothing is recorded.
          </p>
        )}
        {error && <p className="mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        {mode === 'accept' && (
          <div className="mt-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Full name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Jane Smith"
                  className="mt-1.5 w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email <span className="text-slate-400 font-normal">(optional)</span></span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} placeholder="jane@example.com"
                  className="mt-1.5 w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Signature</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium">
                  {([['typed', 'Type', Type], ['drawn', 'Draw', PenLine]] as const).map(([k, label, Icon]) => (
                    <button key={k} onClick={() => setSigType(k)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${sigType === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>
              {sigType === 'typed' ? (
                <div className="h-[100px] rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center px-6">
                  <span className={`text-4xl truncate ${name ? 'text-slate-900' : 'text-slate-300'}`} style={SIGNATURE_FONT}>{name || 'Your signature'}</span>
                </div>
              ) : (
                <SignaturePad value={null} onChange={setDrawn} />
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-600" />
              <span className="text-sm text-slate-700">I have reviewed this estimate, including the terms and conditions, and authorize the work described for {formatMoney(est.total)}.</span>
            </label>

            <div className="flex gap-2">
              <button onClick={submitAccept} disabled={preview || busy || !signatureReady || !agreed}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirm & Accept
              </button>
              <button onClick={() => setMode('idle')} className="px-4 py-3 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {mode === 'decline' && (
          <div className="mt-6 space-y-4 animate-fade-in">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Help us improve <span className="text-slate-400 font-normal">(optional)</span></span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000}
                placeholder="Budget, timing, scope... anything we could adjust?"
                className="mt-1.5 w-full px-4 py-3 text-sm border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
            </label>
            <div className="flex gap-2">
              <button onClick={submitDecline} disabled={preview || busy}
                className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Decline Estimate
              </button>
              <button onClick={() => setMode('idle')} className="px-4 py-3 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
