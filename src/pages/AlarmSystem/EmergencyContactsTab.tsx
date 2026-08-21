import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check, GripVertical, Phone, AlertTriangle } from 'lucide-react';
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
              <label className={labelCls}>Call Timing</label>
              <select className={inputCls} value={form.call_section || 'before_dispatch'} onChange={e => set('call_section', e.target.value)}>
                <option value="before_dispatch">Before Dispatch</option>
                <option value="after_dispatch">After Dispatch</option>
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

export default function EmergencyContactsTab({ systemId, contacts, onContactsChange }: Props) {
  const [modalContact, setModalContact] = useState<Partial<AlarmEmergencyContact> | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const dragItemRef = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'above' | 'below' } | null>(null);
  const [dropOnDivider, setDropOnDivider] = useState(false);

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

  const persistOrder = async (updated: AlarmEmergencyContact[]) => {
    onContactsChange(updated);
    const toUpdate = updated.filter(c => {
      const orig = contacts.find(o => o.id === c.id);
      return orig && (orig.contact_order !== c.contact_order || orig.call_section !== c.call_section);
    });
    for (const c of toUpdate) {
      await supabase
        .from('alarm_emergency_contacts')
        .update({ contact_order: c.contact_order, call_section: c.call_section })
        .eq('id', c.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragItemRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragEnd = () => {
    dragItemRef.current = null;
    setDropTarget(null);
    setDropOnDivider(false);
  };

  const handleCardDragOver = (e: React.DragEvent, contactId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';
    setDropTarget({ id: contactId, position });
    setDropOnDivider(false);
  };

  const handleDividerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(null);
    setDropOnDivider(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = dragItemRef.current;
    if (!draggedId) return;

    if (dropOnDivider) {
      // Dropped on divider: move to end of "before" section
      const newBefore = [...beforeContacts.filter(c => c.id !== draggedId)];
      const newAfter = [...afterContacts.filter(c => c.id !== draggedId)];
      const dragged = contacts.find(c => c.id === draggedId);
      if (!dragged) return;
      newBefore.push({ ...dragged, call_section: 'before_dispatch' });

      const finalBefore = newBefore.map((c, i) => ({ ...c, contact_order: i + 1, call_section: 'before_dispatch' as CallSection }));
      const finalAfter = newAfter.map((c, i) => ({ ...c, contact_order: i + 1, call_section: 'after_dispatch' as CallSection }));
      persistOrder([...finalBefore, ...finalAfter]);
    } else if (dropTarget) {
      const targetContact = contacts.find(c => c.id === dropTarget.id);
      if (!targetContact) return;
      const targetSection: CallSection = (targetContact.call_section || 'before_dispatch') as CallSection;

      // Build new ordered lists
      let newBefore = beforeContacts.filter(c => c.id !== draggedId);
      let newAfter = afterContacts.filter(c => c.id !== draggedId);
      const dragged = contacts.find(c => c.id === draggedId);
      if (!dragged) return;

      const targetList = targetSection === 'before_dispatch' ? newBefore : newAfter;
      const targetIdx = targetList.findIndex(c => c.id === dropTarget.id);
      const insertIdx = dropTarget.position === 'above' ? targetIdx : targetIdx + 1;
      targetList.splice(insertIdx, 0, { ...dragged, call_section: targetSection });

      if (targetSection === 'before_dispatch') {
        newBefore = targetList;
      } else {
        newAfter = targetList;
      }

      const finalBefore = newBefore.map((c, i) => ({ ...c, contact_order: i + 1, call_section: 'before_dispatch' as CallSection }));
      const finalAfter = newAfter.map((c, i) => ({ ...c, contact_order: i + 1, call_section: 'after_dispatch' as CallSection }));
      persistOrder([...finalBefore, ...finalAfter]);
    }

    dragItemRef.current = null;
    setDropTarget(null);
    setDropOnDivider(false);
  };

  const totalContacts = contacts.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-base font-bold text-gray-900">Emergency Contact List</h3>
          <p className="text-xs text-gray-500 mt-0.5">{totalContacts} {totalContacts === 1 ? 'contact' : 'contacts'} &middot; Drag to reorder or move between sections</p>
        </div>
        <button
          onClick={() => setModalContact(emptyContact(systemId, beforeContacts.length + 1, 'before_dispatch'))}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {/* Unified list */}
      <div className="px-4 py-3">
        {/* Section label: Before Dispatch */}
        <div className="flex items-center gap-2 px-2 py-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Call Before Dispatch</span>
          <span className="text-[11px] text-gray-400">({beforeContacts.length})</span>
        </div>

        {/* Before dispatch contacts */}
        {beforeContacts.length === 0 && (
          <div
            className={`mx-2 mb-2 py-6 border-2 border-dashed rounded-lg text-center transition-colors ${
              dropTarget === null && !dropOnDivider && dragItemRef.current ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDropOnDivider(true);
              setDropTarget(null);
            }}
            onDrop={handleDrop}
          >
            <p className="text-xs text-gray-400">No contacts before dispatch. Drag here or add one.</p>
          </div>
        )}
        {beforeContacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            onEdit={() => setModalContact(contact)}
            onDelete={() => handleDelete(contact.id)}
            deleting={deleting === contact.id}
            onDragStart={handleDragStart}
            onDragOver={handleCardDragOver}
            onDragEnd={handleDragEnd}
            isDropAbove={dropTarget?.id === contact.id && dropTarget.position === 'above'}
            isDropBelow={dropTarget?.id === contact.id && dropTarget.position === 'below'}
          />
        ))}

        {/* Dispatch Divider */}
        <div
          className={`relative my-3 mx-2 transition-all ${dropOnDivider ? 'py-3' : 'py-1'}`}
          onDragOver={handleDividerDragOver}
          onDragLeave={() => setDropOnDivider(false)}
          onDrop={handleDrop}
        >
          <div className={`flex items-center gap-3 transition-all ${dropOnDivider ? 'scale-[1.02]' : ''}`}>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 to-amber-300" />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
              dropOnDivider
                ? 'border-amber-400 bg-amber-100 shadow-sm'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Dispatch</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-300 to-amber-300" />
          </div>
          {dropOnDivider && (
            <p className="text-center text-[10px] text-amber-600 mt-1 font-medium">Drop here to place at end of "Before Dispatch"</p>
          )}
        </div>

        {/* Section label: After Dispatch */}
        <div className="flex items-center gap-2 px-2 py-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Call After Dispatch</span>
          <span className="text-[11px] text-gray-400">({afterContacts.length})</span>
        </div>

        {/* After dispatch contacts */}
        {afterContacts.length === 0 && (
          <div
            className={`mx-2 mb-2 py-6 border-2 border-dashed rounded-lg text-center transition-colors ${
              dropTarget === null && !dropOnDivider && dragItemRef.current ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Treat as dropping into after section at position 1
              const fakeId = '__after_empty__';
              setDropTarget({ id: fakeId, position: 'above' });
              setDropOnDivider(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const draggedId = dragItemRef.current;
              if (!draggedId) return;
              const dragged = contacts.find(c => c.id === draggedId);
              if (!dragged) return;
              const newBefore = beforeContacts.filter(c => c.id !== draggedId).map((c, i) => ({ ...c, contact_order: i + 1, call_section: 'before_dispatch' as CallSection }));
              const newAfter = [{ ...dragged, call_section: 'after_dispatch' as CallSection, contact_order: 1 }];
              persistOrder([...newBefore, ...newAfter]);
              dragItemRef.current = null;
              setDropTarget(null);
              setDropOnDivider(false);
            }}
          >
            <p className="text-xs text-gray-400">No contacts after dispatch. Drag here or add one.</p>
          </div>
        )}
        {afterContacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            onEdit={() => setModalContact(contact)}
            onDelete={() => handleDelete(contact.id)}
            deleting={deleting === contact.id}
            onDragStart={handleDragStart}
            onDragOver={handleCardDragOver}
            onDragEnd={handleDragEnd}
            isDropAbove={dropTarget?.id === contact.id && dropTarget.position === 'above'}
            isDropBelow={dropTarget?.id === contact.id && dropTarget.position === 'below'}
          />
        ))}
      </div>

      {modalContact && (
        <ContactModal contact={modalContact} onClose={() => setModalContact(null)} onSave={handleSave} />
      )}
    </div>
  );
}

interface ContactRowProps {
  contact: AlarmEmergencyContact;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDropAbove: boolean;
  isDropBelow: boolean;
}

function ContactRow({ contact, onEdit, onDelete, deleting, onDragStart, onDragOver, onDragEnd, isDropAbove, isDropBelow }: ContactRowProps) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, contact.id)}
      onDragOver={e => onDragOver(e, contact.id)}
      onDragEnd={onDragEnd}
      className="relative mx-2 mb-1"
    >
      {/* Drop indicator above */}
      <div className={`absolute -top-[3px] left-0 right-0 h-[3px] rounded-full transition-opacity ${isDropAbove ? 'opacity-100 bg-blue-500' : 'opacity-0'}`} />

      <div className="group flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing active:shadow-md active:border-blue-200 active:bg-blue-50/30">
        {/* Grip */}
        <div className="flex-shrink-0 text-gray-300 group-hover:text-gray-400 transition-colors">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Order badge */}
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
            (contact.call_section || 'before_dispatch') === 'before_dispatch'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {contact.contact_order}
          </span>
        </div>

        {/* Contact info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {contact.first_name} {contact.last_name}
            </span>
            {contact.relation && (
              <span className="text-xs text-gray-400 flex-shrink-0">({contact.relation})</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-gray-500 font-mono">
              <Phone className="h-3 w-3 text-gray-400" />
              {displayPhone(contact.phone) || '—'}
            </span>
            {contact.access_level && (
              <span className="text-xs text-gray-400">{contact.access_level}</span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {contact.has_ecv_ctv && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded border border-emerald-100">ECV</span>
          )}
          {contact.has_key && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 rounded border border-amber-100">Key</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Drop indicator below */}
      <div className={`absolute -bottom-[3px] left-0 right-0 h-[3px] rounded-full transition-opacity ${isDropBelow ? 'opacity-100 bg-blue-500' : 'opacity-0'}`} />
    </div>
  );
}
