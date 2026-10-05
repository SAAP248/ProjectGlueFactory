import { ExternalLink, Radio } from 'lucide-react';
import {
  annualizedCents, CADENCE_LABELS, formatCents, formatDate, monthlyEquivalentCents, periodsPerTerm,
} from '../lib/domain';
import type { AgreementDetail } from '../lib/types';
import { Card, OccurrenceBadge } from '../ui';

interface Props {
  detail: AgreementDetail;
  today: string;
  onOpenInvoice?: (invoiceId: string) => void;
}

export default function BillingTab({ detail, today, onOpenInvoice }: Props) {
  const { agreement, addons, occurrences, monitoring } = detail;
  const term = agreement.sp_plan_versions?.term_months ?? 12;
  const periods = periodsPerTerm(agreement.cadence, term);
  const addonAnnual = addons.reduce((s, a) => s + a.annual_amount_cents * a.quantity, 0);
  const planAnnual = annualizedCents(agreement.period_amount_cents, agreement.cadence);
  const perPeriod = agreement.period_amount_cents + Math.floor(addonAnnual / periods);
  const planMonthly = monthlyEquivalentCents(perPeriod, agreement.cadence);
  const monitoringMonthly = monitoring.reduce((s, m) => s + m.monthly_cents, 0);
  const paid = occurrences.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount_cents, 0);
  const outstanding = occurrences.filter(o => o.status === 'failed').reduce((s, o) => s + o.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Plan charges" className="lg:col-span-2">
          <dl className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Stat label={`${CADENCE_LABELS[agreement.cadence]} charge`} value={formatCents(perPeriod)} />
            <Stat label="Annual value" value={formatCents(planAnnual + addonAnnual)} />
            <Stat label="Collected" value={formatCents(paid)} />
            <Stat label="Past due" value={formatCents(outstanding)} tone={outstanding > 0 ? 'text-red-600' : undefined} />
          </dl>
          <div className="px-5 pb-4">
            <div className="rounded-lg bg-gray-50 divide-y divide-gray-100 text-sm">
              <Row label="Plan" value={formatCents(agreement.period_amount_cents)} />
              {addons.map(a => (
                <Row key={a.id} label={`${a.name}${a.quantity > 1 ? ` x${a.quantity}` : ''}`} sub={`${formatCents(a.annual_amount_cents * a.quantity)}/yr split ${periods} ways`}
                  value={formatCents(Math.floor((a.annual_amount_cents * a.quantity) / periods))} />
              ))}
              <Row label={`Total per ${CADENCE_LABELS[agreement.cadence].toLowerCase()} charge`} value={formatCents(perPeriod)} strong />
            </div>
          </div>
        </Card>

        <Card title={<span className="inline-flex items-center gap-2"><Radio className="h-4 w-4 text-sky-600" /> Monitoring (separate)</span>}>
          <div className="px-5 py-4 text-sm space-y-3">
            {monitoring.length === 0 ? (
              <p className="text-gray-500">No monitoring subscription on this customer.</p>
            ) : monitoring.map(m => (
              <div key={m.id} className="flex justify-between">
                <span className="text-gray-600">{m.provider}</span>
                <span className="font-medium tabular-nums">{formatCents(m.monthly_cents)}/mo</span>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-gray-600"><span>Plan (monthly equivalent)</span><span className="tabular-nums">{formatCents(planMonthly)}</span></div>
              <div className="flex justify-between font-semibold text-gray-900"><span>Customer pays per month</span><span className="tabular-nums">{formatCents(planMonthly + monitoringMonthly)}</span></div>
            </div>
            <p className="text-xs text-gray-500">Monitoring is billed by its own subscription and is never included on plan invoices.</p>
          </div>
        </Card>
      </div>

      <Card title="Billing schedule">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-5 py-2.5 font-medium">#</th>
                <th className="px-5 py-2.5 font-medium">Bill date</th>
                <th className="px-5 py-2.5 font-medium">Covers</th>
                <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {occurrences.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-500">Billing is scheduled once the agreement is signed.</td></tr>
              )}
              {occurrences.map(o => (
                <tr key={o.id} className={`hover:bg-gray-50/60 ${o.bill_date <= today && o.status === 'scheduled' ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-5 py-2.5 text-gray-400 tabular-nums">{o.sequence}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">{formatDate(o.bill_date)}</td>
                  <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(o.period_start)} – {formatDate(o.period_end)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-medium">{formatCents(o.amount_cents)}</td>
                  <td className="px-5 py-2.5">
                    <OccurrenceBadge status={o.status} />
                    {o.failure_reason && o.status === 'failed' && <span className="block text-xs text-red-600 mt-0.5">{o.failure_reason} · {o.attempts} attempt{o.attempts === 1 ? '' : 's'}</span>}
                  </td>
                  <td className="px-5 py-2.5">
                    {o.invoice_id && o.invoices ? (
                      <button onClick={() => onOpenInvoice?.(o.invoice_id!)} disabled={!onOpenInvoice}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-600">
                        {o.invoices.invoice_number} {onOpenInvoice && <ExternalLink className="h-3 w-3" />}
                      </button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`text-lg font-semibold tabular-nums mt-0.5 ${tone ?? 'text-gray-900'}`}>{value}</dd>
    </div>
  );
}

function Row({ label, sub, value, strong }: { label: string; sub?: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
      <span>{label}{sub && <span className="block text-xs font-normal text-gray-500">{sub}</span>}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
