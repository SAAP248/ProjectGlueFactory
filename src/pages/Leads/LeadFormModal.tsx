import { useState, useEffect } from 'react';
import { X, Plus, Calendar, User, Phone, Mail, MapPin, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Lead, LeadSource } from './types';
import { APPOINTMENT_METHODS } from './types';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string | null;
}

interface Props {
  lead?: Lead | null;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function LeadFormModal({ lead, onClose, onSaved }: Props) {
  const isEdit = !!lead;

  const [form, setForm] = useState({
    contact_name: lead?.contact_name ?? '',
    contact_phone: lead?.contact_phone ?? '',
    contact_email: lead?.contact_email ?? '',
    address: lead?.address ?? '',
    city: lead?.city ?? '',
    state: lead?.state ?? '',
    zip: lead?.zip ?? '',
    lead_source_id: lead?.lead_source_id ?? '',
    notes: lead?.notes ?? '',
    assigned_employee_id: lead?.assigned_employee_id ?? '',
  });

  const [scheduleAppt, setScheduleAppt] = useState(false);
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptMethod, setApptMethod] = useState(APPOINTMENT_METHODS[0]);

  const [sources, setSources] = useState<LeadSource[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newSourceInput, setNewSourceInput] = useState('');
  const [showNewSource, setShowNewSource] = useState(false);
  const [addingSource, setAddingSource] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('lead_sources').select('*').eq('is_active', true).order('name'),
      supabase.from('employees').select('id, first_name, last_name, role').order('first_name'),
    ]).then(([{ data: s }, { data: e }]) => {
      setSources(s ?? []);
      setEmployees(e ?? []);
    });
  }, []);

  async function handleAddSource() {
    if (!newSourceInput.trim()) return;
    setAddingSource(true);
    const { data, error: err } = await supabase
      .from('lead_sources')
      .insert({ name: newSourceInput.trim() })
      .select()
      .single();
    if (!err && data) {
      setSources(prev => [...prev, data as LeadSource].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(f => ({ ...f, lead_source_id: data.id }));
      setNewSourceInput('');
      setShowNewSource(false);
    }
    setAddingSource(false);
  }

  async function handleSave() {
    if (!form.contact_name.trim()) { setError('Contact name is required.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      lead_source_id: form.lead_source_id || null,
      notes: form.notes || null,
      assigned_employee_id: form.assigned_employee_id || null,
      updated_at: new Date().toISOString(),
    };

    let savedLead: Lead | null = null;

    if (isEdit && lead) {
      const { data, error: err } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', lead.id)
        .select('*, lead_sources(*), employees(id, first_name, last_name)')
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      savedLead = data as Lead;
    } else {
      const { data, error: err } = await supabase
        .from('leads')
        .insert({ ...payload, status: 'new' })
        .select('*, lead_sources(*), employees(id, first_name, last_name)')
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      savedLead = data as Lead;

      await supabase.from('lead_activity_log').insert({
        lead_id: savedLead.id,
        action: 'Lead created',
      });
    }

    if (savedLead && scheduleAppt && apptDate) {
      await supabase.from('appointments').insert({
        appointment_date: apptDate,
        start_time: apptTime || null,
        appointment_type: 'sales_call',
        notes: `${apptMethod} — ${form.contact_name}`,
        status: 'scheduled',
        lead_id: savedLead.id,
        employee_id: form.assigned_employee_id || null,
      });
      await supabase.from('lead_activity_log').insert({
        lead_id: savedLead.id,
        action: `Appointment scheduled: ${apptMethod} on ${apptDate}${apptTime ? ' at ' + apptTime : ''}`,
      });
    }

    onSaved(savedLead);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4 text-amber-600" />
            </div>
            <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Lead' : 'New Lead'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Contact Info
            </h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name *</label>
              <input
                type="text"
                placeholder="John Smith"
                value={form.contact_name}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</label>
                <input
                  type="tel"
                  placeholder="555-000-0000"
                  value={form.contact_phone}
                  onChange={e => setForm(f => ({ ...f, contact_phone: formatPhone(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Mail className="h-3 w-3" /> Email</label>
                <input
                  type="email"
                  placeholder="john@email.com"
                  value={form.contact_email}
                  onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Address
            </h3>
            <input
              type="text"
              placeholder="Street address"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-5 gap-2">
              <input
                type="text" placeholder="City"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="col-span-3 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text" placeholder="ST"
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="col-span-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text" placeholder="ZIP"
                value={form.zip}
                onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
                className="col-span-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Assignment
            </h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lead Source</label>
              {showNewSource ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Source name…"
                    value={newSourceInput}
                    onChange={e => setNewSourceInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSource(); if (e.key === 'Escape') setShowNewSource(false); }}
                    autoFocus
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddSource}
                    disabled={addingSource || !newSourceInput.trim()}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowNewSource(false)}
                    className="px-3 py-2 text-gray-500 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={form.lead_source_id}
                    onChange={e => setForm(f => ({ ...f, lead_source_id: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select source…</option>
                    {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button
                    onClick={() => setShowNewSource(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Source
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assign Salesperson</label>
              <select
                value={form.assigned_employee_id}
                onChange={e => setForm(f => ({ ...f, assigned_employee_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}{emp.role ? ` — ${emp.role}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={3}
              placeholder="Internal notes about this lead…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {!isEdit && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleAppt}
                  onChange={e => setScheduleAppt(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Schedule an appointment now
                </span>
              </label>

              {scheduleAppt && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Appointment Method</label>
                    <select
                      value={apptMethod}
                      onChange={e => setApptMethod(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {APPOINTMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                      <input
                        type="date"
                        value={apptDate}
                        onChange={e => setApptDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                      <input
                        type="time"
                        value={apptTime}
                        onChange={e => setApptTime(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
