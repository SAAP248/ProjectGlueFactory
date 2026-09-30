import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CreditCard as Edit, Clock, MapPin, User, Wrench, DollarSign, Camera, FileText, ChevronDown, Plus, Trash2, AlertTriangle, CheckCircle, Navigation, Timer, CreditCard, Receipt, RotateCcw, Activity, Phone, MessageSquare, Building2, Radio, X as XIcon, ClipboardCheck, Shield, Briefcase, Link2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { WorkOrder, WorkOrderLineItem, WorkOrderAttachment } from '../CustomerProfile/types';
import AssignmentsCard, { TechAssignment } from './AssignmentsCard';
import WorkOrderAccountingTab from './WorkOrderAccountingTab';
import WorkOrderSystemsTab from './WorkOrderSystemsTab';

interface Props {
  workOrderId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onAddInspection?: (workOrderId: string) => void;
}

interface LinkedInspection {
  id: string;
  inspection_number: string;
  status: string;
  inspection_date: string | null;
  employees: { first_name: string; last_name: string } | null;
}

interface GoBackReason {
  id: string;
  label: string;
  is_active: boolean;
}

interface TimelineEntry {
  id: string;
  work_order_id: string;
  employee_id: string | null;
  entry_type: string;
  recorded_at: string;
  notes: string | null;
  employees?: { first_name: string; last_name: string };
}

const STATUS_OPTIONS = [
  { value: 'unassigned', label: 'Unassigned', color: 'bg-gray-100 text-gray-700' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-100 text-amber-800' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-orange-100 text-orange-700' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'go_back', label: 'Go-Back', color: 'bg-orange-100 text-orange-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
];

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-gray-500',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  emergency: 'text-red-600',
};

const TYPE_LABELS: Record<string, string> = {
  installation: 'Installation',
  service: 'Service',
  maintenance: 'Maintenance',
  inspection: 'Inspection',
};

const BILLING_LABELS: Record<string, string> = {
  not_billable: 'Not Billable',
  hourly: 'Hourly',
  fixed: 'Fixed Price',
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  phone_call: Phone,
  customer_request: MessageSquare,
  office: Building2,
  dispatch: Radio,
};

const SOURCE_LABELS: Record<string, string> = {
  phone_call: 'Phone Call',
  customer_request: 'Customer Request',
  office: 'From Office',
  dispatch: 'Dispatch',
};

const TIMELINE_TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  start_drive: { label: 'Started Driving', color: 'text-blue-700', bg: 'bg-blue-100' },
  arrived: { label: 'Arrived On Site', color: 'text-teal-700', bg: 'bg-teal-100' },
  start_work: { label: 'Started Work', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  paused: { label: 'Paused', color: 'text-amber-700', bg: 'bg-amber-100' },
  resumed: { label: 'Resumed Work', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  completed: { label: 'Completed Job', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  go_back: { label: 'Marked as Go-Back', color: 'text-orange-700', bg: 'bg-orange-100' },
  cannot_complete: { label: 'Cannot Complete', color: 'text-red-700', bg: 'bg-red-100' },
  note: { label: 'Note Added', color: 'text-gray-700', bg: 'bg-gray-100' },
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateTime(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function WorkOrderDetail({ workOrderId, onBack, onEdit, onAddInspection }: Props) {
  const [activeTab, setActiveTab] = useState('summary');
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [lineItems, setLineItems] = useState<WorkOrderLineItem[]>([]);
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [companyTags, setCompanyTags] = useState<string[]>([]);

  const [newItem, setNewItem] = useState({ line_type: 'part', description: '', quantity: '1', unit_price: '' });
  const [addingItem, setAddingItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const [goBackModal, setGoBackModal] = useState(false);
  const [linkedInspections, setLinkedInspections] = useState<LinkedInspection[]>([]);
  const [goBackReasons, setGoBackReasons] = useState<GoBackReason[]>([]);
  const [selectedReasonIds, setSelectedReasonIds] = useState<string[]>([]);
  const [goBackNotes, setGoBackNotes] = useState('');
  const [savingGoBack, setSavingGoBack] = useState(false);

  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const loadData = useCallback(async () => {
    const [woRes, liRes, attRes] = await Promise.all([
      supabase
        .from('work_orders')
        .select(`
          *,
          companies(name, is_trouble_customer, trouble_notes, tags),
          sites(name, address),
          employees(first_name, last_name),
          requested_by_contact:contacts!requested_by_contact_id(first_name, last_name, title),
          work_order_technicians(
            id, employee_id, is_lead, enroute_at, onsite_at, completed_at, notes,
            status, paused_at, total_paused_minutes,
            scheduled_date, scheduled_start_time, scheduled_end_time,
            estimated_duration_minutes, assignment_notes, visit_sequence,
            employees(first_name, last_name, role)
          )
        `)
        .eq('id', workOrderId)
        .maybeSingle(),
      supabase
        .from('work_order_line_items')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('sort_order'),
      supabase
        .from('work_order_attachments')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at'),
    ]);

    if (woRes.data) {
      setWo(woRes.data as WorkOrder);
      setCompanyTags((woRes.data as any).companies?.tags || []);
    }
    if (liRes.data) setLineItems(liRes.data);
    if (attRes.data) setAttachments(attRes.data);
    setLoading(false);
  }, [workOrderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadTimeline() {
    setLoadingTimeline(true);
    const { data } = await supabase
      .from('work_order_time_entries')
      .select('*, employees(first_name, last_name)')
      .eq('work_order_id', workOrderId)
      .order('recorded_at');
    if (data) setTimelineEntries(data as TimelineEntry[]);
    setLoadingTimeline(false);
  }

  useEffect(() => {
    if (activeTab === 'timeline') {
      loadTimeline();
    }
    if (activeTab === 'inspections') {
      loadLinkedInspections();
    }
  }, [activeTab, workOrderId]);

  async function loadLinkedInspections() {
    const { data } = await supabase
      .from('inspections')
      .select('id, inspection_number, status, inspection_date, employees(first_name, last_name)')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });
    if (data) setLinkedInspections(data as LinkedInspection[]);
  }

  useEffect(() => {
    supabase
      .from('inspections')
      .select('id')
      .eq('work_order_id', workOrderId)
      .then(({ data }) => setLinkedInspections(prev => prev.length ? prev : (data || []) as any));
  }, [workOrderId]);

  async function loadGoBackReasons() {
    const { data } = await supabase
      .from('go_back_reasons')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (data) setGoBackReasons(data);
  }

  function openGoBackModal() {
    loadGoBackReasons();
    if (wo?.go_back_reason_ids) {
      setSelectedReasonIds(wo.go_back_reason_ids as string[]);
    }
    setGoBackNotes(wo?.go_back_notes || '');
    setGoBackModal(true);
  }

  function toggleReason(id: string) {
    setSelectedReasonIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  }

  async function saveGoBack() {
    if (!wo) return;
    setSavingGoBack(true);
    const now = new Date().toISOString();
    await supabase
      .from('work_orders')
      .update({
        is_go_back: true,
        status: 'go_back',
        go_back_reason_ids: selectedReasonIds,
        go_back_notes: goBackNotes || null,
        updated_at: now,
      })
      .eq('id', wo.id);

    await supabase.from('work_order_time_entries').insert({
      work_order_id: wo.id,
      entry_type: 'go_back',
      recorded_at: now,
      notes: goBackNotes || null,
    });

    setWo(prev => prev ? {
      ...prev,
      is_go_back: true,
      status: 'go_back',
      go_back_reason_ids: selectedReasonIds,
      go_back_notes: goBackNotes || null,
    } : prev);
    setGoBackModal(false);
    setSavingGoBack(false);
  }

  async function updateStatus(newStatus: string) {
    if (!wo) return;
    setSavingStatus(true);
    const update: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'completed' && !wo.completed_at) {
      update.completed_at = new Date().toISOString();
    }
    await supabase.from('work_orders').update(update).eq('id', wo.id);
    setWo(prev => prev ? { ...prev, ...update } : prev);
    setStatusOpen(false);
    setSavingStatus(false);
  }

  async function stampTime(field: 'enroute_at' | 'onsite_at' | 'completed_at') {
    if (!wo) return;
    const now = new Date().toISOString();
    const update: Record<string, any> = { [field]: now, updated_at: now };

    if (field === 'enroute_at') {
      update.status = 'in_progress';
    }
    if (field === 'onsite_at' && wo.enroute_at) {
      const mins = Math.round((new Date(now).getTime() - new Date(wo.enroute_at).getTime()) / 60000);
      update.enroute_duration_minutes = mins;
      update.status = 'in_progress';
    }
    if (field === 'completed_at' && wo.onsite_at) {
      const mins = Math.round((new Date(now).getTime() - new Date(wo.onsite_at).getTime()) / 60000);
      update.onsite_duration_minutes = mins;
      update.status = 'completed';
    }

    await supabase.from('work_orders').update(update).eq('id', wo.id);
    setWo(prev => prev ? { ...prev, ...update } : prev);
  }

  async function addLineItem() {
    if (!newItem.description.trim() || !wo) return;
    setSavingItem(true);
    const qty = parseFloat(newItem.quantity) || 1;
    const price = parseFloat(newItem.unit_price) || 0;
    const { data } = await supabase
      .from('work_order_line_items')
      .insert({
        work_order_id: wo.id,
        line_type: newItem.line_type,
        description: newItem.description.trim(),
        quantity: qty,
        unit_price: price,
        total_price: qty * price,
        sort_order: lineItems.length,
      })
      .select()
      .single();
    if (data) setLineItems(prev => [...prev, data]);
    setNewItem({ line_type: 'part', description: '', quantity: '1', unit_price: '' });
    setAddingItem(false);
    setSavingItem(false);
  }

  async function deleteLineItem(id: string) {
    await supabase.from('work_order_line_items').delete().eq('id', id);
    setLineItems(prev => prev.filter(li => li.id !== id));
  }

  const lineItemsTotal = lineItems.reduce((sum, li) => sum + Number(li.total_price), 0);
  const statusInfo = STATUS_OPTIONS.find(s => s.value === wo?.status) || STATUS_OPTIONS[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="p-6 text-center text-gray-500">Work order not found.</div>
    );
  }

  const techs = (wo as any).work_order_technicians || [];
  const isGoBack = (wo as any).is_go_back;
  const woSource = (wo as any).source;
  const SourceIcon = woSource ? SOURCE_ICONS[woSource] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        {/* Row 1: breadcrumb + actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Work Orders</span>
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-900 font-mono">{wo.wo_number}</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
              wo.work_order_type === 'installation' ? 'bg-blue-100 text-blue-700' :
              wo.work_order_type === 'service' ? 'bg-teal-100 text-teal-700' :
              wo.work_order_type === 'maintenance' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              <Wrench className="h-3 w-3" />
              {TYPE_LABELS[wo.work_order_type] || wo.work_order_type}
            </span>
            <span className={`text-xs font-semibold uppercase ${PRIORITY_STYLES[wo.priority] || 'text-gray-500'}`}>
              {wo.priority === 'emergency' ? '! ' : ''}{wo.priority}
            </span>
            {isGoBack && (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                <RotateCcw className="h-3 w-3" /> Go-Back
              </span>
            )}
            {companyTags.length > 0 && companyTags.map(tag => (
              <span key={tag} className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-100 text-blue-700">{tag}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status Dropdown */}
            <div className="relative">
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                disabled={savingStatus}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusInfo.color}`}
              >
                {statusInfo.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {statusOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-44">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updateStatus(opt.value)}
                        className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${opt.value === wo.status ? 'bg-gray-50' : ''}`}
                      >
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${opt.color}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {!isGoBack && wo.status !== 'completed' && wo.status !== 'cancelled' && (
              <button onClick={openGoBackModal} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /> Go-Back
              </button>
            )}
            {onAddInspection && (
              <button onClick={() => onAddInspection(wo.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <ClipboardCheck className="h-3.5 w-3.5" /> Inspection
              </button>
            )}
            <button onClick={() => onEdit(wo.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        </div>

        {/* Row 2: title + meta */}
        <div className="mt-2 flex items-baseline gap-3 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{wo.title}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0 flex-wrap">
            {(wo as any).companies && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {(wo as any).companies.name}
                {(wo as any).companies.is_trouble_customer && (
                  <span className="ml-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 rounded-full border border-red-200">
                    <AlertTriangle className="h-2.5 w-2.5" /> TROUBLE
                  </span>
                )}
              </span>
            )}
            {wo.sites && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{wo.sites.name}</span>}
            {wo.scheduled_date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {wo.scheduled_time && ` ${wo.scheduled_time}`}
              </span>
            )}
            {((wo as any).requested_by_contact_id || (wo as any).requested_by_name) && (
              <span className="flex items-center gap-1 text-blue-600">
                <Phone className="h-3 w-3" />
                {(wo as any).requested_by_name || ((wo as any).requested_by_contact ? `${(wo as any).requested_by_contact.first_name} ${(wo as any).requested_by_contact.last_name}` : 'Contact')}
              </span>
            )}
          </div>
        </div>

        {/* Go-Back banner inline */}
        {isGoBack && (wo as any).go_back_notes && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-1.5 border border-orange-200">
            <RotateCcw className="h-3 w-3 flex-shrink-0" />
            <span>{(wo as any).go_back_notes}</span>
          </div>
        )}

        {/* Inline Time Tracking */}
        <div className="mt-2.5 flex items-center gap-2">
          {[
            { key: 'enroute_at', label: 'Enroute', icon: Navigation, stampLabel: 'Start', canStamp: !wo.enroute_at, durationKey: 'enroute_duration_minutes', durationLabel: 'Drive' },
            { key: 'onsite_at', label: 'On Site', icon: MapPin, stampLabel: 'Arrived', canStamp: wo.enroute_at && !wo.onsite_at, durationKey: 'onsite_duration_minutes', durationLabel: 'On site' },
            { key: 'completed_at', label: 'Done', icon: Timer, stampLabel: 'Complete', canStamp: wo.onsite_at && !wo.completed_at },
          ].map((step, i) => {
            const ts = wo[step.key as keyof typeof wo] as string | null;
            const dur = step.durationKey ? wo[step.durationKey as keyof typeof wo] as number | null : null;
            return (
              <div key={step.key} className="flex items-center gap-2">
                {i > 0 && <div className={`w-6 h-px ${ts ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  ts ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-dashed border-gray-200 bg-gray-50 text-gray-400'
                }`}>
                  <step.icon className="h-3 w-3" />
                  <span>{step.label}</span>
                  {ts ? (
                    <>
                      <span className="font-semibold">{formatTime(ts)}</span>
                      {dur ? <span className="text-emerald-600">({formatDuration(dur as number)})</span> : null}
                    </>
                  ) : step.canStamp ? (
                    <button
                      onClick={() => stampTime(step.key)}
                      className="ml-0.5 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-semibold hover:bg-blue-700 transition-colors"
                    >
                      {step.stampLabel}
                    </button>
                  ) : <span>—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-5">
        <div className="flex gap-5 -mb-px">
          {[
            { id: 'summary', label: 'Summary', icon: FileText },
            { id: 'systems', label: 'Systems', icon: Shield },
            { id: 'line-items', label: `Line Items (${lineItems.length})`, icon: Receipt },
            { id: 'photos', label: `Photos (${attachments.length})`, icon: Camera },
            { id: 'accounting', label: 'Accounting', icon: DollarSign },
            { id: 'timeline', label: 'Timeline', icon: Activity },
            { id: 'inspections', label: `Inspections (${linkedInspections.length})`, icon: ClipboardCheck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-5">
              {/* Origin & Source Card */}
              {(woSource || (wo as any).requested_by_contact_id || (wo as any).requested_by_name || (wo as any).deal_id || (wo as any).go_back_work_order_id) && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">How This Job Came In</h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    {SourceIcon && woSource && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                        <SourceIcon className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-700">{SOURCE_LABELS[woSource]}</span>
                      </div>
                    )}
                    {((wo as any).requested_by_contact_id || (wo as any).requested_by_name) && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                        <Phone className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-slate-700">
                          <span className="text-slate-400">Requested by </span>
                          <span className="font-medium">
                            {(wo as any).requested_by_name || ((wo as any).requested_by_contact ? `${(wo as any).requested_by_contact.first_name} ${(wo as any).requested_by_contact.last_name}` : 'Contact')}
                          </span>
                        </span>
                      </div>
                    )}
                    {(wo as any).deal_id && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                        <Briefcase className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Linked to Deal</span>
                      </div>
                    )}
                    {(wo as any).go_back_work_order_id && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                        <Link2 className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">Go-Back from previous WO</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Trouble Customer Warning */}
              {(wo as any).companies?.is_trouble_customer && (
                <div className="bg-red-50 rounded-xl border-2 border-red-200 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Trouble Customer</p>
                    {(wo as any).companies.trouble_notes && (
                      <p className="text-sm text-red-700 mt-0.5">{(wo as any).companies.trouble_notes}</p>
                    )}
                  </div>
                </div>
              )}

              {wo.reason_for_visit && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reason for Visit</h3>
                  <p className="text-sm text-gray-800 leading-relaxed">{wo.reason_for_visit}</p>
                </div>
              )}
              {wo.scope_of_work && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Scope of Work</h3>
                  <p className="text-sm text-gray-800 leading-relaxed">{wo.scope_of_work}</p>
                </div>
              )}
              {wo.technician_notes && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Technician Notes</h3>
                  <p className="text-sm text-gray-800 leading-relaxed">{wo.technician_notes}</p>
                </div>
              )}
              {wo.resolution_notes && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resolution</h3>
                  <p className="text-sm text-gray-800 leading-relaxed">{wo.resolution_notes}</p>
                </div>
              )}
              {wo.notes && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                  <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Internal Notes</h3>
                  <p className="text-sm text-amber-900 leading-relaxed">{wo.notes}</p>
                </div>
              )}
              {!wo.reason_for_visit && !wo.scope_of_work && !wo.notes && (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notes or descriptions added yet.</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Technicians & Schedule */}
              <AssignmentsCard
                workOrderId={wo.id}
                assignments={techs as TechAssignment[]}
                defaultDate={wo.scheduled_date || null}
                defaultStartTime={wo.scheduled_time || null}
                defaultDuration={wo.estimated_duration || 60}
                onChanged={loadData}
              />

              {/* Billing Card */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Billing</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className={`font-medium ${wo.billing_type === 'not_billable' ? 'text-gray-400' : 'text-gray-900'}`}>
                      {BILLING_LABELS[wo.billing_type] || wo.billing_type}
                    </span>
                  </div>
                  {wo.billing_type === 'hourly' && wo.billing_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rate</span>
                      <span className="font-medium text-gray-900">${wo.billing_rate}/hr</span>
                    </div>
                  )}
                  {wo.billing_type === 'fixed' && wo.fixed_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fixed Price</span>
                      <span className="font-medium text-gray-900">${Number(wo.fixed_amount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Parts & Labor</span>
                    <span className="font-medium text-gray-900">
                      ${(Number(wo.labor_cost) + Number(wo.parts_cost)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Billing Status</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      wo.billing_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      wo.billing_status === 'invoiced' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {wo.billing_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Created */}
              <div className="text-xs text-gray-400 px-1">
                <p>Created {formatDateTime(wo.created_at)}</p>
                {wo.updated_at !== wo.created_at && <p>Updated {formatDateTime(wo.updated_at)}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Line Items Tab */}
        {activeTab === 'line-items' && (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {lineItems.length === 0 && !addingItem ? (
                <div className="py-12 text-center">
                  <Receipt className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No line items yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.map(li => (
                      <tr key={li.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                            li.line_type === 'labor' ? 'bg-blue-100 text-blue-700' :
                            li.line_type === 'part' ? 'bg-teal-100 text-teal-700' :
                            li.line_type === 'fee' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {li.line_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">{li.description}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{li.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">${Number(li.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">${Number(li.total_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deleteLineItem(li.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {addingItem && (
                      <tr className="bg-blue-50">
                        <td className="px-4 py-3">
                          <select
                            value={newItem.line_type}
                            onChange={e => setNewItem(p => ({ ...p, line_type: e.target.value }))}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="part">Part</option>
                            <option value="labor">Labor</option>
                            <option value="fee">Fee</option>
                            <option value="discount">Discount</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            autoFocus
                            type="text"
                            value={newItem.description}
                            onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                            placeholder="Description..."
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={newItem.quantity}
                            onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
                            className="w-16 text-sm text-right border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={newItem.unit_price}
                            onChange={e => setNewItem(p => ({ ...p, unit_price: e.target.value }))}
                            placeholder="0.00"
                            className="w-24 text-sm text-right border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-500">
                          ${((parseFloat(newItem.quantity) || 1) * (parseFloat(newItem.unit_price) || 0)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 flex items-center gap-1 justify-end">
                          <button onClick={addLineItem} disabled={savingItem} className="text-xs px-2 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                            {savingItem ? '...' : 'Add'}
                          </button>
                          <button onClick={() => setAddingItem(false)} className="text-xs px-2 py-1 bg-white border border-gray-300 text-gray-600 rounded font-medium hover:bg-gray-50">
                            Cancel
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setAddingItem(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Line Item
              </button>
              {lineItems.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-900">${lineItemsTotal.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div>
            {attachments.length === 0 ? (
              <div className="text-center py-16">
                <Camera className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No photos or attachments yet</p>
                <p className="text-sm text-gray-400 mt-1">Photos taken in the field will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {attachments.map(att => (
                  <div key={att.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {att.file_type === 'image' ? (
                      <img src={att.file_url} alt={att.caption || att.file_name} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                        <FileText className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-700 truncate">{att.file_name}</p>
                      {att.caption && <p className="text-xs text-gray-400 mt-0.5">{att.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Accounting Tab */}
        {activeTab === 'accounting' && (
          <WorkOrderAccountingTab
            workOrder={wo}
            lineItems={lineItems}
            onPaymentRecorded={loadData}
            onLineItemsChanged={loadData}
          />
        )}

        {/* Systems Tab */}
        {activeTab === 'systems' && (
          <WorkOrderSystemsTab workOrder={wo} />
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="max-w-2xl">
            {loadingTimeline ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : timelineEntries.length === 0 ? (
              <div className="text-center py-16">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No timeline entries yet</p>
                <p className="text-sm text-gray-400 mt-1">Activity will be recorded as technicians work this job</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
                <div className="space-y-1">
                  {timelineEntries.map((entry, i) => {
                    const style = TIMELINE_TYPE_STYLES[entry.entry_type] || { label: entry.entry_type, color: 'text-gray-700', bg: 'bg-gray-100' };
                    return (
                      <div key={entry.id} className="relative flex gap-4 pb-4">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                          <Activity className={`h-4 w-4 ${style.color}`} />
                        </div>
                        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-4 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-sm font-semibold ${style.color}`}>{style.label}</p>
                              {entry.employees && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {entry.employees.first_name} {entry.employees.last_name}
                                </p>
                              )}
                              {entry.notes && (
                                <p className="text-xs text-gray-600 mt-1 italic">"{entry.notes}"</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-medium text-gray-700">{formatTime(entry.recorded_at)}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(entry.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Per-tech Summary */}
            {techs.length > 0 && (
              <div className="mt-6 bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Technician Time Summary</h3>
                <div className="space-y-3">
                  {techs.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                        {t.employees?.first_name?.[0]}{t.employees?.last_name?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {t.employees?.first_name} {t.employees?.last_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {t.enroute_at && (
                          <span className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            {t.onsite_at
                              ? formatDuration(Math.round((new Date(t.onsite_at).getTime() - new Date(t.enroute_at).getTime()) / 60000))
                              : 'In transit'}
                          </span>
                        )}
                        {t.onsite_at && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {t.completed_at
                              ? formatDuration(Math.round((new Date(t.completed_at).getTime() - new Date(t.onsite_at).getTime()) / 60000))
                              : 'On site'}
                          </span>
                        )}
                        {t.completed_at && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inspections Tab */}
      {activeTab === 'inspections' && (
        <div className="max-w-2xl space-y-3">
          {onAddInspection && (
            <button
              onClick={() => onAddInspection(wo.id)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors mb-4"
            >
              <Plus className="h-4 w-4" />
              Add Inspection
            </button>
          )}
          {linkedInspections.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No inspections linked to this work order.</p>
            </div>
          ) : linkedInspections.map(insp => (
            <div key={insp.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-blue-200 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{insp.inspection_number}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    insp.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {insp.status === 'completed' ? 'Completed' : 'Draft'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {insp.inspection_date && <span>{new Date(insp.inspection_date + 'T00:00:00').toLocaleDateString()}</span>}
                  {insp.employees && <span>{insp.employees.first_name} {insp.employees.last_name}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mark as Go-Back Modal */}
      {goBackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGoBackModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mark as Go-Back</h3>
                  <p className="text-xs text-gray-500">{wo.wo_number}</p>
                </div>
              </div>
              <button onClick={() => setGoBackModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Reasons</label>
                {goBackReasons.length === 0 ? (
                  <p className="text-sm text-gray-400">No go-back reasons configured. Add them in Settings.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {goBackReasons.map(reason => (
                      <button
                        key={reason.id}
                        onClick={() => toggleReason(reason.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-all ${
                          selectedReasonIds.includes(reason.id)
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={goBackNotes}
                  onChange={e => setGoBackNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe what needs to be addressed on the return visit..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setGoBackModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveGoBack}
                disabled={savingGoBack}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {savingGoBack ? 'Saving...' : 'Confirm Go-Back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
