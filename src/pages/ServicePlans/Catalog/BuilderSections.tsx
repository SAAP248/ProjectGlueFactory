import { Plus, Trash2 } from 'lucide-react';
import { CADENCES, CADENCE_LABELS, CADENCE_MONTHS, formatCents, formatDate, monthlyEquivalentCents, type Cadence } from '../lib/domain';
import type { VersionDraft, PlanDraft } from '../lib/catalog';
import type { BenefitType, SpPlan } from '../lib/types';
import { Field, PLAN_COLORS, inputCls } from '../ui';

export type PriceRow = { cadence: Cadence; enabled: boolean; dollars: string; is_default: boolean };
export type BenefitRow = Omit<VersionDraft['benefits'][number], 'overage_price_cents'> & { overage: string; key: string };

const CATEGORIES = ['plumbing', 'hvac', 'av', 'security', 'electrical', 'general'];

export function DetailsSection({ plan, onChange, isNew }: { plan: PlanDraft; onChange: (p: Partial<PlanDraft>) => void; isNew: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2"><Field label="Plan name"><input className={inputCls} value={plan.name} onChange={e => onChange({ name: e.target.value })} placeholder="Comfort Club" /></Field></div>
        <Field label="Code" hint={isNew ? 'Short and unique, cannot change later' : 'Locked after creation'}>
          <input className={`${inputCls} uppercase disabled:bg-gray-50 disabled:text-gray-500`} disabled={!isNew} value={plan.code} onChange={e => onChange({ code: e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20) })} placeholder="HVAC-CLUB" />
        </Field>
      </div>
      <Field label="Category">
        <select className={inputCls} value={plan.category} onChange={e => onChange({ category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase() === c ? c : c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>
      </Field>
      <Field label="Description"><textarea rows={3} className={inputCls} value={plan.description} onChange={e => onChange({ description: e.target.value })} /></Field>
      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1.5">Color</span>
        <div className="flex gap-2">
          {Object.entries(PLAN_COLORS).map(([key, c]) => (
            <button key={key} onClick={() => onChange({ color: key })} aria-label={key}
              className={`w-8 h-8 rounded-full ${c.solid} transition-transform ${plan.color === key ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PricingSection({ prices, onChange }: { prices: PriceRow[]; onChange: (p: PriceRow[]) => void }) {
  const set = (cadence: Cadence, patch: Partial<PriceRow>) =>
    onChange(prices.map(p => p.cadence === cadence ? { ...p, ...patch } : patch.is_default ? { ...p, is_default: false } : p));
  const monthly = prices.find(p => p.cadence === 'monthly' && p.enabled);
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">The plan is sold as a 12-month agreement. Turn on each way the customer can split payment.</p>
      {CADENCES.map(cd => {
        const p = prices.find(x => x.cadence === cd)!;
        const cents = Math.round(parseFloat(p.dollars || '0') * 100);
        const annual = cents * (12 / CADENCE_MONTHS[cd]);
        const save = monthly && cd !== 'monthly' ? Math.round(parseFloat(monthly.dollars || '0') * 100) * 12 - annual : 0;
        return (
          <div key={cd} className={`flex flex-wrap items-center gap-4 rounded-xl border p-4 transition-colors ${p.enabled ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50/50'}`}>
            <label className="flex items-center gap-2 w-36">
              <input type="checkbox" checked={p.enabled} onChange={e => set(cd, { enabled: e.target.checked })} className="rounded border-gray-300" />
              <span className="text-sm font-medium text-gray-900">{CADENCE_LABELS[cd]}</span>
            </label>
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input type="number" min={0} step="0.01" disabled={!p.enabled} className={`${inputCls} pl-7 disabled:bg-gray-50`} value={p.dollars} onChange={e => set(cd, { dollars: e.target.value })} />
            </div>
            {p.enabled && cents > 0 && (
              <span className="text-xs text-gray-500 tabular-nums">{formatCents(monthlyEquivalentCents(cents, cd))}/mo · {formatCents(annual)}/yr{save > 0 && <span className="text-emerald-700 font-medium"> · saves {formatCents(save)}</span>}</span>
            )}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-600">
              <input type="radio" name="default-cadence" disabled={!p.enabled} checked={p.is_default} onChange={() => set(cd, { is_default: true })} /> Default
            </label>
          </div>
        );
      })}
    </div>
  );
}

export function newBenefitRow(partial: Partial<BenefitRow> = {}): BenefitRow {
  return { key: crypto.randomUUID(), name: '', description: '', benefit_type: 'visit', quantity_per_term: 1, duration_minutes: 60, overage: '0', ...partial };
}

export function BenefitsSection({ benefits, onChange }: { benefits: BenefitRow[]; onChange: (b: BenefitRow[]) => void }) {
  const set = (key: string, patch: Partial<BenefitRow>) => onChange(benefits.map(b => b.key === key ? { ...b, ...patch } : b));
  return (
    <div className="space-y-3">
      {benefits.map(b => (
        <div key={b.key} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex gap-3">
            <input className={`${inputCls} flex-1`} placeholder="Benefit name, e.g. Annual tune-up" value={b.name} onChange={e => set(b.key, { name: e.target.value })} />
            <select className={`${inputCls} w-40`} value={b.benefit_type} onChange={e => set(b.key, { benefit_type: e.target.value as BenefitType })}>
              <option value="visit">On-site visit</option>
              <option value="remote">Remote session</option>
              <option value="perk">Perk</option>
            </select>
            <button onClick={() => onChange(benefits.filter(x => x.key !== b.key))} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Remove benefit"><Trash2 className="h-4 w-4" /></button>
          </div>
          <input className={inputCls} placeholder="Short description" value={b.description} onChange={e => set(b.key, { description: e.target.value })} />
          {b.benefit_type !== 'perk' && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Included per year"><input type="number" min={0} className={inputCls} value={b.quantity_per_term} onChange={e => set(b.key, { quantity_per_term: Math.max(0, parseInt(e.target.value || '0', 10)) })} /></Field>
              <Field label="Minutes each"><input type="number" min={0} step={15} className={inputCls} value={b.duration_minutes} onChange={e => set(b.key, { duration_minutes: Math.max(0, parseInt(e.target.value || '0', 10)) })} /></Field>
              <Field label="Extra use price ($)"><input type="number" min={0} step="0.01" className={inputCls} value={b.overage} onChange={e => set(b.key, { overage: e.target.value })} /></Field>
            </div>
          )}
        </div>
      ))}
      <button onClick={() => onChange([...benefits, newBenefitRow()])}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
        <Plus className="h-4 w-4" /> Add benefit
      </button>
    </div>
  );
}

type Rules = Omit<VersionDraft, 'prices' | 'benefits' | 'terms_text' | 'change_note'>;

export function RulesSection({ rules, onChange }: { rules: Rules; onChange: (r: Partial<Rules>) => void }) {
  const pct = (bps: number) => String(bps / 100);
  const toBps = (v: string) => Math.max(0, Math.min(10000, Math.round(parseFloat(v || '0') * 100)));
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Term (months)"><input type="number" min={1} max={60} className={inputCls} value={rules.term_months} onChange={e => onChange({ term_months: Math.max(1, Math.min(60, parseInt(e.target.value || '12', 10))) })} /></Field>
        <Field label="Labor discount (%)"><input type="number" min={0} max={100} className={inputCls} value={pct(rules.labor_discount_bps)} onChange={e => onChange({ labor_discount_bps: toBps(e.target.value) })} /></Field>
        <Field label="Parts discount (%)"><input type="number" min={0} max={100} className={inputCls} value={pct(rules.parts_discount_bps)} onChange={e => onChange({ parts_discount_bps: toBps(e.target.value) })} /></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {([['auto_renew', 'Auto renew by default'], ['priority_service', 'Priority scheduling'], ['waive_trip_fee', 'Waive trip fee']] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700">
            <input type="checkbox" checked={rules[k]} onChange={e => onChange({ [k]: e.target.checked })} className="rounded border-gray-300" /> {label}
          </label>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Unused visits">
          <select className={inputCls} value={rules.rollover_policy} onChange={e => onChange({ rollover_policy: e.target.value as Rules['rollover_policy'] })}>
            <option value="none">Expire at renewal</option>
            <option value="one_period">Roll over (capped)</option>
            <option value="unlimited">Roll over (all)</option>
          </select>
        </Field>
        <Field label="Rollover cap"><input type="number" min={0} disabled={rules.rollover_policy !== 'one_period'} className={`${inputCls} disabled:bg-gray-50`} value={rules.rollover_cap} onChange={e => onChange({ rollover_cap: Math.max(0, parseInt(e.target.value || '0', 10)) })} /></Field>
        <Field label="Renewal notice (days)"><input type="number" min={0} className={inputCls} value={rules.renewal_notice_days} onChange={e => onChange({ renewal_notice_days: Math.max(0, parseInt(e.target.value || '0', 10)) })} /></Field>
      </div>
      <Field label="If the customer cancels">
        <select className={inputCls} value={rules.cancellation_policy} onChange={e => onChange({ cancellation_policy: e.target.value as Rules['cancellation_policy'] })}>
          <option value="prorated">Refund unused time (minus benefits already used)</option>
          <option value="no_refund">No refund</option>
        </select>
      </Field>
    </div>
  );
}

export function VersionsSection({ plan, counts }: { plan: SpPlan; counts: Map<string, number> }) {
  return (
    <ol className="relative border-l border-gray-200 ml-2 space-y-5">
      {[...plan.versions].sort((a, b) => b.version_number - a.version_number).map(v => (
        <li key={v.id} className="ml-5">
          <span className={`absolute -left-[7px] mt-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${v.id === plan.current_version_id ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm">Version {v.version_number}</p>
            {v.id === plan.current_version_id && <span className="text-[11px] font-medium text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">Current</span>}
            <span className="text-xs text-gray-500">{formatDate(v.published_at)}</span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{v.change_note || 'No note'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {v.sp_price_options.map(p => `${CADENCE_LABELS[p.cadence]} ${formatCents(p.amount_cents)}`).join(' · ')}
            {' · '}{counts.get(v.id) ?? 0} agreement{counts.get(v.id) === 1 ? '' : 's'}
          </p>
        </li>
      ))}
    </ol>
  );
}
