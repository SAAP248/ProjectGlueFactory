import { Check, Sparkles } from 'lucide-react';
import { CADENCES, CADENCE_LABELS, bpsLabel, formatCents, monthlyEquivalentCents, savingsVsMonthlyCents, type Cadence } from '../lib/domain';
import type { SpPlan } from '../lib/types';
import { planColor } from '../ui';
import { priceFor, priceMap } from './types';

interface Props {
  plans: SpPlan[];
  planId: string;
  cadence: Cadence;
  onPlan: (id: string) => void;
  onCadence: (c: Cadence) => void;
}

export default function StepPlan({ plans, planId, cadence, onPlan, onCadence }: Props) {
  const plan = plans.find(p => p.id === planId);
  const prices = priceMap(plan);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-gray-900">Choose a plan</h2>
        <p className="text-sm text-gray-500 mt-1">Every plan is an annual agreement. The customer can pay it all at once or split it up.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {plans.filter(p => p.status === 'active' && p.current).map(p => {
          const c = planColor(p.color);
          const active = p.id === planId;
          const v = p.current!;
          const annual = priceFor(p, 'annual');
          return (
            <button key={p.id} onClick={() => onPlan(p.id)}
              className={`relative text-left rounded-xl border bg-white p-4 transition-all ${active ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
              <span className={`absolute top-0 left-4 right-4 h-1 rounded-b ${c.solid}`} />
              <div className="flex items-start justify-between gap-2 mt-1">
                <div>
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{p.category} · v{v.version_number}</p>
                </div>
                {active && <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></span>}
              </div>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.description}</p>
              <ul className="mt-3 space-y-1">
                {v.sp_benefits.slice(0, 3).map(b => (
                  <li key={b.id} className="text-xs text-gray-600 flex gap-1.5"><Check className={`h-3.5 w-3.5 ${c.text}`} />{b.benefit_type === 'perk' ? b.name : `${b.quantity_per_term}x ${b.name}`}</li>
                ))}
                {v.labor_discount_bps > 0 && <li className="text-xs text-gray-600 flex gap-1.5"><Check className={`h-3.5 w-3.5 ${c.text}`} />{bpsLabel(v.labor_discount_bps)} off labor</li>}
              </ul>
              {annual != null && <p className="mt-3 text-lg font-semibold text-gray-900 tabular-nums">{formatCents(annual)}<span className="text-xs font-normal text-gray-500"> / year</span></p>}
            </button>
          );
        })}
      </div>

      {plan && (
        <div className="animate-fade-in">
          <p className="text-sm font-medium text-gray-700 mb-2">How should it be billed?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CADENCES.map(cd => {
              const amount = prices[cd];
              if (amount == null) return null;
              const savings = savingsVsMonthlyCents(prices, cd);
              const active = cd === cadence;
              return (
                <button key={cd} onClick={() => onCadence(cd)}
                  className={`rounded-xl border p-3 text-left transition-all ${active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <p className="text-xs font-medium text-gray-500">{CADENCE_LABELS[cd]}</p>
                  <p className="text-base font-semibold text-gray-900 tabular-nums mt-0.5">{formatCents(amount)}</p>
                  <p className="text-xs text-gray-500 tabular-nums">{formatCents(monthlyEquivalentCents(amount, cd))}/mo</p>
                  {savings > 0 && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">
                      <Sparkles className="h-3 w-3" /> Save {formatCents(savings)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
