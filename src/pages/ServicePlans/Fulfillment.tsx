import { useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, ClipboardCheck, Clock, XCircle } from 'lucide-react';
import { benefitsUsable, computeBalance, formatDate } from './lib/domain';
import { cancelVisit, completeVisit } from './lib/fulfillment';
import { fetchAgreementDetail } from './lib/queries';
import type { AgreementDetail, SpBenefit } from './lib/types';
import { ScheduleVisitModal } from './AgreementDetail/ActionModals';
import { benefitsById, type ModuleData } from './useModuleData';
import { Btn, Card, Empty, ErrorNote, PlanChip, errorText } from './ui';

interface Props {
  data: ModuleData;
  today: string;
  onOpen: (id: string) => void;
  onChanged: (message: string) => void;
}

export default function Fulfillment({ data, today, onOpen, onChanged }: Props) {
  const [scheduling, setScheduling] = useState<{ detail: AgreementDetail; benefit: SpBenefit } | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const benefits = useMemo(() => benefitsById(data.plans), [data.plans]);
  const agreementsById = useMemo(() => new Map(data.agreements.map(a => [a.id, a])), [data.agreements]);

  const { owed, open } = useMemo(() => {
    const groups = new Map<string, typeof data.ledger>();
    for (const e of data.ledger) {
      const k = `${e.agreement_id}|${e.benefit_id}`;
      groups.set(k, [...(groups.get(k) ?? []), e]);
    }
    const owedRows: { agreementId: string; benefit: SpBenefit; available: number; usable: boolean }[] = [];
    for (const [k, entries] of groups) {
      const [agreementId, benefitId] = k.split('|');
      const a = agreementsById.get(agreementId);
      const b = benefits.get(benefitId);
      if (!a || !b || b.benefit_type !== 'visit') continue;
      if (!['active', 'pending_renewal', 'past_due'].includes(a.status)) continue;
      const available = computeBalance(entries).available;
      if (available > 0) owedRows.push({ agreementId, benefit: b, available, usable: benefitsUsable(a.status, a.grace_until, today) });
    }
    const settled = new Set(data.ledger.filter(e => e.entry_type === 'consume' || e.entry_type === 'release').map(e => e.work_order_id));
    const openRows = data.ledger
      .filter(e => e.entry_type === 'reserve' && e.work_order_id && !settled.has(e.work_order_id))
      .sort((x, y) => (x.work_orders?.scheduled_date ?? '').localeCompare(y.work_orders?.scheduled_date ?? ''));
    return { owed: owedRows, open: openRows };
  }, [data.ledger, agreementsById, benefits, today]);

  async function startSchedule(agreementId: string, benefit: SpBenefit) {
    setBusy(`s:${agreementId}:${benefit.id}`);
    setError('');
    try {
      setScheduling({ detail: await fetchAgreementDetail(agreementId), benefit });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  }

  async function settle(kind: 'complete' | 'cancel', agreementId: string, woId: string, woNumber: string) {
    setBusy(`${kind}:${woId}`);
    setError('');
    try {
      if (kind === 'complete') await completeVisit(agreementId, woId, woNumber, today);
      else await cancelVisit(agreementId, woId, woNumber, today);
      onChanged(kind === 'complete' ? `${woNumber} completed. Allowance used.` : `${woNumber} canceled. Allowance returned.`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-6">
      <ErrorNote message={error} />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title={<span className="inline-flex items-center gap-2"><CalendarPlus className="h-4 w-4 text-amber-500" /> Visits to schedule <span className="text-gray-400 font-normal">({owed.reduce((s, r) => s + r.available, 0)})</span></span>}>
          {owed.length === 0 ? (
            <Empty icon={ClipboardCheck} title="Every included visit is booked" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {owed.map(r => {
                const a = agreementsById.get(r.agreementId)!;
                return (
                  <li key={`${r.agreementId}${r.benefit.id}`} className="flex items-center gap-3 px-5 py-3">
                    <button onClick={() => onOpen(a.id)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">{a.companies?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{r.benefit.name} · {r.available} left · {a.sites?.name}</p>
                    </button>
                    <PlanChip name={a.sp_plans?.name ?? ''} color={a.sp_plans?.color} />
                    <Btn className="!py-1.5 !px-3 text-xs" disabled={!r.usable} busy={busy === `s:${a.id}:${r.benefit.id}`}
                      onClick={() => startSchedule(a.id, r.benefit)}>
                      {r.usable ? 'Schedule' : 'On hold'}
                    </Btn>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={<span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /> Booked plan visits <span className="text-gray-400 font-normal">({open.length})</span></span>}>
          {open.length === 0 ? (
            <Empty icon={Clock} title="No plan visits booked" body="Schedule a visit from the list on the left." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {open.map(e => {
                const a = agreementsById.get(e.agreement_id);
                const wo = e.work_orders;
                const late = wo?.scheduled_date ? wo.scheduled_date < today : false;
                return (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-12 text-center rounded-lg py-1 flex-shrink-0 ${late ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                      <p className="text-[10px] uppercase font-semibold">{formatDate(wo?.scheduled_date).split(' ')[0]}</p>
                      <p className="text-sm font-semibold leading-none">{wo?.scheduled_date?.slice(8, 10)}</p>
                    </div>
                    <button onClick={() => a && onOpen(a.id)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 truncate">{a?.companies?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{wo?.wo_number} · {benefits.get(e.benefit_id)?.name} · {wo?.status}</p>
                    </button>
                    <button title="Mark complete" disabled={!!busy} onClick={() => settle('complete', e.agreement_id, e.work_order_id!, wo?.wo_number ?? '')}
                      className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button title="Cancel visit" disabled={!!busy} onClick={() => settle('cancel', e.agreement_id, e.work_order_id!, wo?.wo_number ?? '')}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {scheduling && (
        <ScheduleVisitModal
          detail={scheduling.detail}
          benefit={scheduling.benefit}
          today={today}
          onClose={() => setScheduling(null)}
          onDone={msg => { setScheduling(null); onChanged(msg); }}
        />
      )}
    </div>
  );
}
