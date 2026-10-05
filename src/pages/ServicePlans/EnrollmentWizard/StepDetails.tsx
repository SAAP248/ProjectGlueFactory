import { Minus, Plus } from 'lucide-react';
import { formatCents } from '../lib/domain';
import type { SpAddon } from '../lib/types';
import { Field, inputCls } from '../ui';
import type { WizardState } from './types';

interface Props {
  state: WizardState;
  addons: SpAddon[];
  today: string;
  onChange: (patch: Partial<WizardState>) => void;
}

const METHODS: { id: WizardState['paymentMethod']; label: string; sub: string }[] = [
  { id: 'card_on_file', label: 'Card on file', sub: 'Charged automatically each period' },
  { id: 'invoice', label: 'Send invoice', sub: 'Customer pays each invoice' },
  { id: 'card_declined', label: 'Test: declining card', sub: 'Demo only, simulates a failed charge' },
];

export default function StepDetails({ state, addons, today, onChange }: Props) {
  function setQty(id: string, qty: number) {
    const next = { ...state.addons };
    if (qty <= 0) delete next[id];
    else next[id] = Math.min(20, qty);
    onChange({ addons: next });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl text-gray-900">Extras and payment</h2>
        <p className="text-sm text-gray-500 mt-1">Add-ons are priced per year and split evenly across each bill.</p>
      </div>

      <section>
        <p className="text-sm font-medium text-gray-700 mb-2">Add-ons</p>
        {addons.length === 0 && <p className="text-sm text-gray-500">No add-ons available.</p>}
        <div className="grid sm:grid-cols-2 gap-2">
          {addons.map(a => {
            const qty = state.addons[a.id] ?? 0;
            return (
              <div key={a.id} className={`flex items-center gap-3 rounded-xl border p-3 bg-white transition-colors ${qty ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-500">{formatCents(a.annual_amount_cents)} / year</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setQty(a.id, qty - 1)} disabled={!qty} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30" aria-label="Fewer"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
                  <button onClick={() => setQty(a.id, qty + 1)} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50" aria-label="More"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <Field label="Start date" hint="Bills land on this day of the month. Short months use their last day.">
          <input type="date" className={inputCls} min={today} value={state.startDate} onChange={e => onChange({ startDate: e.target.value })} />
        </Field>
        <Field label="Renewal">
          <label className="flex items-center gap-2 h-[38px] text-sm text-gray-700">
            <input type="checkbox" checked={state.autoRenew} onChange={e => onChange({ autoRenew: e.target.checked })} className="rounded border-gray-300" />
            Renew automatically at the end of the term
          </label>
        </Field>
      </section>

      <section>
        <p className="text-sm font-medium text-gray-700 mb-2">Payment</p>
        <div className="grid sm:grid-cols-3 gap-2">
          {METHODS.map(m => (
            <button key={m.id} onClick={() => onChange({ paymentMethod: m.id })}
              className={`rounded-xl border p-3 text-left transition-all ${state.paymentMethod === m.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <p className="text-sm font-medium text-gray-900">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.sub}</p>
            </button>
          ))}
        </div>
      </section>

      <Field label="Internal notes">
        <textarea rows={2} className={inputCls} value={state.notes} onChange={e => onChange({ notes: e.target.value })} placeholder="Optional" />
      </Field>
    </div>
  );
}
