import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { benefitsUsable, bpsLabel, type AgreementStatus } from './lib/domain';
import { companyDate, fetchSettings } from './lib/queries';

interface Coverage {
  agreementNumber: string;
  planName: string;
  usable: boolean;
  benefitName: string | null;
  perks: string[];
}

export default function PlanCoverageBanner({ workOrderId }: { workOrderId: string }) {
  const [coverage, setCoverage] = useState<Coverage | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: wo } = await supabase.from('work_orders').select('sp_agreement_id').eq('id', workOrderId).maybeSingle();
      if (!wo?.sp_agreement_id) return;
      const [agreementRes, ledgerRes, settings] = await Promise.all([
        supabase.from('sp_agreements')
          .select('agreement_number, status, grace_until, sp_plans(name), sp_plan_versions(labor_discount_bps, parts_discount_bps, priority_service, waive_trip_fee)')
          .eq('id', wo.sp_agreement_id).maybeSingle(),
        supabase.from('sp_entitlement_ledger').select('sp_benefits(name)').eq('work_order_id', workOrderId).limit(1).maybeSingle(),
        fetchSettings().catch(() => null),
      ]);
      const a = agreementRes.data as unknown as {
        agreement_number: string; status: AgreementStatus; grace_until: string | null;
        sp_plans: { name: string } | null;
        sp_plan_versions: { labor_discount_bps: number; parts_discount_bps: number; priority_service: boolean; waive_trip_fee: boolean } | null;
      } | null;
      if (!alive || !a) return;
      const v = a.sp_plan_versions;
      const perks = [
        v?.labor_discount_bps ? `${bpsLabel(v.labor_discount_bps)} off labor` : '',
        v?.parts_discount_bps ? `${bpsLabel(v.parts_discount_bps)} off parts` : '',
        v?.priority_service ? 'Priority customer' : '',
        v?.waive_trip_fee ? 'No trip fee' : '',
      ].filter(Boolean);
      const benefit = (ledgerRes.data as unknown as { sp_benefits: { name: string } | null } | null)?.sp_benefits?.name ?? null;
      setCoverage({
        agreementNumber: a.agreement_number,
        planName: a.sp_plans?.name ?? 'Service plan',
        usable: benefitsUsable(a.status, a.grace_until, companyDate(settings)),
        benefitName: benefit,
        perks,
      });
    })();
    return () => { alive = false; };
  }, [workOrderId]);

  if (!coverage) return null;
  const Icon = coverage.usable ? ShieldCheck : ShieldAlert;
  return (
    <div className={`rounded-2xl border p-4 ${coverage.usable ? 'bg-sky-50 border-sky-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${coverage.usable ? 'text-sky-600' : 'text-amber-600'}`} />
        <p className={`text-sm font-semibold ${coverage.usable ? 'text-sky-900' : 'text-amber-900'}`}>
          {coverage.usable ? `Covered by ${coverage.planName}` : `${coverage.planName} is on hold`}
        </p>
        <span className="ml-auto text-xs font-mono text-gray-500">{coverage.agreementNumber}</span>
      </div>
      {coverage.usable ? (
        <>
          {coverage.benefitName && <p className="text-sm text-sky-800 mt-1">This visit is the customer's included {coverage.benefitName.toLowerCase()}.</p>}
          {coverage.perks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {coverage.perks.map(p => <span key={p} className="text-xs font-medium bg-white text-sky-700 rounded-md px-2 py-0.5 ring-1 ring-inset ring-sky-200">{p}</span>)}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-amber-800 mt-1">The plan payment is overdue. Check with the office before applying plan discounts.</p>
      )}
    </div>
  );
}
