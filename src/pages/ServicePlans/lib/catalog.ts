import { supabase } from '../../../lib/supabase';
import type { Cadence, CancellationPolicy, RolloverPolicy } from './domain';
import type { BenefitType } from './types';

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export interface VersionDraft {
  term_months: number;
  auto_renew: boolean;
  renewal_notice_days: number;
  labor_discount_bps: number;
  parts_discount_bps: number;
  priority_service: boolean;
  waive_trip_fee: boolean;
  rollover_policy: RolloverPolicy;
  rollover_cap: number;
  cancellation_policy: CancellationPolicy;
  terms_text: string;
  change_note: string;
  prices: { cadence: Cadence; amount_cents: number; is_default: boolean }[];
  benefits: {
    name: string;
    description: string;
    benefit_type: BenefitType;
    quantity_per_term: number;
    duration_minutes: number;
    overage_price_cents: number;
  }[];
}

export interface PlanDraft {
  code: string;
  name: string;
  category: string;
  description: string;
  color: string;
}

export function validateVersion(v: VersionDraft): string | null {
  if (v.prices.length === 0) return 'Add at least one billing option.';
  if (v.prices.some(p => !Number.isInteger(p.amount_cents) || p.amount_cents <= 0)) return 'Every price must be greater than zero.';
  if (v.benefits.length === 0) return 'Add at least one benefit.';
  if (v.benefits.some(b => !b.name.trim())) return 'Every benefit needs a name.';
  if (v.benefits.some(b => b.quantity_per_term < 0 || b.duration_minutes < 0 || b.overage_price_cents < 0)) return 'Benefit numbers cannot be negative.';
  if (v.labor_discount_bps < 0 || v.labor_discount_bps > 10000 || v.parts_discount_bps < 0 || v.parts_discount_bps > 10000) return 'Discounts must be between 0% and 100%.';
  return null;
}

// Versions are immutable: every change publishes a new version and existing agreements stay on theirs.
export async function publishVersion(planId: string, draft: VersionDraft): Promise<string> {
  const problem = validateVersion(draft);
  if (problem) throw new Error(problem);
  const { data: last, error: lastErr } = await supabase.from('sp_plan_versions').select('version_number')
    .eq('plan_id', planId).order('version_number', { ascending: false }).limit(1).maybeSingle();
  fail(lastErr);
  const { prices, benefits, ...fields } = draft;
  const { data, error } = await supabase.from('sp_plan_versions').insert({
    ...fields,
    plan_id: planId,
    version_number: (last?.version_number ?? 0) + 1,
    published_at: new Date().toISOString(),
  }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not publish the version.');
  const versionId = data.id as string;
  const hasDefault = prices.some(p => p.is_default);
  fail((await supabase.from('sp_price_options').insert(prices.map((p, i) => ({
    plan_version_id: versionId, cadence: p.cadence, amount_cents: p.amount_cents, is_default: hasDefault ? p.is_default : i === 0,
  })))).error);
  fail((await supabase.from('sp_benefits').insert(benefits.map((b, i) => ({
    ...b, name: b.name.trim(), plan_version_id: versionId, sort_order: i,
  })))).error);
  fail((await supabase.from('sp_plans').update({ current_version_id: versionId }).eq('id', planId)).error);
  return versionId;
}

export async function createPlan(plan: PlanDraft, draft: VersionDraft): Promise<string> {
  if (!plan.name.trim() || !plan.code.trim()) throw new Error('Plan name and code are required.');
  const problem = validateVersion(draft);
  if (problem) throw new Error(problem);
  const { data, error } = await supabase.from('sp_plans').insert({
    code: plan.code.trim().toUpperCase(),
    name: plan.name.trim(),
    category: plan.category,
    description: plan.description.trim(),
    color: plan.color,
    status: 'active',
  }).select('id').single();
  if (error || !data) {
    throw new Error(error?.code === '23505' ? 'That plan code is already in use.' : error?.message ?? 'Could not create the plan.');
  }
  await publishVersion(data.id, { ...draft, change_note: draft.change_note || 'Initial version' });
  return data.id as string;
}

export async function updatePlanDetails(planId: string, plan: Omit<PlanDraft, 'code'>) {
  fail((await supabase.from('sp_plans').update({
    name: plan.name.trim(), category: plan.category, description: plan.description.trim(), color: plan.color,
  }).eq('id', planId)).error);
}

export async function setPlanStatus(planId: string, status: 'active' | 'archived') {
  fail((await supabase.from('sp_plans').update({ status }).eq('id', planId)).error);
}

export async function saveAddon(addon: { id?: string; name: string; description: string; category: string; annual_amount_cents: number; is_active: boolean }) {
  if (!addon.name.trim()) throw new Error('Add-on name is required.');
  if (addon.annual_amount_cents < 0) throw new Error('Price cannot be negative.');
  const row = { ...addon, name: addon.name.trim() };
  if (addon.id) fail((await supabase.from('sp_addons').update(row).eq('id', addon.id)).error);
  else fail((await supabase.from('sp_addons').insert(row)).error);
}

export async function resetDemo() {
  fail((await supabase.rpc('sp_reset_demo')).error);
}
