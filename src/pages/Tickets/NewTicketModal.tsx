import { useState, useEffect } from 'react';
import { X, ChevronDown, Search, Globe, Phone, Mail, Building2, MessageSquare, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TYPE_OPTIONS, SOURCE_OPTIONS } from './types';
import type { TicketType, TicketSource, TicketPriority, LinkedRecordType } from './types';

interface Employee { id: string; first_name: string; last_name: string; role: string; }
interface Company { id: string; name: string; }
interface Site { id: string; name: string; address: string; company_id: string; }
interface CustomerSystem { id: string; name: string; site_id: string; }
interface Deal { id: string; title: string; }
interface Invoice { id: string; invoice_number: string; }

interface Props {
  onClose: () => void;
  onSaved: (id: string) => void;
  prefilledCompanyId?: string;
}

interface FormData {
  title: string;
  description: string;
  priority: TicketPriority;
  ticket_type: TicketType;
  source: TicketSource;
  due_date: string;
  company_id: string;
  assigned_to: string;
  show_in_customer_portal: boolean;
  initial_note: string;
  linked_site_ids: string[];
  linked_system_ids: string[];
  linked_deal_ids: string[];
  linked_invoice_ids: string[];
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  phone_call: Phone, email: Mail, portal: Globe, office: Building2, chat: MessageSquare,
};

export default function NewTicketModal({ onClose, onSaved, prefilledCompanyId }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [systems, setSystems] = useState<CustomerSystem[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');

  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    priority: 'normal',
    ticket_type: 'support',
    source: 'office',
    due_date: '',
    company_id: prefilledCompanyId || '',
    assigned_to: '',
    show_in_customer_portal: false,
    initial_note: '',
    linked_site_ids: [],
    linked_system_ids: [],
    linked_deal_ids: [],
    linked_invoice_ids: [],
  });

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    if (form.company_id) loadCompanyRecords(form.company_id);
    else { setSites([]); setSystems([]); setDeals([]); setInvoices([]); }
  }, [form.company_id]);

  async function loadDropdowns() {
    const [empRes, compRes] = await Promise.all([
      supabase.from('employees').select('id, first_name, last_name, role').eq('status', 'active').order('first_name'),
      supabase.from('companies').select('id, name').order('name'),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (compRes.data) setCompanies(compRes.data);
  }

  async function loadCompanyRecords(companyId: string) {
    const [siteRes, dealRes, invRes] = await Promise.all([
      supabase.from('sites').select('id, name, address, company_id').eq('company_id', companyId).order('name'),
      supabase.from('deals').select('id, title').eq('company_id', companyId).order('title'),
      supabase.from('invoices').select('id, invoice_number').eq('company_id', companyId).order('invoice_number', { ascending: false }),
    ]);
    if (siteRes.data) setSites(siteRes.data);
    if (dealRes.data) setDeals(dealRes.data);
    if (invRes.data) setInvoices(invRes.data);
  }

  async function loadSiteSystems(siteId: string) {
    const { data } = await supabase.from('customer_systems').select('id, name, site_id').eq('site_id', siteId).order('name');
    if (data) setSystems(prev => [...prev.filter(s => s.site_id !== siteId), ...data]);
  }

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function toggleArr(field: 'linked_site_ids' | 'linked_system_ids' | 'linked_deal_ids' | 'linked_invoice_ids', id: string) {
    setForm(prev => {
      const arr = prev[field] as string[];
      const exists = arr.includes(id);
      return { ...prev, [field]: exists ? arr.filter(x => x !== id) : [...arr, id] };
    });
  }

  async function handleSite(id: string) {
    toggleArr('linked_site_ids', id);
    if (!form.linked_site_ids.includes(id)) {
      await loadSiteSystems(id);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); setStep(0); return; }
    setSaving(true);
    setError(null);

    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('tickets')
        .insert({
          title: form.title.trim(),
          description: form.description || null,
          priority: form.priority,
          ticket_type: form.ticket_type,
          source: form.source,
          due_date: form.due_date || null,
          company_id: form.company_id || null,
          assigned_to: form.assigned_to || null,
          show_in_customer_portal: form.show_in_customer_portal,
          status: 'open',
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      const ticketId = inserted.id;

      const linkedRecords: { ticket_id: string; record_type: LinkedRecordType; record_id: string }[] = [
        ...form.linked_site_ids.map(id => ({ ticket_id: ticketId, record_type: 'site' as LinkedRecordType, record_id: id })),
        ...form.linked_system_ids.map(id => ({ ticket_id: ticketId, record_type: 'system' as LinkedRecordType, record_id: id })),
        ...form.linked_deal_ids.map(id => ({ ticket_id: ticketId, record_type: 'deal' as LinkedRecordType, record_id: id })),
        ...form.linked_invoice_ids.map(id => ({ ticket_id: ticketId, record_type: 'invoice' as LinkedRecordType, record_id: id })),
      ];

      if (linkedRecords.length > 0) {
        await supabase.from('ticket_linked_records').insert(linkedRecords);
      }

      if (form.initial_note.trim()) {
        await supabase.from('ticket_comments').insert({
          ticket_id: ticketId,
          body: form.initial_note.trim(),
          is_public: false,
        });
      }

      await supabase.from('ticket_timeline').insert({
        ticket_id: ticketId,
        event_type: 'created',
        description: 'Ticket created',
      });

      onSaved(ticketId);
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  }

  const filteredCompanies = companies.filter(c =>
    !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase())
  );
  const filteredEmployees = employees.filter(e =>
    !empSearch || `${e.first_name} ${e.last_name}`.toLowerCase().includes(empSearch.toLowerCase())
  );

  const STEPS = ['Details', 'Link Customer', 'Assign & Finalize'];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-xl bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Support Ticket</h2>
            <p className="text-sm text-gray-500 mt-0.5">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex border-b border-gray-100">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                step === i ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' :
                i < step ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {i < step ? <span className="flex items-center justify-center gap-1"><Check className="h-3 w-3" />{s}</span> : s}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

          {/* Step 0: Core Info */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  rows={4}
                  placeholder="Provide as much detail as possible..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                  <div className="relative">
                    <select
                      value={form.priority}
                      onChange={e => setField('priority', e.target.value as TicketPriority)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
                    >
                      {[
                        { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' },
                        { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
                      ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                  <div className="relative">
                    <select
                      value={form.ticket_type}
                      onChange={e => setField('ticket_type', e.target.value as TicketType)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
                    >
                      {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {SOURCE_OPTIONS.map(opt => {
                    const Icon = SOURCE_ICONS[opt.value] || Building2;
                    const selected = form.source === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setField('source', opt.value as TicketSource)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-left transition-all text-sm ${
                          selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setField('due_date', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 1: Link Customer */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={companySearch}
                    onChange={e => setCompanySearch(e.target.value)}
                    placeholder="Search customers..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <button
                    onClick={() => setField('company_id', '')}
                    className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 transition-colors ${!form.company_id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    No customer linked
                  </button>
                  {filteredCompanies.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setField('company_id', c.id); setCompanySearch(''); }}
                      className={`w-full text-left px-3 py-2.5 text-sm border-b last:border-0 border-gray-100 transition-colors ${form.company_id === c.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {form.company_id && sites.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link Sites (optional)</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {sites.map(site => {
                      const selected = form.linked_site_ids.includes(site.id);
                      return (
                        <button
                          key={site.id}
                          onClick={() => handleSite(site.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                            {selected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{site.name}</p>
                            <p className="text-xs text-gray-500">{site.address}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.linked_site_ids.length > 0 && systems.filter(s => form.linked_site_ids.includes(s.site_id)).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link Systems (optional)</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {systems.filter(s => form.linked_site_ids.includes(s.site_id)).map(sys => {
                      const selected = form.linked_system_ids.includes(sys.id);
                      return (
                        <button
                          key={sys.id}
                          onClick={() => toggleArr('linked_system_ids', sys.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                            {selected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{sys.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.company_id && deals.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link Deals (optional)</label>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {deals.map(deal => {
                      const selected = form.linked_deal_ids.includes(deal.id);
                      return (
                        <button
                          key={deal.id}
                          onClick={() => toggleArr('linked_deal_ids', deal.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                            {selected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className="text-sm text-gray-700 truncate">{deal.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.company_id && invoices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link Invoices (optional)</label>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {invoices.slice(0, 10).map(inv => {
                      const selected = form.linked_invoice_ids.includes(inv.id);
                      return (
                        <button
                          key={inv.id}
                          onClick={() => toggleArr('linked_invoice_ids', inv.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                            {selected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className="text-sm text-gray-700">Invoice #{inv.invoice_number}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Assign & Finalize */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assign to Agent</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    placeholder="Search agents..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  <button
                    onClick={() => setField('assigned_to', '')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm transition-all ${!form.assigned_to ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    Unassigned
                  </button>
                  {filteredEmployees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => setField('assigned_to', emp.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${form.assigned_to === emp.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${form.assigned_to === emp.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{emp.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  onClick={() => setField('show_in_customer_portal', !form.show_in_customer_portal)}
                >
                  <div className={`w-11 h-6 rounded-full transition-colors flex items-center flex-shrink-0 ${form.show_in_customer_portal ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.show_in_customer_portal ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Show in Customer Portal</p>
                    <p className="text-xs text-gray-500 mt-0.5">Customer will be able to see this ticket and its public replies</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial Internal Note (optional)</label>
                <textarea
                  value={form.initial_note}
                  onChange={e => setField('initial_note', e.target.value)}
                  rows={3}
                  placeholder="Add a private note for staff context..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-700">Summary</p>
                <div className="flex justify-between text-gray-600">
                  <span>Subject:</span>
                  <span className="font-medium text-gray-800 text-right max-w-xs truncate">{form.title || '—'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Priority / Type:</span>
                  <span className="font-medium text-gray-800 capitalize">{form.priority} / {form.ticket_type}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Source:</span>
                  <span className="font-medium text-gray-800 capitalize">{form.source.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Linked records:</span>
                  <span className="font-medium text-gray-800">
                    {form.linked_site_ids.length + form.linked_system_ids.length + form.linked_deal_ids.length + form.linked_invoice_ids.length} items
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => {
                  if (step === 0 && !form.title.trim()) { setError('Title is required'); return; }
                  setError(null);
                  setStep(s => s + 1);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Creating...' : 'Create Ticket'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
