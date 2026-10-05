import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonthsAnchored, buildBillingSchedule, monthlyEquivalentCents, formatCents, periodTotalCents,
  graceState, benefitsUsable, lifecycleTransition, cancellationRefundCents, computeBalance,
  rolloverQuantity, resolveDiscount, applyDiscountCents, normalizedMonthlyRevenueCents, toCsv,
  termEndDate, savingsVsMonthlyCents, overageChargeCents, allowedActions,
} from '../src/pages/ServicePlans/lib/domain.ts';

test('report normalization divides by cadence months', () => {
  assert.equal(monthlyEquivalentCents(3000, 'monthly'), 3000);
  assert.equal(monthlyEquivalentCents(8250, 'quarterly'), 2750);
  assert.equal(monthlyEquivalentCents(16500, 'semiannual'), 2750);
  assert.equal(monthlyEquivalentCents(33000, 'annual'), 2750);
  assert.equal(formatCents(monthlyEquivalentCents(33000, 'annual')), '$27.50');
});

test('monitoring plus plan is shown together but billed separately', () => {
  const monitoring = 4500;
  const plan = 3000;
  assert.equal(formatCents(monitoring + plan), '$75.00');
});

test('month-end anchor clamps and recovers', () => {
  assert.equal(addMonthsAnchored('2026-01-31', 1, 31), '2026-02-28');
  assert.equal(addMonthsAnchored('2026-01-31', 2, 31), '2026-03-31');
  assert.equal(addMonthsAnchored('2027-12-31', 2, 31), '2028-02-29');
  const sched = buildBillingSchedule({ agreementId: 'a', startDate: '2026-01-31', cadence: 'monthly', amountCents: 3000 });
  assert.equal(sched.length, 12);
  assert.deepEqual(sched.slice(0, 4).map(o => o.billDate), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.equal(sched[0].periodEnd, '2026-02-27');
  assert.equal(sched[11].periodEnd, '2027-01-30');
});

test('schedule keys are stable so billing is idempotent', () => {
  const a = buildBillingSchedule({ agreementId: 'x', startDate: '2026-04-01', cadence: 'quarterly', amountCents: 9500 });
  const b = buildBillingSchedule({ agreementId: 'x', startDate: '2026-04-01', cadence: 'quarterly', amountCents: 9500 });
  assert.deepEqual(a.map(o => o.occurrenceKey), b.map(o => o.occurrenceKey));
  assert.equal(new Set(a.map(o => o.occurrenceKey)).size, 4);
  assert.equal(termEndDate('2026-04-01'), '2027-03-31');
});

test('add-ons are split across billing periods', () => {
  assert.equal(periodTotalCents(9500, [{ annual_amount_cents: 18000, quantity: 1 }], 'quarterly'), 14000);
  assert.equal(periodTotalCents(33000, [], 'annual'), 33000);
});

test('annual savings vs paying monthly', () => {
  assert.equal(savingsVsMonthlyCents({ monthly: 2000, annual: 22000 }, 'annual'), 2000);
  assert.equal(savingsVsMonthlyCents({ monthly: 2000 }, 'monthly'), 0);
});

test('7-day grace period', () => {
  assert.equal(graceState('past_due', '2026-10-09', '2026-10-05'), 'in_grace');
  assert.equal(graceState('past_due', '2026-10-09', '2026-10-09'), 'in_grace');
  assert.equal(graceState('past_due', '2026-10-09', '2026-10-10'), 'grace_expired');
  assert.equal(benefitsUsable('past_due', '2026-09-27', '2026-10-05'), false);
  assert.equal(benefitsUsable('active', null, '2026-10-05'), true);
  assert.equal(benefitsUsable('paused', null, '2026-10-05'), false);
});

test('lifecycle transitions on the company date', () => {
  const base = { status: 'active' as const, end_date: '2026-10-20', auto_renew: true, resume_on: null };
  assert.equal(lifecycleTransition(base, '2026-10-05', 30), 'renewal_window');
  assert.equal(lifecycleTransition(base, '2026-08-01', 30), null);
  assert.equal(lifecycleTransition(base, '2026-10-21', 30), 'auto_renew');
  assert.equal(lifecycleTransition({ ...base, auto_renew: false }, '2026-10-21', 30), 'expire');
  assert.equal(lifecycleTransition({ ...base, status: 'paused', resume_on: '2026-11-01' }, '2026-11-01', 30), 'resume');
  assert.deepEqual(allowedActions('past_due'), ['retry_payment', 'cancel']);
});

test('cancellation refund follows policy', () => {
  const input = { periodStart: '2026-01-01', periodEnd: '2026-12-31', paidCents: 36500, cancelDate: '2026-01-10' };
  assert.equal(cancellationRefundCents({ ...input, policy: 'no_refund' }), 0);
  assert.equal(cancellationRefundCents({ ...input, policy: 'prorated' }), 35500);
});

test('entitlement ledger: reserve, consume, release', () => {
  const entries = [
    { entry_type: 'grant' as const, quantity: 2, work_order_id: null },
    { entry_type: 'reserve' as const, quantity: 1, work_order_id: 'w1' },
    { entry_type: 'reserve' as const, quantity: 1, work_order_id: 'w2' },
    { entry_type: 'consume' as const, quantity: 1, work_order_id: 'w1' },
  ];
  const b = computeBalance(entries);
  assert.equal(b.consumed, 1);
  assert.equal(b.reserved, 1);
  assert.equal(b.available, 0);
  assert.equal(overageChargeCents(b, 14900), 14900);
  const released = computeBalance([...entries, { entry_type: 'release', quantity: 1, work_order_id: 'w2' }]);
  assert.equal(released.reserved, 0);
  assert.equal(released.available, 1);
});

test('rollover respects policy and cap', () => {
  assert.equal(rolloverQuantity('none', 5, 2), 0);
  assert.equal(rolloverQuantity('one_period', 1, 2), 1);
  assert.equal(rolloverQuantity('unlimited', 0, 3), 3);
});

test('discount precedence never stacks', () => {
  assert.deepEqual(resolveDiscount({ planBps: 1000, promoBps: 1500 }), { bps: 1500, source: 'promo' });
  assert.deepEqual(resolveDiscount({ planBps: 1500, promoBps: 1000 }), { bps: 1500, source: 'plan' });
  assert.deepEqual(resolveDiscount({ planBps: 1500, manualBps: 500 }), { bps: 500, source: 'manual' });
  assert.equal(applyDiscountCents(20000, 1500), 17000);
});

test('normalized monthly revenue counts only billable statuses', () => {
  const total = normalizedMonthlyRevenueCents([
    { status: 'active', cadence: 'annual', period_amount_cents: 33000 },
    { status: 'active', cadence: 'monthly', period_amount_cents: 3000 },
    { status: 'canceled', cadence: 'monthly', period_amount_cents: 9999 },
  ]);
  assert.equal(total, 5750);
});

test('csv escapes and blocks formulas', () => {
  assert.equal(toCsv([['a,b', '=SUM(1)', -5]]), '"a,b",\'=SUM(1),-5');
});
