import { supabase } from '../../../lib/supabase';
import { recordPayment } from '../../Invoices/useInvoices';
import { demoPaymentAdapter, type PaymentAdapter } from './adapters';
import { addDays, CADENCE_LABELS, formatDate, graceUntilFor, periodsPerTerm } from './domain';
import { fetchAgreement } from './queries';
import type { SpAgreement, SpAgreementAddon, SpBillingOccurrence, SpSettings } from './types';

export async function logEvent(agreementId: string, eventType: string, description: string, eventDate: string, metadata: Record<string, unknown> = {}) {
  const { error } = await supabase.from('sp_events').insert({
    agreement_id: agreementId, event_type: eventType, description, event_date: eventDate, metadata,
  });
  if (error) throw new Error(error.message);
}

export async function nextNumber(table: string, column: string, prefix: string, start: number): Promise<string> {
  const { data, error } = await supabase
    .from(table).select(column).ilike(column, `${prefix}%`)
    .order(column, { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  let max = start;
  for (const row of (data ?? []) as unknown as Record<string, string>[]) {
    const n = parseInt(String(row[column]).slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

function paymentToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

async function createPlanInvoice(
  agreement: SpAgreement,
  occ: SpBillingOccurrence,
  addons: SpAgreementAddon[],
  settings: SpSettings,
  today: string,
): Promise<string> {
  const periods = periodsPerTerm(agreement.cadence, agreement.sp_plan_versions?.term_months ?? 12);
  const totalDollars = occ.amount_cents / 100;
  const invoiceNumber = await nextNumber('invoices', 'invoice_number', 'SPI-', 1000);
  const { data: inv, error } = await supabase.from('invoices').insert({
    invoice_number: invoiceNumber,
    company_id: agreement.company_id,
    site_id: agreement.primary_site_id,
    status: 'sent',
    invoice_date: today,
    due_date: addDays(today, settings.invoice_due_days),
    subtotal: totalDollars,
    tax: 0,
    total: totalDollars,
    amount_paid: 0,
    balance_due: totalDollars,
    notes: `Service plan ${agreement.agreement_number}`,
    terms: 'Due on receipt',
    payment_token: paymentToken(),
    sp_agreement_id: agreement.id,
  }).select('id').single();
  if (error || !inv) throw new Error(error?.message ?? 'Could not create invoice.');

  const lines = [{
    invoice_id: inv.id,
    description: `${agreement.sp_plans?.name ?? 'Service plan'} (${CADENCE_LABELS[agreement.cadence]}) ${formatDate(occ.period_start)} - ${formatDate(occ.period_end)}`,
    quantity: 1,
    unit_price: agreement.period_amount_cents / 100,
    total: agreement.period_amount_cents / 100,
    sort_order: 0,
  }, ...addons.map((a, i) => {
    const each = Math.floor(a.annual_amount_cents / periods);
    return {
      invoice_id: inv.id,
      description: `Add-on: ${a.name}`,
      quantity: a.quantity,
      unit_price: each / 100,
      total: Math.floor((a.annual_amount_cents * a.quantity) / periods) / 100,
      sort_order: i + 1,
    };
  })];
  const { error: lineErr } = await supabase.from('invoice_line_items').insert(lines);
  if (lineErr) throw new Error(lineErr.message);
  return inv.id;
}

async function markPastDue(agreement: SpAgreement, today: string, settings: SpSettings, reason: string) {
  if (agreement.status === 'past_due') return;
  const graceUntil = graceUntilFor(today, settings.grace_days);
  const { error } = await supabase.from('sp_agreements')
    .update({ status: 'past_due', grace_until: graceUntil, updated_at: new Date().toISOString() })
    .eq('id', agreement.id);
  if (error) throw new Error(error.message);
  await logEvent(agreement.id, 'payment_failed', `${reason}. Grace period until ${formatDate(graceUntil)}.`, today);
}

export interface BillingRunResult {
  invoiced: number;
  paid: number;
  failed: number;
  errors: string[];
}

export async function runBilling(
  today: string,
  settings: SpSettings,
  agreementId?: string,
  payments: PaymentAdapter = demoPaymentAdapter,
): Promise<BillingRunResult> {
  let q = supabase.from('sp_billing_occurrences')
    .select('*, sp_agreements!inner(status)')
    .eq('status', 'scheduled')
    .lte('bill_date', today)
    .in('sp_agreements.status', ['active', 'past_due', 'pending_renewal'])
    .order('bill_date');
  if (agreementId) q = q.eq('agreement_id', agreementId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const result: BillingRunResult = { invoiced: 0, paid: 0, failed: 0, errors: [] };
  const cache = new Map<string, { agreement: SpAgreement; addons: SpAgreementAddon[] }>();

  for (const occ of (data ?? []) as SpBillingOccurrence[]) {
    const { data: claimed, error: claimErr } = await supabase.from('sp_billing_occurrences')
      .update({ status: 'processing' }).eq('id', occ.id).eq('status', 'scheduled').select('id');
    if (claimErr) { result.errors.push(claimErr.message); continue; }
    if (!claimed || claimed.length === 0) continue;

    try {
      let ctx = cache.get(occ.agreement_id);
      if (!ctx) {
        const agreement = await fetchAgreement(occ.agreement_id);
        const { data: addons, error: addErr } = await supabase.from('sp_agreement_addons').select('*').eq('agreement_id', occ.agreement_id);
        if (addErr) throw new Error(addErr.message);
        ctx = { agreement, addons: (addons ?? []) as SpAgreementAddon[] };
        cache.set(occ.agreement_id, ctx);
      }
      const invoiceId = await createPlanInvoice(ctx.agreement, occ, ctx.addons, settings, today);
      result.invoiced++;
      const charge = await payments.charge({
        agreementNumber: ctx.agreement.agreement_number, amountCents: occ.amount_cents, method: ctx.agreement.payment_method,
      });
      if (charge.ok) {
        const pay = await recordPayment(invoiceId, occ.amount_cents / 100, 'credit_card', charge.reference);
        if (pay.error) throw new Error(pay.error);
        await supabase.from('sp_billing_occurrences').update({
          status: 'paid', attempts: occ.attempts + 1, last_attempt_on: today, invoice_id: invoiceId, failure_reason: null,
        }).eq('id', occ.id);
        result.paid++;
      } else {
        await supabase.from('sp_billing_occurrences').update({
          status: 'failed', attempts: occ.attempts + 1, last_attempt_on: today, invoice_id: invoiceId, failure_reason: charge.reason ?? 'Payment failed',
        }).eq('id', occ.id);
        await markPastDue(ctx.agreement, today, settings, charge.reason ?? 'Payment failed');
        ctx.agreement = { ...ctx.agreement, status: 'past_due' };
        result.failed++;
      }
    } catch (e) {
      await supabase.from('sp_billing_occurrences').update({ status: 'scheduled' }).eq('id', occ.id).eq('status', 'processing');
      result.errors.push(e instanceof Error ? e.message : 'Billing failed');
    }
  }
  return result;
}

export async function retryFailedPayments(
  agreement: SpAgreement,
  today: string,
  payments: PaymentAdapter = demoPaymentAdapter,
): Promise<{ recovered: number; stillFailing: number }> {
  const { data, error } = await supabase.from('sp_billing_occurrences')
    .select('*, invoices(invoice_number,status,balance_due)')
    .eq('agreement_id', agreement.id).eq('status', 'failed').order('bill_date');
  if (error) throw new Error(error.message);
  let recovered = 0;
  let stillFailing = 0;
  for (const occ of (data ?? []) as SpBillingOccurrence[]) {
    const charge = await payments.charge({ agreementNumber: agreement.agreement_number, amountCents: occ.amount_cents, method: agreement.payment_method });
    if (charge.ok) {
      if (occ.invoice_id && (occ.invoices?.balance_due ?? 0) > 0) {
        const pay = await recordPayment(occ.invoice_id, Number(occ.invoices?.balance_due), 'credit_card', charge.reference);
        if (pay.error) throw new Error(pay.error);
      }
      await supabase.from('sp_billing_occurrences').update({
        status: 'paid', attempts: occ.attempts + 1, last_attempt_on: today, failure_reason: null,
      }).eq('id', occ.id);
      recovered++;
    } else {
      await supabase.from('sp_billing_occurrences').update({
        attempts: occ.attempts + 1, last_attempt_on: today, failure_reason: charge.reason ?? 'Payment failed',
      }).eq('id', occ.id);
      stillFailing++;
    }
  }
  if (stillFailing === 0 && agreement.status === 'past_due') {
    const { error: upErr } = await supabase.from('sp_agreements')
      .update({ status: 'active', grace_until: null, updated_at: new Date().toISOString() }).eq('id', agreement.id);
    if (upErr) throw new Error(upErr.message);
    await logEvent(agreement.id, 'payment_recovered', `Payment collected. ${recovered} past-due charge${recovered === 1 ? '' : 's'} paid.`, today);
  } else if (stillFailing > 0) {
    await logEvent(agreement.id, 'payment_retry_failed', 'Retry declined. Agreement remains past due.', today);
  }
  return { recovered, stillFailing };
}
