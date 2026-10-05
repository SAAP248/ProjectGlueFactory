import { useMemo, useState } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import { CADENCE_LABELS, formatCents, formatDate, monthlyEquivalentCents, type AgreementStatus } from './lib/domain';
import type { SpAgreement, SpPlan } from './lib/types';
import { Btn, Empty, PlanChip, STATUS_META, StatusBadge, inputCls } from './ui';

interface Props {
  agreements: SpAgreement[];
  plans: SpPlan[];
  onOpen: (id: string) => void;
  onNew: () => void;
  compact?: boolean;
}

export default function AgreementsList({ agreements, plans, onOpen, onNew, compact }: Props) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<AgreementStatus | 'all'>('all');
  const [planId, setPlanId] = useState('all');

  const counts = useMemo(() => {
    const c = new Map<AgreementStatus, number>();
    for (const a of agreements) c.set(a.status, (c.get(a.status) ?? 0) + 1);
    return c;
  }, [agreements]);

  const rows = agreements.filter(a => {
    if (status !== 'all' && a.status !== status) return false;
    if (planId !== 'all' && a.plan_id !== planId) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [a.agreement_number, a.companies?.name, a.sites?.name, a.sp_plans?.name].some(v => v?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search customer, site, plan or number" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-52`} value={planId} onChange={e => setPlanId(e.target.value)}>
            <option value="all">All plans</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      {!compact && (
        <div className="flex flex-wrap gap-1.5">
          <Chip active={status === 'all'} onClick={() => setStatus('all')} label="All" count={agreements.length} />
          {(Object.keys(STATUS_META) as AgreementStatus[]).filter(s => counts.get(s)).map(s => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)} label={STATUS_META[s].label} count={counts.get(s) ?? 0} />
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {rows.length === 0 ? (
          <Empty icon={FileText} title={agreements.length ? 'No agreements match' : 'No service plans yet'}
            body={agreements.length ? 'Try a different search or filter.' : 'Enroll a customer to start a service plan.'}
            action={<Btn variant="primary" onClick={onNew}><Plus className="h-4 w-4" /> New agreement</Btn>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Agreement</th>
                  {!compact && <th className="px-5 py-3 font-medium">Customer</th>}
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Billing</th>
                  <th className="px-5 py-3 font-medium text-right">Monthly equiv.</th>
                  <th className="px-5 py-3 font-medium">Term ends</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(a => (
                  <tr key={a.id} onClick={() => onOpen(a.id)} className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{a.agreement_number}</p>
                      {compact && a.sites && <p className="text-xs text-gray-500">{a.sites.name}</p>}
                    </td>
                    {!compact && (
                      <td className="px-5 py-3">
                        <p className="text-gray-900">{a.companies?.name}</p>
                        <p className="text-xs text-gray-500">{a.sites?.name}</p>
                      </td>
                    )}
                    <td className="px-5 py-3"><PlanChip name={a.sp_plans?.name ?? ''} color={a.sp_plans?.color} /></td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="tabular-nums text-gray-900">{formatCents(a.period_amount_cents)}</span>
                      <span className="text-gray-500"> / {CADENCE_LABELS[a.cadence].toLowerCase()}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-700">{formatCents(monthlyEquivalentCents(a.period_amount_cents, a.cadence))}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatDate(a.end_date)}</td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
      {label} <span className={`tabular-nums ${active ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
    </button>
  );
}
