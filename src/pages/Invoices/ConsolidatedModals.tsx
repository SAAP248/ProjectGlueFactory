import { useEffect, useState } from 'react';
import { X, Loader2, CreditCard, Plus, Check } from 'lucide-react';
import type { Invoice } from './useInvoices';
import { fetchEligibleInvoices } from './consolidated';
import { formatCurrency, formatDate, StatusPill } from './invoiceFormat';

function ModalShell({
  title,
  icon: Icon,
  onClose,
  children,
  footer,
}: {
  title: string;
  icon: typeof X;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
          {footer}
        </div>
      </div>
    </div>
  );
}

const METHODS = [
  { key: 'check', label: 'Check' },
  { key: 'ach', label: 'ACH' },
  { key: 'credit_card', label: 'Credit Card' },
  { key: 'cash', label: 'Cash' },
];

export function PayChildrenModal({
  invoices,
  onClose,
  onConfirm,
}: {
  invoices: Invoice[];
  onClose: () => void;
  onConfirm: (method: string, reference: string) => Promise<string | null>;
}) {
  const [method, setMethod] = useState('check');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = invoices.reduce((s, i) => s + (Number(i.balance_due) || 0), 0);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const err = await onConfirm(method, reference);
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <ModalShell
      title="Record Payment"
      icon={CreditCard}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Apply {formatCurrency(total)}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-3">
        This payment will close out the following {invoices.length === 1 ? 'invoice' : `${invoices.length} invoices`} in full.
        Other invoices in this consolidated bill stay open.
      </p>
      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 mb-5">
        {invoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="min-w-0">
              <span className="font-mono text-sm font-semibold text-gray-900">{inv.invoice_number}</span>
              <p className="text-xs text-gray-500 truncate">{inv.notes || inv.companies?.name}</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(inv.balance_due) || 0)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-b-xl">
          <span className="text-sm font-semibold text-gray-700">Payment amount</span>
          <span className="text-base font-bold text-emerald-700">{formatCurrency(total)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {METHODS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reference #</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Check # / confirmation"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </ModalShell>
  );
}

export function AddInvoicesModal({
  companyId,
  onClose,
  onConfirm,
}: {
  companyId: string;
  onClose: () => void;
  onConfirm: (ids: string[]) => Promise<string | null>;
}) {
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEligibleInvoices(companyId).then(setRows);
  }, [companyId]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    setSaving(true);
    setError(null);
    const err = await onConfirm([...selected]);
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <ModalShell
      title="Add Invoices"
      icon={Plus}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || selected.size === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add {selected.size || ''} {selected.size === 1 ? 'invoice' : 'invoices'}
          </button>
        </>
      }
    >
      {rows === null ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-sm text-gray-400 text-center">No other open invoices for this customer.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {rows.map((inv) => {
            const isOn = selected.has(inv.id);
            return (
              <button
                key={inv.id}
                onClick={() => toggle(inv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isOn ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isOn ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}
                >
                  {isOn && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">{inv.invoice_number}</span>
                    <StatusPill status={inv.status} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {formatDate(inv.invoice_date)} - {inv.companies?.name}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(Number(inv.balance_due) || 0)}</span>
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </ModalShell>
  );
}
