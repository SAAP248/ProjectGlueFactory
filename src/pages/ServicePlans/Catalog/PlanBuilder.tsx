import { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, ArrowLeft, Check, Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CADENCES, dollarsToCents } from '../lib/domain';
import { createPlan, publishVersion, setPlanStatus, updatePlanDetails, type PlanDraft, type VersionDraft } from '../lib/catalog';
import type { SpPlan } from '../lib/types';
import { Btn, ErrorNote, Field, PlanChip, errorText, inputCls } from '../ui';
import {
  BenefitsSection, DetailsSection, PricingSection, RulesSection, VersionsSection, newBenefitRow, type BenefitRow, type PriceRow,
} from './BuilderSections';

type Section = 'details' | 'pricing' | 'benefits' | 'rules' | 'terms' | 'versions';
type Rules = Omit<VersionDraft, 'prices' | 'benefits' | 'terms_text' | 'change_note'>;

const DEFAULT_RULES: Rules = {
  term_months: 12, auto_renew: true, renewal_notice_days: 30, labor_discount_bps: 1000, parts_discount_bps: 0,
  priority_service: true, waive_trip_fee: false, rollover_policy: 'none', rollover_cap: 0, cancellation_policy: 'prorated',
};

function initial(plan: SpPlan | null) {
  const v = plan?.current;
  const prices: PriceRow[] = CADENCES.map(cd => {
    const opt = v?.sp_price_options.find(p => p.cadence === cd);
    return { cadence: cd, enabled: !!opt || (!v && (cd === 'annual' || cd === 'monthly')), dollars: opt ? (opt.amount_cents / 100).toFixed(2) : '', is_default: opt?.is_default ?? (!v && cd === 'annual') };
  });
  const benefits: BenefitRow[] = v
    ? v.sp_benefits.map(b => newBenefitRow({ name: b.name, description: b.description, benefit_type: b.benefit_type, quantity_per_term: b.quantity_per_term, duration_minutes: b.duration_minutes, overage: (b.overage_price_cents / 100).toFixed(2) }))
    : [newBenefitRow({ name: 'Annual maintenance visit' })];
  const rules: Rules = v ? {
    term_months: v.term_months, auto_renew: v.auto_renew, renewal_notice_days: v.renewal_notice_days, labor_discount_bps: v.labor_discount_bps,
    parts_discount_bps: v.parts_discount_bps, priority_service: v.priority_service, waive_trip_fee: v.waive_trip_fee,
    rollover_policy: v.rollover_policy, rollover_cap: v.rollover_cap, cancellation_policy: v.cancellation_policy,
  } : DEFAULT_RULES;
  return {
    details: { code: plan?.code ?? '', name: plan?.name ?? '', category: plan?.category ?? 'hvac', description: plan?.description ?? '', color: plan?.color ?? 'blue' } as PlanDraft,
    prices, benefits, rules, terms: v?.terms_text ?? '',
  };
}

function toDraft(s: ReturnType<typeof initial>, changeNote: string): VersionDraft {
  return {
    ...s.rules,
    terms_text: s.terms.trim(),
    change_note: changeNote.trim(),
    prices: s.prices.filter(p => p.enabled).map(p => ({ cadence: p.cadence, amount_cents: dollarsToCents(p.dollars || '0'), is_default: p.is_default })),
    benefits: s.benefits.map(b => ({
      name: b.name, description: b.description.trim(), benefit_type: b.benefit_type,
      quantity_per_term: b.benefit_type === 'perk' ? 0 : b.quantity_per_term, duration_minutes: b.benefit_type === 'perk' ? 0 : b.duration_minutes,
      overage_price_cents: b.benefit_type === 'perk' ? 0 : dollarsToCents(b.overage || '0'),
    })),
  };
}

export default function PlanBuilder({ plan, onClose, onSaved }: { plan: SpPlan | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const isNew = !plan;
  const [section, setSection] = useState<Section>('details');
  const [state, setState] = useState(() => initial(plan));
  const baseline = useMemo(() => JSON.stringify(toDraft(initial(plan), '')), [plan]);
  const [changeNote, setChangeNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!plan) return;
    supabase.from('sp_agreements').select('plan_version_id').eq('plan_id', plan.id).then(({ data }) => {
      const m = new Map<string, number>();
      for (const r of data ?? []) m.set(r.plan_version_id, (m.get(r.plan_version_id) ?? 0) + 1);
      setCounts(m);
    });
  }, [plan]);

  const versionChanged = JSON.stringify(toDraft(state, '')) !== baseline;
  const sections: { id: Section; label: string }[] = [
    { id: 'details', label: 'Details' }, { id: 'pricing', label: 'Pricing' }, { id: 'benefits', label: 'Benefits' },
    { id: 'rules', label: 'Rules' }, { id: 'terms', label: 'Terms' }, ...(plan ? [{ id: 'versions' as Section, label: 'Versions' }] : []),
  ];

  async function save() {
    setBusy('save'); setError('');
    try {
      if (!state.details.name.trim()) throw new Error('Give the plan a name.');
      if (isNew) {
        await createPlan(state.details, toDraft(state, changeNote));
        onSaved(`${state.details.name.trim()} created.`);
        return;
      }
      await updatePlanDetails(plan.id, state.details);
      if (versionChanged) {
        if (!changeNote.trim()) { setSection('terms'); throw new Error('Describe what changed so the new version has a note.'); }
        await publishVersion(plan.id, toDraft(state, changeNote));
        onSaved(`${state.details.name.trim()}: new version published. Existing agreements keep their current terms.`);
      } else onSaved(`${state.details.name.trim()} saved.`);
    } catch (e) { setError(errorText(e)); setBusy(''); }
  }

  async function toggleArchive() {
    if (!plan) return;
    setBusy('archive');
    try {
      await setPlanStatus(plan.id, plan.status === 'active' ? 'archived' : 'active');
      onSaved(plan.status === 'active' ? `${plan.name} archived. It can no longer be sold.` : `${plan.name} restored.`);
    } catch (e) { setError(errorText(e)); setBusy(''); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-fade-in">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={onClose} className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{isNew ? 'New service plan' : state.details.name || plan.name}</h1>
            {plan && <PlanChip name={`v${plan.current?.version_number ?? 1}`} color={state.details.color} />}
            {plan?.status === 'archived' && <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">Archived</span>}
          </div>
          {!isNew && versionChanged && <p className="text-xs text-amber-700">Saving will publish version {(plan.versions.length ?? 0) + 1}.</p>}
        </div>
        {plan && <Btn variant="ghost" busy={busy === 'archive'} onClick={toggleArchive}>{plan.status === 'active' ? <><Archive className="h-4 w-4" /> Archive</> : <><ArchiveRestore className="h-4 w-4" /> Restore</>}</Btn>}
        <Btn variant="primary" busy={busy === 'save'} disabled={!!busy} onClick={save}>
          {isNew ? <><Check className="h-4 w-4" /> Create plan</> : versionChanged ? <><Upload className="h-4 w-4" /> Publish version</> : <><Check className="h-4 w-4" /> Save</>}
        </Btn>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 grid md:grid-cols-[180px_1fr] gap-8">
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {sections.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-left whitespace-nowrap transition-colors ${section === s.id ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-800'}`}>
                {s.label}
              </button>
            ))}
          </nav>
          <div key={section} className="animate-fade-in space-y-4">
            {section === 'details' && <DetailsSection plan={state.details} isNew={isNew} onChange={p => setState(s => ({ ...s, details: { ...s.details, ...p } }))} />}
            {section === 'pricing' && <PricingSection prices={state.prices} onChange={prices => setState(s => ({ ...s, prices }))} />}
            {section === 'benefits' && <BenefitsSection benefits={state.benefits} onChange={benefits => setState(s => ({ ...s, benefits }))} />}
            {section === 'rules' && <RulesSection rules={state.rules} onChange={r => setState(s => ({ ...s, rules: { ...s.rules, ...r } }))} />}
            {section === 'terms' && (
              <>
                <Field label="Agreement terms" hint="Shown to the customer before they sign.">
                  <textarea rows={10} className={`${inputCls} leading-relaxed`} value={state.terms} onChange={e => setState(s => ({ ...s, terms: e.target.value }))} />
                </Field>
                {!isNew && <Field label="What changed in this version?" hint="Required when pricing, benefits, rules or terms change."><input className={inputCls} value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="e.g. Raised monthly price, added filter delivery" /></Field>}
              </>
            )}
            {section === 'versions' && plan && <VersionsSection plan={plan} counts={counts} />}
            <ErrorNote message={error} />
          </div>
        </div>
      </div>
    </div>
  );
}
