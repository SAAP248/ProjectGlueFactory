import { useState } from 'react';
import { AlertTriangle, Check, Pencil, Plus, ShieldAlert, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Company } from './types';

type Tone = 'red' | 'amber';

const TONES: Record<Tone, { card: string; title: string; text: string; icon: string; iconBtn: string; input: string; save: string }> = {
  red: {
    card: 'border-red-200 bg-red-50',
    title: 'text-red-700',
    text: 'text-red-800',
    icon: 'text-red-600',
    iconBtn: 'text-red-400 hover:text-red-700 hover:bg-red-100',
    input: 'border-red-300 focus:ring-red-400',
    save: 'bg-red-600 hover:bg-red-700',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50',
    title: 'text-amber-700',
    text: 'text-amber-900',
    icon: 'text-amber-600',
    iconBtn: 'text-amber-500 hover:text-amber-700 hover:bg-amber-100',
    input: 'border-amber-300 focus:ring-amber-400',
    save: 'bg-amber-600 hover:bg-amber-700',
  },
};

interface NoteCardProps {
  tone: Tone;
  icon: typeof AlertTriangle;
  title: string;
  text: string;
  emptyText: string;
  placeholder: string;
  meta?: string;
  startEditing?: boolean;
  onSave: (value: string) => Promise<boolean>;
  onCancelNew?: () => void;
  extraAction?: React.ReactNode;
}

function NoteCard({ tone, icon: Icon, title, text, emptyText, placeholder, meta, startEditing = false, onSave, onCancelNew, extraAction }: NoteCardProps) {
  const t = TONES[tone];
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(text);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const isLong = text.length > 110 || text.split('\n').length > 2;

  async function save() {
    setSaving(true);
    setError(false);
    const ok = await onSave(draft.trim());
    setSaving(false);
    if (ok) setEditing(false);
    else setError(true);
  }

  function cancel() {
    setEditing(false);
    setDraft(text);
    setError(false);
    if (!text) onCancelNew?.();
  }

  return (
    <div className={`rounded-lg border px-3 py-2 ${t.card}`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${t.icon}`} />
        <span className={`flex-1 text-[11px] font-semibold uppercase tracking-wide ${t.title}`}>{title}</span>
        {!editing && (
          <button onClick={() => { setDraft(text); setEditing(true); }} aria-label={`Edit ${title}`} className={`rounded p-1 transition-colors ${t.iconBtn}`}>
            <Pencil className="h-3 w-3" />
          </button>
        )}
        {!editing && extraAction}
      </div>

      {editing ? (
        <div className="mt-1.5">
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className={`w-full resize-none rounded-md border bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${t.input}`}
          />
          {error && <p className="mt-1 text-[11px] text-red-600">Couldn't save. Please try again.</p>}
          <div className="mt-1.5 flex justify-end gap-1.5">
            <button onClick={cancel} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button onClick={save} disabled={saving} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white transition-colors disabled:opacity-60 ${t.save}`}>
              <Check className="h-3 w-3" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={`mt-0.5 whitespace-pre-line text-xs leading-relaxed ${t.text} ${!expanded ? 'line-clamp-2' : ''} ${!text ? 'italic opacity-70' : ''}`}>
            {text || emptyText}
          </p>
          {(isLong || meta) && (
            <div className="mt-0.5 flex items-center justify-between gap-2">
              {meta ? <span className={`text-[11px] opacity-70 ${t.title}`}>{meta}</span> : <span />}
              {isLong && (
                <button onClick={() => setExpanded(v => !v)} className={`text-[11px] font-medium hover:underline ${t.title}`}>
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface Props {
  company: Company;
  onRemoveTroubleFlag: () => void;
  onCompanyChange: (patch: Partial<Company>) => void;
}

export default function CustomerAlerts({ company, onRemoveTroubleFlag, onCompanyChange }: Props) {
  const [addingNote, setAddingNote] = useState(false);
  const troubleFlaggedAt = company.trouble_flagged_at
    ? `Flagged ${new Date(company.trouble_flagged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : undefined;

  async function saveField(field: 'critical_notes' | 'trouble_notes', value: string) {
    const { error } = await supabase.from('companies').update({ [field]: value || null }).eq('id', company.id);
    if (error) return false;
    onCompanyChange({ [field]: value });
    return true;
  }

  return (
    <div className="flex flex-col gap-2">
      {company.is_trouble_customer && (
        <NoteCard
          key={`trouble-${company.id}`}
          tone="red"
          icon={ShieldAlert}
          title="Trouble Customer"
          text={company.trouble_notes || ''}
          emptyText="No notes added."
          placeholder="Describe issues, payment disputes, aggressive behavior..."
          meta={troubleFlaggedAt}
          onSave={value => saveField('trouble_notes', value)}
          extraAction={
            <button onClick={onRemoveTroubleFlag} className="ml-0.5 text-[11px] font-medium text-red-600 hover:text-red-800 hover:underline">
              Remove flag
            </button>
          }
        />
      )}

      {company.critical_notes || addingNote ? (
        <NoteCard
          key={`critical-${company.id}`}
          tone="amber"
          icon={AlertTriangle}
          title="Critical Notes"
          text={company.critical_notes || ''}
          emptyText=""
          placeholder="Gate code, alarm code, special access instructions..."
          startEditing={addingNote && !company.critical_notes}
          onSave={async value => {
            const ok = await saveField('critical_notes', value);
            if (ok) setAddingNote(false);
            return ok;
          }}
          onCancelNew={() => setAddingNote(false)}
        />
      ) : (
        <button
          onClick={() => setAddingNote(true)}
          className="inline-flex items-center gap-1 self-end text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add critical note
        </button>
      )}
    </div>
  );
}
