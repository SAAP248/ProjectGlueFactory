import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Printer, MessageSquare, CheckCircle2, XCircle, Clock, Eye, Loader2, Link2Off } from 'lucide-react';
import type { CustomerEstimateData, EstimateMessage } from './api';
import {
  fetchCustomerEstimate, fetchMessages, markViewed, postCustomerMessage, resolveDealToken, respond,
  subscribeToMessages, uploadEstimateFile, isExpired, formatLongDate,
} from './api';
import EstimateDocument from './EstimateDocument';
import ProposalBook, { PROPOSAL_PAGES } from './ProposalBook';
import type { ProposalPageId } from './ProposalBook';
import ResponseSection from './ResponseSection';
import ConversationPanel from './ConversationPanel';

interface Props {
  token?: string;
  dealToken?: string;
  initialPage?: string;
  preview: boolean;
}

function toPage(p: string | undefined): ProposalPageId {
  return (PROPOSAL_PAGES.find((x) => x.id === p)?.id ?? 'cover') as ProposalPageId;
}

function pageFromHash(): string | undefined {
  return window.location.hash.match(/^#\/estimate\/[^/?]+\/([a-z]+)/)?.[1];
}

export default function CustomerEstimatePage({ token: initialToken, dealToken, initialPage, preview }: Props) {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [data, setData] = useState<CustomerEstimateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<EstimateMessage[] | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [page, setPage] = useState<ProposalPageId>(toPage(initialPage));

  useEffect(() => {
    if (initialToken || !dealToken) return;
    resolveDealToken(dealToken).then((t) => {
      if (t) setToken(t);
      else setError('This proposal link is no longer valid. Please ask your sales representative for a new one.');
    });
  }, [initialToken, dealToken]);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetchCustomerEstimate(token);
    setData(res.data);
    setError(res.error);
  }, [token]);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    const list = await fetchMessages(token);
    if (list) setMessages(list);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    load();
    loadMessages();
    if (!preview) markViewed(token);
  }, [token, preview, load, loadMessages]);

  const estimateId = data?.estimate.id;
  useEffect(() => {
    if (!estimateId) return;
    return subscribeToMessages(estimateId, loadMessages);
  }, [estimateId, loadMessages]);

  useEffect(() => {
    const onHash = () => setPage(toPage(pageFromHash()));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (data) document.title = `${data.estimate.view_mode === 'proposal' ? 'Proposal' : 'Estimate'} ${data.estimate.estimate_number}`;
  }, [data]);

  const navigate = (p: ProposalPageId) => {
    if (!token) return;
    window.location.hash = `#/estimate/${token}/${p}${preview ? '?preview=1' : ''}`;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nameKey = token ? `estimate-contact-${token}` : '';
  const savedName = (nameKey && localStorage.getItem(nameKey)) || data?.estimate.customer_name_signed || '';

  const handleSend = async (input: { name: string; message: string; file: File | null; referenceItem: { id: string; description: string | null } | null }) => {
    if (!token || !data) return 'This document is not loaded yet.';
    if (preview) return 'Preview mode: use the Customer Conversation section in the estimate panel to reply.';
    localStorage.setItem(nameKey, input.name);
    let attachment = null;
    if (input.file) {
      const up = await uploadEstimateFile(data.estimate.id, input.file);
      if (up.error || !up.path) return up.error;
      attachment = { path: up.path, name: input.file.name, type: input.file.type, size: input.file.size };
    }
    const isProposal = data.estimate.view_mode === 'proposal';
    const reference = input.referenceItem
      ? { type: 'product' as const, id: input.referenceItem.id, label: input.referenceItem.description || 'Item' }
      : isProposal && page !== 'cover'
        ? { type: 'system' as const, id: null, label: `${PROPOSAL_PAGES.find((p) => p.id === page)?.label} page` }
        : null;
    const err = await postCustomerMessage(token, { name: input.name, message: input.message, reference, attachment });
    if (!err) await loadMessages();
    return err;
  };

  const handleAccept = async (f: { name: string; email: string; signatureType: 'typed' | 'drawn'; signatureData: string | null }) => {
    if (!token || preview) return null;
    const err = await respond(token, 'accept', f);
    if (!err) { localStorage.setItem(nameKey, f.name); await load(); }
    return err;
  };

  const handleDecline = async (reason: string) => {
    if (!token || preview) return null;
    const err = await respond(token, 'decline', { reason });
    if (!err) await load();
    return err;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
          <Link2Off className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-900 mb-2">We couldn't open this document</h1>
          <p className="text-sm text-slate-500">{error}</p>
          <button onClick={load} className="mt-6 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">Try again</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Loading your document...</div>
      </div>
    );
  }

  const est = data.estimate;
  const isProposal = est.view_mode === 'proposal';
  const docLabel = isProposal ? 'Proposal' : 'Estimate';
  const staffReplies = (messages || []).filter((m) => m.sender_type === 'staff').length;

  const response = (
    <ResponseSection estimate={est} preview={preview} onAccept={handleAccept} onDecline={handleDecline} onAskQuestion={() => setChatOpen(true)} />
  );

  return (
    <div className="min-h-screen bg-slate-100/70 print:bg-white">
      {preview && (
        <div className="bg-blue-600 text-white text-xs sm:text-sm py-2 px-4 text-center flex items-center justify-center gap-2 print:hidden">
          <Eye className="w-4 h-4" /> Preview: this is exactly what your customer sees. Views and responses are not recorded.
        </div>
      )}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{data.business?.name || 'Your Proposal'}</p>
              <p className="text-xs text-slate-500 truncate">{docLabel} #{est.estimate_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={est.status} expired={isExpired(est)} expires={est.expiration_date} />
            <button onClick={() => window.print()} className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={() => setChatOpen(true)} className="relative flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
              <MessageSquare className="w-4 h-4" /> <span className="hidden sm:inline">Questions</span>
              {staffReplies > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-teal-500 text-[11px] font-semibold flex items-center justify-center ring-2 ring-white">{staffReplies}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {isProposal ? (
        <ProposalBook data={data} page={page} onNavigate={navigate} response={response} />
      ) : (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          <div className="animate-fade-in"><EstimateDocument data={data} /></div>
          {(est.terms || data.settings.proposal_terms) && (
            <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-0" open={false}>
              <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between text-sm font-semibold text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors">
                Terms & Conditions
                <span className="text-xs font-normal text-slate-500 group-open:hidden">Show</span>
                <span className="text-xs font-normal text-slate-500 hidden group-open:inline">Hide</span>
              </summary>
              <p className="px-6 pb-6 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{est.terms || data.settings.proposal_terms}</p>
            </details>
          )}
          {response}
        </main>
      )}

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-center print:hidden">
        <p className="text-xs text-slate-400">Questions? Tap "Questions" at the top to message our sales team directly.</p>
      </footer>

      <ConversationPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        lineItems={data.line_items}
        defaultName={savedName}
        pageLabel={isProposal && page !== 'cover' ? PROPOSAL_PAGES.find((p) => p.id === page)?.label : undefined}
        onSend={handleSend}
      />
    </div>
  );
}

function StatusPill({ status, expired, expires }: { status: string; expired: boolean; expires: string | null }) {
  if (status === 'approved') {
    return <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Accepted</span>;
  }
  if (status === 'declined') {
    return <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"><XCircle className="w-3.5 h-3.5" /> Declined</span>;
  }
  if (!expires) return null;
  return (
    <span className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${expired ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-white text-slate-600 border-slate-200'}`}>
      <Clock className="w-3.5 h-3.5" /> {expired ? 'Expired' : `Valid until ${formatLongDate(expires)}`}
    </span>
  );
}
