import { FileText, BookOpen, Eye, Send, Pencil, Plus } from 'lucide-react';
import { customerEstimateLink } from '../Estimates/useEstimates';

export interface DealProposal {
  id: string;
  estimate_number: string;
  status: string;
  total: number;
  public_token: string;
  view_mode: 'estimate' | 'proposal';
  sent_at: string | null;
  viewed_at: string | null;
}

interface Props {
  proposal: DealProposal | null;
  loading: boolean;
  creating: boolean;
  onOpen: () => void;
  onSend: () => void;
  onCreate: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  viewed: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-amber-50 text-amber-800 border-amber-200',
};

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DealProposalCard({ proposal, loading, creating, onOpen, onSend, onCreate }: Props) {
  if (loading && !proposal) {
    return <div className="h-[104px] rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />;
  }

  if (!proposal) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">No estimate yet</p>
          <p className="text-xs text-gray-500 mt-0.5">Every deal has one estimate. Start it here and add equipment.</p>
        </div>
        <button
          onClick={onCreate}
          disabled={creating}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> {creating ? 'Creating…' : 'Create estimate'}
        </button>
      </div>
    );
  }

  const isProposal = proposal.view_mode === 'proposal';
  const statusStyle = STATUS_STYLES[proposal.status] ?? STATUS_STYLES.draft;

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <button
          onClick={onOpen}
          className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 hover:bg-blue-700 transition-colors"
          title="Open estimate"
        >
          {isProposal ? <BookOpen className="h-5 w-5 text-white" /> : <FileText className="h-5 w-5 text-white" />}
        </button>
        <button onClick={onOpen} className="flex-1 min-w-0 text-left group">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
              {isProposal ? 'Proposal' : 'Estimate'}
            </span>
            <span className="font-mono text-xs text-gray-500">{proposal.estimate_number}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${statusStyle}`}>
              {proposal.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {proposal.sent_at ? `Sent ${shortDate(proposal.sent_at)}` : 'Not sent yet'}
            {' · '}
            {proposal.viewed_at ? `Opened ${shortDate(proposal.viewed_at)}` : 'Not opened yet'}
          </p>
        </button>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-900 leading-tight">
            ${Number(proposal.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-blue-100">
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" /> Open / Edit
        </button>
        <button
          onClick={() => window.open(`${customerEstimateLink(proposal.public_token)}?preview=1`, '_blank', 'noopener')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
        <button
          onClick={onSend}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Send className="h-3.5 w-3.5" /> {proposal.sent_at ? 'Resend' : 'Send'}
        </button>
      </div>
    </div>
  );
}
