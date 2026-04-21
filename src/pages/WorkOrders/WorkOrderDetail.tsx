import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CreditCard as Edit, Clock, MapPin, User, Wrench, DollarSign, Camera, FileText, ChevronDown, Plus, Trash2, AlertTriangle, CheckCircle, Navigation, Timer, CreditCard, Receipt, RotateCcw, Activity, Phone, MessageSquare, Building2, Radio, X as XIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { WorkOrder, WorkOrderLineItem, WorkOrderAttachment } from '../CustomerProfile/types';
import AssignmentsCard, { TechAssignment } from './AssignmentsCard';

interface Props {
  workOrderId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
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

export default function WorkOrderDetail({ workOrderId, onBack, onEdit }: Props) {
  const [activeTab, setActiveTab] = useState('summary');
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [lineItems, setLineItems] = useState<WorkOrderLineItem[]>([]);
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);

  const [newItem, setNewItem] = useState({ line_type: 'part', description: '', quantity: '1', unit_price: '' });
  const [addingItem, setAddingItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', reference: '' });
  const [savingPayment, setSavingPayment] = useState(false);

  const [goBackModal, setGoBackModal] = useState(false);
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
          companies(name, is_trouble_customer, trouble_notes),
          sites(name, address),
          employees(first_name, last_name),
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

    if (woRes.data) setWo(woRes.data as WorkOrder);
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
  }, [activeTab, workOrderId]);

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

  async function recordPayment() {
    if (!wo || !paymentForm.amount) return;
    setSavingPayment(true);
    const amount = parseFloat(paymentForm.amount);
    await supabase
      .from('work_orders')
      .update({
        payment_collected: (wo.payment_collected || 0) + amount,
        payment_method: paymentForm.method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wo.id);
    setWo(prev => prev
      ? { ...prev, payment_collected: (prev.payment_collected || 0) + amount, payment_method: paymentForm.method }
      : prev
    );
    setPaymentForm({ amount: '', method: 'cash', reference: '' });
    setPaymentModal(false);
    setSavingPayment(false);
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
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Work Orders
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-900 font-mono">{wo.wo_number}</span>
            {isGoBack && (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                <RotateCcw className="h-3 w-3" />
                Go-Back
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isGoBack && wo.status !== 'completed' && wo.status !== 'cancelled' && (
              <button
                onClick={openGoBackModal}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Mark as Go-Back
              </button>
            )}
            <button
              onClick={() => onEdit(wo.id)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Go-Back Banner */}
      {isGoBack && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-3">
          <div className="flex items-start gap-3">
            <RotateCcw className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">This is a Go-Back Job</p>
              {(wo as any).go_back_notes && (
                <p className="text-xs text-orange-700 mt-0.5">{(wo as any).go_back_notes}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                wo.work_order_type === 'installation' ? 'bg-blue-100 text-blue-700' :
                wo.work_order_type === 'service' ? 'bg-teal-100 text-teal-700' :
                wo.work_order_type === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <Wrench className="h-3 w-3" />
                {TYPE_LABELS[wo.work_order_type] || wo.work_order_type}
              </span>
              <span className={`text-xs font-semibold uppercase tracking-wide ${PRIORITY_STYLES[wo.priority] || 'text-gray-500'}`}>
                {wo.priority === 'emergency' ? '! ' : ''}{wo.priority} priority
              </span>
              {SourceIcon && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <SourceIcon className="h-3.5 w-3.5" />
                  {SOURCE_LABELS[woSource]}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{wo.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {(wo as any).companies && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {(wo as any).companies.name}
                </span>
              )}
              {wo.sites && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {wo.sites.name}
                </span>
              )}
              {wo.scheduled_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {wo.scheduled_time && ` at ${wo.scheduled_time}`}
                </span>
              )}
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              disabled={savingStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusInfo.color}`}
            >
              {statusInfo.label}
              <ChevronDown className="h-4 w-4" />
            </button>
            {statusOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-44">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateStatus(opt.value)}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors ${
                        opt.value === wo.status ? 'bg-gray-50' : ''
                      }`}
                    >
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${opt.color}`}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Time Tracking Bar */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className={`relative p-3.5 rounded-xl border-2 transition-all ${
            wo.enroute_at ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Navigation className={`h-4 w-4 ${wo.enroute_at ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${wo.enroute_at ? 'text-emerald-700' : 'text-gray-400'}`}>
                  Enroute
                </span>
              </div>
              {wo.enroute_at ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <button
                  onClick={() => stampTime('enroute_at')}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                >
                  Start
                </button>
              )}
            </div>
            <p className={`text-sm font-medium ${wo.enroute_at ? 'text-emerald-800' : 'text-gray-400'}`}>
              {wo.enroute_at ? formatTime(wo.enroute_at) : '—'}
            </p>
            {wo.enroute_duration_minutes && (
              <p className="text-xs text-emerald-600 mt-0.5">Drive: {formatDuration(wo.enroute_duration_minutes)}</p>
            )}
          </div>

          <div className={`relative p-3.5 rounded-xl border-2 transition-all ${
            wo.onsite_at ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <MapPin className={`h-4 w-4 ${wo.onsite_at ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${wo.onsite_at ? 'text-emerald-700' : 'text-gray-400'}`}>
                  On Site
                </span>
              </div>
              {wo.onsite_at ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : wo.enroute_at ? (
                <button
                  onClick={() => stampTime('onsite_at')}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                >
                  Arrived
                </button>
              ) : null}
            </div>
            <p className={`text-sm font-medium ${wo.onsite_at ? 'text-emerald-800' : 'text-gray-400'}`}>
              {wo.onsite_at ? formatTime(wo.onsite_at) : '—'}
            </p>
            {wo.onsite_duration_minutes && (
              <p className="text-xs text-emerald-600 mt-0.5">On site: {formatDuration(wo.onsite_duration_minutes)}</p>
            )}
          </div>

          <div className={`relative p-3.5 rounded-xl border-2 transition-all ${
            wo.completed_at ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Timer className={`h-4 w-4 ${wo.completed_at ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${wo.completed_at ? 'text-emerald-700' : 'text-gray-400'}`}>
                  Completed
                </span>
              </div>
              {wo.completed_at ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : wo.onsite_at ? (
                <button
                  onClick={() => stampTime('completed_at')}
                  className="text-xs px-2 py-1 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 transition-colors"
                >
                  Complete
                </button>
              ) : null}
            </div>
            <p className={`text-sm font-medium ${wo.completed_at ? 'text-emerald-800' : 'text-gray-400'}`}>
              {wo.completed_at ? formatTime(wo.completed_at) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="flex gap-6">
          {[
            { id: 'summary', label: 'Summary', icon: FileText },
            { id: 'line-items', label: `Line Items (${lineItems.length})`, icon: Receipt },
            { id: 'photos', label: `Photos (${attachments.length})`, icon: Camera },
            { id: 'payment', label: 'Payment', icon: CreditCard },
            { id: 'timeline', label: 'Timeline', icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-5">
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

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="max-w-lg space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Summary</h3>
              <div className="space-y-3">
                {wo.billing_type === 'fixed' && wo.fixed_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fixed Price</span>
                    <span className="font-medium">${Number(wo.fixed_amount).toFixed(2)}</span>
                  </div>
                )}
                {wo.billing_type === 'hourly' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Hourly Rate</span>
                    <span className="font-medium">${wo.billing_rate}/hr</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Line Items Total</span>
                  <span className="font-medium">${lineItemsTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-500 font-medium">Collected On-Site</span>
                  <span className={`font-bold text-lg ${wo.payment_collected > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    ${Number(wo.payment_collected || 0).toFixed(2)}
                  </span>
                </div>
                {wo.payment_method && (
                  <p className="text-xs text-gray-400">via {wo.payment_method}</p>
                )}
              </div>
            </div>

            {wo.billing_type === 'not_billable' ? (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-600">This work order is not billable. No payment will be collected.</p>
              </div>
            ) : (
              <button
                onClick={() => setPaymentModal(true)}
                className="flex items-center gap-2 w-full justify-center px-4 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                Record On-Site Payment
              </button>
            )}
          </div>
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

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPaymentModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <button onClick={() => setPaymentModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {['cash', 'check', 'card', 'other'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentForm(p => ({ ...p, method }))}
                      className={`py-2 text-sm font-medium rounded-lg capitalize transition-all border-2 ${
                        paymentForm.method === method
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentForm.method !== 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference #</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                    placeholder="Check #, transaction ID..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPaymentModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={recordPayment}
                disabled={savingPayment || !paymentForm.amount}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingPayment ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
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
