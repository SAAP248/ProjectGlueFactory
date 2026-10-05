import { useMemo } from 'react';
import { AlertTriangle, CalendarClock, CalendarPlus, DollarSign, FileSignature, Radio, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  addDays, computeBalance, daysBetween, formatCents, formatDate, graceState, monthlyEquivalentCents,
  normalizedMonthlyRevenueCents,
} from './lib/domain';
import type { ModuleData } from './useModuleData';
import { Card, PlanChip, StatCard, StatusBadge, planColor } from './ui';

interface Props {
  data: ModuleData;
  today: string;
  onOpen: (id: string) => void;
  onGo: (tab: 'agreements' | 'fulfillment' | 'billing') => void;
}

export default function Dashboard({ data, today, onOpen, onGo }: Props) {
  const { agreements, occurrences, ledger, plans, monitoring } = data;

  const m = useMemo(() => {
    const live = agreements.filter(a => ['active', 'past_due', 'pending_renewal', 'paused'].includes(a.status));
    const pastDue = agreements.filter(a => a.status === 'past_due');
    const failedCents = occurrences.filter(o => o.status === 'failed').reduce((s, o) => s + o.amount_cents, 0);
    const renewals = agreements.filter(a => (a.status === 'active' || a.status === 'pending_renewal') && daysBetween(today, a.end_date) <= 60 && a.end_date >= today);
    const pending = agreements.filter(a => a.status === 'draft' || a.status === 'pending_signature');
    const liveIds = new Set(agreements.filter(a => ['active', 'pending_renewal'].includes(a.status)).map(a => a.id));
    const benefitIds = new Set<string>();
    for (const p of plans) for (const v of p.versions) for (const b of v.sp_benefits) if (b.benefit_type === 'visit') benefitIds.add(b.id);
    let visitsOwed = 0;
    const byKey = new Map<string, typeof ledger>();
    for (const e of ledger) {
      if (!liveIds.has(e.agreement_id) || !benefitIds.has(e.benefit_id)) continue;
      const k = `${e.agreement_id}:${e.benefit_id}`;
      byKey.set(k, [...(byKey.get(k) ?? []), e]);
    }
    for (const entries of byKey.values()) visitsOwed += computeBalance(entries).available;
    const upcoming = occurrences
      .filter(o => o.status === 'scheduled' && o.bill_date >= today && o.bill_date <= addDays(today, 30))
      .sort((a, b) => a.bill_date.localeCompare(b.bill_date));
    const monitoringCents = monitoring.reduce((s, x) => s + x.monthly_cents, 0);
    const mix = plans.map(p => {
      const rows = live.filter(a => a.plan_id === p.id);
      return { plan: p, count: rows.length, mrr: rows.filter(a => a.status !== 'paused').reduce((s, a) => s + monthlyEquivalentCents(a.period_amount_cents, a.cadence), 0) };
    }).filter(x => x.count > 0).sort((a, b) => b.mrr - a.mrr);
    return { live, pastDue, failedCents, renewals, pending, visitsOwed, upcoming, monitoringCents, mix, mrr: normalizedMonthlyRevenueCents(agreements) };
  }, [agreements, occurrences, ledger, plans, monitoring, today]);

  const maxMix = Math.max(1, ...m.mix.map(x => x.mrr));
  const byId = new Map(agreements.map(a => [a.id, a]));
  const attention = [
    ...m.pastDue.map(a => ({ a, why: graceState(a.status, a.grace_until, today) === 'in_grace' ? `In grace until ${formatDate(a.grace_until)}` : 'Grace ended, benefits on hold' })),
    ...m.pending.map(a => ({ a, why: a.status === 'draft' ? 'Draft not sent' : 'Waiting on signature' })),
    ...m.renewals.map(a => ({ a, why: `Ends ${formatDate(a.end_date)}${a.auto_renew ? ', auto-renews' : ', manual renewal'}` })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={ShieldCheck} tone="emerald" label="Live agreements" value={m.live.length} sub={`${agreements.length} total on file`} onClick={() => onGo('agreements')} />
        <StatCard icon={TrendingUp} tone="blue" label="Plan revenue / month" value={formatCents(m.mrr)} sub="All cadences normalized to monthly" />
        <StatCard icon={AlertTriangle} tone="red" label="Past due" value={formatCents(m.failedCents)} sub={`${m.pastDue.length} agreement${m.pastDue.length === 1 ? '' : 's'}`} onClick={() => onGo('billing')} />
        <StatCard icon={CalendarPlus} tone="amber" label="Visits owed" value={m.visitsOwed} sub="Included visits not yet scheduled" onClick={() => onGo('fulfillment')} />
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm">
        <Radio className="h-4 w-4 text-sky-600 flex-shrink-0" />
        <p className="text-sky-900">
          Monitoring subscriptions add <strong className="tabular-nums">{formatCents(m.monitoringCents)}/mo</strong> across {monitoring.length} accounts.
          They are tracked separately and never billed by a service plan.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card title="Needs attention" className="lg:col-span-3">
          {attention.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500 text-center">All caught up.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {attention.map(({ a, why }) => (
                <li key={`${a.id}-${why}`}>
                  <button onClick={() => onOpen(a.id)} className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.companies?.name} <span className="text-gray-400 font-normal">· {a.agreement_number}</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">{why}</p>
                    </div>
                    <PlanChip name={a.sp_plans?.name ?? ''} color={a.sp_plans?.color} />
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Plan mix" className="lg:col-span-2">
          <div className="px-5 py-4 space-y-4">
            {m.mix.length === 0 && <p className="text-sm text-gray-500">No live agreements yet.</p>}
            {m.mix.map(({ plan, count, mrr }) => (
              <div key={plan.id}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-800">{plan.name}</span>
                  <span className="text-gray-500 tabular-nums">{count} · {formatCents(mrr)}/mo</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${planColor(plan.color).solid} transition-all duration-700`} style={{ width: `${(mrr / maxMix) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title={<span className="inline-flex items-center gap-2"><DollarSign className="h-4 w-4 text-gray-400" /> Upcoming charges (30 days)</span>}>
          <ul className="divide-y divide-gray-100">
            {m.upcoming.slice(0, 8).map(o => {
              const a = byId.get(o.agreement_id);
              return (
                <li key={o.id}>
                  <button onClick={() => onOpen(o.agreement_id)} className="w-full flex items-center justify-between gap-3 px-5 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors">
                    <span className="w-24 text-gray-500 flex-shrink-0">{formatDate(o.bill_date)}</span>
                    <span className="flex-1 truncate text-gray-900">{a?.companies?.name}</span>
                    <span className="tabular-nums font-medium">{formatCents(o.amount_cents)}</span>
                  </button>
                </li>
              );
            })}
            {m.upcoming.length === 0 && <li className="px-5 py-6 text-sm text-gray-500">No charges in the next 30 days.</li>}
          </ul>
        </Card>
        <Card title={<span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-gray-400" /> Renewals (60 days)</span>}>
          <ul className="divide-y divide-gray-100">
            {m.renewals.map(a => (
              <li key={a.id}>
                <button onClick={() => onOpen(a.id)} className="w-full flex items-center justify-between gap-3 px-5 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors">
                  <span className="w-24 text-gray-500 flex-shrink-0">{formatDate(a.end_date)}</span>
                  <span className="flex-1 truncate text-gray-900">{a.companies?.name}</span>
                  <span className="text-xs text-gray-500">{daysBetween(today, a.end_date)} days</span>
                </button>
              </li>
            ))}
            {m.renewals.length === 0 && <li className="px-5 py-6 text-sm text-gray-500">No renewals coming up.</li>}
          </ul>
          {m.pending.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <FileSignature className="h-3.5 w-3.5" /> {m.pending.length} agreement{m.pending.length === 1 ? '' : 's'} waiting to be signed
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
