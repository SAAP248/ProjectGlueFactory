import { useState } from 'react';
import { Plus, Mail, Phone, Smartphone, Users, Pencil, Trash2, X, Check, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Contact, CallLog, CustomerEmail } from './types';

interface Props {
  companyId: string;
  contacts: Contact[];
  callLogs: CallLog[];
  emails: CustomerEmail[];
  onRefresh: () => void;
}

const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-teal-100 text-teal-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
];

function initials(first: string, last: string) {
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase();
}

const emptyForm = {
  first_name: '',
  last_name: '',
  title: '',
  email: '',
  phone: '',
  mobile: '',
  is_primary: false,
  notes: '',
};

type ContactForm = typeof emptyForm;

interface ContactModalProps {
  companyId: string;
  initial?: Contact;
  onClose: () => void;
  onSaved: () => void;
}

function ContactModal({ companyId, initial, onClose, onSaved }: ContactModalProps) {
  const [form, setForm] = useState<ContactForm>(
    initial
      ? {
          first_name: initial.first_name,
          last_name: initial.last_name,
          title: initial.title || '',
          email: initial.email || '',
          phone: initial.phone || '',
          mobile: initial.mobile || '',
          is_primary: initial.is_primary,
          notes: initial.notes || '',
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function field(key: keyof ContactForm, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.');
      return;
    }
    setSaving(true);
    if (initial) {
      await supabase.from('contacts').update({ ...form }).eq('id', initial.id);
    } else {
      await supabase.from('contacts').insert({ ...form, company_id: companyId });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{initial ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">First Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => field('first_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Last Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => field('last_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title / Role</label>
            <input
              type="text"
              value={form.title}
              onChange={e => field('title', e.target.value)}
              placeholder="e.g. Office Manager"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => field('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => field('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mobile</label>
              <input
                type="tel"
                value={form.mobile}
                onChange={e => field('mobile', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => field('notes', e.target.value)}
              rows={2}
              placeholder="Any additional notes about this contact..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => field('is_primary', !form.is_primary)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center ${form.is_primary ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow mx-1 transition-transform ${form.is_primary ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm text-gray-700">Set as primary contact</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsTab({ companyId, contacts, callLogs, emails, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    await supabase.from('contacts').delete().eq('id', id);
    setConfirmDelete(null);
    onRefresh();
  }

  function contactCallCount(id: string) {
    return callLogs.filter(c => c.contact_id === id).length;
  }

  function contactEmailCount(id: string) {
    return emails.filter(e => e.contact_id === id).length;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditContact(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No contacts for this customer</p>
          <p className="text-sm text-gray-400 mt-1">Add your first contact above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contacts.map((contact, idx) => {
            const calls = contactCallCount(contact.id);
            const mails = contactEmailCount(contact.id);
            return (
              <div
                key={contact.id}
                className={`bg-white rounded-xl border ${contact.is_primary ? 'border-blue-200 shadow-sm' : 'border-gray-100'} p-5 hover:shadow-md transition-shadow group relative`}
              >
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditContact(contact); setShowModal(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(contact.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${avatarColors[idx % avatarColors.length]}`}>
                    {initials(contact.first_name, contact.last_name)}
                  </div>
                  <div className="flex-1 min-w-0 pr-12">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </span>
                      {contact.is_primary && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          <Star className="h-3 w-3 fill-blue-500 text-blue-500" />
                          Primary
                        </span>
                      )}
                    </div>
                    {contact.title && (
                      <p className="text-sm text-gray-500 mt-0.5">{contact.title}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group/link"
                    >
                      <Mail className="h-4 w-4 text-gray-400 group-hover/link:text-blue-500 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group/link"
                    >
                      <Phone className="h-4 w-4 text-gray-400 group-hover/link:text-blue-500 flex-shrink-0" />
                      <span>{contact.phone}</span>
                    </a>
                  )}
                  {contact.mobile && (
                    <a
                      href={`tel:${contact.mobile}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group/link"
                    >
                      <Smartphone className="h-4 w-4 text-gray-400 group-hover/link:text-blue-500 flex-shrink-0" />
                      <span>{contact.mobile}</span>
                    </a>
                  )}
                </div>

                {contact.notes && (
                  <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 leading-relaxed">
                    {contact.notes}
                  </p>
                )}

                {(calls > 0 || mails > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                    {calls > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {calls} {calls === 1 ? 'call' : 'calls'}
                      </span>
                    )}
                    {mails > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {mails} {mails === 1 ? 'email' : 'emails'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ContactModal
          companyId={companyId}
          initial={editContact ?? undefined}
          onClose={() => { setShowModal(false); setEditContact(null); }}
          onSaved={onRefresh}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Contact?</h3>
            <p className="text-sm text-gray-500 mb-6">This will permanently delete the contact and cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
