import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, ExternalLink, Play, RefreshCw } from 'lucide-react';
import { addDays, formatCents, formatDate } from './lib/domain';
import { retryFailedPayments, runBilling } from './lib/billing';
import type { OccurrenceStatus, SpSettings } from './lib/types';
import type { ModuleData } from './useModuleData';
import { Btn, Card, ErrorNote, OccurrenceBadge, StatCard, errorText } from './ui';

type View = 'due' | 'upcoming' | 'failed' | 'paid' | 'all';

interface Props {
  data: ModuleData;
  settings: SpSettings;
  today: string;
  onOpen: (id: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onChanged: (message: string) => void;
}

export default function BillingView({ data, settings, today, onOpen, onOpenInvoice, onChanged }: Props) {
  const [view, setView] = useState<View>('due');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const agreements = useMemo(() => new Map(data.agreements.map(a => [a.id, a])), [data.agreements]);
  const buckets = useMemo(() => {
    const billable = new Set(['active', 'past_due', 'pending_renewal']);
    const occ = data.occurrences;
    const isDue = (o: typeof occ[number]) => o.status === 'scheduled' && o.bill_date <= today && billable.has(agreements.get(o.agreement_id)?.status ?? '');
    return {
      due: occ.filter(isDue),
      upcoming: occ.filter(o => o.status === 'scheduled' && o.bill_date > today),
      failed: occ.filter(o => o.status === 'failed'),
      paid: occ.filter(o => o.status === 'paid').reverse(),
      all: occ,
    };
  }, [data.occurrences, agreements, today]);

  const next30 = buckets.upcoming.filter(o => o.bill_date <= addDays(today, 30)).reduce((s, o) => s + o.amount_cents, 0);
  const collectedMonth = buckets.paid.filter(o => o.last_attempt_on?.slice(0, 7) === today.slice(0, 7)).reduce((s, o) => s + o.amount_cents, 0);

  async function run() {
    setBusy('run'); setError('');
    try {
      const r = await runBilling(today, settings);
      onChanged(r.invoiced === 0 ? 'Nothing due to bill today.' : `${r.invoiced} invoiced, ${r.paid} paid, ${r.failed} declined.${r.errors.length ? ` ${r.errors.length} error(s).` : ''}`);
    } catch (e) { setError(errorText(e)); } finally { setBusy(''); }
  }

  async function retry(agreementId: string) {
    const a = agreements.get(agreementId);
    if (!a) return;
    setBusy(`retry:${agreementId}`); setError('');
    try {
      const r = await retryFailedPayments(a, today);
      onChanged(r.stillFailing ? `${a.agreement_number}: card still declined.` : `${a.agreement_number}: collected ${r.recovered} charge${r.recovered === 1 ? '' : 's'}.`);
    } catch (e) { setError(errorText(e)); } finally { setBusy(''); }
  }

  const rows = buckets[view];
  const views: { id: View; label: string }[] = [
    { id: 'due', label: `Due now (${buckets.due.length})` },
    { id: 'failed', label: `Failed (${buckets.failed.length})` },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'paid', label: 'Paid' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Clock} tone="blue" label="Due to bill" value={formatCents(buckets.due.reduce((s, o) => s + o.amount_cents, 0))} sub={`${buckets.due.length} charges`} />
        <StatCard icon={AlertTriangle} tone="red" label="Failed" value={formatCents(buckets.failed.reduce((s, o) => s + o.amount_cents, 0))} sub={`${buckets.failed.length} charges`} />
        <StatCard icon={CalendarClock} tone="sky" label="Next 30 days" value={formatCents(next30)} />
        <StatCard icon={CheckCircle2} tone="emerald" label="Collected this month" value={formatCents(collectedMonth)} />
      </div>

      <ErrorNote message={error} />

      <Card
        title={
          <div className="flex gap-1">
            {views.map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {v.label}
              </button>
            ))}
          </div>
        }
        action={<Btn variant="primary" busy={busy === 'run'} disabled={buckets.due.length === 0} onClick={run} className="!py-1.5 text-xs"><Play className="h-3.5 w-3.5" /> Run billing</Btn>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-5 py-2.5 font-medium">Bill date</th>
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <th className="px-5 py-2.5 font-medium">Period</th>
                <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Invoice</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-500">Nothing here.</td></tr>}
              {rows.slice(0, 200).map(o => {
                const a = agreements.get(o.agreement_id);
                return (
                  <tr key={o.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-2.5 whitespace-nowrap">{formatDate(o.bill_date)}</td>
                    <td className="px-5 py-2.5">
                      <button onClick={() => onOpen(o.agreement_id)} className="text-left hover:text-blue-600 transition-colors">
                        <span className="font-medium text-gray-900">{a?.companies?.name}</span>
                        <span className="block text-xs text-gray-500">{a?.agreement_number} · {a?.sp_plans?.name}</span>
                      </button>
                    </td>
                    <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(o.period_start)} – {formatDate(o.period_end)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-medium">{formatCents(o.amount_cents)}</td>
                    <td className="px-5 py-2.5">
                      <OccurrenceBadge status={o.status as OccurrenceStatus} />
                      {o.status === 'failed' && <span className="block text-xs text-red-600 mt-0.5">{o.failure_reason}</span>}
                    </td>
                    <td className="px-5 py-2.5">
                      {o.invoice_id && o.invoices ? (
                        <button onClick={() => onOpenInvoice?.(o.invoice_id!)} disabled={!onOpenInvoice}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-600">
                          {o.invoices.invoice_number}{onOpenInvoice && <ExternalLink className="h-3 w-3" />}
                        </button>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {o.status === 'failed' && (
                        <Btn className="!py-1 !px-2.5 text-xs" busy={busy === `retry:${o.agreement_id}`} onClick={() => retry(o.agreement_id)}>
                          <RefreshCw className="h-3 w-3" /> Retry
                        </Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
