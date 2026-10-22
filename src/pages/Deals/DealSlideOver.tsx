import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, MessageSquare, CheckSquare, Plus, CreditCard as Edit3, Save,
  AlertCircle, Send, FileText, User,
  Wrench, FolderKanban, Calendar, ChevronDown, ChevronUp, ChevronRight,
} from 'lucide-react';
import type { Deal, Employee, StatusField } from './types';
import { useDealActivities } from './useDeals';
import { supabase } from '../../lib/supabase';
import {
  FORECAST_CATEGORIES, formatCurrency, getWorkOrderStatusColor, getStatusGroup,
} from './types';
import DealCustomerHeader from './DealCustomerHeader';
import DealStatusCards from './DealStatusCards';
import DealStory from './DealStory';
import DealAccountingTab from './DealAccountingTab';
import DealProposalCard, { type DealProposal } from './DealProposalCard';
import DealInstallPanel from './DealInstallPanel';
import EstimatePanel from '../Estimates/EstimatePanel';
import type { NextStep, StoryLink } from './useDealStory';
import WorkOrderModal from '../WorkOrders/WorkOrderModal';
import SendToCustomerModal from '../Estimates/SendToCustomerModal';
import { createDealEstimate } from '../Estimates/useEstimates';
import NewProjectModal from '../ProjectManagement/NewProjectModal';
import { useDealTimeTracker } from '../../lib/useDealTimeTracker';

interface Props {
  deal: Deal | null;
  employees: Employee[];
  onClose: () => void;
  onUpdate: (dealId: string, updates: Partial<Deal>) => Promise<boolean>;
  onStatusChange: (
    dealId: string,
    field: StatusField,
    newValue: string | null,
    oldValue: string | null,
    extra?: { reason?: string; updates?: Partial<Deal> },
  ) => Promise<Deal | null>;
  onDealsChanged: () => Promise<void> | void;
  onViewCustomer?: (companyId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onOpenWorkOrder?: (workOrderId: string) => void;
}

interface UndoToast {
  message: string;
  undo?: () => Promise<void>;
}

function formFromDeal(deal: Deal): Partial<Deal> {
  return {
    title: deal.title,
    value: deal.value,
    probability: deal.probability,
    expected_close_date: deal.expected_close_date ?? '',
    forecast_category: deal.forecast_category,
    description: deal.description ?? '',
    scope_of_work: deal.scope_of_work ?? '',
    internal_notes: deal.internal_notes ?? '',
    terms_and_conditions: deal.terms_and_conditions ?? '',
  };
}

type ActiveTab = 'details' | 'work_orders' | 'accounting' | 'activity' | 'tasks';

function useProposal(dealId: string | null) {
  const [proposal, setProposal] = useState<DealProposal | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    const { data } = await supabase
      .from('estimates')
      .select('id, estimate_number, status, total, public_token, view_mode, sent_at, viewed_at')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    setProposal((data as DealProposal | null) ?? null);
    setLoading(false);
  }, [dealId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { proposal, loading, refetch: fetch };
}

interface DealWorkOrder {
  id: string;
  wo_number: string;
  title: string;
  status: string;
  billing_status: string;
  priority: string;
  work_order_type: string;
  scheduled_date: string | null;
  assigned_to: string | null;
  assigned_employee?: { first_name: string; last_name: string } | null;
}

function useDealWorkOrders(dealId: string | null) {
  const [workOrders, setWorkOrders] = useState<DealWorkOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    const { data } = await supabase
      .from('work_orders')
      .select('id, wo_number, title, status, billing_status, priority, work_order_type, scheduled_date, assigned_to, assigned_employee:employees!work_orders_assigned_to_fkey(first_name, last_name)')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });
    setWorkOrders((data ?? []) as unknown as DealWorkOrder[]);
    setLoading(false);
  }, [dealId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { workOrders, loading, refetch: fetch };
}

export default function DealSlideOver({ deal, employees, onClose, onUpdate, onStatusChange, onDealsChanged, onViewCustomer, onOpenInvoice, onOpenWorkOrder }: Props) {
  const openWorkOrder = (id: string) => {
    if (!onOpenWorkOrder) return;
    onClose();
    onOpenWorkOrder(id);
  };
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Deal>>({});
  const [noteText, setNoteText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<UndoToast | null>(null);
  const [eAgreementModal, setEAgreementModal] = useState(false);
  const [eAgreementEmail, setEAgreementEmail] = useState('');

  const { activities, tasks, addNote, addTask, toggleTask, refreshActivities } = useDealActivities(deal?.id ?? null);
  const { proposal, loading: proposalLoading, refetch: refetchProposal } = useProposal(deal?.id ?? null);
  const estimateId = proposal?.id ?? null;
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
  const [creatingEstimate, setCreatingEstimate] = useState(false);
  const [accountingRefresh, setAccountingRefresh] = useState(0);
  const { workOrders, loading: workOrdersLoading, refetch: refetchWorkOrders } = useDealWorkOrders(deal?.id ?? null);
  const [showCreateWO, setShowCreateWO] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);

  const [currentEmployeeId, setCurrentEmployeeId] = useState('');

  // Passive time tracking hook
  const { trackTabChange, trackAction } = useDealTimeTracker({
    dealId: deal?.id ?? null,
    employeeId: currentEmployeeId,
    enabled: !!deal && !!currentEmployeeId,
  });

  useEffect(() => {
    supabase.from('employees').select('id').eq('status', 'active').limit(1).then(({ data }) => {
      if (data?.[0]) setCurrentEmployeeId(data[0].id);
    });
  }, []);

  useEffect(() => {
    trackTabChange(activeTab);
  }, [activeTab, trackTabChange]);

  useEffect(() => {
    if (deal) {
      setForm(formFromDeal(deal));
      setEditing(false);
    }
  }, [deal?.id]);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  function showToast(message: string, undo?: () => Promise<void>) {
    clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 3000);
  }

  const [sendOpen, setSendOpen] = useState(false);

  if (!deal) return null;

  const overdueTasks = tasks.filter(t => !t.is_done && t.due_date && new Date(t.due_date) < new Date());

  const startEditing = () => {
    setForm(formFromDeal(deal));
    setEditing(true);
  };

  const handleStatusChange = async (field: StatusField, value: string, reason?: string) => {
    const before = deal;
    const oldValue = before[field] as string | null;
    const needsLostReason = field === 'sales_stage' && !!reason;
    const fresh = await onStatusChange(deal.id, field, value, oldValue, {
      reason,
      updates: needsLostReason ? { lost_reason: reason } : undefined,
    });
    if (!fresh) { showToast('Could not update the status. Please try again.'); return; }
    await refreshActivities();
    trackAction('status_changed', `${getStatusGroup(field).label}: ${value}`);
    const label = getStatusGroup(field).label;
    showToast(`${label} status set to "${value}"`, async () => {
      const restored = await onStatusChange(deal.id, field, oldValue, value, {
        updates: needsLostReason ? { lost_reason: before.lost_reason } : undefined,
      });
      if (restored && field === 'sales_stage' && before.install_status !== restored.install_status) {
        await onUpdate(deal.id, { install_status: before.install_status, office_status: before.office_status });
      }
      await refreshActivities();
      showToast(restored ? `${label} status restored to "${oldValue ?? 'empty'}"` : 'Could not undo the change.');
    });
  };

  const handleAssign = async (employeeId: string | null) => {
    const prev = deal.assigned_employee;
    const next = employees.find(e => e.id === employeeId);
    const ok = await onUpdate(deal.id, { assigned_employee_id: employeeId });
    if (!ok) { showToast('Could not change the salesperson.'); return; }
    const prevName = prev ? `${prev.first_name} ${prev.last_name}` : 'Unassigned';
    const nextName = next ? `${next.first_name} ${next.last_name}` : 'Unassigned';
    await supabase.from('deal_activities').insert({
      deal_id: deal.id,
      activity_type: 'assignment',
      description: `Salesperson changed from ${prevName} to ${nextName}`,
      old_value: prevName,
      new_value: nextName,
    });
    await refreshActivities();
    showToast(`Assigned to ${nextName}`);
  };

  const handleChooseSite = async (siteId: string) => {
    const ok = await onUpdate(deal.id, { site_id: siteId });
    showToast(ok ? 'Site added to this deal' : 'Could not set the site.');
  };

  const handleStoryLink = (link: StoryLink) => {
    if (link.type === 'estimate') { if (estimateId) setEditingEstimateId(estimateId); }
    else if (link.type === 'work_order') setActiveTab('work_orders');
    else if (onOpenInvoice) onOpenInvoice(link.id);
  };

  const handleStoryAction = async (action: NonNullable<NextStep['action']>) => {
    switch (action.kind) {
      case 'create_estimate': await handleCreateEstimate(); break;
      case 'send_estimate': openSend(); break;
      case 'follow_up': {
        const due = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
        await addTask(deal.id, `Follow up with ${deal.companies?.name ?? 'customer'} about the estimate`, due);
        showToast('Follow-up task added for tomorrow');
        break;
      }
      case 'mark_sold': await handleStatusChange('sales_stage', 'Sold'); break;
      case 'create_work_order': setShowCreateWO(true); break;
      case 'view_work_orders': setActiveTab('work_orders'); break;
      case 'open_invoice': if (action.invoiceId && onOpenInvoice) onOpenInvoice(action.invoiceId); break;
      case 'office_reviewed': await handleStatusChange('office_status', 'Office Reviewed'); break;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await onUpdate(deal.id, form);
    setSaving(false);
    if (ok) {
      setEditing(false);
      trackAction('deal_edited', 'Saved deal changes');
    }
  };

  const handleNoteSubmit = async () => {
    if (!noteText.trim()) return;
    await addNote(deal.id, noteText.trim());
    trackAction('note_added', noteText.trim().slice(0, 100));
    setNoteText('');
  };

  const handleTaskSubmit = async () => {
    if (!taskTitle.trim()) return;
    await addTask(deal.id, taskTitle.trim(), taskDue || null);
    trackAction('task_added', taskTitle.trim());
    setTaskTitle('');
    setTaskDue('');
  };

  const openSend = () => {
    if (!estimateId) {
      showToast('No estimate on this deal yet. Create one from the Details tab.');
      return;
    }
    setSendOpen(true);
  };

  async function handleCreateEstimate() {
    if (estimateId) { setEditingEstimateId(estimateId); return; }
    setCreatingEstimate(true);
    const id = await createDealEstimate(deal!);
    setCreatingEstimate(false);
    if (!id) { showToast('Could not create the estimate. Please try again.'); return; }
    await refetchProposal();
    setEditingEstimateId(id);
  }

  async function handleEstimateChanged() {
    if (!editingEstimateId) return;
    const { data } = await supabase.from('estimates').select('total').eq('id', editingEstimateId).maybeSingle();
    const total = data ? Number(data.total) : null;
    if (total !== null && total !== Number(deal!.value)) {
      await onUpdate(deal!.id, { value: total });
    }
    await refetchProposal();
    setAccountingRefresh(n => n + 1);
  }

  const handleProposalSent = async (mode: 'estimate' | 'proposal') => {
    const ok = await onUpdate(deal.id, {
      proposal_sent_date: new Date().toISOString(),
    });
    if (ok) await addNote(deal.id, `${mode === 'proposal' ? 'Proposal' : 'Estimate'} sent to customer.`);
    await Promise.all([refetchProposal(), onDealsChanged(), refreshActivities()]);
  };

  const handleSendEAgreement = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const ok = await onUpdate(deal.id, {
      agreement_sent_date: now,
    });
    if (ok) {
      await addNote(deal.id, `eAgreement sent${eAgreementEmail ? ` to ${eAgreementEmail}` : ''}.`);
      await refreshActivities();
      showToast('eAgreement marked as sent');
    }
    setEAgreementModal(false);
    setEAgreementEmail('');
    setSaving(false);
  };

  const tabs: { key: ActiveTab; label: string; count?: number }[] = [
    { key: 'details', label: 'Details' },
    { key: 'work_orders', label: 'Work Orders', count: workOrders.length },
    { key: 'accounting', label: 'Accounting' },
    { key: 'activity', label: 'Activity', count: activities.length },
    { key: 'tasks', label: 'Tasks', count: tasks.filter(t => !t.is_done).length },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex-1 pr-3">
            {editing ? (
              <input
                className="w-full text-lg font-bold text-gray-900 border-b-2 border-blue-500 bg-transparent outline-none pb-0.5"
                value={form.title ?? ''}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            ) : (
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{deal.title}</h2>
            )}
            <DealCustomerHeader
              deal={deal}
              employees={employees}
              onAssign={handleAssign}
              onChooseSite={handleChooseSite}
              onViewCustomer={onViewCustomer}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                <AlertCircle className="h-3 w-3" />
                {overdueTasks.length} overdue
              </span>
            )}
            <button
              onClick={() => setEAgreementModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              eAgreement
            </button>
            <button
              onClick={openSend}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Send to Customer
            </button>
            {!editing ? (
              <button onClick={startEditing} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
                <Edit3 className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold ${
                  activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="p-6 space-y-6">
              <DealStatusCards deal={deal} onChange={handleStatusChange} />

              <DealProposalCard
                proposal={proposal}
                loading={proposalLoading}
                creating={creatingEstimate}
                onOpen={() => proposal && setEditingEstimateId(proposal.id)}
                onSend={openSend}
                onCreate={handleCreateEstimate}
              />

              <DealStory
                deal={deal}
                activities={activities}
                employees={employees}
                onOpenLink={handleStoryLink}
                onAction={handleStoryAction}
              />

              <div className="border-t border-gray-100" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Deal Value</label>
                  {editing ? (
                    <input
                      type="number"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.value ?? ''}
                      onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
                    />
                  ) : (
                    <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(deal.value)}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Probability: {form.probability ?? deal.probability}%
                  </label>
                  {editing ? (
                    <input
                      type="range"
                      min={0} max={100} step={5}
                      className="mt-2 w-full accent-blue-600"
                      value={form.probability ?? deal.probability}
                      onChange={e => setForm(f => ({ ...f, probability: Number(e.target.value) }))}
                    />
                  ) : (
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${deal.probability}%` }} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Forecast</label>
                  {editing ? (
                    <select
                      className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.forecast_category ?? deal.forecast_category}
                      onChange={e => setForm(f => ({ ...f, forecast_category: e.target.value as Deal['forecast_category'] }))}
                    >
                      {FORECAST_CATEGORIES.map(fc => <option key={fc.value} value={fc.value}>{fc.label}</option>)}
                    </select>
                  ) : (
                    <span className={`mt-1 inline-block text-xs px-2.5 py-1 rounded-lg border font-medium ${FORECAST_CATEGORIES.find(f => f.value === deal.forecast_category)?.color}`}>
                      {FORECAST_CATEGORIES.find(f => f.value === deal.forecast_category)?.label}
                    </span>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expected Close</label>
                  {editing ? (
                    <input
                      type="date"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.expected_close_date ?? ''}
                      onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">
                      {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Close Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {deal.close_date ? new Date(deal.close_date).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                {editing ? (
                  <textarea
                    rows={3}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={form.description ?? ''}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{deal.description || '—'}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scope of Work</label>
                {editing ? (
                  <textarea
                    rows={4}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={form.scope_of_work ?? ''}
                    onChange={e => setForm(f => ({ ...f, scope_of_work: e.target.value }))}
                    placeholder="What will be installed and where..."
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">
                    {deal.scope_of_work || 'No scope of work written yet.'}
                  </p>
                )}
              </div>

              {(deal.terms_and_conditions || editing) && (
                <div>
                  <button
                    type="button"
                    onClick={() => setTermsExpanded(e => !e)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Terms & Conditions
                    {termsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {termsExpanded && (
                    editing ? (
                      <textarea
                        rows={5}
                        className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={form.terms_and_conditions ?? ''}
                        onChange={e => setForm(f => ({ ...f, terms_and_conditions: e.target.value }))}
                      />
                    ) : (
                      <p className="mt-1.5 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">
                        {deal.terms_and_conditions || '—'}
                      </p>
                    )
                  )}
                </div>
              )}

              {deal.internal_notes && !editing && (
                <div>
                  <label className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Internal Notes</label>
                  <p className="mt-1 text-sm text-amber-800 leading-relaxed bg-amber-50 rounded-lg p-3 border border-amber-100">
                    {deal.internal_notes}
                  </p>
                </div>
              )}
              {editing && (
                <div>
                  <label className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Internal Notes</label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-amber-50/50"
                    value={form.internal_notes ?? ''}
                    onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))}
                    placeholder="Private notes visible only to your team..."
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'accounting' && (
            <DealAccountingTab
              dealId={deal.id}
              onSaveCommission={(amount, payrollDate) => onUpdate(deal.id, { commission_amount: amount, commission_payroll_date: payrollDate })}
              onOpenInvoice={onOpenInvoice}
              onOpenWorkOrder={onOpenWorkOrder ? openWorkOrder : undefined}
              onOpenEstimate={setEditingEstimateId}
              refreshKey={accountingRefresh}
            />
          )}

          {activeTab === 'work_orders' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Work Orders</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FolderKanban className="h-3.5 w-3.5" />
                    Create Project
                  </button>
                  <button
                    onClick={() => setShowCreateWO(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Create Work Order
                  </button>
                </div>
              </div>

              <DealInstallPanel installStatus={deal.install_status} workOrders={workOrders} />

              {workOrdersLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading work orders...</div>
              ) : workOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-sm font-medium">No work orders yet</p>
                  <p className="text-gray-400 text-xs mt-1">Create a work order to dispatch a technician for this deal.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workOrders.map(wo => {
                    const statusColor = getWorkOrderStatusColor(wo.status, wo.billing_status);
                    return (
                      <button
                        type="button"
                        key={wo.id}
                        onClick={() => openWorkOrder(wo.id)}
                        disabled={!onOpenWorkOrder}
                        title="Open work order"
                        className={`group w-full text-left rounded-xl border-l-4 ${statusColor.border} ${statusColor.bg} border border-gray-200 p-4 transition-all enabled:hover:shadow-md enabled:hover:-translate-y-px enabled:hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-400">{wo.wo_number}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                                {statusColor.label}
                              </span>
                              {wo.priority === 'high' && (
                                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">High</span>
                              )}
                              {wo.priority === 'emergency' && (
                                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Emergency</span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{wo.title}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                              <span className="capitalize">{wo.work_order_type}</span>
                              {wo.scheduled_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {wo.assigned_employee && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {wo.assigned_employee.first_name} {wo.assigned_employee.last_name}
                                </span>
                              )}
                            </div>
                          </div>
                          {onOpenWorkOrder && (
                            <span className="flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0">
                              Open
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a note…"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNoteSubmit()}
                />
                <button
                  onClick={handleNoteSubmit}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>

              {activities.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No activity yet</p>
                </div>
              )}

              <div className="space-y-3">
                {activities.map(activity => (
                  <div key={activity.id} className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      activity.activity_type === 'stage_change' ? 'bg-blue-400' : 'bg-gray-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(activity.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="New task…"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                />
                <input
                  type="date"
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={taskDue}
                  onChange={e => setTaskDue(e.target.value)}
                />
                <button
                  onClick={handleTaskSubmit}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {tasks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No tasks yet</p>
                </div>
              )}

              <div className="space-y-2">
                {tasks.map(task => {
                  const isOverdue = !task.is_done && task.due_date && new Date(task.due_date) < new Date();
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        task.is_done ? 'bg-gray-50 border-gray-100' :
                        isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.is_done}
                        onChange={e => toggleTask(task.id, e.target.checked)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className={`text-sm ${task.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {task.title}
                        </p>
                        {task.due_date && (
                          <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                            {isOverdue ? 'Overdue: ' : 'Due: '}
                            {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {eAgreementModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEAgreementModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Send eAgreement</h3>
            <p className="text-sm text-gray-500 mb-4">Send an eAgreement request to the customer for this deal.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Recipient Email (optional)</label>
                <input
                  type="email"
                  placeholder="customer@email.com"
                  value={eAgreementEmail}
                  onChange={e => setEAgreementEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                This will mark the deal's agreement as sent and advance the sales stage to "Agreement Sent".
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setEAgreementModal(false); setEAgreementEmail(''); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEAgreement}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {saving ? 'Sending…' : 'Send eAgreement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] bg-gray-900 text-white text-sm font-medium pl-4 pr-2 py-2.5 rounded-xl shadow-xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {toast.message}
          {toast.undo && (
            <button
              onClick={() => { const undo = toast.undo; setToast(null); undo?.(); }}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-white/10 transition-colors"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {sendOpen && estimateId && (
        <SendToCustomerModal estimateId={estimateId} onClose={() => setSendOpen(false)} onSent={handleProposalSent} />
      )}

      {showCreateWO && deal && (
        <WorkOrderModal
          onClose={() => setShowCreateWO(false)}
          onSaved={() => { setShowCreateWO(false); refetchWorkOrders(); onDealsChanged(); refreshActivities(); showToast('Work order created'); }}
          prefilledCompanyId={deal.company_id}
          prefilledDealId={deal.id}
          prefilledSiteId={deal.site_id ?? undefined}
          prefilledTitle={`${deal.title} - Installation`}
          prefilledScopeOfWork={deal.scope_of_work ?? undefined}
          prefilledWorkOrderType="installation"
        />
      )}

      <EstimatePanel
        estimateId={editingEstimateId}
        creating={false}
        onClose={() => setEditingEstimateId(null)}
        onCreateDone={() => {}}
        onOpenEstimate={setEditingEstimateId}
        onChanged={handleEstimateChanged}
        onOpenInvoice={onOpenInvoice}
      />

      {showCreateProject && deal && (
        <NewProjectModal
          onClose={() => setShowCreateProject(false)}
          onSaved={() => { setShowCreateProject(false); showToast('Project created'); }}
          dealId={deal.id}
          prefilledCompanyId={deal.company_id}
        />
      )}
    </>
  );
}
