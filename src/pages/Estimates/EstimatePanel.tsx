import { useState, useEffect, useCallback } from 'react';
import {
  X, FileText, Building2, MapPin, Calendar, Pencil, Printer, Copy, Receipt, Lock, Unlock,
  Loader2, CheckCircle2, XCircle, Briefcase, AlertCircle, ArrowRight, ChevronDown,
} from 'lucide-react';
import {
  fetchEstimateDetail, updateEstimateStatus, duplicateEstimate, convertEstimateToInvoice,
  ESTIMATE_STATUSES, estimateStatusStyles, formatMoney, formatDate,
} from './useEstimates';
import type { EstimateDetailData } from './useEstimates';
import EstimateForm from './EstimateForm';
import CustomerLinkCard from './CustomerLinkCard';
import CustomerConversation from './CustomerConversation';
import { printEstimate } from './printEstimate';

interface Props {
  estimateId: string | null;
  createFor?: { id: string; name: string } | null;
  creating: boolean;
  onClose: () => void;
  onCreateDone: () => void;
  onOpenEstimate: (id: string) => void;
  onChanged: () => void;
  onOpenInvoice?: (invoiceId: string) => void;
}

export default function EstimatePanel({
  estimateId, createFor, creating, onClose, onCreateDone, onOpenEstimate, onChanged, onOpenInvoice,
}: Props) {
  const [detail, setDetail] = useState<EstimateDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);

  const open = !!estimateId;

  const load = useCallback(async () => {
    if (!estimateId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchEstimateDetail(estimateId);
    setDetail(data);
    setError(err);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => {
    setActionError(null);
    setUnlocked(false);
    setStatusMenu(false);
    setConfirmConvert(false);
    if (estimateId) load();
    else setDetail(null);
  }, [estimateId, load]);

  useEffect(() => {
    if (!open || editing || creating) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, editing, creating, onClose]);

  const est = detail?.estimate;
  const converted = !!detail?.invoice;
  const approved = est?.status === 'approved';
  const locked = converted || (approved && !unlocked);

  const run = async (key: string, fn: () => Promise<string | null>) => {
    setBusy(key);
    setActionError(null);
    const err = await fn();
    setBusy(null);
    if (err) setActionError(err);
  };

  const changeStatus = (status: string) =>
    run('status', async () => {
      setStatusMenu(false);
      if (!est) return null;
      const { error: err } = await updateEstimateStatus(est.id, status);
      if (!err) { await load(); onChanged(); }
      return err;
    });

  const handleDuplicate = () =>
    run('duplicate', async () => {
      if (!detail) return null;
      const { id, error: err } = await duplicateEstimate(detail);
      if (id) { onChanged(); onOpenEstimate(id); }
      return err;
    });

  const handleConvert = () =>
    run('convert', async () => {
      setConfirmConvert(false);
      if (!detail) return null;
      const { invoiceId, error: err } = await convertEstimateToInvoice(detail);
      if (invoiceId) {
        await load();
        onChanged();
        if (!err && onOpenInvoice) onOpenInvoice(invoiceId);
      }
      return err;
    });

  const handlePrint = () =>
    run('print', async () => {
      if (!detail) return null;
      const ok = await printEstimate(detail);
      return ok ? null : 'Your browser blocked the print window. Please allow pop-ups and try again.';
    });

  const site = est?.sites;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-gray-900/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[720px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Estimate</p>
              <h2 className="text-lg font-semibold text-gray-900 font-mono truncate">{est?.estimate_number || '...'}</h2>
            </div>
            {est && (
              <span className={`ml-1 px-2.5 py-1 text-xs font-medium rounded-full capitalize ${estimateStatusStyles[est.status] || 'bg-gray-100 text-gray-700'}`}>
                {est.status}
              </span>
            )}
            {converted && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800">Invoiced</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </header>

        {est && (
          <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            {locked ? (
              approved && !converted ? (
                <button onClick={() => setUnlocked(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Unlock className="w-4 h-4" /> Unlock to Edit
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500">
                  <Lock className="w-4 h-4" /> Locked
                </span>
              )
            ) : (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setStatusMenu((v) => !v)}
                disabled={converted || busy === 'status'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {busy === 'status' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Status <ChevronDown className="w-4 h-4" />
              </button>
              {statusMenu && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  {ESTIMATE_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeStatus(s)}
                      disabled={s === est.status}
                      className="w-full text-left px-3 py-2 text-sm capitalize hover:bg-gray-50 disabled:text-gray-400 flex items-center justify-between"
                    >
                      {s}
                      {s === est.status && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handlePrint} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={handleDuplicate} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {busy === 'duplicate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />} Duplicate
            </button>

            {approved && !converted && (
              <button onClick={() => setConfirmConvert(true)} disabled={!!busy} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {busy === 'convert' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />} Convert to Invoice
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && !detail ? (
            <div className="flex items-center justify-center py-24 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading estimate...
            </div>
          ) : error ? (
            <div className="m-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                {error}
                <button onClick={load} className="block mt-2 font-medium underline">Try again</button>
              </div>
            </div>
          ) : est && detail ? (
            <div className="px-6 py-6 space-y-6">
              {actionError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{actionError}</div>
              )}

              {confirmConvert && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-900 font-medium">Create an invoice from this estimate?</p>
                  <p className="text-sm text-emerald-800 mt-1">All line items{Number(est.tax) > 0 ? ', tax,' : ''} and notes will be copied. The estimate will then be locked.</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleConvert} className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Create Invoice</button>
                    <button onClick={() => setConfirmConvert(false)} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              {detail.invoice && (
                <button
                  onClick={() => onOpenInvoice?.(detail.invoice!.id)}
                  disabled={!onOpenInvoice}
                  className="w-full flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-left hover:bg-teal-100 transition-colors group disabled:cursor-default"
                >
                  <span className="flex items-center gap-2 text-sm text-teal-900">
                    <Receipt className="w-4 h-4" /> Converted to invoice <span className="font-mono font-semibold">{detail.invoice.invoice_number}</span>
                  </span>
                  {onOpenInvoice && <ArrowRight className="w-4 h-4 text-teal-700 group-hover:translate-x-0.5 transition-transform" />}
                </button>
              )}

              {approved && unlocked && !converted && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> This estimate was approved. Changes will differ from what the customer accepted.
                </div>
              )}

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard icon={Building2} label="Customer" value={est.companies?.name || '—'} />
                <InfoCard
                  icon={MapPin}
                  label="Site"
                  value={site?.name || (site ? 'Unnamed site' : 'No specific site')}
                  sub={site ? [site.address, site.city, site.state, site.zip].filter(Boolean).join(', ') : undefined}
                />
                <InfoCard icon={Calendar} label="Estimate Date" value={formatDate(est.estimate_date)} />
                <InfoCard icon={Calendar} label="Expires" value={formatDate(est.expiration_date)} />
                {detail.deal && <InfoCard icon={Briefcase} label="Linked Deal" value={detail.deal.title || 'Untitled deal'} />}
              </section>

              <CustomerLinkCard estimate={est} onSaved={() => { load(); onChanged(); }} />

              {(est.accepted_at || est.declined_at) && (
                <section className={`rounded-xl border p-4 ${est.declined_at && est.status === 'declined' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  {est.status === 'declined' && est.declined_at ? (
                    <div className="flex gap-3">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-red-900">Declined on {formatDate(est.declined_at)}</p>
                        {est.declined_reason && <p className="text-red-800 mt-1">Reason: {est.declined_reason}</p>}
                      </div>
                    </div>
                  ) : est.accepted_at ? (
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-emerald-900">Accepted on {formatDate(est.accepted_at)}</p>
                        {est.customer_name_signed && (
                          <p className="text-emerald-800 mt-1">
                            Signed by {est.customer_name_signed}{est.customer_email_signed ? ` (${est.customer_email_signed})` : ''}
                          </p>
                        )}
                        {est.signature_type === 'drawn' && est.signature_data?.startsWith('data:image/png') ? (
                          <img src={est.signature_data} alt="Customer signature" className="mt-3 h-16 max-w-[240px] object-contain bg-white rounded-lg border border-emerald-200 px-3" />
                        ) : est.signature_type === 'typed' && est.customer_name_signed ? (
                          <p className="mt-3 inline-block bg-white rounded-lg border border-emerald-200 px-4 py-1 text-2xl text-gray-900" style={{ fontFamily: "'Dancing Script', cursive" }}>{est.customer_name_signed}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>
              )}

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h3>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {detail.lineItems.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-500">No line items on this estimate yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {detail.lineItems.map((li) => (
                            <tr key={li.id} className="hover:bg-gray-50/60">
                              <td className="px-4 py-3 text-gray-900">{li.description || '—'}</td>
                              <td className="px-4 py-3 text-right text-gray-700">{Number(li.quantity)}</td>
                              <td className="px-4 py-3 text-right text-gray-700">{formatMoney(li.unit_price)}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">{formatMoney(Number(li.quantity) * Number(li.unit_price))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatMoney(est.subtotal)}</span></div>
                    <div className="flex justify-between text-gray-600"><span>Tax</span><span>{formatMoney(est.tax)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-bold text-gray-900"><span>Total</span><span>{formatMoney(est.total)}</span></div>
                  </div>
                </div>
              </section>

              {(est.notes || est.terms) && (
                <section className="grid grid-cols-1 gap-4">
                  {est.notes && <TextBlock label="Notes" text={est.notes} />}
                  {est.terms && <TextBlock label="Terms" text={est.terms} />}
                </section>
              )}

              <CustomerConversation estimateId={est.id} onRead={onChanged} />
            </div>
          ) : null}
        </div>
      </aside>

      <EstimateForm
        open={editing || creating}
        editing={editing ? detail : null}
        presetCompany={createFor}
        onClose={() => (editing ? setEditing(false) : onCreateDone())}
        onSaved={(id) => {
          onChanged();
          if (editing) {
            setEditing(false);
            setUnlocked(false);
            load();
          } else {
            onCreateDone();
            onOpenEstimate(id);
          }
        }}
      />
    </>
  );
}

function InfoCard({ icon: Icon, label, value, sub }: { icon: typeof Building2; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1.5">{label}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}
