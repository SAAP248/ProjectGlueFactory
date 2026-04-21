import { useState, useEffect } from 'react';
import { X, ClipboardList, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { updateTicketField, logTimelineEvent } from './hooks';

interface Props {
  ticketId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface TicketData {
  title: string;
  description: string | null;
  company_id: string | null;
  companies?: { name: string } | null;
  linked_records?: { record_type: string; record_id: string }[];
}

interface Site { id: string; name: string; address: string; }
interface CustomerSystem { id: string; name: string; site_id: string; }
interface Employee { id: string; first_name: string; last_name: string; }

function generateWoNumber(): string {
  return `WO-${Date.now().toString().slice(-6)}`;
}

export default function ConvertToWorkOrderModal({ ticketId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [systems, setSystems] = useState<CustomerSystem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [form, setForm] = useState({
    title: '',
    reason_for_visit: '',
    site_id: '',
    system_id: '',
    work_order_type: 'service',
    priority: 'normal',
    scheduled_date: '',
    assigned_to: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (form.site_id) {
      supabase.from('customer_systems').select('id, name, site_id').eq('site_id', form.site_id).order('name')
        .then(({ data }) => { if (data) setSystems(data); });
    } else {
      setSystems([]);
    }
  }, [form.site_id]);

  async function loadData() {
    setLoading(true);
    const [ticketRes, empRes] = await Promise.all([
      supabase.from('tickets').select(`
        title, description, company_id, companies(name),
        linked_records:ticket_linked_records(record_type, record_id)
      `).eq('id', ticketId).maybeSingle(),
      supabase.from('employees').select('id, first_name, last_name').eq('status', 'active').order('first_name'),
    ]);

    if (ticketRes.data) {
      const t = ticketRes.data as any;
      setTicket(t);
      setForm(prev => ({
        ...prev,
        title: t.title || '',
        reason_for_visit: t.description || '',
      }));

      if (t.company_id) {
        const { data: siteData } = await supabase.from('sites').select('id, name, address').eq('company_id', t.company_id).order('name');
        if (siteData) setSites(siteData);

        const linkedSite = (t.linked_records || []).find((r: any) => r.record_type === 'site');
        const linkedSystem = (t.linked_records || []).find((r: any) => r.record_type === 'system');
        if (linkedSite) setForm(prev => ({ ...prev, site_id: linkedSite.record_id }));
        if (linkedSystem) setForm(prev => ({ ...prev, system_id: linkedSystem.record_id }));
      }
    }
    if (empRes.data) setEmployees(empRes.data);
    setLoading(false);
  }

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);

    try {
      const { data: wo, error: woErr } = await supabase.from('work_orders').insert({
        wo_number: generateWoNumber(),
        title: form.title.trim(),
        reason_for_visit: form.reason_for_visit || null,
        company_id: ticket?.company_id || null,
        site_id: form.site_id || null,
        system_id: form.system_id || null,
        work_order_type: form.work_order_type,
        priority: form.priority,
        status: 'unassigned',
        source: 'customer_request',
        scheduled_date: form.scheduled_date || null,
        assigned_to: form.assigned_to || null,
        billing_type: 'not_billable',
        estimated_duration: 60,
        updated_at: new Date().toISOString(),
      }).select('id').single();

      if (woErr) throw woErr;

      await updateTicketField(ticketId, { converted_to_work_order_id: wo.id });
      await logTimelineEvent(ticketId, 'converted_to_work_order', `Converted to work order ${wo.id}`);

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to create work order');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-white rounded-2xl p-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Convert to Work Order</h2>
              <p className="text-xs text-gray-500">Pre-filled from ticket details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

          {ticket?.companies && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">Customer: {ticket.companies.name}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for Visit</label>
            <textarea
              value={form.reason_for_visit}
              onChange={e => setField('reason_for_visit', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
              <div className="relative">
                <select value={form.work_order_type} onChange={e => setField('work_order_type', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                  <option value="service">Service</option>
                  <option value="installation">Installation</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <div className="relative">
                <select value={form.priority} onChange={e => setField('priority', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {sites.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Site</label>
              <div className="relative">
                <select value={form.site_id} onChange={e => { setField('site_id', e.target.value); setField('system_id', ''); }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {systems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">System</label>
              <div className="relative">
                <select value={form.system_id} onChange={e => setField('system_id', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                  <option value="">Select system...</option>
                  {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheduled Date</label>
              <input type="date" value={form.scheduled_date} onChange={e => setField('scheduled_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign Tech</label>
              <div className="relative">
                <select value={form.assigned_to} onChange={e => setField('assigned_to', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                  <option value="">Unassigned</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
