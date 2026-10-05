// Pure Service Plans rules. No I/O, no imports: money in integer cents, durations in integer minutes,
// discounts in basis points (1000 = 10%), dates as ISO 'YYYY-MM-DD' strings evaluated in UTC.

export type Cadence = 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type AgreementStatus =
  | 'draft' | 'pending_signature' | 'active' | 'past_due' | 'paused'
  | 'pending_renewal' | 'canceled' | 'expired';
export type LedgerEntryType = 'grant' | 'rollover' | 'reserve' | 'release' | 'consume' | 'expire' | 'adjust';
export type RolloverPolicy = 'none' | 'one_period' | 'unlimited';
export type CancellationPolicy = 'no_refund' | 'prorated';

export const CADENCES: Cadence[] = ['monthly', 'quarterly', 'semiannual', 'annual'];
export const CADENCE_MONTHS: Record<Cadence, number> = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
export const CADENCE_LABELS: Record<Cadence, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', semiannual: 'Semiannual', annual: 'Annual',
};

// ---------- Money ----------

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, '0')}`;
}

export function dollarsToCents(value: number | string): number {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function monthlyEquivalentCents(amountCents: number, cadence: Cadence): number {
  return Math.round(amountCents / CADENCE_MONTHS[cadence]);
}

export function annualizedCents(amountCents: number, cadence: Cadence): number {
  return amountCents * (12 / CADENCE_MONTHS[cadence]);
}

export function periodsPerTerm(cadence: Cadence, termMonths = 12): number {
  return Math.max(1, Math.floor(termMonths / CADENCE_MONTHS[cadence]));
}

export function addonPeriodCents(annualCents: number, quantity: number, periods: number): number {
  return Math.floor((annualCents * quantity) / periods);
}

export function periodTotalCents(
  planPeriodCents: number,
  addons: { annual_amount_cents: number; quantity: number }[],
  cadence: Cadence,
  termMonths = 12,
): number {
  const periods = periodsPerTerm(cadence, termMonths);
  const addonAnnual = addons.reduce((s, a) => s + a.annual_amount_cents * a.quantity, 0);
  return planPeriodCents + Math.floor(addonAnnual / periods);
}

export function savingsVsMonthlyCents(prices: Partial<Record<Cadence, number>>, cadence: Cadence): number {
  const monthly = prices.monthly;
  const chosen = prices[cadence];
  if (monthly == null || chosen == null || cadence === 'monthly') return 0;
  return monthly * 12 - annualizedCents(chosen, cadence);
}

// ---------- Dates ----------

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return [y, m, d];
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parts(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return fmt(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addMonthsAnchored(iso: string, months: number, anchorDay?: number): string {
  const [y, m, d] = parts(iso);
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const day = Math.min(anchorDay ?? d, daysInMonth(ny, nm));
  return fmt(ny, nm, day);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = parts(fromIso);
  const [y2, m2, d2] = parts(toIso);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function dayOfMonth(iso: string): number {
  return parts(iso)[2];
}

export function termEndDate(startIso: string, termMonths = 12): string {
  return addDays(addMonthsAnchored(startIso, termMonths, dayOfMonth(startIso)), -1);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// ---------- Billing schedule ----------

export interface ScheduledOccurrence {
  occurrenceKey: string;
  sequence: number;
  periodStart: string;
  periodEnd: string;
  billDate: string;
  amountCents: number;
}

export function billingOccurrenceKey(agreementId: string, periodStart: string): string {
  return `bill:${agreementId}:${periodStart}`;
}

export function buildBillingSchedule(input: {
  agreementId: string;
  startDate: string;
  cadence: Cadence;
  termMonths?: number;
  anchorDay?: number;
  amountCents: number;
}): ScheduledOccurrence[] {
  const step = CADENCE_MONTHS[input.cadence];
  const anchor = input.anchorDay ?? dayOfMonth(input.startDate);
  const count = periodsPerTerm(input.cadence, input.termMonths ?? 12);
  const out: ScheduledOccurrence[] = [];
  for (let i = 0; i < count; i++) {
    const periodStart = addMonthsAnchored(input.startDate, i * step, anchor);
    const periodEnd = addDays(addMonthsAnchored(input.startDate, (i + 1) * step, anchor), -1);
    out.push({
      occurrenceKey: billingOccurrenceKey(input.agreementId, periodStart),
      sequence: i + 1,
      periodStart,
      periodEnd,
      billDate: periodStart,
      amountCents: input.amountCents,
    });
  }
  return out;
}

export function isOccurrenceDue(occ: { status: string; bill_date: string }, today: string): boolean {
  return occ.status === 'scheduled' && occ.bill_date <= today;
}

// ---------- Grace period / lifecycle ----------

export type GraceState = 'none' | 'in_grace' | 'grace_expired';

export function graceState(status: AgreementStatus, graceUntil: string | null, today: string): GraceState {
  if (status !== 'past_due' || !graceUntil) return 'none';
  return today <= graceUntil ? 'in_grace' : 'grace_expired';
}

export function graceUntilFor(failedOn: string, graceDays: number): string {
  return addDays(failedOn, graceDays);
}

export function benefitsUsable(status: AgreementStatus, graceUntil: string | null, today: string): boolean {
  if (status === 'active' || status === 'pending_renewal') return true;
  return graceState(status, graceUntil, today) === 'in_grace';
}

export type AgreementAction =
  | 'send' | 'sign' | 'pause' | 'resume' | 'cancel' | 'renew' | 'retry_payment';

export function allowedActions(status: AgreementStatus): AgreementAction[] {
  switch (status) {
    case 'draft': return ['send', 'sign', 'cancel'];
    case 'pending_signature': return ['sign', 'cancel'];
    case 'active': return ['pause', 'renew', 'cancel'];
    case 'past_due': return ['retry_payment', 'cancel'];
    case 'paused': return ['resume', 'cancel'];
    case 'pending_renewal': return ['renew', 'pause', 'cancel'];
    case 'canceled':
    case 'expired': return ['renew'];
  }
}

export type LifecycleTransition = 'resume' | 'renewal_window' | 'auto_renew' | 'expire' | null;

export function lifecycleTransition(
  a: { status: AgreementStatus; end_date: string; auto_renew: boolean; resume_on: string | null },
  today: string,
  noticeDays: number,
): LifecycleTransition {
  if (a.status === 'paused' && a.resume_on && a.resume_on <= today) return 'resume';
  if (a.status === 'active' || a.status === 'pending_renewal') {
    if (today > a.end_date) return a.auto_renew ? 'auto_renew' : 'expire';
    if (a.status === 'active' && daysBetween(today, a.end_date) <= noticeDays) return 'renewal_window';
  }
  return null;
}

export function cancellationRefundCents(input: {
  policy: CancellationPolicy;
  periodStart: string;
  periodEnd: string;
  paidCents: number;
  cancelDate: string;
}): number {
  if (input.policy !== 'prorated' || input.paidCents <= 0) return 0;
  const total = daysBetween(input.periodStart, input.periodEnd) + 1;
  const used = Math.min(total, Math.max(0, daysBetween(input.periodStart, input.cancelDate) + 1));
  return Math.floor((input.paidCents * (total - used)) / total);
}

// ---------- Entitlement ledger ----------

export interface LedgerEntryLike {
  entry_type: LedgerEntryType;
  quantity: number;
  work_order_id: string | null;
}

export interface Balance {
  granted: number;
  rolledOver: number;
  adjusted: number;
  consumed: number;
  reserved: number;
  expired: number;
  available: number;
}

export function computeBalance(entries: LedgerEntryLike[]): Balance {
  const b = { granted: 0, rolledOver: 0, adjusted: 0, consumed: 0, reserved: 0, expired: 0 };
  const openReservations = new Map<string, number>();
  let looseReserves = 0;
  for (const e of entries) {
    switch (e.entry_type) {
      case 'grant': b.granted += e.quantity; break;
      case 'rollover': b.rolledOver += e.quantity; break;
      case 'adjust': b.adjusted += e.quantity; break;
      case 'expire': b.expired += e.quantity; break;
      case 'consume': b.consumed += e.quantity; break;
      case 'reserve':
        if (e.work_order_id) openReservations.set(e.work_order_id, (openReservations.get(e.work_order_id) ?? 0) + e.quantity);
        else looseReserves += e.quantity;
        break;
      case 'release': break;
    }
  }
  for (const e of entries) {
    if ((e.entry_type === 'release' || e.entry_type === 'consume') && e.work_order_id && openReservations.has(e.work_order_id)) {
      const left = (openReservations.get(e.work_order_id) ?? 0) - e.quantity;
      if (left <= 0) openReservations.delete(e.work_order_id);
      else openReservations.set(e.work_order_id, left);
    }
  }
  b.reserved = looseReserves + [...openReservations.values()].reduce((s, q) => s + q, 0);
  const available = b.granted + b.rolledOver + b.adjusted - b.consumed - b.reserved - b.expired;
  return { ...b, available: Math.max(0, available) };
}

export function rolloverQuantity(policy: RolloverPolicy, cap: number, unused: number): number {
  if (unused <= 0 || policy === 'none') return 0;
  if (policy === 'unlimited') return unused;
  return Math.min(cap, unused);
}

export function overageChargeCents(balance: Balance, overagePriceCents: number): number {
  return balance.available > 0 ? 0 : overagePriceCents;
}

export const ledgerKeys = {
  grant: (agreementId: string, benefitId: string, periodStart: string) => `grant:${agreementId}:${benefitId}:${periodStart}`,
  rollover: (agreementId: string, benefitId: string, periodStart: string) => `rollover:${agreementId}:${benefitId}:${periodStart}`,
  expire: (agreementId: string, benefitId: string, periodEnd: string) => `expire:${agreementId}:${benefitId}:${periodEnd}`,
  reserve: (workOrderId: string) => `reserve:${workOrderId}`,
  release: (workOrderId: string) => `release:${workOrderId}`,
  consume: (workOrderId: string) => `consume:${workOrderId}`,
  remote: (agreementId: string, benefitId: string, stamp: string) => `use:${agreementId}:${benefitId}:${stamp}`,
};

// ---------- Discount precedence ----------

export interface DiscountChoice {
  bps: number;
  source: 'manual' | 'plan' | 'promo' | 'none';
}

// Discounts never stack: a manual override always wins, otherwise the larger of plan or promo applies.
export function resolveDiscount(input: { planBps: number; promoBps?: number; manualBps?: number | null }): DiscountChoice {
  if (input.manualBps != null) return { bps: input.manualBps, source: 'manual' };
  const promo = input.promoBps ?? 0;
  if (input.planBps <= 0 && promo <= 0) return { bps: 0, source: 'none' };
  return promo > input.planBps ? { bps: promo, source: 'promo' } : { bps: input.planBps, source: 'plan' };
}

export function applyDiscountCents(cents: number, bps: number): number {
  return cents - Math.round((cents * bps) / 10000);
}

export function bpsLabel(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

// ---------- Reporting ----------

export function normalizedMonthlyRevenueCents(
  agreements: { status: AgreementStatus; cadence: Cadence; period_amount_cents: number }[],
): number {
  return agreements
    .filter(a => a.status === 'active' || a.status === 'past_due' || a.status === 'pending_renewal')
    .reduce((s, a) => s + monthlyEquivalentCents(a.period_amount_cents, a.cadence), 0);
}

export function toCsv(rows: (string | number | null)[][]): string {
  return rows
    .map(r => r.map(v => {
      const s = v == null ? '' : String(v);
      const safe = typeof v === 'string' && /^[=+\-@]/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    }).join(','))
    .join('\n');
}
