import { useState, useEffect } from 'react';
import { X, ChevronDown, Search, RotateCcw, AlertTriangle, Phone, MessageSquare, Building2, Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Company {
  id: string;
  name: string;
  is_trouble_customer?: boolean;
  trouble_notes?: string;
}

interface Site {
  id: string;
  name: string;
  address: string;
  company_id: string;
}

interface CustomerSystem {
  id: string;
  name: string;
  site_id: string;
  system_types?: { name: string };
}

interface GoBackReason {
  id: string;
  label: string;
}

interface PastWO {
  id: string;
  wo_number: string;
  title: string;
  scheduled_date: string | null;
}

interface WorkOrderFormData {
  source: string;
  company_id: string;
  site_id: string;
  system_id: string;
  title: string;
  work_order_type: string;
  priority: string;
  status: string;
  reason_for_visit: string;
  scope_of_work: string;
  billing_type: string;
  billing_rate: string;
  fixed_amount: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration: string;
  notes: string;
  technician_ids: string[];
  lead_technician_id: string;
  is_go_back: boolean;
  go_back_work_order_id: string;
  go_back_reason_ids: string[];
  go_back_notes: string;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
  prefilledCompanyId?: string;
  editWorkOrderId?: string;
}

const SOURCE_OPTIONS = [
  { value: 'phone_call', label: 'Phone Call', icon: Phone, activeClass: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'customer_request', label: 'Customer Request', icon: MessageSquare, activeClass: 'border-teal-500 bg-teal-50 text-teal-700' },
  { value: 'office', label: 'From Office', icon: Building2, activeClass: 'border-gray-500 bg-gray-100 text-gray-700' },
  { value: 'dispatch', label: 'Dispatch', icon: Radio, activeClass: 'border-amber-500 bg-amber-50 text-amber-700' },
];

const WO_TYPES = [
  { value: 'installation', label: 'Installation' },
  { value: 'service', label: 'Service' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'emergency', label: 'Emergency' },
];

const STATUSES = [
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const BILLING_TYPES = [
  { value: 'not_billable', label: 'Not Billable' },
  { value: 'hourly', label: 'Billable - Hourly Rate' },
  { value: 'fixed', label: 'Billable - Fixed Price' },
];

function generateWoNumber(): string {
  return `WO-${Date.now().toString().slice(-6)}`;
}

export default function WorkOrderModal({ onClose, onSaved, prefilledCompanyId, editWorkOrderId }: Props) {
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [systems, setSystems] = useState<CustomerSystem[]>([]);
  const [goBackReasons, setGoBackReasons] = useState<GoBackReason[]>([]);
  const [pastWOs, setPastWOs] = useState<PastWO[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [woSearch, setWoSearch] = useState('');

  const [form, setForm] = useState<WorkOrderFormData>({
    source: 'office',
    company_id: prefilledCompanyId || '',
    site_id: '',
    system_id: '',
    title: '',
    work_order_type: 'service',
    priority: 'normal',
    status: 'unassigned',
    reason_for_visit: '',
    scope_of_work: '',
    billing_type: 'not_billable',
    billing_rate: '',
    fixed_amount: '',
    scheduled_date: '',
    scheduled_time: '',
    estimated_duration: '60',
    notes: '',
    technician_ids: [],
    lead_technician_id: '',
    is_go_back: false,
    go_back_work_order_id: '',
    go_back_reason_ids: [],
    go_back_notes: '',
  });

  const selectedCompany = companies.find(c => c.id === form.company_id);

  useEffect(() => {
    loadDropdownData();
    if (editWorkOrderId) loadExistingWorkOrder();
  }, []);

  useEffect(() => {
    if (form.company_id) {
      loadSites(form.company_id);
      loadPastWOs(form.company_id);
    } else {
      setSites([]);
      setSystems([]);
      setPastWOs([]);
    }
  }, [form.company_id]);

  useEffect(() => {
    if (form.site_id) loadSystems(form.site_id);
    else setSystems([]);
  }, [form.site_id]);

  async function loadDropdownData() {
    const [empRes, compRes, reasonsRes] = await Promise.all([
      supabase.from('employees').select('id, first_name, last_name, role').eq('status', 'active').order('first_name'),
      supabase.from('companies').select('id, name, is_trouble_customer, trouble_notes').order('name'),
      supabase.from('go_back_reasons').select('id, label').eq('is_active', true).order('sort_order'),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (compRes.data) setCompanies(compRes.data);
    if (reasonsRes.data) setGoBackReasons(reasonsRes.data);
  }

  async function loadSites(companyId: string) {
    const { data } = await supabase.from('sites').select('id, name, address, company_id').eq('company_id', companyId).order('name');
    setSites(data || []);
  }

  async function loadSystems(siteId: string) {
    const { data } = await supabase.from('customer_systems').select('id, name, site_id, system_types(name)').eq('site_id', siteId).order('name');
    setSystems(data || []);
  }

  async function loadPastWOs(companyId: string) {
    const { data } = await supabase
      .from('work_orders').select('id, wo_number, title, scheduled_date')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(50);
    setPastWOs(data || []);
  }

  async function loadExistingWorkOrder() {
    const { data } = await supabase
      .from('work_orders').select('*, work_order_technicians(employee_id, is_lead)').eq('id', editWorkOrderId).maybeSingle();
    if (data) {
      const techs = data.work_order_technicians || [];
      const lead = techs.find((t: any) => t.is_lead);
      setForm({
        source: data.source || 'office',
        company_id: data.company_id || '',
        site_id: data.site_id || '',
        system_id: data.system_id || '',
        title: data.title || '',
        work_order_type: data.work_order_type || 'service',
        priority: data.priority || 'normal',
        status: data.status || 'unassigned',
        reason_for_visit: data.reason_for_visit || '',
        scope_of_work: data.scope_of_work || '',
        billing_type: data.billing_type || 'not_billable',
        billing_rate: data.billing_rate?.toString() || '',
        fixed_amount: data.fixed_amount?.toString() || '',
        scheduled_date: data.scheduled_date || '',
        scheduled_time: data.scheduled_time || '',
        estimated_duration: data.estimated_duration?.toString() || '60',
        notes: data.notes || '',
        technician_ids: techs.map((t: any) => t.employee_id),
        lead_technician_id: lead?.employee_id || '',
        is_go_back: data.is_go_back || false,
        go_back_work_order_id: data.go_back_work_order_id || '',
        go_back_reason_ids: data.go_back_reason_ids || [],
        go_back_notes: data.go_back_notes || '',
      });
    }
  }

  function setField<K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleTechnician(empId: string) {
    setForm(prev => {
      const exists = prev.technician_ids.includes(empId);
      const newIds = exists ? prev.technician_ids.filter(id => id !== empId) : [...prev.technician_ids, empId];
      const newLead = exists && prev.lead_technician_id === empId ? '' : prev.lead_technician_id;
      return { ...prev, technician_ids: newIds, lead_technician_id: newLead };
    });
  }

  function toggleGoBackReason(id: string) {
    setForm(prev => {
      const exists = prev.go_back_reason_ids.includes(id);
      return { ...prev, go_back_reason_ids: exists ? prev.go_back_reason_ids.filter(r => r !== id) : [...prev.go_back_reason_ids, id] };
    });
  }

  async function handleSave(asDraft = false) {
    if (!form.title.trim()) { setError('Title is required'); setActiveSection(1); return; }
    if (!form.company_id) { setError('Customer is required'); setActiveSection(2); return; }

    if (asDraft) setSavingDraft(true); else setSaving(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        source: form.source,
        company_id: form.company_id,
        site_id: form.site_id || null,
        system_id: form.system_id || null,
        title: form.title.trim(),
        work_order_type: form.work_order_type,
        priority: form.priority,
        status: asDraft ? 'unassigned' : form.status,
        reason_for_visit: form.reason_for_visit || null,
        scope_of_work: form.scope_of_work || null,
        billing_type: form.billing_type,
        billing_rate: form.billing_rate ? parseFloat(form.billing_rate) : 0,
        fixed_amount: form.fixed_amount ? parseFloat(form.fixed_amount) : 0,
        scheduled_date: form.scheduled_date || null,
        scheduled_time: form.scheduled_time || null,
        estimated_duration: parseInt(form.estimated_duration) || 60,
        notes: form.notes || null,
        assigned_to: form.lead_technician_id || null,
        is_go_back: form.is_go_back,
        go_back_reason_ids: form.is_go_back ? form.go_back_reason_ids : [],
        go_back_notes: form.is_go_back ? form.go_back_notes || null : null,
        go_back_work_order_id: form.is_go_back && form.go_back_work_order_id ? form.go_back_work_order_id : null,
        updated_at: new Date().toISOString(),
      };

      let workOrderId = editWorkOrderId;

      if (editWorkOrderId) {
        const { error: updateErr } = await supabase.from('work_orders').update(payload).eq('id', editWorkOrderId);
        if (updateErr) throw updateErr;
      } else {
        payload.wo_number = generateWoNumber();
        const { data: inserted, error: insertErr } = await supabase.from('work_orders').insert(payload).select('id').single();
        if (insertErr) throw insertErr;
        workOrderId = inserted.id;
      }

      if (workOrderId) {
        if (editWorkOrderId) {
          await supabase.from('work_order_technicians').delete().eq('work_order_id', workOrderId);
        }
        if (form.technician_ids.length > 0) {
          const durationMinutes = parseInt(form.estimated_duration) || 60;
          const startTime = form.scheduled_time || null;
          let endTime: string | null = null;
          if (startTime) {
            const [h, m] = startTime.split(':').map(Number);
            const total = h * 60 + m + durationMinutes;
            const nh = Math.floor(total / 60) % 24;
            const nm = total % 60;
            endTime = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
          }
          await supabase.from('work_order_technicians').insert(
            form.technician_ids.map(empId => ({
              work_order_id: workOrderId,
              employee_id: empId,
              is_lead: empId === form.lead_technician_id,
              scheduled_date: form.scheduled_date || null,
              scheduled_start_time: startTime,
              scheduled_end_time: endTime,
              estimated_duration_minutes: durationMinutes,
            }))
          );
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save work order');
    } finally {
      setSaving(false);
      setSavingDraft(false);
    }
  }

  const sections = ['Source', 'Job Info', 'Customer & Site', 'Schedule', 'Billing', 'Dispatch'];

  const filteredEmployees = employees.filter(emp => {
    if (!techSearch) return true;
    const s = techSearch.toLowerCase();
    return `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(s) || emp.role.toLowerCase().includes(s);
  });

  const filteredPastWOs = pastWOs.filter(wo => {
    if (!woSearch) return true;
    const s = woSearch.toLowerCase();
    return wo.wo_number.toLowerCase().includes(s) || wo.title.toLowerCase().includes(s);
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{editWorkOrderId ? 'Edit Work Order' : 'New Work Order'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{editWorkOrderId ? 'Update work order details' : 'Create a new service ticket'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
          {sections.map((s, i) => (
            <button
              key={s}
              onClick={() => setActiveSection(i)}
              className={`flex-shrink-0 flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeSection === i ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

          {activeSection === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">How did this job come in? <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {SOURCE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const selected = form.source === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setField('source', opt.value)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${selected ? opt.activeClass + ' border-current' : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'}`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.source === 'phone_call' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Call Notes (optional)</label>
                  <textarea
                    value={form.reason_for_visit}
                    onChange={e => setField('reason_for_visit', e.target.value)}
                    rows={3}
                    placeholder="What did the customer say on the call?"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              <div className="border-t border-gray-100 pt-5">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setField('is_go_back', !form.is_go_back)}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center flex-shrink-0 ${form.is_go_back ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.is_go_back ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-orange-500" />
                      This is a Follow-Up / Go-Back
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Link this to a previous work order and track the reason</p>
                  </div>
                </label>
              </div>

              {form.is_go_back && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Original Work Order (from same customer)</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={woSearch}
                        onChange={e => setWoSearch(e.target.value)}
                        placeholder="Search WO number or title..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                    {!form.company_id && <p className="text-xs text-gray-400 italic">Select a customer first to see past work orders</p>}
                    {form.company_id && filteredPastWOs.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto bg-white">
                        {filteredPastWOs.map(wo => (
                          <button
                            key={wo.id}
                            onClick={() => setField('go_back_work_order_id', form.go_back_work_order_id === wo.id ? '' : wo.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0 border-gray-100 ${form.go_back_work_order_id === wo.id ? 'bg-orange-50' : ''}`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${form.go_back_work_order_id === wo.id ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`} />
                            <span className="font-mono text-xs font-semibold text-orange-700">{wo.wo_number}</span>
                            <span className="text-sm text-gray-700 truncate">{wo.title}</span>
                            {wo.scheduled_date && (
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Go-Back Reasons (select all that apply)</label>
                    <div className="flex flex-wrap gap-2">
                      {goBackReasons.map(reason => {
                        const selected = form.go_back_reason_ids.includes(reason.id);
                        return (
                          <button
                            key={reason.id}
                            onClick={() => toggleGoBackReason(reason.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${selected ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300'}`}
                          >
                            {reason.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Go-Back Notes</label>
                    <textarea
                      value={form.go_back_notes}
                      onChange={e => setField('go_back_notes', e.target.value)}
                      rows={2}
                      placeholder="Additional notes about why we're going back..."
                      className="w-full px-3 py-2.5 border border-orange-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="Brief description of the job"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Order Type</label>
                  <div className="relative">
                    <select value={form.work_order_type} onChange={e => setField('work_order_type', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                      {WO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                  <div className="relative">
                    <select value={form.priority} onChange={e => setField('priority', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                      {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <div className="relative">
                  <select value={form.status} onChange={e => setField('status', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for Visit</label>
                <textarea value={form.reason_for_visit} onChange={e => setField('reason_for_visit', e.target.value)} rows={3} placeholder="Why is the customer calling? What is the reported issue?" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Scope of Work</label>
                <textarea value={form.scope_of_work} onChange={e => setField('scope_of_work', e.target.value)} rows={3} placeholder="What will we do? What is the planned work?" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Internal Notes</label>
                <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2} placeholder="Office notes, special instructions..." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          )}

          {activeSection === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    value={form.company_id}
                    onChange={e => { setField('company_id', e.target.value); setField('site_id', ''); setField('system_id', ''); setField('go_back_work_order_id', ''); }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
                  >
                    <option value="">Select a customer...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_trouble_customer ? ' ⚠' : ''}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {selectedCompany?.is_trouble_customer && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Trouble Customer — Office Staff Only</p>
                    {selectedCompany.trouble_notes && <p className="text-sm text-amber-700 mt-1">{selectedCompany.trouble_notes}</p>}
                    <p className="text-xs text-amber-600 mt-2">This information is not visible in the Technician Portal.</p>
                  </div>
                </div>
              )}

              {form.company_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Site / Location</label>
                  <div className="relative">
                    <select value={form.site_id} onChange={e => { setField('site_id', e.target.value); setField('system_id', ''); }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                      <option value="">Select a site...</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name} — {s.address}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  {sites.length === 0 && <p className="text-xs text-gray-400 mt-1">No sites found for this customer.</p>}
                </div>
              )}

              {form.site_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">System</label>
                  <div className="relative">
                    <select value={form.system_id} onChange={e => setField('system_id', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                      <option value="">Select a system...</option>
                      {systems.map(s => <option key={s.id} value={s.id}>{s.name}{(s.system_types as any)?.name ? ` (${(s.system_types as any).name})` : ''}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  {systems.length === 0 && <p className="text-xs text-gray-400 mt-1">No systems found for this site.</p>}
                </div>
              )}
            </div>
          )}

          {activeSection === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheduled Date</label>
                  <input type="date" value={form.scheduled_date} onChange={e => setField('scheduled_date', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheduled Time</label>
                  <input type="time" value={form.scheduled_time} onChange={e => setField('scheduled_time', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Duration</label>
                <div className="relative">
                  <select value={form.estimated_duration} onChange={e => setField('estimated_duration', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                    <option value="360">6 hours</option>
                    <option value="480">8 hours (full day)</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {activeSection === 4 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {BILLING_TYPES.map(bt => (
                    <label key={bt.value} className={`flex items-center gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${form.billing_type === bt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="billing_type" value={bt.value} checked={form.billing_type === bt.value} onChange={e => setField('billing_type', e.target.value)} className="text-blue-600" />
                      <span className={`text-sm font-medium ${form.billing_type === bt.value ? 'text-blue-700' : 'text-gray-700'}`}>{bt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.billing_type === 'hourly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Hourly Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" step="0.01" min="0" value={form.billing_rate} onChange={e => setField('billing_rate', e.target.value)} placeholder="0.00" className="w-full pl-7 pr-12 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/hr</span>
                  </div>
                </div>
              )}
              {form.billing_type === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fixed Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" step="0.01" min="0" value={form.fixed_amount} onChange={e => setField('fixed_amount', e.target.value)} placeholder="0.00" className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}
              {form.billing_type === 'not_billable' && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">This work order will not generate a customer charge. Use this for warranty work, callbacks, or internal maintenance.</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 5 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Assign Technicians</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={techSearch}
                    onChange={e => setTechSearch(e.target.value)}
                    placeholder="Search by name or role..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {filteredEmployees.length === 0 ? (
                  <p className="text-sm text-gray-400">No technicians found.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredEmployees.map(emp => {
                      const selected = form.technician_ids.includes(emp.id);
                      const isLead = form.lead_technician_id === emp.id;
                      return (
                        <div
                          key={emp.id}
                          className={`flex items-center justify-between p-3.5 rounded-lg border-2 cursor-pointer transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                          onClick={() => toggleTechnician(emp.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                              {emp.first_name[0]}{emp.last_name[0]}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${selected ? 'text-blue-800' : 'text-gray-800'}`}>{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-gray-500 capitalize">{emp.role}</p>
                            </div>
                          </div>
                          {selected && (
                            <button
                              onClick={e => { e.stopPropagation(); setField('lead_technician_id', isLead ? '' : emp.id); }}
                              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${isLead ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'}`}
                            >
                              {isLead ? 'Lead' : 'Set Lead'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {form.technician_ids.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-medium text-emerald-800">
                    {form.technician_ids.length} technician{form.technician_ids.length !== 1 ? 's' : ''} assigned
                    {form.lead_technician_id && ` · Lead: ${employees.find(e => e.id === form.lead_technician_id)?.first_name}`}
                  </p>
                </div>
              )}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-800 leading-relaxed">
                  <span className="font-semibold">Tip:</span> Each tech is scheduled for the date &amp; time above. To give techs different dates, different times, or to schedule a job across multiple days, open the work order and use the <span className="font-semibold">Technicians &amp; Schedule</span> card.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex gap-2">
            {activeSection > 0 && (
              <button onClick={() => setActiveSection(s => s - 1)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            {!editWorkOrderId && (
              <button
                onClick={() => handleSave(true)}
                disabled={savingDraft}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {savingDraft ? 'Saving...' : 'Save as Draft'}
              </button>
            )}
            {activeSection < sections.length - 1 ? (
              <button onClick={() => setActiveSection(s => s + 1)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Next
              </button>
            ) : (
              <button onClick={() => handleSave(false)} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {saving ? 'Saving...' : editWorkOrderId ? 'Save Changes' : 'Create Work Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
