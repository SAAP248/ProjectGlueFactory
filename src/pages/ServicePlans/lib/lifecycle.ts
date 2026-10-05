import { supabase } from '../../../lib/supabase';
import { demoPaymentAdapter } from './adapters';
import { logEvent, nextNumber, runBilling } from './billing';
import {
  addDays, buildBillingSchedule, cancellationRefundCents, computeBalance, dayOfMonth, formatCents, formatDate,
  ledgerKeys, lifecycleTransition, periodTotalCents, rolloverQuantity, termEndDate, type Cadence,
} from './domain';
import { fetchAgreement, fetchBenefits, fetchLedger, fetchPlanVersion } from './queries';
import type { SpAgreement, SpAgreementAddon, SpSettings } from './types';

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export interface NewAgreementInput {
  companyId: string;
  coverage: { siteId: string; systemIds: string[] }[];
  planId: string;
  planVersionId: string;
  cadence: Cadence;
  periodAmountCents: number;
  startDate: string;
  addons: { addonId: string; name: string; annualAmountCents: number; quantity: number }[];
  autoRenew: boolean;
  paymentMethod: SpAgreement['payment_method'];
  notes: string;
  mode: 'draft' | 'send' | 'sign';
  signerName: string;
}

export async function createAgreement(input: NewAgreementInput, settings: SpSettings, today: string): Promise<string> {
  const version = await fetchPlanVersion(input.planVersionId);
  const agreementNumber = await nextNumber('sp_agreements', 'agreement_number', 'SP-', 1000);
  const { data, error } = await supabase.from('sp_agreements').insert({
    agreement_number: agreementNumber,
    company_id: input.companyId,
    primary_site_id: input.coverage[0]?.siteId ?? null,
    plan_id: input.planId,
    plan_version_id: input.planVersionId,
    cadence: input.cadence,
    status: input.mode === 'send' ? 'pending_signature' : 'draft',
    start_date: input.startDate,
    end_date: termEndDate(input.startDate, version.term_months),
    anchor_day: dayOfMonth(input.startDate),
    period_amount_cents: input.periodAmountCents,
    auto_renew: input.autoRenew,
    payment_method: input.paymentMethod,
    notes: input.notes,
  }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create agreement.');
  const id = data.id as string;

  const siteRows = input.coverage.flatMap((c): { agreement_id: string; site_id: string; system_id: string | null }[] =>
    c.systemIds.length > 0
      ? c.systemIds.map(sys => ({ agreement_id: id, site_id: c.siteId, system_id: sys }))
      : [{ agreement_id: id, site_id: c.siteId, system_id: null }]);
  if (siteRows.length > 0) fail((await supabase.from('sp_agreement_sites').insert(siteRows)).error);
  if (input.addons.length > 0) {
    fail((await supabase.from('sp_agreement_addons').insert(input.addons.map(a => ({
      agreement_id: id, addon_id: a.addonId, name: a.name, annual_amount_cents: a.annualAmountCents, quantity: a.quantity,
    })))).error);
  }
  await logEvent(id, 'created', `Agreement created (version ${version.version_number})`, today);
  if (input.mode === 'send') await logEvent(id, 'sent', 'Sent to customer for signature', today);
  if (input.mode === 'sign') await signAndActivate(id, input.signerName, settings, today);
  return id;
}

export async function sendForSignature(agreement: SpAgreement, today: string) {
  fail((await supabase.from('sp_agreements').update({ status: 'pending_signature', updated_at: new Date().toISOString() }).eq('id', agreement.id)).error);
  await logEvent(agreement.id, 'sent', 'Sent to customer for signature', today);
}

async function seedTermEntitlements(agreement: SpAgreement) {
  const benefits = await fetchBenefits(agreement.plan_version_id);
  if (benefits.length === 0) return;
  fail((await supabase.from('sp_entitlement_ledger').upsert(benefits.map(b => ({
    agreement_id: agreement.id,
    benefit_id: b.id,
    entry_type: 'grant',
    quantity: b.quantity_per_term,
    period_start: agreement.start_date,
    period_end: agreement.end_date,
    occurrence_key: ledgerKeys.grant(agreement.id, b.id, agreement.start_date),
    note: 'Term allowance',
  })), { onConflict: 'occurrence_key', ignoreDuplicates: true })).error);
}

async function seedSchedule(agreement: SpAgreement) {
  const { data: addons, error } = await supabase.from('sp_agreement_addons').select('*').eq('agreement_id', agreement.id);
  fail(error);
  const term = agreement.sp_plan_versions?.term_months ?? 12;
  const amount = periodTotalCents(agreement.period_amount_cents, (addons ?? []) as SpAgreementAddon[], agreement.cadence, term);
  const schedule = buildBillingSchedule({
    agreementId: agreement.id, startDate: agreement.start_date, cadence: agreement.cadence,
    termMonths: term, anchorDay: agreement.anchor_day, amountCents: amount,
  });
  fail((await supabase.from('sp_billing_occurrences').upsert(schedule.map(o => ({
    agreement_id: agreement.id,
    occurrence_key: o.occurrenceKey,
    sequence: o.sequence,
    period_start: o.periodStart,
    period_end: o.periodEnd,
    bill_date: o.billDate,
    amount_cents: o.amountCents,
  })), { onConflict: 'occurrence_key', ignoreDuplicates: true })).error);
}

export async function signAndActivate(agreementId: string, signerName: string, settings: SpSettings, today: string) {
  const agreement = await fetchAgreement(agreementId);
  if (agreement.status !== 'draft' && agreement.status !== 'pending_signature') {
    throw new Error('Only draft or pending agreements can be signed.');
  }
  fail((await supabase.from('sp_agreements').update({
    status: 'active',
    signed_by_name: signerName.trim() || agreement.companies?.name || 'Customer',
    signed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', agreementId)).error);
  const active = { ...agreement, status: 'active' as const };
  await seedSchedule(active);
  await seedTermEntitlements(active);
  await logEvent(agreementId, 'signed', `Signed by ${signerName.trim() || 'customer'}`, today);
  await logEvent(agreementId, 'activated', `Agreement active. Coverage ${formatDate(agreement.start_date)} to ${formatDate(agreement.end_date)}.`, today);
  await runBilling(today, settings, agreementId);
}

export async function pauseAgreement(agreement: SpAgreement, today: string, resumeOn: string) {
  fail((await supabase.from('sp_agreements').update({
    status: 'paused', paused_at: today, resume_on: resumeOn, updated_at: new Date().toISOString(),
  }).eq('id', agreement.id)).error);
  fail((await supabase.from('sp_billing_occurrences').update({ status: 'skipped' })
    .eq('agreement_id', agreement.id).eq('status', 'scheduled').gte('bill_date', today).lt('bill_date', resumeOn)).error);
  await logEvent(agreement.id, 'paused', `Paused. Billing and benefits resume ${formatDate(resumeOn)}.`, today);
}

export async function resumeAgreement(agreement: SpAgreement, today: string) {
  fail((await supabase.from('sp_agreements').update({
    status: 'active', paused_at: null, resume_on: null, updated_at: new Date().toISOString(),
  }).eq('id', agreement.id)).error);
  await logEvent(agreement.id, 'resumed', 'Agreement resumed.', today);
}

export async function updatePaymentMethod(agreement: SpAgreement, method: SpAgreement['payment_method'], today: string) {
  fail((await supabase.from('sp_agreements').update({ payment_method: method, updated_at: new Date().toISOString() }).eq('id', agreement.id)).error);
  await logEvent(agreement.id, 'payment_method_updated', method === 'card_on_file' ? 'New card saved on file.' : 'Payment method changed.', today);
}

export async function cancelAgreement(agreement: SpAgreement, today: string, reason: string): Promise<number> {
  const policy = agreement.sp_plan_versions?.cancellation_policy ?? 'no_refund';
  const { data: current, error } = await supabase.from('sp_billing_occurrences').select('*')
    .eq('agreement_id', agreement.id).eq('status', 'paid').lte('period_start', today).gte('period_end', today).maybeSingle();
  fail(error);
  const refund = current ? cancellationRefundCents({
    policy, periodStart: current.period_start, periodEnd: current.period_end, paidCents: current.amount_cents, cancelDate: today,
  }) : 0;
  if (refund > 0) {
    const res = await demoPaymentAdapter.refund({ agreementNumber: agreement.agreement_number, amountCents: refund });
    if (!res.ok) throw new Error('Refund failed.');
  }
  fail((await supabase.from('sp_agreements').update({
    status: 'canceled', canceled_at: today, cancel_reason: reason, auto_renew: false, updated_at: new Date().toISOString(),
  }).eq('id', agreement.id)).error);
  fail((await supabase.from('sp_billing_occurrences').update({ status: 'void' })
    .eq('agreement_id', agreement.id).in('status', ['scheduled', 'failed'])).error);
  const refundText = refund > 0 ? ` Prorated refund of ${formatCents(refund)} issued.` : ' No refund per plan terms.';
  await logEvent(agreement.id, 'canceled', `Canceled: ${reason || 'No reason given'}.${refundText}`, today, { refund_cents: refund });
  return refund;
}

export async function renewAgreement(agreement: SpAgreement, today: string, settings: SpSettings): Promise<string> {
  const { data: plan, error } = await supabase.from('sp_plans').select('current_version_id').eq('id', agreement.plan_id).maybeSingle();
  fail(error);
  const versionId = plan?.current_version_id ?? agreement.plan_version_id;
  const version = await fetchPlanVersion(versionId);
  const price = version.sp_price_options.find(p => p.cadence === agreement.cadence);
  const startDate = agreement.end_date >= today && agreement.status !== 'canceled' ? addDays(agreement.end_date, 1) : today;

  const number = await nextNumber('sp_agreements', 'agreement_number', 'SP-', 1000);
  const { data: created, error: insErr } = await supabase.from('sp_agreements').insert({
    agreement_number: number,
    company_id: agreement.company_id,
    primary_site_id: agreement.primary_site_id,
    plan_id: agreement.plan_id,
    plan_version_id: versionId,
    cadence: agreement.cadence,
    status: 'active',
    start_date: startDate,
    end_date: termEndDate(startDate, version.term_months),
    anchor_day: dayOfMonth(startDate),
    period_amount_cents: price?.amount_cents ?? agreement.period_amount_cents,
    auto_renew: true,
    payment_method: agreement.payment_method,
    signed_by_name: agreement.signed_by_name,
    signed_at: new Date().toISOString(),
    renewed_from_id: agreement.id,
    notes: `Renewal of ${agreement.agreement_number}`,
  }).select('id').single();
  if (insErr || !created) throw new Error(insErr?.message ?? 'Could not renew.');
  const newId = created.id as string;

  const [{ data: sites }, { data: addons }] = await Promise.all([
    supabase.from('sp_agreement_sites').select('site_id, system_id').eq('agreement_id', agreement.id),
    supabase.from('sp_agreement_addons').select('addon_id, name, annual_amount_cents, quantity').eq('agreement_id', agreement.id),
  ]);
  if (sites?.length) fail((await supabase.from('sp_agreement_sites').insert(sites.map(s => ({ ...s, agreement_id: newId })))).error);
  if (addons?.length) fail((await supabase.from('sp_agreement_addons').insert(addons.map(a => ({ ...a, agreement_id: newId })))).error);

  const renewed = await fetchAgreement(newId);
  await seedSchedule(renewed);
  await seedTermEntitlements(renewed);

  // Rollover unused benefits into the new term, expire the rest on the old one.
  const oldBenefits = await fetchBenefits(agreement.plan_version_id);
  const ledger = await fetchLedger([agreement.id]);
  const policy = agreement.status === 'canceled' ? 'none' : agreement.sp_plan_versions?.rollover_policy ?? 'none';
  const cap = agreement.sp_plan_versions?.rollover_cap ?? 0;
  const rolled: string[] = [];
  for (const b of oldBenefits) {
    const unused = computeBalance(ledger.filter(e => e.benefit_id === b.id)).available;
    if (unused <= 0) continue;
    const target = version.sp_benefits.find(nb => nb.name === b.name);
    const qty = target ? rolloverQuantity(policy, cap, unused) : 0;
    if (qty > 0 && target) {
      fail((await supabase.from('sp_entitlement_ledger').upsert({
        agreement_id: newId, benefit_id: target.id, entry_type: 'rollover', quantity: qty,
        period_start: startDate, period_end: renewed.end_date,
        occurrence_key: ledgerKeys.rollover(newId, target.id, startDate), note: `Rolled over from ${agreement.agreement_number}`,
      }, { onConflict: 'occurrence_key', ignoreDuplicates: true })).error);
      rolled.push(`${qty} x ${b.name}`);
    }
    fail((await supabase.from('sp_entitlement_ledger').upsert({
      agreement_id: agreement.id, benefit_id: b.id, entry_type: 'expire', quantity: unused,
      period_start: agreement.start_date, period_end: agreement.end_date,
      occurrence_key: ledgerKeys.expire(agreement.id, b.id, agreement.end_date),
      note: qty > 0 ? `Rolled ${qty} into ${number}` : 'Unused at term end',
    }, { onConflict: 'occurrence_key', ignoreDuplicates: true })).error);
  }

  const earlyRenewal = agreement.end_date >= today && ['active', 'pending_renewal', 'paused', 'past_due'].includes(agreement.status);
  if (earlyRenewal) {
    // Current term keeps billing until its end date; the sweep expires it afterwards.
    fail((await supabase.from('sp_agreements').update({
      status: agreement.status === 'pending_renewal' ? 'active' : agreement.status, auto_renew: false, updated_at: new Date().toISOString(),
    }).eq('id', agreement.id)).error);
  } else if (agreement.status !== 'canceled' && agreement.status !== 'expired') {
    fail((await supabase.from('sp_agreements').update({ status: 'expired', auto_renew: false, updated_at: new Date().toISOString() }).eq('id', agreement.id)).error);
    fail((await supabase.from('sp_billing_occurrences').update({ status: 'void' }).eq('agreement_id', agreement.id).eq('status', 'scheduled')).error);
  }
  await logEvent(agreement.id, 'renewed', `Renewed as ${number}, starting ${formatDate(startDate)}.`, today);
  await logEvent(newId, 'activated',
    `Renewed from ${agreement.agreement_number} on version ${version.version_number}.${rolled.length ? ` Rolled over: ${rolled.join(', ')}.` : ''}`, today);
  await runBilling(today, settings, newId);
  return newId;
}

async function expireAgreement(agreement: SpAgreement, today: string) {
  const benefits = await fetchBenefits(agreement.plan_version_id);
  const ledger = await fetchLedger([agreement.id]);
  for (const b of benefits) {
    const unused = computeBalance(ledger.filter(e => e.benefit_id === b.id)).available;
    if (unused <= 0) continue;
    fail((await supabase.from('sp_entitlement_ledger').upsert({
      agreement_id: agreement.id, benefit_id: b.id, entry_type: 'expire', quantity: unused,
      period_start: agreement.start_date, period_end: agreement.end_date,
      occurrence_key: ledgerKeys.expire(agreement.id, b.id, agreement.end_date), note: 'Unused at term end',
    }, { onConflict: 'occurrence_key', ignoreDuplicates: true })).error);
  }
  fail((await supabase.from('sp_agreements').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', agreement.id)).error);
  await logEvent(agreement.id, 'expired', 'Term ended without renewal.', today);
}

export interface LifecycleResult {
  resumed: number;
  renewalNotices: number;
  renewed: number;
  expired: number;
}

export async function processLifecycle(today: string, settings: SpSettings): Promise<LifecycleResult> {
  const { data, error } = await supabase.from('sp_agreements')
    .select('id, status, end_date, auto_renew, resume_on')
    .in('status', ['active', 'paused', 'pending_renewal']);
  fail(error);
  const { data: renewals, error: renErr } = await supabase.from('sp_agreements').select('renewed_from_id').not('renewed_from_id', 'is', null);
  fail(renErr);
  const alreadyRenewed = new Set((renewals ?? []).map(r => r.renewed_from_id as string));
  const result: LifecycleResult = { resumed: 0, renewalNotices: 0, renewed: 0, expired: 0 };
  for (const row of (data ?? []) as Pick<SpAgreement, 'id' | 'status' | 'end_date' | 'auto_renew' | 'resume_on'>[]) {
    const transition = lifecycleTransition(row, today, settings.renewal_notice_days);
    if (!transition) continue;
    if (alreadyRenewed.has(row.id) && transition === 'renewal_window') continue;
    const agreement = await fetchAgreement(row.id);
    if (transition === 'resume') { await resumeAgreement(agreement, today); result.resumed++; }
    if (transition === 'renewal_window') {
      fail((await supabase.from('sp_agreements').update({ status: 'pending_renewal', updated_at: new Date().toISOString() }).eq('id', row.id)).error);
      await logEvent(row.id, 'renewal_notice', `Renewal notice sent. Term ends ${formatDate(row.end_date)}.`, today);
      result.renewalNotices++;
    }
    if (transition === 'auto_renew') { await renewAgreement(agreement, today, settings); result.renewed++; }
    if (transition === 'expire') { await expireAgreement(agreement, today); result.expired++; }
  }
  return result;
}
