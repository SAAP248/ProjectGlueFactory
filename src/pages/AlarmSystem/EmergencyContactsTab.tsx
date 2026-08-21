import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check, CheckCircle2, XCircle, GripVertical, Phone, Shield, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AlarmEmergencyContact } from '../CustomerProfile/types';

interface Props {
  systemId: string;
  contacts: AlarmEmergencyContact[];
  onContactsChange: (contacts: AlarmEmergencyContact[]) => void;
}

const ACCESS_LEVELS = ['Full', 'Limited', 'Key Holder', 'Emergency Only', 'None'];
const RELATIONS = ['Owner', 'Spouse', 'Manager', 'Employee', 'Neighbor', 'Family', 'Other'];

type CallSection = 'before_dispatch' | 'after_dispatch';

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function handlePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  return formatPhoneNumber(digits);
}

function displayPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

const emptyContact = (systemId: string, order: number, section: CallSection): Partial<AlarmEmergencyContact> => ({
  system_id: systemId,
  contact_order: order,
  first_name: '',
  last_name: '',
  phone: '',
  has_ecv_ctv: false,
  has_key: false,
  access_level: '',
  relation: '',
  call_section: section,
});

interface ContactModalProps {
  contact: Partial<AlarmEmergencyContact>;
  onClose: () => void;
  onSave: (c: Partial<AlarmEmergencyContact>) => Promise<void>;
}

function ContactModal({ contact: initial, onClose, onSave }: ContactModalProps) {
  const [form, setForm] = useState<Partial<AlarmEmergencyContact>>({
    ...initial,
    phone: initial.phone ? displayPhone(initial.phone) : '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof AlarmEmergencyContact, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...form, phone: form.phone?.replace(/\D/g, '') || '' });
    setSaving(false);
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{initial.id ? 'Edit Contact' : 'Add Emergency Contact'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name *</label>
              <input className={inputCls} value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} placeholder="John" />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input className={inputCls} value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input
                className={inputCls}
                value={form.phone || ''}
                onChange={e => set('phone', handlePhoneInput(e.target.value))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className={labelCls}>Relation</label>
              <select className={inputCls} value={form.relation || ''} onChange={e => set('relation', e.target.value)}>
                <option value="">Select...</option>
                {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Access Level</label>
              <select className={inputCls} value={form.access_level || ''} onChange={e => set('access_level', e.target.value)}>
                <option value="">Select...</option>
                {ACCESS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Section</label>
              <select className={inputCls} value={form.call_section || 'before_dispatch'} onChange={e => set('call_section', e.target.value)}>
                <option value="before_dispatch">Call Before Dispatch</option>
                <option value="after_dispatch">Call After Dispatch</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.has_ecv_ctv} onChange={e => set('has_ecv_ctv', e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
              <span className="text-sm text-gray-700">ECV / CTV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.has_key} onChange={e => set('has_key', e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
              <span className="text-sm text-gray-700">Has Key</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.first_name || !form.phone}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ContactCardProps {
  contact: AlarmEmergencyContact;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  isDragTarget: boolean;
}

function ContactCard({ contact, index, onEdit, onDelete, deleting, onDragStart, onDragOver, onDrop, isDragTarget }: ContactCardProps) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, contact.id)}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, contact.id)}
      className={`
        group relative flex items-center gap-3 p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing
        ${isDragTarget ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}
      `}
    >
      <div className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-shrink-0">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
          {index + 1}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {contact.first_name} {contact.last_name}
          </span>
          {contact.relation && (
            <span className="text-xs text-gray-400 flex-shrink-0">({contact.relation})</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-xs text-gray-600 font-mono">
            <Phone className="h-3 w-3 text-gray-400" />
            {displayPhone(contact.phone) || '—'}
          </span>
          {contact.access_level && (
            <span className="text-xs text-gray-400">{contact.access_level}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {contact.has_ecv_ctv && (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded">ECV</span>
        )}
        {contact.has_key && (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 rounded">Key</span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function EmergencyContactsTab({ systemId, contacts, onContactsChange }: Props) {
  const [modalContact, setModalContact] = useState<Partial<AlarmEmergencyContact> | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const dragItemRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const beforeContacts = contacts
    .filter(c => (c.call_section || 'before_dispatch') === 'before_dispatch')
    .sort((a, b) => a.contact_order - b.contact_order);
  const afterContacts = contacts
    .filter(c => c.call_section === 'after_dispatch')
    .sort((a, b) => a.contact_order - b.contact_order);

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
          call_section: contact.call_section,
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
          call_section: contact.call_section,
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragItemRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string, section: CallSection) => {
    e.preventDefault();
    setDragOverId(null);
    const draggedId = dragItemRef.current;
    if (!draggedId || draggedId === targetId) return;

    const sectionContacts = contacts
      .filter(c => (c.call_section || 'before_dispatch') === section)
      .sort((a, b) => a.contact_order - b.contact_order);

    const draggedContact = contacts.find(c => c.id === draggedId);
    if (!draggedContact) return;

    const isMovingToNewSection = (draggedContact.call_section || 'before_dispatch') !== section;

    let reordered: AlarmEmergencyContact[];
    if (isMovingToNewSection) {
      const targetIdx = sectionContacts.findIndex(c => c.id === targetId);
      const updated = [...sectionContacts];
      updated.splice(targetIdx, 0, { ...draggedContact, call_section: section });
      reordered = updated;
    } else {
      const fromIdx = sectionContacts.findIndex(c => c.id === draggedId);
      const toIdx = sectionContacts.findIndex(c => c.id === targetId);
      const updated = [...sectionContacts];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      reordered = updated;
    }

    const updates = reordered.map((c, i) => ({
      ...c,
      contact_order: i + 1,
      call_section: section,
    }));

    const allUpdated = contacts.map(c => {
      const found = updates.find(u => u.id === c.id);
      if (found) return found;
      if (c.id === draggedId && isMovingToNewSection) return null;
      return c;
    }).filter(Boolean) as AlarmEmergencyContact[];

    if (isMovingToNewSection) {
      const otherSection = section === 'before_dispatch' ? 'after_dispatch' : 'before_dispatch';
      const remaining = allUpdated
        .filter(c => (c.call_section || 'before_dispatch') === otherSection)
        .sort((a, b) => a.contact_order - b.contact_order)
        .map((c, i) => ({ ...c, contact_order: i + 1 }));
      const final = [
        ...allUpdated.filter(c => (c.call_section || 'before_dispatch') !== otherSection),
        ...remaining,
      ];
      onContactsChange(final);
      for (const u of [...updates, ...remaining]) {
        await supabase
          .from('alarm_emergency_contacts')
          .update({ contact_order: u.contact_order, call_section: u.call_section })
          .eq('id', u.id);
      }
    } else {
      onContactsChange(allUpdated);
      for (const u of updates) {
        await supabase
          .from('alarm_emergency_contacts')
          .update({ contact_order: u.contact_order })
          .eq('id', u.id);
      }
    }

    dragItemRef.current = null;
  };

  const handleDropOnSection = async (e: React.DragEvent, section: CallSection) => {
    e.preventDefault();
    setDragOverId(null);
    const draggedId = dragItemRef.current;
    if (!draggedId) return;

    const draggedContact = contacts.find(c => c.id === draggedId);
    if (!draggedContact) return;

    if ((draggedContact.call_section || 'before_dispatch') === section) return;

    const sectionContacts = contacts
      .filter(c => (c.call_section || 'before_dispatch') === section)
      .sort((a, b) => a.contact_order - b.contact_order);

    const newOrder = sectionContacts.length + 1;
    const updated = contacts.map(c => {
      if (c.id === draggedId) return { ...c, call_section: section, contact_order: newOrder };
      return c;
    }) as AlarmEmergencyContact[];

    const otherSection = section === 'before_dispatch' ? 'after_dispatch' : 'before_dispatch';
    const remaining = updated
      .filter(c => (c.call_section || 'before_dispatch') === otherSection)
      .sort((a, b) => a.contact_order - b.contact_order)
      .map((c, i) => ({ ...c, contact_order: i + 1 }));

    const final = [
      ...updated.filter(c => (c.call_section || 'before_dispatch') !== otherSection),
      ...remaining,
    ];
    onContactsChange(final);

    await supabase
      .from('alarm_emergency_contacts')
      .update({ call_section: section, contact_order: newOrder })
      .eq('id', draggedId);
    for (const r of remaining) {
      await supabase
        .from('alarm_emergency_contacts')
        .update({ contact_order: r.contact_order })
        .eq('id', r.id);
    }

    dragItemRef.current = null;
  };

  return (
    <div className="space-y-6">
      {/* Before Dispatch Section */}
      <SectionPanel
        title="Call Before Dispatch"
        description="These contacts are called first, before authorities are dispatched"
        icon={<Shield className="h-5 w-5 text-blue-600" />}
        section="before_dispatch"
        contacts={beforeContacts}
        onAdd={() => setModalContact(emptyContact(systemId, beforeContacts.length + 1, 'before_dispatch'))}
        onEdit={c => setModalContact(c)}
        onDelete={handleDelete}
        deleting={deleting}
        onDragStart={handleDragStart}
        onDragOver={(e) => { handleDragOver(e); }}
        onDrop={handleDrop}
        onDropOnSection={handleDropOnSection}
        dragOverId={dragOverId}
        setDragOverId={setDragOverId}
      />

      {/* After Dispatch Section */}
      <SectionPanel
        title="Call After Dispatch"
        description="These contacts are notified after authorities have been dispatched"
        icon={<ShieldAlert className="h-5 w-5 text-amber-600" />}
        section="after_dispatch"
        contacts={afterContacts}
        onAdd={() => setModalContact(emptyContact(systemId, afterContacts.length + 1, 'after_dispatch'))}
        onEdit={c => setModalContact(c)}
        onDelete={handleDelete}
        deleting={deleting}
        onDragStart={handleDragStart}
        onDragOver={(e) => { handleDragOver(e); }}
        onDrop={handleDrop}
        onDropOnSection={handleDropOnSection}
        dragOverId={dragOverId}
        setDragOverId={setDragOverId}
      />

      {modalContact && (
        <ContactModal contact={modalContact} onClose={() => setModalContact(null)} onSave={handleSave} />
      )}
    </div>
  );
}

interface SectionPanelProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  section: CallSection;
  contacts: AlarmEmergencyContact[];
  onAdd: () => void;
  onEdit: (c: AlarmEmergencyContact) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string, section: CallSection) => void;
  onDropOnSection: (e: React.DragEvent, section: CallSection) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
}

function SectionPanel({
  title, description, icon, section, contacts, onAdd, onEdit, onDelete, deleting,
  onDragStart, onDragOver, onDrop, onDropOnSection, dragOverId, setDragOverId,
}: SectionPanelProps) {
  const headerBg = section === 'before_dispatch' ? 'bg-blue-50/50' : 'bg-amber-50/50';
  const borderColor = section === 'before_dispatch' ? 'border-blue-200' : 'border-amber-200';

  return (
    <div
      className={`rounded-xl border ${borderColor} overflow-hidden`}
      onDragOver={onDragOver}
      onDrop={e => onDropOnSection(e, section)}
    >
      <div className={`flex items-center justify-between px-6 py-4 ${headerBg} border-b ${borderColor}`}>
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${section === 'before_dispatch' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
          </span>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>

      <div className="p-4">
        {contacts.length === 0 ? (
          <div className="py-10 text-center">
            <Phone className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No contacts in this section</p>
            <p className="text-xs text-gray-300 mt-1">Drag contacts here or click "Add" above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact, idx) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                index={idx}
                onEdit={() => onEdit(contact)}
                onDelete={() => onDelete(contact.id)}
                deleting={deleting === contact.id}
                onDragStart={onDragStart}
                onDragOver={(e) => {
                  onDragOver(e);
                  setDragOverId(contact.id);
                }}
                onDrop={(e) => onDrop(e, contact.id, section)}
                isDragTarget={dragOverId === contact.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
