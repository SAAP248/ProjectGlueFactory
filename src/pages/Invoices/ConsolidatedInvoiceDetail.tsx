import { useMemo, useState } from 'react';
import { ArrowLeft, Layers, CreditCard, Plus, X, Calendar, Building2, ChevronRight, Check } from 'lucide-react';
import {
  useConsolidatedDetail,
  summarize,
  payConsolidatedChildren,
  addInvoicesToConsolidated,
  removeInvoiceFromConsolidated,
} from './consolidated';
import { PayChildrenModal, AddInvoicesModal } from './ConsolidatedModals';
import { formatCurrency, formatDate, StatusPill } from './invoiceFormat';

interface Props {
  consolidatedId: string;
  onBack: () => void;
  onOpenInvoice: (id: string) => void;
}

export default function ConsolidatedInvoiceDetail({ consolidatedId, onBack, onOpenInvoice }: Props) {
  const { ci, loading, error, refetch } = useConsolidatedDetail(consolidatedId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPay, setShowPay] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const summary = useMemo(() => (ci ? summarize(ci) : null), [ci]);
  const openChildren = useMemo(
    () => (ci?.invoices || []).filter((i) => i.status !== 'paid' && i.status !== 'void' && Number(i.balance_due) > 0),
    [ci]
  );
  const selectedInvoices = openChildren.filter((i) => selected.has(i.id));
  const selectedTotal = selectedInvoices.reduce((s, i) => s + (Number(i.balance_due) || 0), 0);

  if (loading) {
    return (
      <div className="py-32 text-center">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error || !ci || !summary) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </button>
        <p className="text-red-600">{error || 'Consolidated invoice not found'}</p>
      </div>
    );
  }

  const pct = summary.total > 0 ? Math.round((summary.paid / summary.total) * 100) : 0;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleRemove = async (invoiceId: string) => {
    setActionError(null);
    const err = await removeInvoiceFromConsolidated(ci.id, invoiceId);
    if (err) setActionError(err);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(invoiceId);
      return next;
    });
    refetch();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <Layers className="h-5 w-5 text-teal-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{ci.consolidated_number}</h1>
              <StatusPill status={summary.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="font-semibold text-gray-900">{ci.companies?.name || 'Unknown'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatDate(ci.invoice_date)} - Due {formatDate(ci.due_date)}
              </span>
            </div>
            {ci.notes && <p className="text-sm text-gray-500 mt-2">{ci.notes}</p>}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            disabled={!ci.company_id}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add Invoices
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { label: 'Total', value: summary.total, cls: 'text-gray-900' },
            { label: 'Paid', value: summary.paid, cls: 'text-emerald-600' },
            { label: 'Balance', value: summary.balance, cls: summary.balance > 0 ? 'text-gray-900' : 'text-emerald-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.cls}`}>{formatCurrency(s.value)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>
              {summary.paidCount} of {summary.count} invoices closed
            </span>
            <span>{pct}% paid</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {actionError && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{actionError}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Included Invoices</h2>
            <p className="text-xs text-gray-500">Select the invoices the customer is paying for</p>
          </div>
          <div className="flex items-center gap-3">
            {openChildren.length > 0 && (
              <button
                onClick={() =>
                  setSelected(
                    selectedInvoices.length === openChildren.length ? new Set() : new Set(openChildren.map((i) => i.id))
                  )
                }
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {selectedInvoices.length === openChildren.length ? 'Clear' : 'Select all open'}
              </button>
            )}
            <button
              onClick={() => setShowPay(true)}
              disabled={selectedInvoices.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Record Payment{selectedInvoices.length > 0 ? ` (${formatCurrency(selectedTotal)})` : ''}
            </button>
          </div>
        </div>

        {ci.invoices.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No invoices in this consolidated bill yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="w-12 px-6 py-3" />
                  <th className="px-3 py-3 text-left">Invoice #</th>
                  <th className="px-3 py-3 text-left">Description</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3 text-right">Paid</th>
                  <th className="px-3 py-3 text-right">Balance</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ci.invoices.map((inv) => {
                  const payable = openChildren.some((o) => o.id === inv.id);
                  const isOn = selected.has(inv.id);
                  const isSub = inv.company_id !== ci.company_id;
                  return (
                    <tr
                      key={inv.id}
                      className={`group transition-colors ${isOn ? 'bg-emerald-50/50' : 'hover:bg-gray-50/70'}`}
                    >
                      <td className="px-6 py-3.5">
                        {payable ? (
                          <button
                            onClick={() => toggle(inv.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isOn ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 hover:border-emerald-500'
                            }`}
                            aria-label={`Select ${inv.invoice_number}`}
                          >
                            {isOn && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </button>
                        ) : (
                          <Check className="h-4 w-4 text-emerald-500" />
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <button
                          onClick={() => onOpenInvoice(inv.id)}
                          className="font-mono text-sm font-semibold text-blue-700 hover:underline"
                        >
                          {inv.invoice_number}
                        </button>
                      </td>
                      <td className="px-3 py-3.5 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-xs">{inv.notes || '-'}</span>
                          {isSub && (
                            <span className="shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                              {inv.companies?.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-right text-emerald-600">
                        {formatCurrency(Number(inv.amount_paid))}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-right font-bold text-gray-900">
                        {formatCurrency(Number(inv.balance_due))}
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusPill status={inv.status} />
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {payable && (
                            <button
                              onClick={() => handleRemove(inv.id)}
                              title="Remove from consolidated invoice"
                              className="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onOpenInvoice(inv.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Open invoice"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPay && (
        <PayChildrenModal
          invoices={selectedInvoices}
          onClose={() => setShowPay(false)}
          onConfirm={async (method, reference) => {
            const err = await payConsolidatedChildren(ci.id, selectedInvoices, method, reference);
            if (!err) {
              setShowPay(false);
              setSelected(new Set());
            }
            refetch();
            return err;
          }}
        />
      )}

      {showAdd && ci.company_id && (
        <AddInvoicesModal
          companyId={ci.company_id}
          onClose={() => setShowAdd(false)}
          onConfirm={async (ids) => {
            const err = await addInvoicesToConsolidated(ci.id, ids);
            if (!err) setShowAdd(false);
            refetch();
            return err;
          }}
        />
      )}
    </div>
  );
}
