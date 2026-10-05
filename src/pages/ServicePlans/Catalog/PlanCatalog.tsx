import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, ShieldCheck } from 'lucide-react';
import { bpsLabel, formatCents, monthlyEquivalentCents } from '../lib/domain';
import { fetchCatalog } from '../lib/queries';
import type { SpPlan } from '../lib/types';
import { Btn, Empty, ErrorNote, Loading, errorText, planColor } from '../ui';
import PlanBuilder from './PlanBuilder';

export default function PlanCatalog() {
  const [plans, setPlans] = useState<SpPlan[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SpPlan | 'new' | null>(null);
  const [toast, setToast] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    try { setPlans(await fetchCatalog()); setError(''); } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t); }, [toast]);

  const visible = (plans ?? []).filter(p => showArchived || p.status === 'active');
  const archivedCount = (plans ?? []).filter(p => p.status === 'archived').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Annual maintenance plans sold to customers. Changes publish a new version so signed agreements never change.</p>
        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded border-gray-300" /> Show archived ({archivedCount})
            </label>
          )}
          <Btn variant="primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New plan</Btn>
        </div>
      </div>
      <ErrorNote message={error} />
      {!plans ? (!error && <Loading />) : visible.length === 0 ? (
        <Empty icon={ShieldCheck} title="No service plans yet" body="Create your first plan to start selling maintenance agreements." action={<Btn variant="primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New plan</Btn>} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(p => {
            const c = planColor(p.color);
            const v = p.current;
            const annual = v?.sp_price_options.find(o => o.cadence === 'annual');
            const monthly = v?.sp_price_options.find(o => o.cadence === 'monthly');
            return (
              <button key={p.id} onClick={() => setEditing(p)}
                className={`group text-left rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all ${p.status === 'archived' ? 'opacity-60' : ''}`}>
                <div className={`h-1.5 ${c.solid}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5"><span className="font-mono">{p.code}</span> · v{v?.version_number ?? '-'} · <span className="capitalize">{p.category}</span></p>
                    </div>
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg} ${c.text}`}><ShieldCheck className="h-4 w-4" /></span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2 min-h-[2.5rem]">{p.description}</p>
                  <ul className="mt-3 space-y-1">
                    {v?.sp_benefits.slice(0, 4).map(b => (
                      <li key={b.id} className="text-xs text-gray-600 flex gap-1.5"><Check className={`h-3.5 w-3.5 flex-shrink-0 ${c.text}`} />{b.benefit_type === 'perk' ? b.name : `${b.quantity_per_term}x ${b.name}`}</li>
                    ))}
                    {!!v?.labor_discount_bps && <li className="text-xs text-gray-600 flex gap-1.5"><Check className={`h-3.5 w-3.5 ${c.text}`} />{bpsLabel(v.labor_discount_bps)} off labor</li>}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-end justify-between">
                    <div>
                      {annual && <p className="text-xl font-semibold text-gray-900 tabular-nums">{formatCents(annual.amount_cents)}<span className="text-xs font-normal text-gray-500"> / yr</span></p>}
                      {monthly && <p className="text-xs text-gray-500 tabular-nums">or {formatCents(monthlyEquivalentCents(monthly.amount_cents, 'monthly'))}/mo</p>}
                    </div>
                    <span className="text-xs text-gray-400">{v?.sp_price_options.length ?? 0} billing options</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <PlanBuilder plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async msg => { setEditing(null); setToast(msg); await load(); }} />
      )}
      {toast && <div className="fixed bottom-6 right-6 z-[60] animate-fade-in rounded-xl bg-gray-900 text-white text-sm px-4 py-3 shadow-lg max-w-md">{toast}</div>}
    </div>
  );
}
