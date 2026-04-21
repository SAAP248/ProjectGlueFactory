import { useState, useMemo } from 'react';
import {
  LifeBuoy, Plus, Search, Filter, MessageSquare, Globe,
  Phone, Mail, Building2, Clock, AlertCircle, ChevronDown,
} from 'lucide-react';
import { useTickets } from './hooks';
import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_OPTIONS, SOURCE_OPTIONS } from './types';
import type { Ticket, TicketStatus, TicketPriority, TicketType, TicketSource } from './types';

interface Props {
  onViewTicket: (id: string) => void;
  onNewTicket: () => void;
  refreshKey: number;
}

type TabFilter = 'all' | 'mine' | 'unassigned' | 'portal' | 'closed';

const SOURCE_ICONS: Record<string, React.ElementType> = {
  phone_call: Phone,
  email: Mail,
  portal: Globe,
  office: Building2,
  chat: MessageSquare,
};

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(ticket: Ticket) {
  if (!ticket.due_date) return false;
  if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
  return new Date(ticket.due_date) < new Date();
}

export default function TicketsList({ onViewTicket, onNewTicket, refreshKey }: Props) {
  const { tickets, loading } = useTickets(refreshKey);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const filtered = useMemo(() => {
    let list = tickets;

    if (activeTab === 'mine') list = list.filter(t => t.assigned_to === 'current_user');
    else if (activeTab === 'unassigned') list = list.filter(t => !t.assigned_to);
    else if (activeTab === 'portal') list = list.filter(t => t.source === 'portal');
    else if (activeTab === 'closed') list = list.filter(t => t.status === 'closed' || t.status === 'resolved');
    else list = list.filter(t => t.status !== 'closed' && t.status !== 'resolved');

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(t =>
        t.ticket_number.toLowerCase().includes(s) ||
        t.title.toLowerCase().includes(s) ||
        (t.companies?.name || '').toLowerCase().includes(s)
      );
    }
    if (filterPriority) list = list.filter(t => t.priority === filterPriority);
    if (filterStatus) list = list.filter(t => t.status === filterStatus);
    if (filterType) list = list.filter(t => t.ticket_type === filterType);

    return list;
  }, [tickets, activeTab, search, filterPriority, filterStatus, filterType]);

  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length;
    const pending = tickets.filter(t => t.status === 'pending').length;
    const unassigned = tickets.filter(t => !t.assigned_to && t.status !== 'closed' && t.status !== 'resolved').length;
    const resolvedThisWeek = tickets.filter(t => {
      if (t.status !== 'resolved' && t.status !== 'closed') return false;
      const d = new Date(t.updated_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d > weekAgo;
    }).length;
    return { open, pending, unassigned, resolvedThisWeek };
  }, [tickets]);

  const tabCounts: Record<TabFilter, number> = useMemo(() => ({
    all: tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length,
    mine: tickets.filter(t => t.assigned_to === 'current_user').length,
    unassigned: tickets.filter(t => !t.assigned_to && t.status !== 'closed' && t.status !== 'resolved').length,
    portal: tickets.filter(t => t.source === 'portal').length,
    closed: tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length,
  }), [tickets]);

  const TABS: { id: TabFilter; label: string }[] = [
    { id: 'all', label: 'All Open' },
    { id: 'mine', label: 'My Tickets' },
    { id: 'unassigned', label: 'Unassigned' },
    { id: 'portal', label: 'Portal' },
    { id: 'closed', label: 'Closed' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <LifeBuoy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
              <p className="text-sm text-gray-500">{tickets.length} total ticket{tickets.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onNewTicket}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Open', value: stats.open, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Pending Reply', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Unassigned', value: stats.unassigned, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Resolved This Week', value: stats.resolvedThisWeek, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {tabCounts[tab.id] > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tabCounts[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets..."
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>

            <div className="relative">
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="pl-3 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="">All Priorities</option>
                {(['low', 'normal', 'high', 'urgent'] as TicketPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="pl-3 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="">All Types</option>
                {TYPE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <LifeBuoy className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-base font-medium">No tickets found</p>
            <p className="text-sm mt-1">
              {search || filterPriority || filterType ? 'Try adjusting your filters' : 'Create a new ticket to get started'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white sticky top-0 z-10">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28">Ticket #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Subject</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24">Priority</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-36">Assigned To</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28">Due</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(ticket => {
                const statusCfg = STATUS_CONFIG[ticket.status];
                const priorityCfg = PRIORITY_CONFIG[ticket.priority];
                const SourceIcon = SOURCE_ICONS[ticket.source] || Building2;
                const overdue = isOverdue(ticket);

                return (
                  <tr
                    key={ticket.id}
                    onClick={() => onViewTicket(ticket.id)}
                    className="bg-white hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-gray-500">{ticket.ticket_number}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">{ticket.title}</span>
                        {ticket.companies?.name && (
                          <span className="text-xs text-gray-500 mt-0.5">{ticket.companies.name}</span>
                        )}
                      </div>
                      {(ticket.comment_count || 0) > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <MessageSquare className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-400">{ticket.comment_count}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${priorityCfg.color}`}>
                        {priorityCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className={`flex items-center gap-1.5 ${ticket.source === 'portal' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <SourceIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs capitalize">{ticket.source.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {ticket.employees ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            {ticket.employees.first_name?.[0]}{ticket.employees.last_name?.[0]}
                          </div>
                          <span className="text-xs text-gray-700 truncate">{ticket.employees.first_name} {ticket.employees.last_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {ticket.due_date ? (
                        <div className={`flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                          {overdue && <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                          <span className="text-xs font-medium">
                            {new Date(ticket.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{formatRelative(ticket.updated_at)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
