import { useEffect, useState } from 'react';
import { Pencil, Plus, Save } from 'lucide-react';
import { CADENCES, CADENCE_LABELS, dollarsToCents, formatCents, type Cadence } from './lib/domain';
import { fetchAddons, updateSettings } from './lib/queries';
import { saveAddon } from './lib/catalog';
import type { SpAddon, SpSettings } from './lib/types';
import { Btn, Card, ErrorNote, Field, Loading, Modal, errorText, inputCls } from './ui';

interface Props {
  settings: SpSettings;
  onChanged: (message: string) => void;
}

export default function SettingsView({ settings, onChanged }: Props) {
  const [form, setForm] = useState({
    grace_days: settings.grace_days,
    renewal_notice_days: settings.renewal_notice_days,
    invoice_due_days: settings.invoice_due_days,
    default_cadence: settings.default_cadence,
    demo_mode: settings.demo_mode,
    demo_date: settings.demo_date,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addons, setAddons] = useState<SpAddon[] | null>(null);
  const [addonError, setAddonError] = useState('');
  const [editing, setEditing] = useState<Partial<SpAddon> | null>(null);

  async function loadAddons() {
    try { setAddons(await fetchAddons(true)); setAddonError(''); } catch (e) { setAddonError(errorText(e)); }
  }
  useEffect(() => { loadAddons(); }, []);

  const num = (k: 'grace_days' | 'renewal_notice_days' | 'invoice_due_days') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: Math.max(0, Math.min(365, parseInt(e.target.value || '0', 10))) }));

  async function save() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.demo_date)) { setError('Pick a valid simulated date.'); return; }
    setSaving(true); setError('');
    try { await updateSettings(form); onChanged('Settings saved.'); } catch (e) { setError(errorText(e)); } finally { setSaving(false); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <Card title="Billing rules">
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Grace period" hint="Days after a failed charge"><input type="number" min={0} className={inputCls} value={form.grace_days} onChange={num('grace_days')} /></Field>
            <Field label="Renewal notice" hint="Days before term ends"><input type="number" min={0} className={inputCls} value={form.renewal_notice_days} onChange={num('renewal_notice_days')} /></Field>
            <Field label="Invoice due" hint="Days after issue"><input type="number" min={0} className={inputCls} value={form.invoice_due_days} onChange={num('invoice_due_days')} /></Field>
          </div>
          <Field label="Default billing frequency">
            <select className={inputCls} value={form.default_cadence} onChange={e => setForm(f => ({ ...f, default_cadence: e.target.value as Cadence }))}>
              {CADENCES.map(c => <option key={c} value={c}>{CADENCE_LABELS[c]}</option>)}
            </select>
          </Field>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>
                <span className="block text-sm font-medium text-gray-900">Demo mode</span>
                <span className="block text-xs text-gray-600">Uses a simulated date and simulated card payments.</span>
              </span>
              <button type="button" role="switch" aria-checked={form.demo_mode} onClick={() => setForm(f => ({ ...f, demo_mode: !f.demo_mode }))}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.demo_mode ? 'bg-amber-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.demo_mode ? 'translate-x-4' : ''}`} />
              </button>
            </label>
            {form.demo_mode && (
              <Field label="Simulated today">
                <input type="date" className={inputCls} value={form.demo_date} onChange={e => setForm(f => ({ ...f, demo_date: e.target.value }))} />
              </Field>
            )}
          </div>
          <ErrorNote message={error} />
          <div className="flex justify-end"><Btn variant="primary" busy={saving} onClick={save}><Save className="h-4 w-4" /> Save settings</Btn></div>
        </div>
      </Card>

      <Card title="Add-ons" action={<Btn variant="ghost" className="!py-1 text-xs" onClick={() => setEditing({ name: '', description: '', category: 'general', annual_amount_cents: 0, is_active: true })}><Plus className="h-3.5 w-3.5" /> New add-on</Btn>}>
        <ErrorNote message={addonError} />
        {!addons ? <Loading /> : (
          <ul className="divide-y divide-gray-50">
            {addons.length === 0 && <li className="px-5 py-8 text-center text-sm text-gray-500">No add-ons yet.</li>}
            {addons.map(a => (
              <li key={a.id} className="px-5 py-3 flex items-center gap-3 group">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${a.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{a.name}</p>
                  <p className="text-xs text-gray-500 truncate">{a.description}</p>
                </div>
                <span className="text-sm tabular-nums text-gray-700">{formatCents(a.annual_amount_cents)}/yr</span>
                <button onClick={() => setEditing(a)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label={`Edit ${a.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && <AddonModal addon={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await loadAddons(); onChanged('Add-on saved.'); }} />}
    </div>
  );
}

function AddonModal({ addon, onClose, onSaved }: { addon: Partial<SpAddon>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: addon.name ?? '', description: addon.description ?? '', category: addon.category ?? 'general',
    price: ((addon.annual_amount_cents ?? 0) / 100).toFixed(2), is_active: addon.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true); setError('');
    try {
      await saveAddon({ id: addon.id, name: f.name, description: f.description, category: f.category, annual_amount_cents: dollarsToCents(f.price), is_active: f.is_active });
      onSaved();
    } catch (e) { setError(errorText(e)); setBusy(false); }
  }

  return (
    <Modal title={addon.id ? 'Edit add-on' : 'New add-on'} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={submit}>Save</Btn></>}>
      <div className="space-y-4">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Description"><textarea rows={2} className={inputCls} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><input className={inputCls} value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></Field>
          <Field label="Annual price ($)"><input type="number" min={0} step="0.01" className={inputCls} value={f.price} onChange={e => setF({ ...f, price: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked })} className="rounded border-gray-300" />
          Available for new agreements
        </label>
        <ErrorNote message={error} />
      </div>
    </Modal>
  );
}
