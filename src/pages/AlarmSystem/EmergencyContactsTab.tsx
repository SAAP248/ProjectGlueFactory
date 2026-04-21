import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AlarmEmergencyContact } from '../CustomerProfile/types';

interface Props {
  systemId: string;
  contacts: AlarmEmergencyContact[];
  onContactsChange: (contacts: AlarmEmergencyContact[]) => void;
}

const ACCESS_LEVELS = ['Full', 'Limited', 'Key Holder', 'Emergency Only', 'None'];
const RELATIONS = ['Owner', 'Spouse', 'Manager', 'Employee', 'Neighbor', 'Family', 'Other'];

const emptyContact = (systemId: string, order: number): Partial<AlarmEmergencyContact> => ({
  system_id: systemId,
  contact_order: order,
  first_name: '',
  last_name: '',
  phone: '',
  has_ecv_ctv: false,
  has_key: false,
  access_level: '',
  relation: '',
});

interface ContactModalProps {
  contact: Partial<AlarmEmergencyContact>;
  onClose: () => void;
  onSave: (c: Partial<AlarmEmergencyContact>) => Promise<void>;
}

function ContactModal({ contact: initial, onClose, onSave }: ContactModalProps) {
  const [form, setForm] = useState<Partial<AlarmEmergencyContact>>({ ...initial });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof AlarmEmergencyContact, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{initial.id ? 'Edit Contact' : 'Add Emergency Contact'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name</label>
              <input className={inputCls} value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input className={inputCls} value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(000) 000-0000" />
            </div>
            <div>
              <label className={labelCls}>Priority Order</label>
              <input className={inputCls} type="number" min={1} value={form.contact_order || 1} onChange={e => set('contact_order', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className={labelCls}>Access Level</label>
              <select className={inputCls} value={form.access_level || ''} onChange={e => set('access_level', e.target.value)}>
                <option value="">Select...</option>
                {ACCESS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Relation</label>
              <select className={inputCls} value={form.relation || ''} onChange={e => set('relation', e.target.value)}>
                <option value="">Select...</option>
                {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.has_ecv_ctv} onChange={e => set('has_ecv_ctv', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">ECV / CTV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.has_key} onChange={e => set('has_key', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">Has Key</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.first_name}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyContactsTab({ systemId, contacts, onContactsChange }: Props) {
  const [modalContact, setModalContact] = useState<Partial<AlarmEmergencyContact> | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSave = async (contact: Partial<AlarmEmergencyContact>) => {
    if (contact.id) {
      const { data } = await supabase
        .from('alarm_emergency_contacts')
        .update({
          contact_order: contact.contact_order,
          first_name: contact.first_name,
          last_name: contact.last_name,
          phone: contact.phone,
          has_ecv_ctv: contact.has_ecv_ctv,
          has_key: contact.has_key,
          access_level: contact.access_level,
          relation: contact.relation,
        })
        .eq('id', contact.id)
        .select()
        .maybeSingle();
      if (data) {
        onContactsChange(contacts.map(c => c.id === data.id ? (data as AlarmEmergencyContact) : c));
      }
    } else {
      const { data } = await supabase
        .from('alarm_emergency_contacts')
        .insert({
          system_id: systemId,
          contact_order: contact.contact_order,
          first_name: contact.first_name,
          last_name: contact.last_name,
          phone: contact.phone,
          has_ecv_ctv: contact.has_ecv_ctv,
          has_key: contact.has_key,
          access_level: contact.access_level,
          relation: contact.relation,
        })
        .select()
        .maybeSingle();
      if (data) onContactsChange([...contacts, data as AlarmEmergencyContact]);
    }
    setModalContact(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from('alarm_emergency_contacts').delete().eq('id', id);
    onContactsChange(contacts.filter(c => c.id !== id));
    setDeleting(null);
  };

  const sorted = [...contacts].sort((a, b) => a.contact_order - b.contact_order);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Emergency Contacts Information</h3>
        <button
          onClick={() => setModalContact(emptyContact(systemId, contacts.length + 1))}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">First Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">ECV/CTV</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Has Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Access Level</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Relation</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(contact => (
              <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {contact.contact_order}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{contact.first_name}</td>
                <td className="px-4 py-3 text-gray-800">{contact.last_name}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{contact.phone || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {contact.has_ecv_ctv
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                    : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}
                </td>
                <td className="px-4 py-3 text-center">
                  {contact.has_key
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                    : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}
                </td>
                <td className="px-4 py-3 text-gray-600">{contact.access_level || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{contact.relation || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setModalContact(contact)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      disabled={deleting === contact.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {contacts.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            No emergency contacts added yet. Click "Add Contact" to get started.
          </div>
        )}
      </div>

      {modalContact && (
        <ContactModal contact={modalContact} onClose={() => setModalContact(null)} onSave={handleSave} />
      )}
    </div>
  );
}
