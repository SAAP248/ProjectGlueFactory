import { supabase } from '../../../lib/supabase';
import type {
  AgreementDetail, SpAddon, SpAgreement, SpBenefit, SpBillingOccurrence, SpLedgerEntry, SpPlan,
  SpPlanVersion, SpSettings,
} from './types';

export const AGREEMENT_SELECT =
  '*, companies(name), sites:primary_site_id(name,address,city), sp_plans(name,color,category), ' +
  'sp_plan_versions(id,plan_id,version_number,term_months,auto_renew,renewal_notice_days,labor_discount_bps,' +
  'parts_discount_bps,priority_service,waive_trip_fee,rollover_policy,rollover_cap,cancellation_policy,terms_text,change_note,published_at)';

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function companyDate(settings: SpSettings | null): string {
  if (settings?.demo_mode) return settings.demo_date;
  return new Date().toISOString().slice(0, 10);
}

export async function fetchSettings(): Promise<SpSettings> {
  const { data, error } = await supabase.from('sp_settings').select('*').eq('id', 1).maybeSingle();
  fail(error);
  if (!data) throw new Error('Service Plans settings are missing.');
  return data as SpSettings;
}

export async function updateSettings(patch: Partial<Omit<SpSettings, 'id'>>): Promise<void> {
  const { error } = await supabase.from('sp_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1);
  fail(error);
}

export async function fetchCatalog(): Promise<SpPlan[]> {
  const { data, error } = await supabase
    .from('sp_plans')
    .select('*, versions:sp_plan_versions!sp_plan_versions_plan_id_fkey(*, sp_price_options(*), sp_benefits(*))')
    .order('name');
  fail(error);
  return (data ?? []).map((p: Omit<SpPlan, 'current'>) => {
    const versions = [...(p.versions ?? [])]
      .map(v => ({
        ...v,
        sp_benefits: [...v.sp_benefits].sort((a, b) => a.sort_order - b.sort_order),
      }))
      .sort((a, b) => b.version_number - a.version_number);
    const current = versions.find(v => v.id === p.current_version_id) ?? versions[0] ?? null;
    return { ...p, versions, current } as SpPlan;
  });
}

export async function fetchAddons(includeInactive = false): Promise<SpAddon[]> {
  let q = supabase.from('sp_addons').select('*').order('name');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  fail(error);
  return (data ?? []) as SpAddon[];
}

export async function fetchAgreements(filter: { companyId?: string } = {}): Promise<SpAgreement[]> {
  let q = supabase.from('sp_agreements').select(AGREEMENT_SELECT).order('agreement_number', { ascending: false });
  if (filter.companyId) q = q.eq('company_id', filter.companyId);
  const { data, error } = await q;
  fail(error);
  return (data ?? []) as unknown as SpAgreement[];
}

export async function fetchAgreement(id: string): Promise<SpAgreement> {
  const { data, error } = await supabase.from('sp_agreements').select(AGREEMENT_SELECT).eq('id', id).maybeSingle();
  fail(error);
  if (!data) throw new Error('Agreement not found.');
  return data as unknown as SpAgreement;
}

export async function fetchBenefits(versionId: string): Promise<SpBenefit[]> {
  const { data, error } = await supabase.from('sp_benefits').select('*').eq('plan_version_id', versionId).order('sort_order');
  fail(error);
  return (data ?? []) as SpBenefit[];
}

export async function fetchPlanVersion(versionId: string): Promise<SpPlanVersion> {
  const { data, error } = await supabase
    .from('sp_plan_versions').select('*, sp_price_options(*), sp_benefits(*)').eq('id', versionId).maybeSingle();
  fail(error);
  if (!data) throw new Error('Plan version not found.');
  return data as SpPlanVersion;
}

export async function fetchLedger(agreementIds?: string[]): Promise<SpLedgerEntry[]> {
  let q = supabase.from('sp_entitlement_ledger')
    .select('*, work_orders(wo_number,status,scheduled_date)')
    .order('created_at');
  if (agreementIds) q = q.in('agreement_id', agreementIds);
  const { data, error } = await q;
  fail(error);
  return (data ?? []) as SpLedgerEntry[];
}

export async function fetchOccurrences(filter: { agreementId?: string } = {}): Promise<SpBillingOccurrence[]> {
  let q = supabase.from('sp_billing_occurrences')
    .select('*, invoices(invoice_number,status,balance_due)')
    .order('bill_date');
  if (filter.agreementId) q = q.eq('agreement_id', filter.agreementId);
  const { data, error } = await q;
  fail(error);
  return (data ?? []) as SpBillingOccurrence[];
}

export async function fetchAgreementDetail(id: string): Promise<AgreementDetail> {
  const agreement = await fetchAgreement(id);
  const [sites, addons, benefits, ledger, occurrences, events, monitoring] = await Promise.all([
    supabase.from('sp_agreement_sites').select('id, site_id, system_id, sites(name,address,city), customer_systems(name)').eq('agreement_id', id),
    supabase.from('sp_agreement_addons').select('*').eq('agreement_id', id),
    fetchBenefits(agreement.plan_version_id),
    fetchLedger([id]),
    fetchOccurrences({ agreementId: id }),
    supabase.from('sp_events').select('*').eq('agreement_id', id).order('event_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('sp_monitoring_accounts').select('*').eq('company_id', agreement.company_id).eq('status', 'active'),
  ]);
  fail(sites.error); fail(addons.error); fail(events.error); fail(monitoring.error);
  return {
    agreement,
    sites: (sites.data ?? []) as unknown as AgreementDetail['sites'],
    addons: (addons.data ?? []) as AgreementDetail['addons'],
    benefits,
    ledger,
    occurrences,
    events: (events.data ?? []) as AgreementDetail['events'],
    monitoring: (monitoring.data ?? []) as AgreementDetail['monitoring'],
  };
}

export async function fetchCoveredSiteIds(companyId?: string): Promise<Map<string, string>> {
  let q = supabase
    .from('sp_agreement_sites')
    .select('site_id, sp_agreements!inner(status, agreement_number, company_id, sp_plans(name))')
    .in('sp_agreements.status', ['active', 'past_due', 'pending_renewal', 'paused']);
  if (companyId) q = q.eq('sp_agreements.company_id', companyId);
  const { data, error } = await q;
  fail(error);
  const map = new Map<string, string>();
  for (const r of (data ?? []) as unknown as { site_id: string; sp_agreements: { sp_plans: { name: string } | null } }[]) {
    map.set(r.site_id, r.sp_agreements.sp_plans?.name ?? 'Service Plan');
  }
  return map;
}
