import { Radio, ShieldCheck } from 'lucide-react';
import {
  CADENCE_LABELS, addMonthsAnchored, bpsLabel, formatCents, formatDate, monthlyEquivalentCents, periodTotalCents, termEndDate,
} from '../lib/domain';
import { Field, PlanChip, inputCls } from '../ui';
import { priceFor, type WizardLookups, type WizardState } from './types';

export default function StepReview({ state, lookups, onSigner }: { state: WizardState; lookups: WizardLookups; onSigner: (v: string) => void }) {
  const plan = lookups.plans.find(p => p.id === state.planId);
  const v = plan?.current;
  if (!plan || !v) return null;
  const planPeriod = priceFor(plan, state.cadence) ?? 0;
  const addons = lookups.addons.filter(a => state.addons[a.id]).map(a => ({ ...a, quantity: state.addons[a.id] }));
  const period = periodTotalCents(planPeriod, addons, state.cadence, v.term_months);
  const planMonthly = monthlyEquivalentCents(period, state.cadence);
  const covered = lookups.sites.filter(s => state.coverage[s.id]);
  const coveredIds = new Set(covered.map(s => s.id));
  const monitoring = lookups.monitoring.filter(m => !m.site_id || coveredIds.has(m.site_id));
  const monitoringMonthly = monitoring.reduce((s, m) => s + m.monthly_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-gray-900">Review and sign</h2>
        <p className="text-sm text-gray-500 mt-1">Save as a draft, send it for signature, or have the customer sign now.</p>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-3 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          <Row label="Customer" value={state.company?.name} />
          <Row label="Plan" value={<span className="inline-flex items-center gap-2"><PlanChip name={plan.name} color={plan.color} /><span className="text-xs text-gray-500">version {v.version_number}</span></span>} />
          <Row label="Term" value={`${formatDate(state.startDate)} to ${formatDate(termEndDate(state.startDate, v.term_months))}`} />
          <Row label="Billing" value={`${CADENCE_LABELS[state.cadence]}, first bill ${formatDate(state.startDate)}, next ${formatDate(addMonthsAnchored(state.startDate, state.cadence === 'monthly' ? 1 : state.cadence === 'quarterly' ? 3 : state.cadence === 'semiannual' ? 6 : 12))}`} />
          <Row label="Covers" value={covered.map(s => `${s.name}${state.coverage[s.id].length ? ` (${state.coverage[s.id].length} systems)` : ''}`).join(', ')} />
          <Row label="Benefits" value={[
            ...v.sp_benefits.map(b => b.benefit_type === 'perk' ? b.name : `${b.quantity_per_term}x ${b.name}`),
            v.labor_discount_bps ? `${bpsLabel(v.labor_discount_bps)} off labor` : '',
            v.parts_discount_bps ? `${bpsLabel(v.parts_discount_bps)} off parts` : '',
          ].filter(Boolean).join(' · ')} />
          <Row label="Renewal" value={state.autoRenew ? 'Renews automatically' : 'Ends at term'} />
        </div>

        <div className="md:col-span-2 space-y-3">
          <div className="rounded-xl bg-slate-900 text-white p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Each {CADENCE_LABELS[state.cadence].toLowerCase()} bill</p>
            <p className="text-3xl font-semibold tabular-nums mt-1">{formatCents(period)}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <div className="flex justify-between"><span>{plan.name}</span><span className="tabular-nums">{formatCents(planPeriod)}</span></div>
              {addons.map(a => (
                <div key={a.id} className="flex justify-between"><span>{a.name}{a.quantity > 1 ? ` x${a.quantity}` : ''}</span><span className="tabular-nums">incl.</span></div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 text-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer's monthly picture</p>
            <div className="flex justify-between"><span className="inline-flex items-center gap-1.5 text-gray-700"><ShieldCheck className="h-3.5 w-3.5 text-blue-600" />Service plan</span><span className="tabular-nums">{formatCents(planMonthly)}</span></div>
            <div className="flex justify-between"><span className="inline-flex items-center gap-1.5 text-gray-700"><Radio className="h-3.5 w-3.5 text-gray-400" />Monitoring (billed separately)</span><span className="tabular-nums">{formatCents(monitoringMonthly)}</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold text-gray-900"><span>Combined</span><span className="tabular-nums">{formatCents(planMonthly + monitoringMonthly)}/mo</span></div>
          </div>
        </div>
      </div>

      {v.terms_text && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 max-h-36 overflow-y-auto text-xs leading-relaxed text-gray-600 whitespace-pre-line">{v.terms_text}</div>
      )}

      <Field label="Signer's full name" hint="Only needed to sign now. Typing the name acts as the customer's signature.">
        <input className={`${inputCls} font-display text-lg`} value={state.signerName} onChange={e => onSigner(e.target.value)} placeholder="e.g. Jordan Reyes" />
      </Field>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 px-4 py-3 text-sm">
      <span className="w-20 flex-shrink-0 text-gray-500">{label}</span>
      <span className="text-gray-900 min-w-0">{value || '—'}</span>
    </div>
  );
}
