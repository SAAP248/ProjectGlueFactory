import { useEffect, useMemo, useState } from 'react';
import { X, Layers, Search, Check, Loader2 } from 'lucide-react';
import type { Invoice } from './useInvoices';
import {
  createConsolidated,
  fetchBillingCompanies,
  fetchEligibleInvoices,
  type BillingCompany,
} from './consolidated';
import { formatCurrency, formatDate, StatusPill } from './invoiceFormat';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  initialCompanyId?: string | null;
  initialInvoiceIds?: string[];
  lockCompany?: boolean;
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function NewConsolidatedModal({
  open,
  onClose,
  onCreated,
  initialCompanyId = null,
  initialInvoiceIds = [],
  lockCompany = false,
}: Props) {
  const [companies, setCompanies] = useState<BillingCompany[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(initialCompanyId);
  const [companySearch, setCompanySearch] = useState('');
  const [eligible, setEligible] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialInvoiceIds));
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCompanyId(initialCompanyId);
    setSelected(new Set(initialInvoiceIds));
    setDueDate(defaultDueDate());
    setNotes('');
    setError(null);
    setCompanySearch('');
    fetchBillingCompanies().then(setCompanies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !companyId) {
      setEligible([]);
      return;
    }
    setLoadingInvoices(true);
    fetchEligibleInvoices(companyId).then((rows) => {
      setEligible(rows);
      setLoadingInvoices(false);
    });
  }, [open, companyId]);

  const topLevel = useMemo(
    () =>
      companies
        .filter((c) => !c.parent_company_id)
        .filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
        .slice(0, 40),
    [companies, companySearch]
  );

  const company = companies.find((c) => c.id === companyId) || null;
  const chosen = eligible.filter((i) => selected.has(i.id));
  const chosenTotal = chosen.reduce((s, i) => s + (Number(i.balance_due) || 0), 0);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCreate = async () => {
    if (!companyId || chosen.length < 2) return;
    setSaving(true);
    setError(null);
    const { id, error: err } = await createConsolidated({
      companyId,
      invoiceIds: chosen.map((i) => i.id),
      dueDate: dueDate || null,
      notes,
    });
    setSaving(false);
    if (err || !id) {
      setError(err || 'Could not create consolidated invoice');
      return;
    }
    onCreated(id);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Layers className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">New Consolidated Invoice</h2>
              <p className="text-xs text-gray-500">Combine open invoices into one bill for the customer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</label>
            {company ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
                <span className="text-sm font-semibold text-gray-900">{company.name}</span>
                {!lockCompany && (
                  <button
                    onClick={() => {
                      setCompanyId(null);
                      setSelected(new Set());
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="relative border-b border-gray-100">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    autoFocus
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    placeholder="Search customers..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {topLevel.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCompanyId(c.id)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-blue-50/60 transition-colors"
                    >
                      {c.name}
                    </button>
                  ))}
                  {topLevel.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No customers found</p>}
                </div>
              </div>
            )}
          </div>

          {company && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Open invoices to include
                </label>
                {eligible.length > 0 && (
                  <button
                    onClick={() =>
                      setSelected(chosen.length === eligible.length ? new Set() : new Set(eligible.map((i) => i.id)))
                    }
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    {chosen.length === eligible.length ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {loadingInvoices ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                ) : eligible.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">
                    This customer has no open invoices that aren't already consolidated.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {eligible.map((inv) => {
                      const isOn = selected.has(inv.id);
                      const isSub = inv.company_id !== companyId;
                      return (
                        <button
                          key={inv.id}
                          onClick={() => toggle(inv.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isOn ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isOn ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isOn && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-gray-900">{inv.invoice_number}</span>
                              <StatusPill status={inv.status} />
                              {isSub && (
                                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                                  {inv.companies?.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {formatDate(inv.invoice_date)}
                              {inv.notes ? ` - ${inv.notes}` : ''}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(Number(inv.balance_due) || 0)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {company && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly subscriptions"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{chosen.length}</span> invoices
            <span className="mx-2 text-gray-300">|</span>
            <span className="font-semibold text-gray-900">{formatCurrency(chosenTotal)}</span>
            {chosen.length === 1 && <span className="ml-2 text-xs text-amber-600">Select at least 2</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || chosen.length < 2}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Consolidated Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
