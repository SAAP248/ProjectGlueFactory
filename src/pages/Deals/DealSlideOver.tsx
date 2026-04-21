import { useState, useEffect, useCallback } from 'react';
import {
  X, MessageSquare, CheckSquare, Plus, Clock, CreditCard as Edit3, Save,
  AlertCircle, Send, FileText, User, Trash2, GripVertical, ShoppingBag, Search,
} from 'lucide-react';
import type { Deal, Employee } from './types';
import { useDealActivities } from './useDeals';
import { supabase } from '../../lib/supabase';
import {
  SALES_STAGES, INSTALL_STATUSES, OFFICE_STATUSES, FORECAST_CATEGORIES,
  getStageColor, getDaysInStage, getAgingColor, formatCurrency,
} from './types';

interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  image_url: string | null;
}

function useProductCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('products')
      .select('id,sku,name,category,cost,price,image_url')
      .eq('is_active', true)
      .order('category')
      .then(({ data }) => {
        setProducts((data ?? []) as CatalogProduct[]);
        setLoading(false);
      });
  }, []);

  return { products, loading };
}

interface Props {
  deal: Deal | null;
  employees: Employee[];
  onClose: () => void;
  onUpdate: (dealId: string, updates: Partial<Deal>) => Promise<boolean>;
}

type ActiveTab = 'details' | 'proposal' | 'activity' | 'tasks';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total: number;
  sort_order: number;
  isNew?: boolean;
}

function useProposal(dealId: string | null) {
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    const { data: est } = await supabase
      .from('estimates')
      .select('id, notes, terms')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (est) {
      setEstimateId(est.id);
      setNotes(est.notes ?? '');
      setTerms(est.terms ?? '');
      const { data: items } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', est.id)
        .order('sort_order');
      setLineItems((items ?? []).map(i => ({
        id: i.id,
        description: i.description ?? '',
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        unit_cost: Number(i.unit_cost),
        total: Number(i.total),
        sort_order: i.sort_order ?? 0,
      })));
    } else {
      setEstimateId(null);
      setLineItems([]);
      setNotes('');
      setTerms('');
    }
    setLoading(false);
  }, [dealId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { estimateId, lineItems, setLineItems, notes, setNotes, terms, setTerms, loading, refetch: fetch };
}

export default function DealSlideOver({ deal, employees, onClose, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Deal>>({});
  const [noteText, setNoteText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [eAgreementModal, setEAgreementModal] = useState(false);
  const [eAgreementEmail, setEAgreementEmail] = useState('');
  const [proposalSaving, setProposalSaving] = useState(false);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragSourceItemId, setDragSourceItemId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');
  const { products: catalogProducts, loading: catalogLoading } = useProductCatalog();

  const { activities, tasks, addNote, addTask, toggleTask } = useDealActivities(deal?.id ?? null);
  const { estimateId, lineItems, setLineItems, notes, setNotes, terms, setTerms, loading: proposalLoading, refetch: refetchProposal } = useProposal(deal?.id ?? null);

  useEffect(() => {
    if (deal) {
      setForm({
        title: deal.title,
        value: deal.value,
        probability: deal.probability,
        sales_stage: deal.sales_stage,
        install_status: deal.install_status,
        office_status: deal.office_status,
        expected_close_date: deal.expected_close_date ?? '',
        forecast_category: deal.forecast_category,
        description: deal.description ?? '',
        lost_reason: deal.lost_reason ?? '',
        assigned_employee_id: deal.assigned_employee_id ?? '',
      });
      setEditing(false);
    }
  }, [deal]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (!deal) return null;

  const days = getDaysInStage(deal.stage_entered_at);
  const overdueTasks = tasks.filter(t => !t.is_done && t.due_date && new Date(t.due_date) < new Date());
  const assignedEmployee = deal.assigned_employee;

  const handleSave = async () => {
    setSaving(true);
    const ok = await onUpdate(deal.id, form);
    setSaving(false);
    if (ok) setEditing(false);
  };

  const handleNoteSubmit = async () => {
    if (!noteText.trim()) return;
    await addNote(deal.id, noteText.trim());
    setNoteText('');
  };

  const handleTaskSubmit = async () => {
    if (!taskTitle.trim()) return;
    await addTask(deal.id, taskTitle.trim(), taskDue || null);
    setTaskTitle('');
    setTaskDue('');
  };

  const handleSendProposal = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const ok = await onUpdate(deal.id, {
      proposal_sent_date: now,
      sales_stage: 'Proposal Sent',
    });
    if (ok) {
      await addNote(deal.id, 'Proposal sent to customer.');
      showToast('Proposal marked as sent');
    }
    setSaving(false);
  };

  const handleSendEAgreement = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const ok = await onUpdate(deal.id, {
      agreement_sent_date: now,
      sales_stage: 'Agreement Sent',
    });
    if (ok) {
      await addNote(deal.id, `eAgreement sent${eAgreementEmail ? ` to ${eAgreementEmail}` : ''}.`);
      showToast('eAgreement marked as sent');
    }
    setEAgreementModal(false);
    setEAgreementEmail('');
    setSaving(false);
  };

  function addProductFromCatalog(product: CatalogProduct) {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: product.name,
      quantity: 1,
      unit_price: product.price,
      unit_cost: product.cost,
      total: product.price,
      sort_order: lineItems.length,
      isNew: true,
    };
    setLineItems(prev => [...prev, newItem]);
  }

  function addLineItem() {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit_price: 0,
      unit_cost: 0,
      total: 0,
      sort_order: lineItems.length,
      isNew: true,
    };
    setLineItems(prev => [...prev, newItem]);
  }

  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setLineItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, ...updates };
      updated.total = Number(updated.quantity) * Number(updated.unit_price);
      return updated;
    }));
  }

  function removeLineItem(id: string) {
    setLineItems(prev => prev.filter(i => i.id !== id));
  }

  function handleItemDragStart(e: React.DragEvent, id: string) {
    setDragSourceItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleItemDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragSourceItemId || dragSourceItemId === targetId) {
      setDragOverItemId(null);
      return;
    }
    const srcIdx = lineItems.findIndex(i => i.id === dragSourceItemId);
    const tgtIdx = lineItems.findIndex(i => i.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) { setDragOverItemId(null); return; }
    const reordered = [...lineItems];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, moved);
    setLineItems(reordered.map((item, idx) => ({ ...item, sort_order: idx })));
    setDragSourceItemId(null);
    setDragOverItemId(null);
  }

  const handleSaveProposal = async () => {
    if (!estimateId) return;
    setProposalSaving(true);

    const subtotal = lineItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
    await supabase.from('estimates').update({
      notes,
      terms,
      subtotal,
      total: subtotal,
      updated_at: new Date().toISOString(),
    }).eq('id', estimateId);

    const existingItems = lineItems.filter(i => !i.isNew);
    const newItems = lineItems.filter(i => i.isNew);

    for (const item of existingItems) {
      await supabase.from('estimate_line_items').update({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        total: item.total,
        sort_order: item.sort_order,
      }).eq('id', item.id);
    }

    if (newItems.length > 0) {
      await supabase.from('estimate_line_items').insert(newItems.map(i => ({
        estimate_id: estimateId,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        unit_cost: i.unit_cost,
        total: i.total,
        sort_order: i.sort_order,
      })));
    }

    await onUpdate(deal.id, { value: subtotal });
    await refetchProposal();
    setProposalSaving(false);
    showToast('Proposal saved');
  };

  const proposalTotal = lineItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const proposalCost = lineItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0);
  const proposalMargin = proposalTotal > 0 ? ((proposalTotal - proposalCost) / proposalTotal) * 100 : 0;

  const filteredCatalogProducts = catalogProducts.filter(p => {
    const matchesSearch = !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.sku.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCategory = !catalogCategory || p.category === catalogCategory;
    return matchesSearch && matchesCategory;
  });
  const catalogCategories = Array.from(new Set(catalogProducts.map(p => p.category))).sort();

  const tabs: { key: ActiveTab; label: string; count?: number }[] = [
    { key: 'details', label: 'Details' },
    { key: 'proposal', label: 'Proposal' },
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
            <p className="text-sm text-gray-500 mt-0.5">{deal.companies?.name ?? '—'}</p>
            {assignedEmployee && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <User className="h-3 w-3" />
                {assignedEmployee.first_name} {assignedEmployee.last_name}
              </p>
            )}
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
              onClick={handleSendProposal}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Send Proposal
            </button>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Salesperson</label>
                {editing ? (
                  <select
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={form.assigned_employee_id ?? ''}
                    onChange={e => setForm(f => ({ ...f, assigned_employee_id: e.target.value || null }))}
                  >
                    <option value="">— Unassigned —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-900 font-medium">
                      {assignedEmployee
                        ? `${assignedEmployee.first_name} ${assignedEmployee.last_name}`
                        : <span className="text-gray-400 font-normal">Unassigned</span>
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Days in Stage</label>
                  <div className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${getAgingColor(days)}`}>
                    <Clock className="h-3.5 w-3.5" />
                    {days} days
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
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pipeline Stages</label>
                {[
                  { label: 'Sales Stage', field: 'sales_stage' as const, options: SALES_STAGES },
                  { label: 'Install Status', field: 'install_status' as const, options: INSTALL_STATUSES },
                  { label: 'Office Status', field: 'office_status' as const, options: OFFICE_STATUSES },
                ].map(({ label, field, options }) => (
                  <div key={field} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 w-28">{label}</span>
                    {editing ? (
                      <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 ml-2"
                        value={form[field] ?? deal[field] ?? ''}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      >
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStageColor(deal[field] ?? '')}`}>
                        {deal[field] ?? '—'}
                      </span>
                    )}
                  </div>
                ))}
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

              {(deal.lost_reason || editing) && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lost Reason</label>
                  {editing ? (
                    <input
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Why was this deal lost?"
                      value={form.lost_reason ?? ''}
                      onChange={e => setForm(f => ({ ...f, lost_reason: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{deal.lost_reason || '—'}</p>
                  )}
                </div>
              )}

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

              <div className="pt-2 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Proposal Sent', date: deal.proposal_sent_date },
                    { label: 'Proposal Viewed', date: deal.proposal_viewed_date },
                    { label: 'Agreement Sent', date: deal.agreement_sent_date },
                  ].map(({ label, date }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5">
                        {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proposal' && (
            <div className="p-6 space-y-5">
              {proposalLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading proposal…</div>
              ) : !estimateId ? (
                <div className="text-center py-12">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-sm font-medium">No proposal attached to this deal yet.</p>
                  <p className="text-gray-400 text-xs mt-1">Create a new deal with the wizard to generate a proposal.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">Line Items</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Drag rows to reorder. Save when done.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCatalog(c => !c)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${showCatalog ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Browse Catalog
                      </button>
                      <button
                        onClick={handleSaveProposal}
                        disabled={proposalSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {proposalSaving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {showCatalog && (
                    <div className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/30">
                      <div className="px-4 pt-4 pb-3 border-b border-blue-100 space-y-2">
                        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Product Catalog</p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search by name or SKU…"
                              value={catalogSearch}
                              onChange={e => setCatalogSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <select
                            value={catalogCategory}
                            onChange={e => setCatalogCategory(e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">All Categories</option>
                            {catalogCategories.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-blue-100">
                        {catalogLoading ? (
                          <div className="p-4 text-center text-xs text-gray-400">Loading products…</div>
                        ) : filteredCatalogProducts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-400">No products found</div>
                        ) : (
                          filteredCatalogProducts.map(product => (
                            <button
                              key={product.id}
                              onClick={() => addProductFromCatalog(product)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-100/60 text-left transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <ShoppingBag className="h-4 w-4 text-blue-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                                <p className="text-xs text-gray-400">{product.sku} · {product.category}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-bold text-gray-900">${product.price.toFixed(2)}</p>
                                <p className="text-xs text-gray-400">cost ${product.cost.toFixed(2)}</p>
                              </div>
                              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="h-4 w-4 text-blue-600" />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="w-6 px-2" />
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Description</th>
                          <th className="text-center px-2 py-2 text-xs font-semibold text-gray-500 w-14">Qty</th>
                          <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-20">Cost</th>
                          <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-20">Price</th>
                          <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-14">Margin</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {lineItems.map(item => {
                          const lineTotal = Number(item.quantity) * Number(item.unit_price);
                          const lineCost = Number(item.quantity) * Number(item.unit_cost);
                          const lineMargin = lineTotal > 0 ? ((lineTotal - lineCost) / lineTotal) * 100 : 0;
                          return (
                            <tr
                              key={item.id}
                              draggable
                              onDragStart={e => handleItemDragStart(e, item.id)}
                              onDragOver={e => { e.preventDefault(); setDragOverItemId(item.id); }}
                              onDrop={e => handleItemDrop(e, item.id)}
                              onDragEnd={() => { setDragSourceItemId(null); setDragOverItemId(null); }}
                              className={`transition-colors ${dragOverItemId === item.id ? 'bg-blue-50' : 'hover:bg-gray-50/50'}`}
                            >
                              <td className="px-2 py-1.5 text-gray-300 cursor-grab">
                                <GripVertical className="h-4 w-4" />
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={e => updateLineItem(item.id, { description: e.target.value })}
                                  className="w-full border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5"
                                  placeholder="Description…"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={item.quantity}
                                  onChange={e => updateLineItem(item.id, { quantity: Number(e.target.value) })}
                                  className="w-14 border border-gray-200 rounded px-1.5 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center justify-end gap-0.5">
                                  <span className="text-gray-400 text-xs">$</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={item.unit_cost}
                                    onChange={e => updateLineItem(item.id, { unit_cost: Number(e.target.value) })}
                                    className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center justify-end gap-0.5">
                                  <span className="text-gray-400 text-xs">$</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={item.unit_price}
                                    onChange={e => updateLineItem(item.id, { unit_price: Number(e.target.value) })}
                                    className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${lineMargin >= 30 ? 'bg-emerald-50 text-emerald-700' : lineMargin >= 15 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                  {lineTotal > 0 ? `${lineMargin.toFixed(0)}%` : '—'}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">
                                <button onClick={() => removeLineItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="px-4 py-3 border-t border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={addLineItem}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5" /> Custom Line Item
                        </button>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Cost: <strong className="text-gray-700">${proposalCost.toFixed(2)}</strong></span>
                          <span className={`font-semibold px-1.5 py-0.5 rounded ${proposalMargin >= 30 ? 'bg-emerald-50 text-emerald-700' : proposalMargin >= 15 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                            {proposalTotal > 0 ? `${proposalMargin.toFixed(1)}% margin` : '—'}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          Total: ${proposalTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Scope of Work / Notes</label>
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Describe the work to be performed…"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Terms & Conditions</label>
                    <textarea
                      rows={5}
                      value={terms}
                      onChange={e => setTerms(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Payment terms, warranty, cancellation policy…"
                    />
                  </div>
                </>
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
        <div className="fixed bottom-6 right-6 z-[70] bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {toast}
        </div>
      )}
    </>
  );
}
