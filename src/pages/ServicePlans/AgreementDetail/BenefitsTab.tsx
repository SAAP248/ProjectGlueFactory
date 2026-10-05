import { CalendarPlus, CheckCircle2, Clock, Headphones, MinusCircle, PlusCircle, Sparkles, Wrench, XCircle } from 'lucide-react';
import { benefitsUsable, computeBalance, formatCents, formatDate, type LedgerEntryType } from '../lib/domain';
import type { AgreementDetail, SpBenefit } from '../lib/types';
import { Btn, Card } from '../ui';

const ENTRY_LABEL: Record<LedgerEntryType, { label: string; cls: string }> = {
  grant: { label: 'Granted', cls: 'text-emerald-700' },
  rollover: { label: 'Rolled over', cls: 'text-teal-700' },
  adjust: { label: 'Adjusted', cls: 'text-blue-700' },
  reserve: { label: 'Reserved', cls: 'text-amber-700' },
  release: { label: 'Released', cls: 'text-gray-600' },
  consume: { label: 'Used', cls: 'text-gray-900' },
  expire: { label: 'Expired', cls: 'text-red-600' },
};

const TYPE_ICON = { visit: Wrench, remote: Headphones, perk: Sparkles };

interface Props {
  detail: AgreementDetail;
  today: string;
  onSchedule: (b: SpBenefit) => void;
  onRemote: (b: SpBenefit) => void;
  onAdjust: (b: SpBenefit) => void;
  onCompleteVisit: (workOrderId: string, woNumber: string) => void;
  onCancelVisit: (workOrderId: string, woNumber: string) => void;
}

export default function BenefitsTab({ detail, today, onSchedule, onRemote, onAdjust, onCompleteVisit, onCancelVisit }: Props) {
  const { agreement, benefits, ledger } = detail;
  const usable = benefitsUsable(agreement.status, agreement.grace_until, today);
  const v = agreement.sp_plan_versions;
  const settled = new Set(ledger.filter(e => e.entry_type === 'consume' || e.entry_type === 'release').map(e => e.work_order_id));
  const openVisits = ledger.filter(e => e.entry_type === 'reserve' && e.work_order_id && !settled.has(e.work_order_id));

  return (
    <div className="space-y-6">
      {!usable && agreement.status !== 'canceled' && agreement.status !== 'expired' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Benefits are on hold while this agreement is {agreement.status.replace('_', ' ')}.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {benefits.map(b => {
          const bal = computeBalance(ledger.filter(e => e.benefit_id === b.id));
          const total = bal.granted + bal.rolledOver + bal.adjusted;
          const pctUsed = total > 0 ? Math.min(100, ((bal.consumed + bal.reserved) / total) * 100) : 0;
          const Icon = TYPE_ICON[b.benefit_type];
          return (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.quantity_per_term} per term · {b.duration_minutes} min · overage {formatCents(b.overage_price_cents)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">{bal.available}</p>
                  <p className="text-xs text-gray-500 mt-1">left</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pctUsed}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>{bal.granted} granted</span>
                {bal.rolledOver > 0 && <span className="text-teal-700">+{bal.rolledOver} rolled over</span>}
                {bal.adjusted !== 0 && <span className="text-blue-700">{bal.adjusted > 0 ? '+' : ''}{bal.adjusted} adjusted</span>}
                <span>{bal.consumed} used</span>
                {bal.reserved > 0 && <span className="text-amber-700">{bal.reserved} reserved</span>}
                {bal.expired > 0 && <span className="text-red-600">{bal.expired} expired</span>}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                {b.benefit_type === 'remote' ? (
                  <Btn variant="secondary" disabled={!usable || bal.available <= 0} onClick={() => onRemote(b)} className="!py-1.5 !px-3 text-xs">
                    <Headphones className="h-3.5 w-3.5" /> Log session
                  </Btn>
                ) : (
                  <Btn variant="secondary" disabled={!usable} onClick={() => onSchedule(b)} className="!py-1.5 !px-3 text-xs">
                    <CalendarPlus className="h-3.5 w-3.5" /> Schedule visit
                  </Btn>
                )}
                <Btn variant="ghost" onClick={() => onAdjust(b)} className="!py-1.5 !px-3 text-xs">Adjust</Btn>
              </div>
            </div>
          );
        })}
      </div>

      {v && (
        <Card title="Member pricing">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 text-sm">
            <Perk label="Labor discount" value={`${v.labor_discount_bps / 100}%`} />
            <Perk label="Parts discount" value={`${v.parts_discount_bps / 100}%`} />
            <Perk label="Priority service" value={v.priority_service ? 'Yes' : 'No'} />
            <Perk label="Trip fee" value={v.waive_trip_fee ? 'Waived' : 'Standard'} />
          </div>
          <p className="px-5 pb-4 text-xs text-gray-500">Discounts never stack. A manual override wins; otherwise the larger of plan or promotion applies.</p>
        </Card>
      )}

      {openVisits.length > 0 && (
        <Card title="Scheduled plan visits">
          <ul className="divide-y divide-gray-100">
            {openVisits.map(e => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {e.work_orders?.wo_number} · {benefits.find(b => b.id === e.benefit_id)?.name}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(e.work_orders?.scheduled_date)} · {e.work_orders?.status}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => onCompleteVisit(e.work_order_id!, e.work_orders?.wo_number ?? '')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                  </button>
                  <button onClick={() => onCancelVisit(e.work_order_id!, e.work_orders?.wo_number ?? '')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                    <XCircle className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Allowance ledger">
        {ledger.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No allowance activity yet. Benefits are granted when the agreement is signed.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 font-medium">Benefit</th>
                  <th className="px-5 py-2.5 font-medium">Entry</th>
                  <th className="px-5 py-2.5 font-medium text-right">Qty</th>
                  <th className="px-5 py-2.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...ledger].reverse().map(e => {
                  const m = ENTRY_LABEL[e.entry_type];
                  const negative = ['reserve', 'consume', 'expire'].includes(e.entry_type) || e.quantity < 0;
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(e.created_at.slice(0, 10))}</td>
                      <td className="px-5 py-2.5 text-gray-900">{benefits.find(b => b.id === e.benefit_id)?.name ?? 'Benefit'}</td>
                      <td className={`px-5 py-2.5 font-medium ${m.cls}`}>{m.label}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          {negative ? <MinusCircle className="h-3 w-3 text-gray-400" /> : <PlusCircle className="h-3 w-3 text-emerald-500" />}
                          {Math.abs(e.quantity)}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-gray-500">{e.work_orders?.wo_number ? `${e.work_orders.wo_number} · ` : ''}{e.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Perk({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
