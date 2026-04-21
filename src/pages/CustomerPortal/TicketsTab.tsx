import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LifeBuoy, Plus, X, ChevronRight, ArrowLeft, MessageSquare, Lock, Globe, Send, Clock } from 'lucide-react';
import type { PortalUser } from './types';

interface PortalTicket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  source: string;
  created_at: string;
  updated_at: string;
  comment_count?: number;
}

interface PortalTicketComment {
  id: string;
  body: string;
  is_public: boolean;
  author_employee_id: string | null;
  author_portal_user_id: string | null;
  created_at: string;
  employees?: { first_name: string; last_name: string } | null;
  customer_portal_users?: { first_name: string; last_name: string } | null;
}

interface Props {
  user: PortalUser;
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  open:     'bg-blue-100 text-blue-700',
  pending:  'bg-amber-100 text-amber-700',
  on_hold:  'bg-gray-100 text-gray-600',
  resolved: 'bg-green-100 text-green-700',
  closed:   'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', pending: 'Pending', on_hold: 'On Hold', resolved: 'Resolved', closed: 'Closed',
};

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TicketsTab({ user, loading: parentLoading }: Props) {
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'new'>('list');
  const [selectedTicket, setSelectedTicket] = useState<PortalTicket | null>(null);
  const [comments, setComments] = useState<PortalTicketComment[]>([]);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parentLoading) loadTickets();
  }, [user.company_id, parentLoading]);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, priority, source, created_at, updated_at')
      .eq('company_id', user.company_id)
      .or(`show_in_customer_portal.eq.true,created_by_portal_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const list = data || [];

    if (list.length > 0) {
      const ids = list.map((t: any) => t.id);
      const { data: counts } = await supabase
        .from('ticket_comments')
        .select('ticket_id')
        .in('ticket_id', ids)
        .eq('is_public', true);

      const countMap: Record<string, number> = {};
      (counts || []).forEach((c: any) => { countMap[c.ticket_id] = (countMap[c.ticket_id] || 0) + 1; });

      setTickets(list.map((t: any) => ({ ...t, comment_count: countMap[t.id] || 0 })));
    } else {
      setTickets([]);
    }
    setLoading(false);
  }

  async function loadComments(ticketId: string) {
    const { data } = await supabase
      .from('ticket_comments')
      .select(`
        id, body, is_public, author_employee_id, author_portal_user_id, created_at,
        employees(first_name, last_name),
        customer_portal_users(first_name, last_name)
      `)
      .eq('ticket_id', ticketId)
      .eq('is_public', true)
      .order('created_at', { ascending: true });
    setComments(data || []);
  }

  async function handleViewTicket(ticket: PortalTicket) {
    setSelectedTicket(ticket);
    await loadComments(ticket.id);
    setView('detail');
  }

  async function handleReply() {
    if (!replyBody.trim() || !selectedTicket) return;
    setSubmitting(true);

    await supabase.from('ticket_comments').insert({
      ticket_id: selectedTicket.id,
      body: replyBody.trim(),
      is_public: true,
      author_portal_user_id: user.id,
    });

    setReplyBody('');
    await loadComments(selectedTicket.id);
    setSubmitting(false);
  }

  async function handleCreateTicket() {
    if (!newForm.title.trim()) { setError('Subject is required'); return; }
    setCreating(true);
    setError(null);

    const { data, error: err } = await supabase.from('tickets').insert({
      title: newForm.title.trim(),
      description: newForm.description || null,
      company_id: user.company_id,
      source: 'portal',
      status: 'open',
      priority: 'normal',
      ticket_type: 'support',
      show_in_customer_portal: true,
      created_by_portal_user_id: user.id,
      updated_at: new Date().toISOString(),
    }).select('id').single();

    if (err) { setError(err.message); setCreating(false); return; }

    await supabase.from('ticket_timeline').insert({
      ticket_id: data.id,
      event_type: 'created',
      description: 'Ticket submitted via customer portal',
      actor_portal_user_id: user.id,
    });

    setNewForm({ title: '', description: '' });
    await loadTickets();
    setView('list');
    setCreating(false);
  }

  if (loading || parentLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (view === 'new') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <LifeBuoy className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Submit a Support Request</h2>
              <p className="text-sm text-gray-500">We'll respond as soon as possible</p>
            </div>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newForm.title}
                onChange={e => setNewForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of your issue"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Details</label>
              <textarea
                value={newForm.description}
                onChange={e => setNewForm(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                placeholder="Please describe your issue in detail..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setView('list')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreateTicket}
              disabled={creating}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {creating ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedTicket) {
    const canReply = selectedTicket.status !== 'closed';
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={() => { setView('list'); setSelectedTicket(null); setComments([]); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-gray-400">{selectedTicket.ticket_number}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedTicket.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
                  </span>
                </div>
                <h2 className="text-base font-bold text-gray-900">{selectedTicket.title}</h2>
                <p className="text-xs text-gray-400 mt-1">Opened {formatRelative(selectedTicket.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
            {comments.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No replies yet. Our team will respond soon.</p>
              </div>
            )}
            {comments.map(c => {
              const isCustomer = !!c.author_portal_user_id;
              const name = isCustomer
                ? (c.customer_portal_users ? `${c.customer_portal_users.first_name} ${c.customer_portal_users.last_name}` : 'You')
                : (c.employees ? `${c.employees.first_name} ${c.employees.last_name}` : 'Support Team');
              const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div key={c.id} className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isCustomer ? 'bg-teal-500 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {initials}
                  </div>
                  <div className={`flex-1 max-w-lg ${isCustomer ? 'flex flex-col items-end' : ''}`}>
                    <div className={`rounded-xl px-4 py-3 ${isCustomer ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{isCustomer ? 'You' : name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{formatRelative(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{c.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {canReply && (
            <div className="border-t border-gray-100 p-4">
              <div className="rounded-xl border-2 border-blue-200">
                <textarea
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  rows={3}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2.5 text-sm focus:outline-none resize-none rounded-t-xl"
                />
                <div className="flex items-center justify-between px-3 pb-2.5">
                  <span className="text-xs text-gray-400">Reply to this support ticket</span>
                  <button
                    onClick={handleReply}
                    disabled={!replyBody.trim() || submitting}
                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Support Tickets</h2>
          <p className="text-sm text-gray-500 mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setView('new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Submit Request
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <LifeBuoy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">No support tickets yet</h3>
          <p className="text-sm text-gray-500 mb-6">Need help? Submit a support request and our team will get back to you.</p>
          <button
            onClick={() => setView('new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Submit Request
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => (
            <button
              key={ticket.id}
              onClick={() => handleViewTicket(ticket)}
              className="w-full bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 hover:border-blue-300 hover:bg-blue-50 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <LifeBuoy className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs text-gray-400">{ticket.ticket_number}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">{ticket.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {(ticket.comment_count || 0) > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MessageSquare className="h-3 w-3" />
                      {ticket.comment_count}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {formatRelative(ticket.updated_at)}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
