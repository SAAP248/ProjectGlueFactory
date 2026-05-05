import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Filter, Calendar, User, AlertCircle,
  Wrench, Clock, DollarSign, LayoutList, LayoutGrid, RefreshCw,
  RotateCcw, Phone, MessageSquare, Building2, Radio, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { WorkOrder } from '../CustomerProfile/types';
import WorkOrderModal from './WorkOrderModal';

interface Props {
  onViewDetail: (id: string) => void;
}

const STATUS_OPTIONS = ['all', 'unassigned', 'scheduled', 'in_progress', 'on_hold', 'go_back', 'completed', 'cancelled'];
const TYPE_OPTIONS = ['all', 'installation', 'service', 'maintenance', 'inspection'];
const SOURCE_OPTIONS = ['all', 'phone_call', 'customer_request', 'office', 'dispatch'];

const STATUS_STYLES: Record<string, string> = {
  unassigned: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-800',
  on_hold: 'bg-orange-100 text-orange-700',
  go_back: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  emergency: 'text-red-600',
};

const TYPE_LABELS: Record<string, string> = {
  installation: 'Install',
  service: 'Service',
  maintenance: 'Maint.',
  inspection: 'Inspect',
};

const BILLING_LABELS: Record<string, string> = {
  not_billable: 'Not Billable',
  hourly: 'Hourly',
  fixed: 'Fixed',
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  phone_call: Phone,
  customer_request: MessageSquare,
  office: Building2,
  dispatch: Radio,
};

const SOURCE_COLORS: Record<string, string> = {
  phone_call: 'text-blue-500',
  customer_request: 'text-teal-500',
  office: 'text-gray-500',
  dispatch: 'text-amber-500',
};

function formatLabel(val: string): string {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const KANBAN_COLUMNS = [
  { status: 'unassigned', label: 'Unassigned', headerClass: 'bg-gray-100 text-gray-700' },
  { status: 'scheduled', label: 'Scheduled', headerClass: 'bg-blue-100 text-blue-700' },
  { status: 'in_progress', label: 'In Progress', headerClass: 'bg-amber-100 text-amber-800' },
  { status: 'go_back', label: 'Go-Back', headerClass: 'bg-orange-100 text-orange-700' },
  { status: 'completed', label: 'Completed', headerClass: 'bg-emerald-100 text-emerald-700' },
];

interface WOWithCompany extends WorkOrder {
  is_go_back?: boolean;
  source?: string;
  companies?: { name: string; is_trouble_customer?: boolean };
}

export default function WorkOrdersList({ onViewDetail }: Props) {
  const [workOrders, setWorkOrders] = useState<WOWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [goBackOnly, setGoBackOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [stats, setStats] = useState({ open: 0, inProgress: 0, completedToday: 0, overdue: 0, goBackRate: 0 });

  const loadWorkOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('work_orders')
      .select(`
        id, wo_number, title, work_order_type, status, priority, billing_type, billing_status,
        scheduled_date, scheduled_time, estimated_duration, enroute_at, onsite_at, completed_at,
        labor_cost, parts_cost, fixed_amount, payment_collected, created_at,
        is_go_back, source,
        companies(name, is_trouble_customer),
        sites(name),
        work_order_technicians(employee_id, is_lead, employees(first_name, last_name))
      `)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (typeFilter !== 'all') query = query.eq('work_order_type', typeFilter);
    if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
    if (goBackOnly) query = query.eq('is_go_back', true);

    const { data } = await query;
    const results = (data as WOWithCompany[]) || [];
    setWorkOrders(results);

    const today = new Date().toISOString().split('T')[0];
    const completed = results.filter(w => w.status === 'completed');
    const goBackCompleted = completed.filter(w => w.is_go_back).length;
    const goBackRate = completed.length > 0 ? Math.round((goBackCompleted / completed.length) * 100) : 0;

    setStats({
      open: results.filter(w => ['unassigned', 'scheduled'].includes(w.status)).length,
      inProgress: results.filter(w => w.status === 'in_progress').length,
      completedToday: results.filter(w => w.status === 'completed' && w.completed_at?.startsWith(today)).length,
      overdue: results.filter(w =>
        w.scheduled_date && w.scheduled_date < today && !['completed', 'cancelled'].includes(w.status)
      ).length,
      goBackRate,
    });

    setLoading(false);
  }, [statusFilter, typeFilter, sourceFilter, goBackOnly]);

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  const filtered = workOrders.filter(wo => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      wo.wo_number?.toLowerCase().includes(s) ||
      wo.title?.toLowerCase().includes(s) ||
      (wo.companies as any)?.name?.toLowerCase().includes(s) ||
      (wo.sites as any)?.name?.toLowerCase().includes(s)
    );
  });

  const statCards = [
    { label: 'Open', value: stats.open, color: 'bg-blue-500', textColor: 'text-blue-600', bg: 'bg-blue-50', icon: Wrench },
    { label: 'In Progress', value: stats.inProgress, color: 'bg-amber-500', textColor: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
    { label: 'Completed Today', value: stats.completedToday, color: 'bg-emerald-500', textColor: 'text-emerald-600', bg: 'bg-emerald-50', icon: Wrench },
    { label: 'Overdue', value: stats.overdue, color: 'bg-red-500', textColor: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
    { label: 'Go-Back Rate', value: `${stats.goBackRate}%`, color: stats.goBackRate > 10 ? 'bg-orange-500' : 'bg-gray-400', textColor: stats.goBackRate > 10 ? 'text-orange-600' : 'text-gray-500', bg: stats.goBackRate > 10 ? 'bg-orange-50' : 'bg-gray-50', icon: RotateCcw },
  ];

  function getLeadTech(wo: WorkOrder): string {
    const techs = wo.work_order_technicians || [];
    const lead = techs.find((t: any) => t.is_lead) || techs[0];
    if (!lead) return '';
    const emp = (lead as any).employees;
    if (!emp) return '';
    return `${emp.first_name} ${emp.last_name}`;
  }

  const activeFilterCount = [
    statusFilter !== 'all',
    typeFilter !== 'all',
    sourceFilter !== 'all',
    goBackOnly,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage service tickets, installations, and inspections</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadWorkOrders}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Work Order
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {statCards.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
                <div className={`${s.color} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold ${s.textColor}`}>{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search work orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TYPE_OPTIONS.map(t => (
              <option key={t} value={t}>{t === 'all' ? 'All Types' : formatLabel(t)}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : formatLabel(s)}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              activeFilterCount > 0
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">Source:</label>
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SOURCE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s === 'all' ? 'All Sources' : formatLabel(s)}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setGoBackOnly(!goBackOnly)}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${goBackOnly ? 'bg-orange-500' : 'bg-gray-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${goBackOnly ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm text-gray-700 flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
                Go-Backs Only
              </span>
            </label>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSourceFilter('all'); setGoBackOnly(false); setStatusFilter('all'); setTypeFilter('all'); }}
                className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No work orders found</p>
                <p className="text-sm text-gray-400 mt-1">Create your first work order to get started</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  New Work Order
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">WO #</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer / Site</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tech</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheduled</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Billing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(wo => {
                    const leadTech = getLeadTech(wo);
                    const techCount = (wo.work_order_technicians || []).length;
                    const isGoBack = wo.is_go_back || wo.status === 'go_back';
                    const isTroubleCustomer = (wo.companies as any)?.is_trouble_customer;
                    const SourceIcon = wo.source ? SOURCE_ICONS[wo.source] : null;
                    return (
                      <tr
                        key={wo.id}
                        onClick={() => onViewDetail(wo.id)}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors relative ${
                          isGoBack ? 'border-l-4 border-l-orange-400' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-blue-700">{wo.wo_number}</span>
                            {isGoBack && (
                              <span title="Go-Back">
                                <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {isTroubleCustomer && (
                              <span title="Trouble Customer — Office Only">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              </span>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{(wo.companies as any)?.name || '—'}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{(wo.sites as any)?.name || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {SourceIcon && (
                              <span title={formatLabel(wo.source || '')}>
                                <SourceIcon className={`h-3.5 w-3.5 flex-shrink-0 ${SOURCE_COLORS[wo.source!] || 'text-gray-400'}`} />
                              </span>
                            )}
                            <p className="text-sm text-gray-800 max-w-xs truncate">{wo.title}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            wo.work_order_type === 'installation' ? 'bg-blue-100 text-blue-700' :
                            wo.work_order_type === 'service' ? 'bg-teal-100 text-teal-700' :
                            wo.work_order_type === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {TYPE_LABELS[wo.work_order_type] || wo.work_order_type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[wo.status] || 'bg-gray-100 text-gray-600'}`}>
                            {formatLabel(wo.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <AlertCircle className={`h-3.5 w-3.5 ${PRIORITY_COLORS[wo.priority] || 'text-gray-400'}`} />
                            <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[wo.priority] || 'text-gray-500'}`}>
                              {wo.priority}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {leadTech ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                {leadTech.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="text-xs text-gray-700">{leadTech.split(' ')[0]}</span>
                              {techCount > 1 && <span className="text-xs text-gray-400">+{techCount - 1}</span>}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {wo.scheduled_date ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <div>
                                <p className="text-xs font-medium text-gray-700">
                                  {new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                                {wo.scheduled_time && <p className="text-xs text-gray-400">{wo.scheduled_time}</p>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className={`h-3.5 w-3.5 ${wo.billing_type === 'not_billable' ? 'text-gray-300' : 'text-emerald-500'}`} />
                            <span className={`text-xs ${wo.billing_type === 'not_billable' ? 'text-gray-400' : 'text-emerald-700 font-medium'}`}>
                              {BILLING_LABELS[wo.billing_type] || wo.billing_type}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          // Kanban View
          <div className="grid grid-cols-5 gap-4 h-full min-h-0">
            {KANBAN_COLUMNS.map(col => {
              const colWOs = filtered.filter(w => w.status === col.status);
              return (
                <div key={col.status} className="flex flex-col min-h-0">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${col.headerClass}`}>
                    <span className="text-xs font-bold uppercase tracking-wide">{col.label}</span>
                    <span className="text-xs font-bold bg-white/60 px-1.5 py-0.5 rounded-full">{colWOs.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {colWOs.map(wo => {
                      const leadTech = getLeadTech(wo);
                      const isGoBack = wo.is_go_back || wo.status === 'go_back';
                      const isTroubleCustomer = (wo.companies as any)?.is_trouble_customer;
                      const SourceIcon = wo.source ? SOURCE_ICONS[wo.source] : null;
                      return (
                        <div
                          key={wo.id}
                          onClick={() => onViewDetail(wo.id)}
                          className={`bg-white rounded-xl border p-3.5 cursor-pointer hover:shadow-md transition-all ${
                            isGoBack
                              ? 'border-l-4 border-l-orange-400 border-gray-100 hover:border-l-orange-500'
                              : 'border-gray-100 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-blue-600">{wo.wo_number}</span>
                              {isGoBack && <RotateCcw className="h-3 w-3 text-orange-500" />}
                              {isTroubleCustomer && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                            </div>
                            <span className={`text-xs font-semibold capitalize ${PRIORITY_COLORS[wo.priority] || 'text-gray-400'}`}>
                              {wo.priority}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 leading-snug mb-1">{wo.title}</p>
                          <p className="text-xs text-gray-500 mb-3">{(wo.companies as any)?.name}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                wo.work_order_type === 'installation' ? 'bg-blue-100 text-blue-700' :
                                wo.work_order_type === 'service' ? 'bg-teal-100 text-teal-700' :
                                wo.work_order_type === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {TYPE_LABELS[wo.work_order_type] || wo.work_order_type}
                              </span>
                              {SourceIcon && (
                                <SourceIcon className={`h-3.5 w-3.5 ${SOURCE_COLORS[wo.source!] || 'text-gray-400'}`} />
                              )}
                            </div>
                            {leadTech ? (
                              <div className="flex items-center gap-1">
                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                  {leadTech.split(' ').map(n => n[0]).join('')}
                                </div>
                              </div>
                            ) : (
                              <User className="h-3.5 w-3.5 text-gray-300" />
                            )}
                          </div>
                          {wo.scheduled_date && (
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-400">
                                {new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {wo.scheduled_time && ` ${wo.scheduled_time}`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {colWOs.length === 0 && (
                      <div className="py-8 text-center">
                        <p className="text-xs text-gray-400">No work orders</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <WorkOrderModal
          onClose={() => setShowModal(false)}
          onSaved={loadWorkOrders}
        />
      )}
    </div>
  );
}
