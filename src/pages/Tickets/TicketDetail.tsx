import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, MessageSquare, Lock, Globe, ChevronDown, User,
  Paperclip, Send, Link, X, ClipboardList, CheckSquare,
  XCircle, ChevronRight, Building2, MapPin, Radio, DollarSign,
  TrendingUp, Clock, AlertCircle, LifeBuoy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTicketDetail, addTicketComment, updateTicketField, removeLinkedRecord, addLinkedRecord, logTimelineEvent } from './hooks';
import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_OPTIONS, SOURCE_OPTIONS } from './types';
import type { TicketStatus, TicketPriority, TicketType, LinkedRecordType } from './types';

interface Employee { id: string; first_name: string; last_name: string; role: string; }

interface Props {
  ticketId: string;
  onBack: () => void;
  onConvertToWorkOrder: (ticketId: string) => void;
}

const RECORD_TYPE_ICONS: Record<string, React.ElementType> = {
  site: MapPin, system: Radio, deal: TrendingUp, invoice: DollarSign, work_order: ClipboardList,
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  site: 'Site', system: 'System', deal: 'Deal', invoice: 'Invoice', work_order: 'Work Order',
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return formatTime(dateStr);
}

export default function TicketDetail({ ticketId, onBack, onConvertToWorkOrder }: Props) {
  const { ticket, loading, error, reload } = useTicketDetail(ticketId);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [replyBody, setReplyBody] = useState('');
  const [isPublicReply, setIsPublicReply] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [linkType, setLinkType] = useState<LinkedRecordType>('site');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState<{ id: string; label: string }[]>([]);
  const commentEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('employees').select('id, first_name, last_name, role').eq('status', 'active').order('first_name')
      .then(({ data }) => { if (data) setEmployees(data); });
  }, []);

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.comments.length]);

  async function handleReply() {
    if (!replyBody.trim()) return;
    setSubmitting(true);
    await addTicketComment(ticketId, replyBody.trim(), isPublicReply);
    setReplyBody('');
    await reload();
    setSubmitting(false);
  }

  async function handleUpdateStatus(status: TicketStatus) {
    setSaving('status');
    const updates: any = { status };
    if (status === 'resolved' && !ticket?.resolved_at) updates.resolved_at = new Date().toISOString();
    if (status === 'closed' && !ticket?.closed_at) updates.closed_at = new Date().toISOString();
    await updateTicketField(ticketId, updates);
    await logTimelineEvent(ticketId, 'status_changed', `Status changed to ${STATUS_CONFIG[status].label}`);
    await reload();
    setSaving(null);
  }

  async function handleUpdatePriority(priority: TicketPriority) {
    setSaving('priority');
    await updateTicketField(ticketId, { priority });
    await reload();
    setSaving(null);
  }

  async function handleUpdateType(ticket_type: TicketType) {
    setSaving('type');
    await updateTicketField(ticketId, { ticket_type });
    await reload();
    setSaving(null);
  }

  async function handleUpdateAssignee(assigned_to: string) {
    setSaving('assigned');
    const emp = employees.find(e => e.id === assigned_to);
    await updateTicketField(ticketId, { assigned_to: assigned_to || null });
    if (emp) {
      await logTimelineEvent(ticketId, 'assigned', `Assigned to ${emp.first_name} ${emp.last_name}`);
    }
    await reload();
    setSaving(null);
  }

  async function handleUpdateDueDate(due_date: string) {
    setSaving('due');
    await updateTicketField(ticketId, { due_date: due_date || null });
    await reload();
    setSaving(null);
  }

  async function handleUpdatePortalVisibility(val: boolean) {
    setSaving('portal');
    await updateTicketField(ticketId, { show_in_customer_portal: val });
    await reload();
    setSaving(null);
  }

  async function handleRemoveLink(id: string) {
    await removeLinkedRecord(id);
    await reload();
  }

  async function searchLinkRecords(type: LinkedRecordType, query: string) {
    if (!ticket?.company_id) return;
    let data: { id: string; label: string }[] = [];

    if (type === 'site') {
      const res = await supabase.from('sites').select('id, name').eq('company_id', ticket.company_id).ilike('name', `%${query}%`).limit(8);
      data = (res.data || []).map((r: any) => ({ id: r.id, label: r.name }));
    } else if (type === 'system') {
      const res = await supabase.from('customer_systems').select('id, name').eq('company_id', ticket.company_id).ilike('name', `%${query}%`).limit(8);
      data = (res.data || []).map((r: any) => ({ id: r.id, label: r.name }));
    } else if (type === 'deal') {
      const res = await supabase.from('deals').select('id, title').eq('company_id', ticket.company_id).ilike('title', `%${query}%`).limit(8);
      data = (res.data || []).map((r: any) => ({ id: r.id, label: r.title }));
    } else if (type === 'invoice') {
      const res = await supabase.from('invoices').select('id, invoice_number').eq('company_id', ticket.company_id).ilike('invoice_number', `%${query}%`).limit(8);
      data = (res.data || []).map((r: any) => ({ id: r.id, label: `Invoice #${r.invoice_number}` }));
    } else if (type === 'work_order') {
      const res = await supabase.from('work_orders').select('id, wo_number, title').eq('company_id', ticket.company_id).ilike('title', `%${query}%`).limit(8);
      data = (res.data || []).map((r: any) => ({ id: r.id, label: `${r.wo_number} - ${r.title}` }));
    }
    setLinkResults(data);
  }

  async function handleAddLink(recordId: string, label: string) {
    const existing = ticket?.linked_records.find(r => r.record_type === linkType && r.record_id === recordId);
    if (!existing) {
      await addLinkedRecord(ticketId, linkType, recordId);
    }
    setAddLinkOpen(false);
    setLinkSearch('');
    setLinkResults([]);
    await reload();
  }

  async function handleCloseTicket() {
    await handleUpdateStatus('closed');
    await logTimelineEvent(ticketId, 'closed', 'Ticket closed');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <AlertCircle className="h-12 w-12 mb-3" />
        <p>{error || 'Ticket not found'}</p>
        <button onClick={onBack} className="mt-4 text-blue-600 text-sm hover:underline">Go back</button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Tickets
        </button>
        <ChevronRight className="h-4 w-4 text-gray-300" />
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-sm font-semibold text-gray-500">{ticket.ticket_number}</span>
        </div>
        <h1 className="text-sm font-semibold text-gray-900 flex-1 truncate">{ticket.title}</h1>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${priorityCfg.color}`}>
          {priorityCfg.label}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main conversation panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Ticket description */}
          {ticket.description && (
            <div className="bg-white mx-6 mt-4 rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{ticket.description}</p>
            </div>
          )}

          {/* Comments thread */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {ticket.comments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No replies yet. Start the conversation.</p>
              </div>
            )}

            {ticket.comments.map(comment => {
              const isInternal = !comment.is_public;
              const authorName = comment.employees
                ? `${comment.employees.first_name} ${comment.employees.last_name}`
                : comment.customer_portal_users
                ? `${comment.customer_portal_users.first_name} ${comment.customer_portal_users.last_name}`
                : 'Unknown';
              const isCustomer = !!comment.author_portal_user_id;
              const initials = authorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div key={comment.id} className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isCustomer ? 'bg-teal-500 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {initials || <User className="h-4 w-4" />}
                  </div>
                  <div className={`flex-1 max-w-2xl ${isCustomer ? 'items-end' : ''}`}>
                    <div className={`rounded-xl px-4 py-3 ${
                      isInternal
                        ? 'bg-amber-50 border border-amber-200'
                        : isCustomer
                        ? 'bg-teal-50 border border-teal-200'
                        : 'bg-white border border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-gray-700">{authorName}</span>
                        {isInternal && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                            <Lock className="h-2.5 w-2.5" />
                            Internal
                          </span>
                        )}
                        {isCustomer && (
                          <span className="text-xs text-teal-600 font-medium">Customer</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatRelative(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{comment.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={commentEndRef} />
          </div>

          {/* Reply composer */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
            <div className={`rounded-xl border-2 transition-colors ${isPublicReply ? 'border-blue-200' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center gap-2 px-3 pt-2.5">
                {isPublicReply
                  ? <Globe className="h-4 w-4 text-blue-500" />
                  : <Lock className="h-4 w-4 text-amber-600" />
                }
                <button
                  onClick={() => setIsPublicReply(p => !p)}
                  className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
                    isPublicReply ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                >
                  {isPublicReply ? 'Public Reply' : 'Internal Note'}
                </button>
                <span className="text-xs text-gray-400">
                  {isPublicReply ? 'Visible to customer in portal' : 'Only visible to staff'}
                </span>
              </div>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
                rows={3}
                placeholder={isPublicReply ? 'Write a reply...' : 'Add an internal note...'}
                className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between px-3 pb-2.5">
                <span className="text-xs text-gray-400">Ctrl+Enter to send</span>
                <button
                  onClick={handleReply}
                  disabled={!replyBody.trim() || submitting}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          {/* Properties */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Properties</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Status</span>
                <div className="relative">
                  <select
                    value={ticket.status}
                    onChange={e => handleUpdateStatus(e.target.value as TicketStatus)}
                    disabled={saving === 'status'}
                    className={`text-xs font-semibold pl-2 pr-6 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer ${statusCfg.color}`}
                  >
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Priority</span>
                <div className="relative">
                  <select
                    value={ticket.priority}
                    onChange={e => handleUpdatePriority(e.target.value as TicketPriority)}
                    disabled={saving === 'priority'}
                    className={`text-xs font-semibold pl-2 pr-6 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer ${priorityCfg.color}`}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Type</span>
                <div className="relative">
                  <select
                    value={ticket.ticket_type}
                    onChange={e => handleUpdateType(e.target.value as TicketType)}
                    disabled={saving === 'type'}
                    className="text-xs font-medium px-2 pr-6 py-1 rounded border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer capitalize"
                  >
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Assigned To</span>
                <div className="relative">
                  <select
                    value={ticket.assigned_to || ''}
                    onChange={e => handleUpdateAssignee(e.target.value)}
                    disabled={saving === 'assigned'}
                    className="text-xs font-medium px-2 pr-6 py-1 rounded border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer max-w-36 truncate"
                  >
                    <option value="">Unassigned</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Due Date</span>
                <input
                  type="date"
                  value={ticket.due_date || ''}
                  onChange={e => handleUpdateDueDate(e.target.value)}
                  className="text-xs font-medium px-2 py-1 rounded border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Portal Visible</span>
                <button
                  onClick={() => handleUpdatePortalVisibility(!ticket.show_in_customer_portal)}
                  disabled={saving === 'portal'}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center flex-shrink-0 ${ticket.show_in_customer_portal ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${ticket.show_in_customer_portal ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Customer */}
          {ticket.companies && (
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-gray-500" />
                </div>
                <span className="text-sm font-semibold text-gray-800">{ticket.companies.name}</span>
              </div>
            </div>
          )}

          {/* Linked Records */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Linked Records</p>
              <button
                onClick={() => setAddLinkOpen(o => !o)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Link className="h-3 w-3" />
                Add Link
              </button>
            </div>

            {addLinkOpen && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <div className="relative">
                  <select
                    value={linkType}
                    onChange={e => { setLinkType(e.target.value as LinkedRecordType); setLinkResults([]); setLinkSearch(''); }}
                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded appearance-none pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['site', 'system', 'deal', 'invoice', 'work_order'].map(t => (
                      <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                </div>
                <input
                  type="text"
                  value={linkSearch}
                  onChange={e => { setLinkSearch(e.target.value); searchLinkRecords(linkType, e.target.value); }}
                  placeholder={`Search ${RECORD_TYPE_LABELS[linkType]}...`}
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {linkResults.length > 0 && (
                  <div className="border border-gray-200 rounded bg-white max-h-32 overflow-y-auto">
                    {linkResults.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleAddLink(r.id, r.label)}
                        className="w-full text-left text-xs px-2.5 py-2 hover:bg-blue-50 hover:text-blue-700 border-b last:border-0 border-gray-100 transition-colors truncate"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {ticket.linked_records.length === 0 && !addLinkOpen && (
              <p className="text-xs text-gray-400 italic">No linked records</p>
            )}

            <div className="space-y-1.5">
              {ticket.linked_records.map(lr => {
                const Icon = RECORD_TYPE_ICONS[lr.record_type] || Link;
                return (
                  <div key={lr.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-200 group">
                    <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">{RECORD_TYPE_LABELS[lr.record_type]}</p>
                      <p className="text-xs font-medium text-gray-800 truncate">{lr.display_name || lr.record_id}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveLink(lr.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</p>
            <div className="space-y-2">
              {!ticket.converted_to_work_order_id ? (
                <button
                  onClick={() => onConvertToWorkOrder(ticketId)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
                >
                  <ClipboardList className="h-4 w-4" />
                  Convert to Work Order
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Converted to Work Order</span>
                </div>
              )}

              {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                <button
                  onClick={handleCloseTicket}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all"
                >
                  <XCircle className="h-4 w-4" />
                  Close Ticket
                </button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="p-4">
            <button
              onClick={() => setTimelineOpen(o => !o)}
              className="w-full flex items-center justify-between mb-2"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity Log</p>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${timelineOpen ? '' : '-rotate-90'}`} />
            </button>

            {timelineOpen && (
              <div className="space-y-2">
                {ticket.timeline.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No activity yet</p>
                )}
                {ticket.timeline.map(event => {
                  const actor = event.employees
                    ? `${event.employees.first_name} ${event.employees.last_name}`
                    : 'System';
                  return (
                    <div key={event.id} className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-700">{event.description}</p>
                        <p className="text-xs text-gray-400">{actor} · {formatTime(event.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
