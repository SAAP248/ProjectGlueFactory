import { useState } from 'react';
import { Layers, ChevronRight } from 'lucide-react';
import { useConsolidatedList, summarize } from '../Invoices/consolidated';
import { formatCurrency, formatDate, StatusPill } from '../Invoices/invoiceFormat';

interface Props {
  companyId: string;
  onOpenInvoice?: (invoiceId: string) => void;
}

export default function ConsolidatedInvoicesSection({ companyId, onOpenInvoice }: Props) {
  const { items, loading } = useConsolidatedList([companyId]);
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading || items.length === 0) return null;

  return (
    <div className="px-6 pt-5 pb-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Consolidated Invoices</p>
      <div className="space-y-2">
        {items.map((ci) => {
          const s = summarize(ci);
          const pct = s.total > 0 ? Math.round((s.paid / s.total) * 100) : 0;
          const isOpen = openId === ci.id;
          return (
            <div key={ci.id} className="rounded-xl border border-teal-100 bg-teal-50/30 overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : ci.id)}
                className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left hover:bg-teal-50/70 transition-colors"
              >
                <ChevronRight className={`h-4 w-4 text-teal-600 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                <Layers className="h-4 w-4 text-teal-600" />
                <span className="font-mono text-sm font-semibold text-teal-800">{ci.consolidated_number}</span>
                <span className="text-xs text-gray-500">
                  {s.count} invoices - Due {formatDate(ci.due_date)}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="hidden sm:block w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    {s.paidCount}/{s.count} paid
                  </span>
                  <span className="text-sm font-bold text-gray-900 w-24 text-right">{formatCurrency(s.balance)}</span>
                  <StatusPill status={s.status} />
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-teal-100 bg-white divide-y divide-gray-50">
                  {ci.invoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => onOpenInvoice?.(inv.id)}
                      className="w-full flex items-center gap-3 pl-14 pr-4 py-2.5 text-left hover:bg-blue-50/40 transition-colors"
                    >
                      <span className="font-mono text-sm font-semibold text-blue-700 w-24">{inv.invoice_number}</span>
                      <span className="flex-1 min-w-0 text-sm text-gray-600 truncate">
                        {inv.notes || '-'}
                        {inv.company_id !== ci.company_id && (
                          <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                            {inv.companies?.name}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(inv.balance_due))}</span>
                      <StatusPill status={inv.status} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
