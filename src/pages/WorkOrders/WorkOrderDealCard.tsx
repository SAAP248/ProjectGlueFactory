import { Briefcase, ArrowUpRight, BadgeDollarSign, CalendarDays } from 'lucide-react';
import { useDealAccounting } from '../../lib/useDealAccounting';
import { formatMoney, formatShortDate, formatHours } from '../../lib/jobCosting';

interface Props {
  dealId: string;
  onOpenDeal?: (dealId: string) => void;
}

export default function WorkOrderDealCard({ dealId, onOpenDeal }: Props) {
  const { data: a, loading, error } = useDealAccounting(dealId);

  return (
    <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-blue-100 bg-blue-50/60 flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg border border-blue-100"><Briefcase className="h-4 w-4 text-blue-600" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Linked Deal</p>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{a?.deal.title ?? (loading ? 'Loading...' : 'Deal')}</h3>
        </div>
        {onOpenDeal && (
          <button
            onClick={() => onOpenDeal(dealId)}
            className="flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            Open deal <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <p className="px-6 py-4 text-sm text-red-600">We couldn't load the deal's numbers.</p>}

      {a && (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-gray-500">Sale price</p>
              <p className="text-base font-bold text-gray-900">{formatMoney(a.soldFor)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Job labor ({formatHours(a.laborMinutes)})</p>
              <p className="text-base font-bold text-gray-900">{formatMoney(a.laborCost)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Job products</p>
              <p className="text-base font-bold text-gray-900">{formatMoney(a.productCost)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Job profit</p>
              <p className={`text-base font-bold ${a.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatMoney(a.netProfit)} <span className="text-xs font-semibold">({a.marginPct.toFixed(1)}%)</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 border-t border-gray-100 text-sm">
            <span className="flex items-center gap-1.5 text-gray-600">
              <BadgeDollarSign className="h-4 w-4 text-amber-500" />
              Commission <span className="font-semibold text-gray-900">{formatMoney(a.commission)}</span>
              {a.deal.assigned_employee && <span className="text-gray-400">· {a.deal.assigned_employee.first_name} {a.deal.assigned_employee.last_name}</span>}
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              Payroll date <span className="font-semibold text-gray-900">{a.deal.commission_payroll_date ? formatShortDate(a.deal.commission_payroll_date) : 'Not set'}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
