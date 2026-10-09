import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Pencil, Check, X, Loader2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  companyId: string;
  passcode: string | null;
  onSaved: (passcode: string | null) => void;
}

export default function PasscodeBadge({ companyId, passcode, onSaved }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(passcode ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(passcode ?? '');
    setError(null);
    setEditing(true);
  }

  async function save() {
    const value = draft.trim() || null;
    setSaving(true);
    const { error: err } = await supabase.from('companies').update({ verbal_passcode: value }).eq('id', companyId);
    setSaving(false);
    if (err) {
      setError('Could not save passcode.');
      return;
    }
    onSaved(value);
    setEditing(false);
    setRevealed(false);
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-1.5 rounded border border-amber-300 bg-white px-2 py-0.5 focus-within:ring-2 focus-within:ring-amber-400">
          <KeyRound className="h-3.5 w-3.5 text-amber-600" />
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            placeholder="e.g. Oranges"
            maxLength={60}
            className="w-32 bg-transparent text-xs font-mono text-gray-900 outline-none placeholder:text-gray-400"
          />
        </span>
        <button onClick={save} disabled={saving} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50" aria-label="Save passcode">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => setEditing(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Cancel">
          <X className="h-3.5 w-3.5" />
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  if (!passcode) {
    return (
      <button
        onClick={startEdit}
        className="inline-flex items-center gap-1 rounded border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:border-amber-400 hover:text-amber-700"
      >
        <Plus className="h-3 w-3" />
        Add passcode
      </button>
    );
  }

  return (
    <span className="group inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-mono text-amber-800" title="Verbal passcode used to verify the customer">
      <KeyRound className="h-3.5 w-3.5 text-amber-600" />
      Passcode: {revealed ? passcode : '\u2022'.repeat(Math.min(passcode.length, 8))}
      <button onClick={() => setRevealed(r => !r)} className="rounded p-0.5 text-amber-600 hover:bg-amber-100" aria-label={revealed ? 'Hide passcode' : 'Show passcode'}>
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button onClick={startEdit} className="rounded p-0.5 text-amber-600 opacity-0 transition-opacity hover:bg-amber-100 group-hover:opacity-100" aria-label="Edit passcode">
        <Pencil className="h-3 w-3" />
      </button>
    </span>
  );
}
