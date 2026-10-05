import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileSignature, Save, Send, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { createAgreement } from '../lib/lifecycle';
import { fetchAddons, fetchCatalog, fetchCoveredSiteIds } from '../lib/queries';
import type { SpMonitoringAccount, SpSettings } from '../lib/types';
import { Btn, ErrorNote, Loading, errorText } from '../ui';
import StepCustomer from './StepCustomer';
import StepCoverage from './StepCoverage';
import StepPlan from './StepPlan';
import StepDetails from './StepDetails';
import StepReview from './StepReview';
import { priceFor, type WizardCompany, type WizardLookups, type WizardSite, type WizardState } from './types';

const STEPS = ['Customer', 'Coverage', 'Plan', 'Extras', 'Review'];

interface Props {
  settings: SpSettings;
  today: string;
  initialCompany?: WizardCompany | null;
  onClose: () => void;
  onCreated: (agreementId: string, message: string) => void;
}

export default function EnrollmentWizard({ settings, today, initialCompany, onClose, onCreated }: Props) {
  const [step, setStep] = useState(initialCompany ? 1 : 0);
  const [state, setState] = useState<WizardState>({
    company: initialCompany ?? null, coverage: {}, planId: '', cadence: settings.default_cadence, addons: {},
    startDate: today, paymentMethod: 'card_on_file', autoRenew: true, notes: '', signerName: '',
  });
  const [catalog, setCatalog] = useState<Pick<WizardLookups, 'plans' | 'addons'> | null>(null);
  const [company, setCompany] = useState<Omit<WizardLookups, 'plans' | 'addons'> | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');

  const patch = (p: Partial<WizardState>) => setState(s => ({ ...s, ...p }));

  useEffect(() => {
    Promise.all([fetchCatalog(), fetchAddons()])
      .then(([plans, addons]) => setCatalog({ plans, addons }))
      .catch(e => setError(errorText(e)));
  }, []);

  const companyId = state.company?.id;
  useEffect(() => {
    if (!companyId) return;
    setCompany(null);
    (async () => {
      try {
        const [sites, systems, mon, covered] = await Promise.all([
          supabase.from('sites').select('id, name, address, city').eq('company_id', companyId).order('name'),
          supabase.from('customer_systems').select('id, name, site_id').eq('company_id', companyId).order('name'),
          supabase.from('sp_monitoring_accounts').select('*').eq('company_id', companyId).eq('status', 'active'),
          fetchCoveredSiteIds(companyId),
        ]);
        const err = sites.error ?? systems.error ?? mon.error;
        if (err) throw new Error(err.message);
        const list: WizardSite[] = (sites.data ?? []).map(s => ({
          id: s.id, name: s.name ?? 'Site', address: s.address ?? '', city: s.city ?? '',
          systems: (systems.data ?? []).filter(x => x.site_id === s.id).map(x => ({ id: x.id, name: x.name ?? 'System' })),
        }));
        setCompany({ sites: list, monitoring: (mon.data ?? []) as SpMonitoringAccount[], coveredSites: covered });
        if (list.length === 1) setState(s => (Object.keys(s.coverage).length ? s : { ...s, coverage: { [list[0].id]: list[0].systems.map(x => x.id) } }));
      } catch (e) { setError(errorText(e)); }
    })();
  }, [companyId]);

  const plan = catalog?.plans.find(p => p.id === state.planId);
  const canNext = [
    !!state.company,
    Object.keys(state.coverage).length > 0,
    !!plan?.current && priceFor(plan, state.cadence) != null,
    /^\d{4}-\d{2}-\d{2}$/.test(state.startDate),
    true,
  ][step];

  function pickPlan(id: string) {
    const p = catalog?.plans.find(x => x.id === id);
    const cadence = priceFor(p, state.cadence) != null ? state.cadence
      : p?.current?.sp_price_options.find(o => o.is_default)?.cadence ?? p?.current?.sp_price_options[0]?.cadence ?? state.cadence;
    patch({ planId: id, cadence });
  }

  async function save(mode: 'draft' | 'send' | 'sign') {
    if (!state.company || !plan?.current) return;
    if (mode === 'sign' && state.signerName.trim().length < 2) { setError("Type the signer's full name to sign now."); return; }
    setSaving(mode); setError('');
    try {
      const id = await createAgreement({
        companyId: state.company.id,
        coverage: Object.entries(state.coverage).map(([siteId, systemIds]) => ({ siteId, systemIds })),
        planId: plan.id,
        planVersionId: plan.current.id,
        cadence: state.cadence,
        periodAmountCents: priceFor(plan, state.cadence) ?? 0,
        startDate: state.startDate,
        addons: (catalog?.addons ?? []).filter(a => state.addons[a.id]).map(a => ({ addonId: a.id, name: a.name, annualAmountCents: a.annual_amount_cents, quantity: state.addons[a.id] })),
        autoRenew: state.autoRenew,
        paymentMethod: state.paymentMethod,
        notes: state.notes.trim(),
        mode,
        signerName: state.signerName.trim(),
      }, settings, today);
      onCreated(id, mode === 'sign' ? 'Agreement signed and activated.' : mode === 'send' ? 'Agreement sent for signature.' : 'Draft agreement saved.');
    } catch (e) { setError(errorText(e)); setSaving(''); }
  }

  const loading = !catalog || (step > 0 && !!companyId && !company);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-fade-in">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center"><ShieldCheck className="h-4 w-4 text-white" /></div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">New service plan</p>
            <p className="text-xs text-gray-500 truncate">{state.company?.name ?? 'Choose a customer'}</p>
          </div>
        </div>
        <ol className="flex-1 flex items-center justify-center">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center">
              <button disabled={i > step} onClick={() => setStep(i)} className="flex flex-col items-center disabled:cursor-default">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`mt-1 text-xs font-semibold hidden md:block ${i === step ? 'text-blue-600' : i < step ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
              </button>
              {i < STEPS.length - 1 && <span className={`h-0.5 w-8 md:w-14 lg:w-20 mx-1 md:mb-5 transition-colors ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </li>
          ))}
        </ol>
        <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div key={step} className="max-w-4xl mx-auto px-6 py-8 animate-fade-in">
          {loading ? <Loading /> : (
            <>
              {step === 0 && <StepCustomer value={state.company} onChange={c => { patch({ company: c, coverage: {} }); setStep(1); }} />}
              {step === 1 && company && <StepCoverage sites={company.sites} coveredSites={company.coveredSites} coverage={state.coverage} onChange={coverage => patch({ coverage })} />}
              {step === 2 && <StepPlan plans={catalog.plans} planId={state.planId} cadence={state.cadence} onPlan={pickPlan} onCadence={cadence => patch({ cadence })} />}
              {step === 3 && <StepDetails state={state} addons={catalog.addons} today={today} onChange={patch} />}
              {step === 4 && company && <StepReview state={state} lookups={{ ...catalog, ...company }} onSigner={signerName => patch({ signerName })} />}
            </>
          )}
          {error && <div className="mt-6"><ErrorNote message={error} /></div>}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Btn variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}><ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}</Btn>
          {step < STEPS.length - 1 ? (
            <Btn variant="primary" disabled={!canNext || loading} onClick={() => setStep(step + 1)}>Continue <ArrowRight className="h-4 w-4" /></Btn>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <Btn busy={saving === 'draft'} disabled={!!saving} onClick={() => save('draft')}><Save className="h-4 w-4" /> Save draft</Btn>
              <Btn busy={saving === 'send'} disabled={!!saving} onClick={() => save('send')}><Send className="h-4 w-4" /> Send for signature</Btn>
              <Btn variant="primary" busy={saving === 'sign'} disabled={!!saving} onClick={() => save('sign')}><FileSignature className="h-4 w-4" /> Sign and activate</Btn>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
