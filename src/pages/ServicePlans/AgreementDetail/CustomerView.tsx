import { CalendarDays, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { CADENCE_LABELS, computeBalance, formatCents, formatDate } from '../lib/domain';
import type { AgreementDetail } from '../lib/types';
import { Modal, planColor } from '../ui';

export default function CustomerView({ detail, today, onClose }: { detail: AgreementDetail; today: string; onClose: () => void }) {
  const { agreement, benefits, ledger, occurrences, sites, monitoring } = detail;
  const color = planColor(agreement.sp_plans?.color);
  const nextCharge = occurrences.find(o => o.status === 'scheduled' && o.bill_date >= today);
  const settled = new Set(ledger.filter(e => e.entry_type !== 'reserve').map(e => e.work_order_id));
  const nextVisit = ledger
    .filter(e => e.entry_type === 'reserve' && e.work_order_id && !settled.has(e.work_order_id) && e.work_orders?.scheduled_date)
    .sort((a, b) => (a.work_orders!.scheduled_date! < b.work_orders!.scheduled_date! ? -1 : 1))[0];
  const siteNames = [...new Set(sites.map(s => s.sites?.name).filter(Boolean))];

  return (
    <Modal title="Customer view" subtitle="What the customer sees in their portal and emails." onClose={onClose} wide>
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className={`${color.bg} px-6 py-6`}>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <ShieldCheck className={`h-4 w-4 ${color.text}`} /> Your service plan
          </div>
          <h2 className="font-display text-3xl text-gray-900 mt-2">{agreement.sp_plans?.name}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Covering {siteNames.join(', ') || 'your home'} through {formatDate(agreement.end_date)}
          </p>
        </div>
        <div className="px-6 py-5 grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Included this year</p>
            <ul className="space-y-2.5">
              {benefits.map(b => {
                const bal = computeBalance(ledger.filter(e => e.benefit_id === b.id));
                return (
                  <li key={b.id} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="flex-1 text-gray-800">{b.name}</span>
                    <span className="text-gray-500 tabular-nums whitespace-nowrap">{bal.available} of {bal.granted + bal.rolledOver + bal.adjusted} left</span>
                  </li>
                );
              })}
            </ul>
            {agreement.sp_plan_versions && (
              <p className="text-xs text-gray-500 mt-4">
                Member savings: {agreement.sp_plan_versions.labor_discount_bps / 100}% off labor
                {agreement.sp_plan_versions.parts_discount_bps > 0 && `, ${agreement.sp_plan_versions.parts_discount_bps / 100}% off parts`}
                {agreement.sp_plan_versions.priority_service && ', priority scheduling'}
                {agreement.sp_plan_versions.waive_trip_fee && ', no trip fee'}.
              </p>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="text-sm">
                <p className="text-gray-500">Next visit</p>
                <p className="font-medium text-gray-900">
                  {nextVisit ? `${formatDate(nextVisit.work_orders?.scheduled_date)} · ${benefits.find(b => b.id === nextVisit.benefit_id)?.name}` : 'Call us to book your next visit'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="text-sm">
                <p className="text-gray-500">{CADENCE_LABELS[agreement.cadence]} plan payment</p>
                <p className="font-medium text-gray-900">
                  {nextCharge ? `${formatCents(nextCharge.amount_cents)} on ${formatDate(nextCharge.bill_date)}` : 'No upcoming charges'}
                </p>
                {monitoring.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Alarm monitoring ({formatCents(monitoring.reduce((s, m) => s + m.monthly_cents, 0))}/mo) is billed separately.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
