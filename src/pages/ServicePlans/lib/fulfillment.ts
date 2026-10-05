import { supabase } from '../../../lib/supabase';
import { logEvent, nextNumber } from './billing';
import { benefitsUsable, computeBalance, formatCents, formatDate, ledgerKeys } from './domain';
import { fetchLedger } from './queries';
import type { SpAgreement, SpBenefit } from './types';

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export interface ScheduleVisitInput {
  agreement: SpAgreement;
  benefit: SpBenefit;
  siteId: string | null;
  systemId: string | null;
  date: string;
  time: string;
  technicianId: string | null;
  notes: string;
}

export async function scheduleVisit(input: ScheduleVisitInput, today: string) {
  const { agreement, benefit } = input;
  if (!benefitsUsable(agreement.status, agreement.grace_until, today)) {
    throw new Error('Benefits are on hold for this agreement. Collect payment or resume the plan first.');
  }
  const ledger = await fetchLedger([agreement.id]);
  const balance = computeBalance(ledger.filter(e => e.benefit_id === benefit.id));
  const covered = balance.available > 0;
  const woNumber = await nextNumber('work_orders', 'wo_number', 'SPV-', 1000);
  const { data, error } = await supabase.from('work_orders').insert({
    wo_number: woNumber,
    company_id: agreement.company_id,
    site_id: input.siteId,
    system_id: input.systemId,
    title: `${benefit.name} (${agreement.sp_plans?.name ?? 'Service plan'})`,
    description: benefit.description,
    work_order_type: 'maintenance',
    status: input.technicianId ? 'scheduled' : 'unassigned',
    priority: agreement.sp_plan_versions?.priority_service ? 'high' : 'normal',
    scheduled_date: input.date,
    scheduled_time: input.time || null,
    assigned_to: input.technicianId,
    estimated_duration: benefit.duration_minutes,
    billing_type: covered ? 'not_billable' : 'fixed',
    fixed_amount: covered ? 0 : benefit.overage_price_cents / 100,
    reason_for_visit: covered ? `Included plan visit - ${agreement.agreement_number}` : `Overage visit - ${agreement.agreement_number}`,
    notes: input.notes,
    source: 'office',
    sp_agreement_id: agreement.id,
  }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create the visit.');
  if (covered) {
    fail((await supabase.from('sp_entitlement_ledger').upsert({
      agreement_id: agreement.id, benefit_id: benefit.id, entry_type: 'reserve', quantity: 1,
      period_start: agreement.start_date, period_end: agreement.end_date, work_order_id: data.id,
      occurrence_key: ledgerKeys.reserve(data.id), note: `Reserved for ${woNumber}`,
    }, { onConflict: 'occurrence_key', ignoreDuplicates: true })).error);
  }
  await logEvent(agreement.id, 'visit_scheduled',
    covered
      ? `${benefit.name} scheduled for ${formatDate(input.date)} (${woNumber}).`
      : `${benefit.name} scheduled for ${formatDate(input.date)} as overage at ${formatCents(benefit.overage_price_cents)} (${woNumber}).`,
    today, { work_order_id: data.id });
  return { workOrderId: data.id as string, woNumber, covered };
}

async function closeReservation(agreementId: string, workOrderId: string, kind: 'consume' | 'release', today: string) {
  const { data: reserve, error } = await supabase.from('sp_entitlement_ledger').select('*')
    .eq('occurrence_key', ledgerKeys.reserve(workOrderId)).maybeSingle();
  fail(error);
  if (!reserve) return;
  fail((await supabase.from('sp_entitlement_ledger').upsert({
    agreement_id: agreementId, benefit_id: reserve.benefit_id, entry_type: kind, quantity: reserve.quantity,
    period_start: reserve.period_start, period_end: reserve.period_end, work_order_id: workOrderId,
    occurrence_key: kind === 'consume' ? ledgerKeys.consume(workOrderId) : ledgerKeys.release(workOrderId),
    note: kind === 'consume' ? `Used on ${formatDate(today)}` : 'Visit canceled, allowance returned',
  }, { onConflict: 'occurrence_key', ignoreDuplicates: true })).error);
}

export async function completeVisit(agreementId: string, workOrderId: string, woNumber: string, today: string) {
  fail((await supabase.from('work_orders').update({
    status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', workOrderId)).error);
  await closeReservation(agreementId, workOrderId, 'consume', today);
  await logEvent(agreementId, 'visit_completed', `Visit ${woNumber} completed.`, today, { work_order_id: workOrderId });
}

export async function cancelVisit(agreementId: string, workOrderId: string, woNumber: string, today: string) {
  fail((await supabase.from('work_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', workOrderId)).error);
  await closeReservation(agreementId, workOrderId, 'release', today);
  await logEvent(agreementId, 'visit_canceled', `Visit ${woNumber} canceled. Allowance returned.`, today, { work_order_id: workOrderId });
}

// Visits completed or canceled from the regular work order screens still need their reservation settled.
export async function reconcileVisits(today: string): Promise<number> {
  const { data, error } = await supabase.from('sp_entitlement_ledger')
    .select('agreement_id, work_order_id, entry_type, work_orders(status)')
    .not('work_order_id', 'is', null);
  fail(error);
  const rows = (data ?? []) as unknown as { agreement_id: string; work_order_id: string; entry_type: string; work_orders: { status: string } | null }[];
  const settled = new Set(rows.filter(r => r.entry_type !== 'reserve').map(r => r.work_order_id));
  let changed = 0;
  for (const r of rows) {
    if (r.entry_type !== 'reserve' || settled.has(r.work_order_id)) continue;
    const status = r.work_orders?.status;
    if (status === 'completed') { await closeReservation(r.agreement_id, r.work_order_id, 'consume', today); changed++; }
    if (status === 'cancelled' || status === 'canceled') { await closeReservation(r.agreement_id, r.work_order_id, 'release', today); changed++; }
  }
  return changed;
}

export async function logRemoteSession(agreement: SpAgreement, benefit: SpBenefit, today: string, note: string) {
  if (!benefitsUsable(agreement.status, agreement.grace_until, today)) {
    throw new Error('Benefits are on hold for this agreement.');
  }
  const ledger = await fetchLedger([agreement.id]);
  const balance = computeBalance(ledger.filter(e => e.benefit_id === benefit.id));
  if (balance.available <= 0) throw new Error(`No ${benefit.name.toLowerCase()} left this term. Overage is ${formatCents(benefit.overage_price_cents)}.`);
  fail((await supabase.from('sp_entitlement_ledger').insert({
    agreement_id: agreement.id, benefit_id: benefit.id, entry_type: 'consume', quantity: 1,
    period_start: agreement.start_date, period_end: agreement.end_date,
    occurrence_key: ledgerKeys.remote(agreement.id, benefit.id, `${today}:${crypto.randomUUID()}`),
    note: note.trim() || `Used ${formatDate(today)}`,
  })).error);
  await logEvent(agreement.id, 'benefit_used', `${benefit.name} used.${note.trim() ? ` ${note.trim()}` : ''}`, today);
}

export async function adjustEntitlement(agreement: SpAgreement, benefit: SpBenefit, quantity: number, reason: string, today: string) {
  if (!Number.isInteger(quantity) || quantity === 0) throw new Error('Enter a whole number other than zero.');
  fail((await supabase.from('sp_entitlement_ledger').insert({
    agreement_id: agreement.id, benefit_id: benefit.id, entry_type: 'adjust', quantity,
    period_start: agreement.start_date, period_end: agreement.end_date,
    occurrence_key: `adjust:${agreement.id}:${benefit.id}:${crypto.randomUUID()}`,
    note: reason.trim() || 'Manual adjustment',
  })).error);
  await logEvent(agreement.id, 'benefit_adjusted', `${benefit.name} ${quantity > 0 ? '+' : ''}${quantity}. ${reason.trim()}`, today);
}
