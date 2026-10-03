import { useEffect, useState, type ReactNode } from 'react';
import { Link2, Copy, Check, Eye, FileText, BookOpen, ChevronDown, Loader2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EstimateRecord } from './useEstimates';
import { customerEstimateLink } from './useEstimates';

interface Props {
  estimate: EstimateRecord;
  onSaved: () => void;
  onSend: () => void;
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function CustomerLinkCard({ estimate, onSaved, onSend }: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentOpen, setContentOpen] = useState(false);
  const [coverTitle, setCoverTitle] = useState(estimate.cover_title || '');
  const [coverImage, setCoverImage] = useState(estimate.cover_image_url || '');
  const [scope, setScope] = useState(estimate.scope_of_work || '');

  useEffect(() => {
    setCoverTitle(estimate.cover_title || '');
    setCoverImage(estimate.cover_image_url || '');
    setScope(estimate.scope_of_work || '');
  }, [estimate.id, estimate.cover_title, estimate.cover_image_url, estimate.scope_of_work]);

  const link = customerEstimateLink(estimate.public_token);
  const isProposal = estimate.view_mode === 'proposal';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed. Select the link and copy it manually.');
    }
  };

  const update = async (key: string, values: Partial<EstimateRecord>) => {
    setBusy(key);
    setError(null);
    const { error: err } = await supabase.from('estimates').update(values).eq('id', estimate.id);
    setBusy(null);
    if (err) { setError('Changes could not be saved. Please try again.'); return false; }
    onSaved();
    return true;
  };

  const coverImageValid = !coverImage.trim() || /^https:\/\//i.test(coverImage.trim());

  const saveContent = async () => {
    if (!coverImageValid) return;
    const ok = await update('content', {
      cover_title: coverTitle.trim() || null,
      cover_image_url: coverImage.trim() || null,
      scope_of_work: scope.trim() || null,
    });
    if (ok) setContentOpen(false);
  };

  return (
    <section className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500 font-medium">
          <Link2 className="w-3.5 h-3.5" /> Customer Link
        </p>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${isProposal ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-white text-gray-700 border-gray-200'}`}>
            {isProposal ? <BookOpen className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            {estimate.sent_at ? 'Sent as' : 'Shows as'} {isProposal ? 'Proposal' : 'Estimate'}
          </span>
          <button onClick={onSend} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 rounded-md hover:bg-blue-50 transition-colors">
            <Send className="w-3.5 h-3.5" /> {estimate.sent_at ? 'Change / Resend' : 'Send'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <input readOnly value={link} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 px-3 py-2 text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded-lg" />
          <button onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={() => window.open(`${link}?preview=1`, '_blank', 'noopener')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
            <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Preview</span>
          </button>
        </div>

        <p className="text-xs text-gray-500">
          {estimate.sent_at ? <>Sent <span className="font-medium text-gray-700">{formatDateTime(estimate.sent_at)}</span> &middot; </> : <>Not sent yet &middot; </>}
          {estimate.viewed_at ? (
            <>Customer first opened this on <span className="font-medium text-gray-700">{formatDateTime(estimate.viewed_at)}</span>
              {estimate.last_viewed_at && estimate.last_viewed_at !== estimate.viewed_at && <> &middot; last viewed {formatDateTime(estimate.last_viewed_at)}</>}</>
          ) : 'Not viewed by the customer yet.'}
          {' '}Customers see this as {isProposal ? 'a multi-page proposal book' : 'a single-page estimate'}.
        </p>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {isProposal && (
          <div className="rounded-lg border border-gray-200">
            <button onClick={() => setContentOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 rounded-lg transition-colors">
              Proposal content
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${contentOpen ? 'rotate-180' : ''}`} />
            </button>
            {contentOpen && (
              <div className="px-3 pb-3 space-y-3 animate-fade-in">
                <p className="text-xs text-gray-500">Leave blank to use the defaults from Settings. About Us and Terms come from Settings; this estimate's own terms override them when filled in.</p>
                <Field label="Cover title">
                  <input value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} placeholder="e.g. Security Upgrade Proposal" className={inputCls} />
                </Field>
                <Field label="Cover image URL" error={coverImageValid ? undefined : 'Use a secure link starting with https://'}>
                  <input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." className={inputCls} />
                </Field>
                <Field label="Scope of work">
                  <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={6} placeholder="Describe what the project includes..." className={`${inputCls} resize-y`} />
                </Field>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setContentOpen(false)} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={saveContent} disabled={busy === 'content' || !coverImageValid} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {busy === 'content' && <Loader2 className="w-4 h-4 animate-spin" />} Save content
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
