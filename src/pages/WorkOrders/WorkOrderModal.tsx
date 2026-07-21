import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronDown, Search, RotateCcw, AlertTriangle, Phone, MessageSquare,
  Building2, Radio, UserPlus, Star, Clock, Plus, Trash2, Package, Truck,
  Calendar, Sun, Moon, Tag, StickyNote, ShieldAlert, MessageCircle,
} from 'lucide-react';
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
  notes?: string;
  critical_notes?: string;
  tags?: string[];
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

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
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

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  cost: number;
  price: number;
}

interface PartLineItem {
  key: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

interface TechAssignment {
  employee_id: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  work_order_title: string;
}

type TimeBlockMode = 'am' | 'pm' | 'specific';

interface WorkOrderFormData {
  source: string;
  company_id: string;
  site_id: string;
  system_id: string;
  requested_by_contact_id: string;
  requested_by_name: string;
  title: string;
  work_order_type: string;
  priority: string;
  status: string;
  reason_for_visit: string;
  scope_of_work: string;
  billing_type: string;
  billing_rate: string;
  fixed_amount: string;
  travel_fee: string;
  scheduled_date: string;
  scheduled_time: string;
  time_block: TimeBlockMode;
  estimated_duration: string;
  notes: string;
  technician_ids: string[];
  lead_technician_id: string;
  assign_date_only: boolean;
  is_go_back: boolean;
  go_back_work_order_id: string;
  go_back_reason_ids: string[];
  go_back_notes: string;
  notify_customer: boolean;
  notify_message: string;
  notify_phone: string;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
  prefilledCompanyId?: string;
  prefilledDealId?: string;
  prefilledSiteId?: string;
  prefilledTitle?: string;
  prefilledScopeOfWork?: string;
  prefilledWorkOrderType?: string;
  editWorkOrderId?: string;
}

const SOURCE_OPTIONS = [
  { value: 'phone_call', label: 'Phone Call', icon: Phone, activeClass: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'customer_request', label: 'Customer Request', icon: MessageSquare, activeClass: 'border-teal-500 bg-teal-50 text-teal-700' },
  { value: 'office', label: 'From Office', icon: Building2, activeClass: 'border-gray-500 bg-gray-100 text-gray-700' },
  { value: 'dispatch', label: 'Dispatch', icon: Radio, activeClass: 'border-amber-500 bg-amber-50 text-amber-700' },
];

const WO_TYPES = [
  { value: 'work_order', label: 'Work Order' },
  { value: 'service_call', label: 'Service Call' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'installation', label: 'Installation' },
  { value: 'project', label: 'Project' },
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

const HOUR_START = 6;
const HOUR_END = 18;
const TOTAL_HOURS = HOUR_END - HOUR_START;

function generateWoNumber(): string {
  return `WO-${Date.now().toString().slice(-6)}`;
}

function timeToHourOffset(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60 - HOUR_START;
}

export default function WorkOrderModal({ onClose, onSaved, prefilledCompanyId, prefilledDealId, prefilledSiteId, prefilledTitle, prefilledScopeOfWork, prefilledWorkOrderType, editWorkOrderId }: Props) {
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [systems, setSystems] = useState<CustomerSystem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [goBackReasons, setGoBackReasons] = useState<GoBackReason[]>([]);
  const [pastWOs, setPastWOs] = useState<PastWO[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [woSearch, setWoSearch] = useState('');

  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactFirst, setNewContactFirst] = useState('');
  const [newContactLast, setNewContactLast] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [addAsContact, setAddAsContact] = useState(true);

  // Parts catalog
  const [parts, setParts] = useState<PartLineItem[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Technician availability
  const [techAssignments, setTechAssignments] = useState<TechAssignment[]>([]);

  const [form, setForm] = useState<WorkOrderFormData>({
    source: 'office',
    company_id: prefilledCompanyId || '',
    site_id: prefilledSiteId || '',
    system_id: '',
    requested_by_contact_id: '',
    requested_by_name: '',
    title: prefilledTitle || '',
    work_order_type: prefilledWorkOrderType || 'service_call',
    priority: 'normal',
    status: 'unassigned',
    reason_for_visit: '',
    scope_of_work: prefilledScopeOfWork || '',
    billing_type: 'not_billable',
    billing_rate: '',
    fixed_amount: '',
    travel_fee: '',
    scheduled_date: '',
    scheduled_time: '',
    time_block: 'am',
    estimated_duration: '240',
    notes: '',
    technician_ids: [],
    lead_technician_id: '',
    assign_date_only: false,
    is_go_back: false,
    go_back_work_order_id: '',
    go_back_reason_ids: [],
    go_back_notes: '',
    notify_customer: false,
    notify_message: '',
    notify_phone: '',
  });

  const selectedCompany = companies.find(c => c.id === form.company_id);

  useEffect(() => {
    loadDropdownData();
    if (editWorkOrderId) loadExistingWorkOrder();
  }, []);

  useEffect(() => {
    if (form.company_id) {
      loadSites(form.company_id);
      loadContacts(form.company_id);
      loadPastWOs(form.company_id);
    } else {
      setSites([]);
      setSystems([]);
      setContacts([]);
      setPastWOs([]);
    }
  }, [form.company_id]);

  useEffect(() => {
    if (form.site_id) loadSystems(form.site_id);
    else setSystems([]);
  }, [form.site_id]);

  // Auto-select single site
  useEffect(() => {
    if (sites.length === 1 && !form.site_id) {
      setForm(prev => ({ ...prev, site_id: sites[0].id }));
    }
  }, [sites]);

  // Auto-select single system
  useEffect(() => {
    if (systems.length === 1 && !form.system_id) {
      setForm(prev => ({ ...prev, system_id: systems[0].id }));
    }
  }, [systems]);

  // Load tech assignments when date changes
  useEffect(() => {
    if (form.scheduled_date) loadTechAvailability(form.scheduled_date);
    else setTechAssignments([]);
  }, [form.scheduled_date]);

  // Update notify message when relevant fields change
  useEffect(() => {
    if (form.notify_customer) {
      const contact = contacts.find(c => c.id === form.requested_by_contact_id);
      const name = contact ? contact.first_name : 'there';
      const type = WO_TYPES.find(t => t.value === form.work_order_type)?.label || 'appointment';
      const dateStr = form.scheduled_date ? new Date(form.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '[Date TBD]';
      const timeStr = form.time_block === 'am' ? 'AM (8:00-12:00)' : form.time_block === 'pm' ? 'PM (12:00-4:00)' : form.scheduled_time || '[Time TBD]';
      setForm(prev => ({
        ...prev,
        notify_message: `Hi ${name}, your ${type} has been scheduled for ${dateStr} ${timeStr}. Please call us if you need to reschedule.`,
      }));
    }
  }, [form.notify_customer, form.scheduled_date, form.time_block, form.scheduled_time, form.requested_by_contact_id, form.work_order_type, contacts]);

  async function loadDropdownData() {
    const [empRes, compRes, reasonsRes] = await Promise.all([
      supabase.from('employees').select('id, first_name, last_name, role').eq('status', 'active').order('first_name'),
      supabase.from('companies').select('id, name, is_trouble_customer, trouble_notes, notes, critical_notes, tags').order('name'),
      supabase.from('go_back_reasons').select('id, label').eq('is_active', true).order('sort_order'),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (compRes.data) setCompanies(compRes.data as Company[]);
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

  async function loadContacts(companyId: string) {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, title, phone, email, is_primary')
      .eq('company_id', companyId)
      .order('is_primary', { ascending: false })
      .order('first_name');
    setContacts(data || []);
    // Auto-set notify phone from primary contact
    const primary = (data || []).find(c => c.is_primary);
    if (primary?.phone) {
      setForm(prev => ({ ...prev, notify_phone: primary.phone || '' }));
    }
  }

  async function loadPastWOs(companyId: string) {
    const { data } = await supabase
      .from('work_orders').select('id, wo_number, title, scheduled_date')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(50);
    setPastWOs(data || []);
  }

  async function loadTechAvailability(date: string) {
    const { data } = await supabase
      .from('work_order_technicians')
      .select('employee_id, scheduled_date, scheduled_start_time, scheduled_end_time, work_orders(title)')
      .eq('scheduled_date', date);
    if (data) {
      setTechAssignments(data.map((d: any) => ({
        employee_id: d.employee_id,
        scheduled_date: d.scheduled_date,
        scheduled_start_time: d.scheduled_start_time,
        scheduled_end_time: d.scheduled_end_time,
        work_order_title: d.work_orders?.title || 'Assigned',
      })));
    }
  }

  const loadCatalogProducts = useCallback(async () => {
    setCatalogLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, sku, name, category, cost, price')
      .eq('is_active', true)
      .order('name')
      .limit(200);
    setCatalogProducts(data || []);
    setCatalogLoading(false);
  }, []);

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
        requested_by_contact_id: data.requested_by_contact_id || '',
        requested_by_name: data.requested_by_name || '',
        title: data.title || '',
        work_order_type: data.work_order_type || 'service_call',
        priority: data.priority || 'normal',
        status: data.status || 'unassigned',
        reason_for_visit: data.reason_for_visit || '',
        scope_of_work: data.scope_of_work || '',
        billing_type: data.billing_type || 'not_billable',
        billing_rate: data.billing_rate?.toString() || '',
        fixed_amount: data.fixed_amount?.toString() || '',
        travel_fee: data.travel_fee?.toString() || '',
        scheduled_date: data.scheduled_date || '',
        scheduled_time: data.scheduled_time || '',
        time_block: data.time_block || 'am',
        estimated_duration: data.estimated_duration?.toString() || '240',
        notes: data.notes || '',
        technician_ids: techs.map((t: any) => t.employee_id),
        lead_technician_id: lead?.employee_id || '',
        assign_date_only: false,
        is_go_back: data.is_go_back || false,
        go_back_work_order_id: data.go_back_work_order_id || '',
        go_back_reason_ids: data.go_back_reason_ids || [],
        go_back_notes: data.go_back_notes || '',
        notify_customer: false,
        notify_message: '',
        notify_phone: '',
      });
      if (data.requested_by_name && !data.requested_by_contact_id) {
        setShowNewContact(true);
        const nameParts = (data.requested_by_name || '').split(' ');
        setNewContactFirst(nameParts[0] || '');
        setNewContactLast(nameParts.slice(1).join(' ') || '');
      }
      // Load existing parts
      const { data: lineItems } = await supabase
        .from('work_order_line_items')
        .select('*')
        .eq('work_order_id', editWorkOrderId)
        .eq('line_type', 'part')
        .order('created_at');
      if (lineItems) {
        setParts(lineItems.map((li: any) => ({
          key: li.id,
          product_id: li.product_id,
          description: li.description,
          quantity: li.quantity || 1,
          unit_price: li.unit_price || 0,
        })));
      }
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

  function formatPhoneNumber(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function handleRequestedByChange(value: string) {
    if (value === '__new_contact__') {
      setShowNewContact(true);
      setField('requested_by_contact_id', '');
      setField('requested_by_name', '');
    } else {
      setShowNewContact(false);
      setNewContactFirst('');
      setNewContactLast('');
      setNewContactPhone('');
      setNewContactEmail('');
      setField('requested_by_contact_id', value);
      setField('requested_by_name', '');
      // Update notify phone
      const c = contacts.find(ct => ct.id === value);
      if (c?.phone) setField('notify_phone', c.phone);
    }
  }

  function handleTimeBlockChange(block: TimeBlockMode) {
    if (block === 'am') {
      setForm(prev => ({ ...prev, time_block: 'am', scheduled_time: '08:00', estimated_duration: '240' }));
    } else if (block === 'pm') {
      setForm(prev => ({ ...prev, time_block: 'pm', scheduled_time: '12:00', estimated_duration: '240' }));
    } else {
      setForm(prev => ({ ...prev, time_block: 'specific', scheduled_time: prev.scheduled_time || '' }));
    }
  }

  function addProductToParts(product: Product) {
    setParts(prev => [...prev, {
      key: crypto.randomUUID(),
      product_id: product.id,
      description: product.name,
      quantity: 1,
      unit_price: product.price,
    }]);
    setShowCatalog(false);
  }

  function addCustomPart() {
    setParts(prev => [...prev, {
      key: crypto.randomUUID(),
      product_id: null,
      description: '',
      quantity: 1,
      unit_price: 0,
    }]);
  }

  function updatePart(key: string, field: keyof PartLineItem, value: any) {
    setParts(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p));
  }

  function removePart(key: string) {
    setParts(prev => prev.filter(p => p.key !== key));
  }

  async function handleSave(asDraft = false) {
    if (!form.company_id) { setError('Customer is required'); setActiveSection(1); return; }
    if (!form.title.trim()) { setError('Title is required'); setActiveSection(2); return; }

    if (asDraft) setSavingDraft(true); else setSaving(true);
    setError(null);

    try {
      let contactId = form.requested_by_contact_id || null;
      let contactName = form.requested_by_name || null;

      if (showNewContact && newContactFirst.trim()) {
        const fullName = `${newContactFirst.trim()} ${newContactLast.trim()}`.trim();
        const rawPhone = newContactPhone.replace(/\D/g, '');
        if (addAsContact && form.company_id) {
          const { data: newContact, error: contactErr } = await supabase
            .from('contacts')
            .insert({
              company_id: form.company_id,
              first_name: newContactFirst.trim(),
              last_name: newContactLast.trim(),
              phone: rawPhone || null,
              email: newContactEmail.trim() || null,
              is_primary: false,
            })
            .select('id')
            .single();
          if (contactErr) throw contactErr;
          contactId = newContact.id;
          contactName = null;
        } else {
          contactId = null;
          contactName = fullName;
        }
      }

      const resolvedStatus = form.assign_date_only ? 'unassigned' : (asDraft ? 'unassigned' : form.status);

      const payload: Record<string, any> = {
        source: form.source,
        company_id: form.company_id,
        site_id: form.site_id || null,
        system_id: form.system_id || null,
        requested_by_contact_id: contactId,
        requested_by_name: contactName,
        title: form.title.trim(),
        work_order_type: form.work_order_type,
        priority: form.priority,
        status: resolvedStatus,
        reason_for_visit: form.reason_for_visit || null,
        scope_of_work: form.scope_of_work || null,
        billing_type: form.billing_type,
        billing_rate: form.billing_rate ? parseFloat(form.billing_rate) : 0,
        fixed_amount: form.fixed_amount ? parseFloat(form.fixed_amount) : 0,
        travel_fee: form.travel_fee ? parseFloat(form.travel_fee) : 0,
        scheduled_date: form.scheduled_date || null,
        scheduled_time: form.scheduled_time || null,
        time_block: form.time_block,
        estimated_duration: parseInt(form.estimated_duration) || 240,
        notes: form.notes || null,
        assigned_to: form.assign_date_only ? null : (form.lead_technician_id || null),
        is_go_back: form.is_go_back,
        go_back_reason_ids: form.is_go_back ? form.go_back_reason_ids : [],
        go_back_notes: form.is_go_back ? form.go_back_notes || null : null,
        go_back_work_order_id: form.is_go_back && form.go_back_work_order_id ? form.go_back_work_order_id : null,
        updated_at: new Date().toISOString(),
        ...(prefilledDealId && !editWorkOrderId ? { deal_id: prefilledDealId } : {}),
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
        // Technician assignments
        if (editWorkOrderId) {
          await supabase.from('work_order_technicians').delete().eq('work_order_id', workOrderId);
        }
        if (!form.assign_date_only && form.technician_ids.length > 0) {
          const durationMinutes = parseInt(form.estimated_duration) || 240;
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

        // Parts / line items
        if (editWorkOrderId) {
          await supabase.from('work_order_line_items').delete().eq('work_order_id', workOrderId).eq('line_type', 'part');
        }
        if (parts.length > 0) {
          await supabase.from('work_order_line_items').insert(
            parts.filter(p => p.description.trim()).map(p => ({
              work_order_id: workOrderId,
              product_id: p.product_id || null,
              line_type: 'part',
              description: p.description,
              quantity: p.quantity,
              unit_price: p.unit_price,
              unit_cost: 0,
            }))
          );
        }

        // SMS notification log
        if (form.notify_customer && form.notify_phone && form.notify_message) {
          await supabase.from('sms_messages').insert({
            company_id: form.company_id,
            contact_id: form.requested_by_contact_id || null,
            direction: 'outbound',
            body: form.notify_message,
            phone_number: form.notify_phone.replace(/\D/g, ''),
            source: 'system',
            sent_at: new Date().toISOString(),
          });
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

  const sections = ['Source', 'Customer & Site', 'Job Info', 'Schedule & Assign', 'Billing', 'Notify'];

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

  const filteredCatalog = catalogProducts.filter(p => {
    if (!catalogSearch) return true;
    const s = catalogSearch.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.category || '').toLowerCase().includes(s);
  });

  const partsTotal = parts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);

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

          {/* Section 0: Source */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Original Work Order</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" value={woSearch} onChange={e => setWoSearch(e.target.value)} placeholder="Search WO number or title..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
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
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${form.go_back_work_order_id === wo.id ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`} />
                            <span className="font-mono text-xs font-semibold text-orange-700">{wo.wo_number}</span>
                            <span className="text-sm text-gray-700 truncate">{wo.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Go-Back Reasons</label>
                    <div className="flex flex-wrap gap-2">
                      {goBackReasons.map(reason => {
                        const selected = form.go_back_reason_ids.includes(reason.id);
                        return (
                          <button key={reason.id} onClick={() => toggleGoBackReason(reason.id)} className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${selected ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300'}`}>
                            {reason.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Go-Back Notes</label>
                    <textarea value={form.go_back_notes} onChange={e => setField('go_back_notes', e.target.value)} rows={2} placeholder="Additional notes..." className="w-full px-3 py-2.5 border border-orange-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Customer & Site */}
          {activeSection === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    value={form.company_id}
                    onChange={e => { setField('company_id', e.target.value); setField('site_id', ''); setField('system_id', ''); setField('go_back_work_order_id', ''); setField('requested_by_contact_id', ''); setField('requested_by_name', ''); setShowNewContact(false); }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
                  >
                    <option value="">Select a customer...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_trouble_customer ? ' ⚠' : ''}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Customer Context Panel */}
              {selectedCompany && (selectedCompany.is_trouble_customer || selectedCompany.tags?.length || selectedCompany.critical_notes || selectedCompany.notes) && (
                <div className="space-y-3">
                  {selectedCompany.is_trouble_customer && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-800">Trouble Customer</p>
                        {selectedCompany.trouble_notes && <p className="text-sm text-red-700 mt-1">{selectedCompany.trouble_notes}</p>}
                      </div>
                    </div>
                  )}

                  {selectedCompany.tags && selectedCompany.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      {selectedCompany.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">{tag}</span>
                      ))}
                    </div>
                  )}

                  {selectedCompany.critical_notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Access / Gate Codes</p>
                        <p className="text-sm text-amber-700 mt-0.5">{selectedCompany.critical_notes}</p>
                      </div>
                    </div>
                  )}

                  {selectedCompany.notes && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2.5">
                      <StickyNote className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600">{selectedCompany.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {form.company_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Site / Location
                    {sites.length === 1 && form.site_id && <span className="ml-2 text-xs text-emerald-600 font-normal">(auto-selected)</span>}
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    System
                    {systems.length === 1 && form.system_id && <span className="ml-2 text-xs text-emerald-600 font-normal">(auto-selected)</span>}
                  </label>
                  <div className="relative">
                    <select value={form.system_id} onChange={e => setField('system_id', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                      <option value="">Select a system...</option>
                      {systems.map(s => <option key={s.id} value={s.id}>{s.name}{(s.system_types as any)?.name ? ` (${(s.system_types as any).name})` : ''}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {form.company_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Requested By</label>
                  <div className="relative">
                    <select
                      value={showNewContact ? '__new_contact__' : form.requested_by_contact_id}
                      onChange={e => handleRequestedByChange(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
                    >
                      <option value="">Select who requested this...</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}{c.title ? ` — ${c.title}` : ''}{c.is_primary ? ' (Primary)' : ''}
                        </option>
                      ))}
                      <option value="__new_contact__">+ New Contact</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>

                  {!showNewContact && form.requested_by_contact_id && (() => {
                    const c = contacts.find(ct => ct.id === form.requested_by_contact_id);
                    if (!c) return null;
                    return (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {c.first_name[0]}{c.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                            {c.first_name} {c.last_name}
                            {c.is_primary && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                          </p>
                          {c.title && <p className="text-xs text-gray-500">{c.title}</p>}
                        </div>
                      </div>
                    );
                  })()}

                  {showNewContact && (
                    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <UserPlus className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-semibold text-gray-800">New Contact</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                          <input type="text" value={newContactFirst} onChange={e => setNewContactFirst(e.target.value)} placeholder="First name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Last Name <span className="text-red-500">*</span></label>
                          <input type="text" value={newContactLast} onChange={e => setNewContactLast(e.target.value)} placeholder="Last name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                          <input type="tel" value={newContactPhone} onChange={e => setNewContactPhone(formatPhoneNumber(e.target.value))} maxLength={14} placeholder="(555) 123-4567" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                          <input type="email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="email@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                        <div onClick={() => setAddAsContact(!addAsContact)} className={`w-9 h-5 rounded-full transition-colors flex items-center flex-shrink-0 ${addAsContact ? 'bg-blue-500' : 'bg-gray-200'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${addAsContact ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-sm text-gray-700">Add this person as a contact on the account</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Job Info */}
          {activeSection === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input type="text" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Brief description of the job" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
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

          {/* Section 3: Schedule & Assign */}
          {activeSection === 3 && (
            <div className="space-y-5">
              {/* Assign date only toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div
                  onClick={() => setField('assign_date_only', !form.assign_date_only)}
                  className={`w-10 h-5 rounded-full transition-colors flex items-center flex-shrink-0 ${form.assign_date_only ? 'bg-blue-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${form.assign_date_only ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Schedule date only — assign tech later</p>
                  <p className="text-xs text-gray-500">Job will appear on the dispatch board for assignment</p>
                </div>
              </label>

              {/* Customer time preference hint */}
              {selectedCompany?.critical_notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Site Access Notes</p>
                    <p className="text-xs text-amber-700 mt-0.5">{selectedCompany.critical_notes}</p>
                  </div>
                </div>
              )}

              {/* Date + Time Row */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheduled Date</label>
                <input type="date" value={form.scheduled_date} onChange={e => setField('scheduled_date', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Window</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTimeBlockChange('am')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      form.time_block === 'am' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    <span className="text-xs font-semibold">AM</span>
                    <span className="text-[10px] text-gray-500">8:00 - 12:00</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeBlockChange('pm')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      form.time_block === 'pm' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    <span className="text-xs font-semibold">PM</span>
                    <span className="text-[10px] text-gray-500">12:00 - 4:00</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeBlockChange('specific')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      form.time_block === 'specific' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-semibold">Specific</span>
                    <span className="text-[10px] text-gray-500">Choose time</span>
                  </button>
                </div>
              </div>

              {form.time_block === 'specific' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
                    <input type="time" value={form.scheduled_time} onChange={e => setField('scheduled_time', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
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

              {/* Duration-aware time preview */}
              {form.time_block === 'specific' && form.scheduled_time && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-emerald-800 font-medium">
                    {(() => {
                      const [h, m] = form.scheduled_time.split(':').map(Number);
                      const startStr = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                      const dur = parseInt(form.estimated_duration) || 240;
                      const totalMin = h * 60 + m + dur;
                      const endH = Math.floor(totalMin / 60) % 24;
                      const endM = totalMin % 60;
                      const endStr = `${endH > 12 ? endH - 12 : endH}:${String(endM).padStart(2, '0')} ${endH >= 12 ? 'PM' : 'AM'}`;
                      return `Scheduled window: ${startStr} — ${endStr} (${dur >= 60 ? `${dur / 60}h` : `${dur}min`})`;
                    })()}
                  </p>
                </div>
              )}

              {form.time_block !== 'specific' && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-blue-800 font-medium">
                    {form.time_block === 'am' ? 'Morning block: 8:00 AM — 12:00 PM' : 'Afternoon block: 12:00 PM — 4:00 PM'} (4-hour window)
                  </p>
                </div>
              )}

              {/* Technician Assignment (only when not date-only) */}
              {!form.assign_date_only && (
                <>
                  {/* Availability Timeline */}
                  {form.scheduled_date && employees.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Technician Availability — {new Date(form.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </label>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Time header */}
                        <div className="flex bg-gray-50 border-b border-gray-200">
                          <div className="w-28 flex-shrink-0 px-2 py-1.5 text-xs font-medium text-gray-500">Tech</div>
                          <div className="flex-1 flex">
                            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                              <div key={i} className="flex-1 text-center text-[10px] text-gray-400 py-1.5 border-l border-gray-100">
                                {i + HOUR_START > 12 ? `${i + HOUR_START - 12}p` : i + HOUR_START === 12 ? '12p' : `${i + HOUR_START}a`}
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Tech rows */}
                        <div className="max-h-48 overflow-y-auto">
                          {employees.filter(emp => emp.role.toLowerCase().includes('tech') || emp.role.toLowerCase().includes('field') || emp.role.toLowerCase().includes('install')).map(emp => {
                            const empAssignments = techAssignments.filter(a => a.employee_id === emp.id);
                            const isSelected = form.technician_ids.includes(emp.id);
                            return (
                              <div
                                key={emp.id}
                                onClick={() => toggleTechnician(emp.id)}
                                className={`flex border-b last:border-b-0 border-gray-100 cursor-pointer hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                              >
                                <div className="w-28 flex-shrink-0 px-2 py-2 flex items-center gap-1.5">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {emp.first_name[0]}{emp.last_name[0]}
                                  </div>
                                  <span className="text-xs font-medium text-gray-700 truncate">{emp.first_name}</span>
                                </div>
                                <div className="flex-1 relative py-1.5">
                                  <div className="absolute inset-0 flex">
                                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                                      <div key={i} className="flex-1 border-l border-gray-50" />
                                    ))}
                                  </div>
                                  {/* Show scheduled time block overlay */}
                                  {isSelected && form.scheduled_time && (() => {
                                    const start = timeToHourOffset(form.scheduled_time);
                                    const dur = (parseInt(form.estimated_duration) || 240) / 60;
                                    const left = Math.max(0, (start / TOTAL_HOURS) * 100);
                                    const width = Math.min(100 - left, (dur / TOTAL_HOURS) * 100);
                                    return (
                                      <div
                                        className="absolute top-1 bottom-1 rounded bg-blue-200 border border-blue-300 opacity-60"
                                        style={{ left: `${left}%`, width: `${width}%` }}
                                      />
                                    );
                                  })()}
                                  {empAssignments.map((a, idx) => {
                                    if (!a.scheduled_start_time) return null;
                                    const start = timeToHourOffset(a.scheduled_start_time);
                                    const end = a.scheduled_end_time ? timeToHourOffset(a.scheduled_end_time) : start + 1;
                                    const left = Math.max(0, (start / TOTAL_HOURS) * 100);
                                    const width = Math.min(100 - left, ((end - start) / TOTAL_HOURS) * 100);
                                    // Conflict detection
                                    let hasConflict = false;
                                    if (isSelected && form.scheduled_time) {
                                      const newStart = timeToHourOffset(form.scheduled_time);
                                      const newEnd = newStart + (parseInt(form.estimated_duration) || 240) / 60;
                                      hasConflict = newStart < end && newEnd > start;
                                    }
                                    return (
                                      <div
                                        key={idx}
                                        className={`absolute top-1 bottom-1 rounded flex items-center px-1 overflow-hidden ${hasConflict ? 'bg-red-200 border border-red-400' : 'bg-orange-200 border border-orange-300'}`}
                                        style={{ left: `${left}%`, width: `${width}%` }}
                                        title={`${a.work_order_title}${hasConflict ? ' (CONFLICT)' : ''}`}
                                      >
                                        <span className={`text-[9px] font-medium truncate ${hasConflict ? 'text-red-800' : 'text-orange-800'}`}>{a.work_order_title}</span>
                                      </div>
                                    );
                                  })}
                                  {empAssignments.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-[10px] text-emerald-500 font-medium">Available</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-3 h-2 rounded-sm bg-orange-200 border border-orange-300" />Existing job</span>
                        <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-3 h-2 rounded-sm bg-blue-200 border border-blue-300" />This job</span>
                        <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-3 h-2 rounded-sm bg-red-200 border border-red-400" />Conflict</span>
                      </div>
                    </div>
                  )}

                  {!form.scheduled_date && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <Calendar className="h-5 w-5 mx-auto text-gray-300 mb-1" />
                      <p className="text-xs text-gray-500">Pick a date above to see technician availability</p>
                    </div>
                  )}

                  {/* Technician List */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Technicians</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" value={techSearch} onChange={e => setTechSearch(e.target.value)} placeholder="Search by name or role..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    {filteredEmployees.length === 0 ? (
                      <p className="text-sm text-gray-400">No technicians found.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {filteredEmployees.map(emp => {
                          const selected = form.technician_ids.includes(emp.id);
                          const isLead = form.lead_technician_id === emp.id;
                          const empAssigns = techAssignments.filter(a => a.employee_id === emp.id);
                          // Check for scheduling conflict
                          let hasConflict = false;
                          if (selected && form.scheduled_time && empAssigns.length > 0) {
                            const newStart = timeToHourOffset(form.scheduled_time);
                            const newEnd = newStart + (parseInt(form.estimated_duration) || 240) / 60;
                            hasConflict = empAssigns.some(a => {
                              if (!a.scheduled_start_time) return false;
                              const aStart = timeToHourOffset(a.scheduled_start_time);
                              const aEnd = a.scheduled_end_time ? timeToHourOffset(a.scheduled_end_time) : aStart + 1;
                              return newStart < aEnd && newEnd > aStart;
                            });
                          }
                          return (
                            <div
                              key={emp.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg border-2 cursor-pointer transition-all ${hasConflict ? 'border-red-300 bg-red-50' : selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                              onClick={() => toggleTechnician(emp.id)}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${selected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                  {emp.first_name[0]}{emp.last_name[0]}
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${selected ? 'text-blue-800' : 'text-gray-800'}`}>{emp.first_name} {emp.last_name}</p>
                                  <p className="text-xs text-gray-500 capitalize">
                                    {emp.role}
                                    {empAssigns.length > 0 && <span className="text-orange-600 ml-1">· {empAssigns.length} job{empAssigns.length > 1 ? 's' : ''} today</span>}
                                    {hasConflict && <span className="text-red-600 ml-1 font-semibold">· TIME CONFLICT</span>}
                                  </p>
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

                  {/* Assignment summary */}
                  {form.technician_ids.length > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs font-medium text-emerald-800">
                        {form.technician_ids.length} technician{form.technician_ids.length !== 1 ? 's' : ''} assigned
                        {form.lead_technician_id && ` · Lead: ${employees.find(e => e.id === form.lead_technician_id)?.first_name}`}
                      </p>
                    </div>
                  )}
                </>
              )}

              {form.assign_date_only && form.scheduled_date && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <Calendar className="h-6 w-6 mx-auto text-blue-400 mb-2" />
                  <p className="text-sm font-medium text-blue-800">Scheduled for {new Date(form.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  <p className="text-xs text-blue-600 mt-1">This job will appear in the dispatch board for technician assignment</p>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Billing */}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Hourly Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input type="number" step="0.01" min="0" value={form.billing_rate} onChange={e => setField('billing_rate', e.target.value)} placeholder="0.00" className="w-full pl-7 pr-12 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/hr</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Travel Fee</label>
                    <div className="relative">
                      <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="number" step="0.01" min="0" value={form.travel_fee} onChange={e => setField('travel_fee', e.target.value)} placeholder="0.00" className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {form.billing_type === 'fixed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Fixed Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input type="number" step="0.01" min="0" value={form.fixed_amount} onChange={e => setField('fixed_amount', e.target.value)} placeholder="0.00" className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Travel Fee</label>
                    <div className="relative">
                      <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="number" step="0.01" min="0" value={form.travel_fee} onChange={e => setField('travel_fee', e.target.value)} placeholder="0.00" className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {form.billing_type === 'not_billable' && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">This work order will not generate a customer charge. Use this for warranty work, callbacks, or internal maintenance.</p>
                </div>
              )}

              {/* Parts & Materials */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    Parts & Materials
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { if (catalogProducts.length === 0) loadCatalogProducts(); setShowCatalog(true); }}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1"
                    >
                      <Search className="h-3 w-3" /> Browse Products
                    </button>
                    <button
                      type="button"
                      onClick={addCustomPart}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Custom Part
                    </button>
                  </div>
                </div>

                {showCatalog && (
                  <div className="mb-4 border border-blue-200 rounded-xl p-3 bg-blue-50/50">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                        placeholder="Search products by name, SKU, or category..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                      {catalogLoading ? (
                        <p className="p-3 text-sm text-gray-400 text-center">Loading...</p>
                      ) : filteredCatalog.length === 0 ? (
                        <p className="p-3 text-sm text-gray-400 text-center">No products found</p>
                      ) : (
                        filteredCatalog.slice(0, 30).map(p => (
                          <button
                            key={p.id}
                            onClick={() => addProductToParts(p)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 border-gray-50 text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-800">{p.name}</p>
                              <p className="text-xs text-gray-500">{p.sku}{p.category ? ` · ${p.category}` : ''}</p>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">${p.price.toFixed(2)}</span>
                          </button>
                        ))
                      )}
                    </div>
                    <button onClick={() => setShowCatalog(false)} className="mt-2 text-xs text-gray-500 hover:text-gray-700">Close catalog</button>
                  </div>
                )}

                {parts.length > 0 && (
                  <div className="space-y-2">
                    {parts.map(part => (
                      <div key={part.key} className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-lg">
                        <input
                          type="text"
                          value={part.description}
                          onChange={e => updatePart(part.key, 'description', e.target.value)}
                          placeholder="Part description"
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          min="1"
                          value={part.quantity}
                          onChange={e => updatePart(part.key, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={part.unit_price}
                            onChange={e => updatePart(part.key, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full pl-5 pr-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 w-16 text-right">${(part.quantity * part.unit_price).toFixed(2)}</span>
                        <button onClick={() => removePart(part.key)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-700">Parts Total: <span className="text-blue-700">${partsTotal.toFixed(2)}</span></p>
                    </div>
                  </div>
                )}

                {parts.length === 0 && !showCatalog && (
                  <p className="text-xs text-gray-400 mt-1">No parts added. Use the buttons above to add parts from your inventory or create custom line items.</p>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Notify Customer */}
          {activeSection === 5 && (
            <div className="space-y-5">
              <label className="flex items-center gap-3 cursor-pointer select-none p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div
                  onClick={() => setField('notify_customer', !form.notify_customer)}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center flex-shrink-0 ${form.notify_customer ? 'bg-emerald-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.notify_customer ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    Send text notification to customer
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Log an outbound SMS message about this appointment</p>
                </div>
              </label>

              {form.notify_customer && (
                <div className="space-y-4 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Phone</label>
                    <input
                      type="tel"
                      value={form.notify_phone}
                      onChange={e => setField('notify_phone', formatPhoneNumber(e.target.value))}
                      maxLength={14}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {contacts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {contacts.filter(c => c.phone).slice(0, 3).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setField('notify_phone', c.phone || '')}
                            className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-emerald-300 transition-colors"
                          >
                            {c.first_name} · {c.phone}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                    <textarea
                      value={form.notify_message}
                      onChange={e => setField('notify_message', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">{form.notify_message.length} characters</p>
                  </div>
                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold">Note:</span> This message will be logged in the customer's communication history. Actual SMS delivery requires integration setup.
                    </p>
                  </div>
                </div>
              )}

              {!form.notify_customer && (
                <div className="text-center py-8">
                  <MessageCircle className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-400">Toggle on to compose a notification message</p>
                </div>
              )}
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
