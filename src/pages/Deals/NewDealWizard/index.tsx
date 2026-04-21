import { useState, useMemo, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { WizardState } from './types';
import { DEFAULT_TERMS, generateProposalToken, generateAccountNumber } from './types';
import WizardProgressBar from './WizardProgressBar';
import Step1WhoWhere from './Step1WhoWhere';
import Step2Systems from './Step2Systems';
import Step3Products from './Step3Products';
import Step4ScopeTerms from './Step4ScopeTerms';
import Step5ReviewSend from './Step5ReviewSend';

interface LeadPrefill {
  leadId: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  assignedEmployeeId?: string;
}

interface Props {
  initialStage?: string;
  prefilledCompanyId?: string;
  prefilledCompanyName?: string;
  leadPrefill?: LeadPrefill;
  onClose: () => void;
  onDealCreated?: () => void;
}

function makeInitialState(companyId?: string, companyName?: string, lead?: LeadPrefill): WizardState {
  const today = new Date();
  const expiry = new Date(today);
  expiry.setDate(expiry.getDate() + 30);

  const phones = lead?.contactPhone
    ? [{ id: crypto.randomUUID(), label: 'Main', phone_number: lead.contactPhone, is_primary: true }]
    : [{ id: crypto.randomUUID(), label: 'Main', phone_number: '', is_primary: true }];

  const emails = lead?.contactEmail
    ? [{ id: crypto.randomUUID(), label: 'Primary', email_address: lead.contactEmail, is_primary: true }]
    : [{ id: crypto.randomUUID(), label: 'Primary', email_address: '', is_primary: true }];

  return {
    customerMode: companyId ? 'existing' : 'new',
    existingCompanyId: companyId ?? '',
    existingCompanyName: companyName ?? '',
    convertedFromLeadId: lead?.leadId,

    newCompanyName: lead?.contactName ?? '',
    newCustomerType: 'residential',
    newAccountNumber: generateAccountNumber(),
    newStatus: 'prospect',
    newPhones: phones,
    newEmails: emails,

    billingAddress: lead?.address ?? '',
    billingCity: lead?.city ?? '',
    billingState: lead?.state ?? '',
    billingZip: lead?.zip ?? '',

    siteMode: 'new',
    existingSiteId: '',
    existingSiteName: '',
    siteMatchesBilling: false,
    siteName: '',
    siteAddress: lead?.address ?? '',
    siteCity: lead?.city ?? '',
    siteState: lead?.state ?? '',
    siteZip: lead?.zip ?? '',
    siteType: 'residential',
    siteAccessInstructions: '',
    siteAlarmCode: '',

    systems: [],
    lineItems: [],
    marginThreshold: 30,

    scopeOfWork: '',
    internalNotes: '',
    termsAndConditions: DEFAULT_TERMS,
    expirationDate: expiry.toISOString().slice(0, 10),

    depositRequested: false,
    depositAmount: '',
    depositMethod: '',

    dealTitle: '',
    probability: 20,
    expectedCloseDate: '',
    forecastCategory: 'pipeline',
    assignedEmployeeId: lead?.assignedEmployeeId ?? '',
  };
}

export default function NewDealWizard({ initialStage, prefilledCompanyId, prefilledCompanyName, leadPrefill, onClose, onDealCreated }: Props) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(() => makeInitialState(prefilledCompanyId, prefilledCompanyName, leadPrefill));
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState('');

  useEffect(() => {
    if (!leadPrefill?.leadId) return;
    Promise.all([
      supabase.from('lead_systems').select('*').eq('lead_id', leadPrefill.leadId).order('sort_order'),
      supabase.from('lead_line_items').select('*').eq('lead_id', leadPrefill.leadId).order('sort_order'),
    ]).then(([{ data: sysList }, { data: itemsList }]) => {
      const systems = (sysList ?? []).map((s: Record<string, unknown>) => ({
        id: crypto.randomUUID(),
        system_type_id: s.system_type_id as string,
        system_type_name: s.system_type_name as string,
        system_type_icon: s.system_type_icon as string,
        system_type_color: s.system_type_color as string,
        name: s.system_type_name as string,
        package_id: s.package_id as string | null,
        package_name: s.package_name as string | null,
        sort_order: s.sort_order as number,
      }));
      const lineItems = (itemsList ?? []).map((li: Record<string, unknown>) => ({
        id: crypto.randomUUID(),
        product_id: li.product_id as string | null,
        system_group_id: null,
        description: li.description as string,
        quantity: Number(li.quantity),
        unit_cost: Number(li.unit_cost),
        unit_price: Number(li.unit_price),
        sort_order: li.sort_order as number,
      }));
      setState(prev => ({
        ...prev,
        ...(systems.length > 0 ? { systems } : {}),
        ...(lineItems.length > 0 ? { lineItems } : {}),
      }));
    });
  }, [leadPrefill?.leadId]);

  const proposalToken = useMemo(() => generateProposalToken(), []);

  function onChange(updates: Partial<WizardState>) {
    setState(prev => ({ ...prev, ...updates }));
    setStepError('');
  }

  const step1Warnings = useMemo(() => {
    if (state.customerMode === 'existing') return [];
    const w: string[] = [];
    if (state.newPhones.length === 0) w.push('No phone numbers added');
    if (state.newEmails.length === 0) w.push('No email addresses added');
    return w;
  }, [state.customerMode, state.newPhones, state.newEmails]);

  function validateStep(): boolean {
    if (step === 1) {
      if (state.customerMode === 'existing' && !state.existingCompanyId) {
        setStepError('Please select an existing customer.');
        return false;
      }
      if (state.customerMode === 'new' && !state.newCompanyName.trim()) {
        setStepError('Customer name is required.');
        return false;
      }
    }
    if (step === 2) {
      if (state.systems.length === 0) {
        setStepError('Please select at least one system type.');
        return false;
      }
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep(s => Math.min(5, s + 1));
  }

  function prev() {
    setStep(s => Math.max(1, s - 1));
    setStepError('');
  }

  async function handleCreateDeal(sendMode: 'email' | 'sms' | null) {
    setSaving(true);
    try {
      let companyId = state.existingCompanyId;
      let siteId = state.existingSiteId || null;

      if (state.customerMode === 'new') {
        const { data: co, error: coErr } = await supabase.from('companies').insert({
          name: state.newCompanyName.trim(),
          customer_type: state.newCustomerType,
          account_number: state.newAccountNumber || null,
          status: state.newStatus,
          billing_address: state.billingAddress || null,
          billing_city: state.billingCity || null,
          billing_state: state.billingState || null,
          billing_zip: state.billingZip || null,
        }).select('id').single();
        if (coErr || !co) { setSaving(false); setStepError('Failed to create customer: ' + coErr?.message); return; }
        companyId = co.id;

        if (state.newPhones.length > 0) {
          await supabase.from('company_phones').insert(
            state.newPhones.map(p => ({
              company_id: companyId,
              label: p.label,
              phone_number: p.phone_number,
              is_primary: p.is_primary,
            }))
          );
        }
        if (state.newEmails.length > 0) {
          await supabase.from('company_emails').insert(
            state.newEmails.map(e => ({
              company_id: companyId,
              label: e.label,
              email_address: e.email_address,
              is_primary: e.is_primary,
            }))
          );
        }
      }

      if (state.siteMode === 'new' || !siteId) {
        const siteName = state.siteName || (state.newCompanyName || state.existingCompanyName) + ' - Main';
        const { data: site, error: siteErr } = await supabase.from('sites').insert({
          company_id: companyId,
          name: siteName,
          address: state.siteAddress || state.billingAddress || '',
          city: state.siteCity || state.billingCity || '',
          state: state.siteState || state.billingState || '',
          zip: state.siteZip || state.billingZip || '',
          site_type: state.siteType,
          access_instructions: state.siteAccessInstructions || null,
          alarm_code: state.siteAlarmCode || null,
        }).select('id').single();
        if (!siteErr && site) siteId = site.id;
      }

      const customerName = state.customerMode === 'existing' ? state.existingCompanyName : state.newCompanyName;
      const dealTitle = `${customerName} - ${state.systems.map(s => s.name).join(', ')}`;
      const totalRevenue = state.lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);

      const isSending = !!sendMode;
      const { data: deal, error: dealErr } = await supabase.from('deals').insert({
        company_id: companyId,
        site_id: siteId,
        title: dealTitle,
        value: totalRevenue,
        probability: isSending ? 50 : 20,
        sales_stage: isSending ? 'Proposal Sent' : (initialStage ?? 'Lead'),
        install_status: 'Not Scheduled',
        office_status: 'Sold',
        forecast_category: 'pipeline',
        stage_entered_at: new Date().toISOString(),
        proposal_token: proposalToken,
        proposal_sent_at: isSending ? new Date().toISOString() : null,
        scope_of_work: state.scopeOfWork || null,
        internal_notes: state.internalNotes || null,
        terms_and_conditions: state.termsAndConditions || null,
        deposit_requested: state.depositRequested,
        deposit_amount: state.depositRequested && state.depositAmount ? Number(state.depositAmount) : null,
        deposit_method: state.depositRequested && state.depositMethod ? state.depositMethod : null,
        assigned_employee_id: state.assignedEmployeeId || null,
      }).select('id').single();

      if (dealErr || !deal) { setSaving(false); setStepError('Failed to create deal: ' + dealErr?.message); return; }

      if (state.systems.length > 0) {
        await supabase.from('deal_systems').insert(
          state.systems.map((s, idx) => ({
            deal_id: deal.id,
            system_type_id: s.system_type_id,
            package_id: s.package_id,
            name: s.name,
            sort_order: idx,
          }))
        );
      }

      const today = new Date().toISOString().slice(0, 10);
      const estNumber = `EST-${proposalToken}`;
      const subtotal = state.lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const { data: estimate, error: estErr } = await supabase.from('estimates').insert({
        estimate_number: estNumber,
        company_id: companyId,
        site_id: siteId,
        deal_id: deal.id,
        status: isSending ? 'sent' : 'draft',
        estimate_date: today,
        expiration_date: state.expirationDate || null,
        subtotal,
        tax: 0,
        total: subtotal,
        notes: state.scopeOfWork || null,
        terms: state.termsAndConditions || null,
      }).select('id').single();

      if (!estErr && estimate && state.lineItems.length > 0) {
        await supabase.from('estimate_line_items').insert(
          state.lineItems.map((item, idx) => ({
            estimate_id: estimate.id,
            product_id: item.product_id,
            system_group_id: item.system_group_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_cost: item.unit_cost,
            total: item.quantity * item.unit_price,
            sort_order: idx,
          }))
        );
      }

      if (state.convertedFromLeadId && deal) {
        await supabase.from('leads').update({
          status: 'converted',
          converted_deal_id: deal.id,
          updated_at: new Date().toISOString(),
        }).eq('id', state.convertedFromLeadId);
        await supabase.from('lead_activity_log').insert({
          lead_id: state.convertedFromLeadId,
          action: 'Converted to Deal',
          notes: `Deal created: ${dealTitle}`,
        });
      }

      onDealCreated?.();
      onClose();
    } catch (err: unknown) {
      setStepError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${state.convertedFromLeadId ? 'bg-amber-500' : 'bg-blue-600'}`}>
              <span className="text-white font-black text-sm">W</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">New Proposal</span>
              {state.convertedFromLeadId && (
                <span className="ml-2 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  Converting Lead
                </span>
              )}
            </div>
          </div>

          <WizardProgressBar currentStep={step} />

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Save Draft & Exit</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className={`px-6 py-8 ${step === 3 ? 'max-w-screen-xl mx-auto' : 'max-w-4xl mx-auto'}`}>
          {stepError && (
            <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {stepError}
            </div>
          )}

          {step === 1 && <Step1WhoWhere state={state} onChange={onChange} warnings={step1Warnings} leadPrefill={leadPrefill} />}
          {step === 2 && <Step2Systems state={state} onChange={onChange} />}
          {step === 3 && (
            <>
              <div className="max-w-none mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-xs text-amber-800 font-medium">
                  <strong>Tip:</strong> Click a section header to expand it, then click <strong>Browse Products</strong> to pick from your catalog — or use <strong>Custom Line Item</strong> to add anything manually. Drag rows to reorder.
                </span>
              </div>
              <Step3Products state={state} onChange={onChange} />
            </>
          )}
          {step === 4 && <Step4ScopeTerms state={state} onChange={onChange} />}
          {step === 5 && (
            <Step5ReviewSend
              state={state}
              onChange={onChange}
              onCreateDeal={handleCreateDeal}
              saving={saving}
              proposalToken={proposalToken}
            />
          )}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
        <button
          onClick={prev}
          disabled={step === 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${s === step ? 'bg-blue-600 w-4' : s < step ? 'bg-blue-300' : 'bg-gray-200'}`} />
          ))}
        </div>

        {step < 5 ? (
          <button
            onClick={next}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
