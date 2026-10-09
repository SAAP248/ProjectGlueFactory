import { Fragment } from 'react';
import { ChevronRight, Layers, Check } from 'lucide-react';
import type { Invoice } from './useInvoices';
import type { ConsolidatedInvoice, ConsolidatedSummary } from './consolidated';
import { formatCurrency, formatDate, StatusPill } from './invoiceFormat';

export type ListRow =
  | { kind: 'ci'; ci: ConsolidatedInvoice; summary: ConsolidatedSummary; matched: Set<string> }
  | { kind: 'inv'; inv: Invoice };

interface Props {
  rows: ListRow[];
  ciNumbers: Map<string, string>;
  expanded: Set<string>;
  selected: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (inv: Invoice) => void;
  onOpenInvoice: (id: string) => void;
  onOpenConsolidated: (id: string) => void;
}

function isOverdue(due: string | null, balance: number, status: string) {
  return status !== 'paid' && status !== 'void' && !!due && new Date(due) < new Date() && balance > 0;
}

export function isSelectable(inv: Invoice) {
  return !inv.consolidated_invoice_id && inv.status !== 'paid' && inv.status !== 'void';
}

function Checkbox({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
        on ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white hover:border-blue-500'
      }`}
    >
      {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </button>
  );
}

const TH = 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider';

export default function InvoiceListTable({
  rows,
  ciNumbers,
  expanded,
  selected,
  onToggleExpand,
  onToggleSelect,
  onOpenInvoice,
  onOpenConsolidated,
}: Props) {
  const invoiceRow = (inv: Invoice, child: { ciCompanyId: string | null; highlight: boolean } | null) => {
    const balance = Number(inv.balance_due) || 0;
    const overdue = isOverdue(inv.due_date, balance, inv.status);
    const parentNumber = inv.consolidated_invoice_id ? ciNumbers.get(inv.consolidated_invoice_id) : null;
    const isSub = child && inv.company_id !== child.ciCompanyId;

    return (
      <tr
        key={inv.id}
        onClick={() => onOpenInvoice(inv.id)}
        className={`cursor-pointer transition-colors ${
          child
            ? child.highlight
              ? 'bg-amber-50/70 hover:bg-amber-50'
              : 'bg-slate-50/60 hover:bg-blue-50/40'
            : overdue
              ? 'bg-red-50/30 hover:bg-blue-50/40'
              : 'hover:bg-blue-50/40'
        }`}
      >
        <td className="pl-5 pr-2 py-3.5 w-10">
          {!child && isSelectable(inv) && (
            <Checkbox on={selected.has(inv.id)} onClick={() => onToggleSelect(inv)} />
          )}
        </td>
        <td className="px-4 py-3.5">
          <div className={`flex items-center gap-2 ${child ? 'pl-6 border-l-2 border-teal-200 ml-1' : ''}`}>
            <span className="font-mono text-sm font-semibold text-blue-700">{inv.invoice_number}</span>
            {!child && parentNumber && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenConsolidated(inv.consolidated_invoice_id!);
                }}
                className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 whitespace-nowrap"
              >
                Part of {parentNumber}
              </button>
            )}
          </div>
        </td>
        <td className="px-4 py-3.5 text-sm text-gray-900">
          {child ? (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="truncate max-w-[220px]">{inv.notes || '-'}</span>
              {isSub && (
                <span className="shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                  {inv.companies?.name}
                </span>
              )}
            </div>
          ) : (
            <span className="font-medium">{inv.companies?.name || 'Unknown'}</span>
          )}
        </td>
        <td className="px-4 py-3.5 text-sm text-gray-600">{formatDate(inv.invoice_date)}</td>
        <td className={`px-4 py-3.5 text-sm ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
          {formatDate(inv.due_date)}
        </td>
        <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 text-right">{formatCurrency(Number(inv.total))}</td>
        <td className="px-4 py-3.5 text-sm text-emerald-600 font-medium text-right">
          {formatCurrency(Number(inv.amount_paid))}
        </td>
        <td className="px-4 py-3.5 text-sm font-bold text-gray-900 text-right">{formatCurrency(balance)}</td>
        <td className="px-4 py-3.5">
          <StatusPill status={inv.status} />
        </td>
        <td className="px-4 py-3.5 text-right">
          <ChevronRight className="h-4 w-4 text-gray-300 inline" />
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50/80 border-b border-gray-100">
          <tr>
            <th className="w-10" />
            <th className={`${TH} text-left`}>Invoice #</th>
            <th className={`${TH} text-left`}>Customer</th>
            <th className={`${TH} text-left`}>Date</th>
            <th className={`${TH} text-left`}>Due Date</th>
            <th className={`${TH} text-right`}>Total</th>
            <th className={`${TH} text-right`}>Paid</th>
            <th className={`${TH} text-right`}>Balance</th>
            <th className={`${TH} text-left`}>Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => {
            if (row.kind === 'inv') return invoiceRow(row.inv, null);
            const { ci, summary, matched } = row;
            const isOpen = expanded.has(ci.id);
            const overdue = summary.status === 'overdue';
            return (
              <Fragment key={ci.id}>
                <tr
                  onClick={() => onOpenConsolidated(ci.id)}
                  className={`cursor-pointer transition-colors ${
                    isOpen ? 'bg-teal-50/40' : overdue ? 'bg-red-50/30' : ''
                  } hover:bg-teal-50/60`}
                >
                  <td className="pl-4 pr-2 py-3.5 w-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(ci.id);
                      }}
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                      className="p-1 rounded-md text-gray-400 hover:text-teal-700 hover:bg-teal-100 transition-colors"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-teal-600 shrink-0" />
                      <span className="font-mono text-sm font-semibold text-teal-800">{ci.consolidated_number}</span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 whitespace-nowrap">
                        Consolidated - {summary.count} invoices
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-900 font-medium">{ci.companies?.name || 'Unknown'}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{formatDate(ci.invoice_date)}</td>
                  <td className={`px-4 py-3.5 text-sm ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                    {formatDate(ci.due_date)}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 text-right">{formatCurrency(summary.total)}</td>
                  <td className="px-4 py-3.5 text-sm text-emerald-600 font-medium text-right">{formatCurrency(summary.paid)}</td>
                  <td className="px-4 py-3.5 text-sm font-bold text-gray-900 text-right">{formatCurrency(summary.balance)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <StatusPill status={summary.status} />
                      {summary.status === 'partial' && (
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">
                          {summary.paidCount}/{summary.count} paid
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <ChevronRight className="h-4 w-4 text-gray-300 inline" />
                  </td>
                </tr>
                {isOpen &&
                  ci.invoices.map((child) =>
                    invoiceRow(child, { ciCompanyId: ci.company_id, highlight: matched.has(child.id) })
                  )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
