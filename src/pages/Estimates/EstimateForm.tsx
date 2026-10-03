import { useState, useEffect, useRef } from 'react';
import { X, Plus, Search, Trash2, Building2, MapPin, Loader2, FileText, ChevronUp, ChevronDown, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LineItemProductSearch } from '../Invoices/NewInvoiceSlideOver';
import { saveEstimate, formatMoney } from './useEstimates';
import type { EstimateDetailData, LineItemInput } from './useEstimates';

interface Props {
  open: boolean;
  editing: EstimateDetailData | null;
  presetCompany?: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}

interface CompanyOption { id: string; name: string }
interface SiteOption { id: string; name: string | null; address: string | null; city: string | null; state: string | null }
type Row = LineItemInput & { key: string };

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow';

let rowCounter = 0;
const newRow = (): Row => ({ key: `row-${++rowCounter}`, description: '', quantity: 1, unit_price: 0, product_id: null });
const isoDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export default function EstimateForm({ open, editing, presetCompany, onClose, onSaved }: Props) {
  const [company, setCompany] = useState<CompanyOption | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CompanyOption[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [siteId, setSiteId] = useState('');
  const [estimateDate, setEstimateDate] = useState(isoDate());
  const [expirationDate, setExpirationDate] = useState(isoDate(30));
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [rows, setRows] = useState<Row[]>([newRow()]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    setCustomerSearch('');
    setCustomerResults([]);
    if (editing) {
      const e = editing.estimate;
      setCompany(e.company_id ? { id: e.company_id, name: e.companies?.name || 'Customer' } : null);
      setSiteId(e.site_id || '');
      setEstimateDate(e.estimate_date || isoDate());
      setExpirationDate(e.expiration_date || '');
      const sub = Number(e.subtotal) || 0;
      setTaxRate(sub > 0 ? Math.round(((Number(e.tax) || 0) / sub) * 10000) / 100 : 0);
      setNotes(e.notes || '');
      setTerms(e.terms || '');
      setRows(
        editing.lineItems.length
          ? editing.lineItems.map((li) => ({
              key: `row-${++rowCounter}`,
              id: li.id,
              description: li.description || '',
              quantity: Number(li.quantity) || 0,
              unit_price: Number(li.unit_price) || 0,
              product_id: li.product_id,
            }))
          : [newRow()]
      );
    } else {
      setCompany(presetCompany || null);
      setSiteId('');
      setEstimateDate(isoDate());
      setExpirationDate(isoDate(30));
      setTaxRate(0);
      setNotes('');
      setTerms('');
      setRows([newRow()]);
    }
  }, [open, editing, presetCompany]);

  useEffect(() => {
    if (!customerSearch.trim() || company) {
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setCustomerLoading(true);
      const { data } = await supabase
        .from('companies').select('id, name').ilike('name', `%${customerSearch.trim()}%`).order('name').limit(20);
      setCustomerResults((data ?? []) as CompanyOption[]);
      setCustomerLoading(false);
      setShowDropdown(true);
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch, company]);

  useEffect(() => {
    if (!company) {
      setSites([]);
      return;
    }
    supabase
      .from('sites').select('id, name, address, city, state').eq('company_id', company.id).order('name')
      .then(({ data }) => setSites((data ?? []) as SiteOption[]));
  }, [company]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key: string) =>
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key);
      return next.length ? next : [newRow()];
    });
  const moveRow = (index: number, dir: -1 | 1) =>
    setRows((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const subtotal = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const taxAmount = Math.round(subtotal * (Number(taxRate) || 0)) / 100;
  const total = subtotal + taxAmount;

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!company) errs.customer = 'Choose a customer';
    if (!estimateDate) errs.date = 'Estimate date is required';
    const filled = rows.filter((r) => r.description.trim());
    if (!filled.length) errs.items = 'Add at least one line item';
    if (filled.some((r) => r.quantity <= 0)) errs.items = 'Quantities must be greater than zero';
    if (filled.some((r) => r.unit_price < 0)) errs.items = 'Prices cannot be negative';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setError(null);
    const { id, error: saveErr } = await saveEstimate(
      editing?.estimate.id ?? null,
      {
        company_id: company!.id,
        site_id: siteId || null,
        estimate_date: estimateDate,
        expiration_date: expirationDate || null,
        tax: taxAmount,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
      },
      filled.map(({ id: rowId, description, quantity, unit_price, product_id }) => ({
        id: rowId, description: description.trim(), quantity, unit_price, product_id,
      }))
    );
    setSaving(false);
    if (saveErr) {
      setError(saveErr);
      if (!id) return;
    }
    if (id && !saveErr) onSaved(id);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-[1px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => !saving && onClose()}
      />
      <div
        className={`fixed inset-y-0 right-0 z-[70] w-full max-w-[640px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Estimate' : 'New Estimate'}</h2>
              {editing && <p className="text-xs text-gray-500 font-mono">{editing.estimate.estimate_number}</p>}
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <section className="space-y-4">
            <div ref={customerRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
              {company ? (
                <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Building2 className="w-4 h-4 text-gray-400" /> {company.name}
                  </span>
                  {!editing && !presetCompany && (
                    <button type="button" onClick={() => { setCompany(null); setSiteId(''); }} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setShowDropdown(true); }}
                    className={`${inputCls} pl-9`}
                  />
                  {customerLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                </div>
              )}
              {showDropdown && !company && customerSearch.trim() && !customerLoading && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {customerResults.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">No customers found</p>
                  ) : (
                    customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCompany(c); setShowDropdown(false); setFieldErrors((p) => ({ ...p, customer: '' })); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
                      >
                        <Building2 className="w-4 h-4 text-gray-400" /> {c.name}
                      </button>
                    ))
                  )}
                </div>
              )}
              {fieldErrors.customer && <p className="mt-1 text-xs text-red-600">{fieldErrors.customer}</p>}
            </div>

            {company && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline w-4 h-4 mr-1 text-gray-400 -mt-0.5" /> Site
                </label>
                <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={inputCls}>
                  <option value="">No specific site</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || 'Unnamed site'}{s.address ? ` — ${s.address}, ${s.city || ''} ${s.state || ''}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Date <span className="text-red-500">*</span></label>
                <input type="date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} className={inputCls} />
                {fieldErrors.date && <p className="mt-1 text-xs text-red-600">{fieldErrors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className={inputCls} />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-gray-400" /> Line Items
              </h3>
              <button type="button" onClick={() => setRows((p) => [...p, newRow()])} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            {fieldErrors.items && <p className="mb-2 text-xs text-red-600">{fieldErrors.items}</p>}

            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={row.key} className="group border border-gray-200 rounded-lg p-3 bg-gray-50/60 hover:border-gray-300 transition-colors">
                  <div className="flex gap-2">
                    <div className="flex flex-col pt-1">
                      <button type="button" onClick={() => moveRow(index, -1)} disabled={index === 0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => moveRow(index, 1)} disabled={index === rows.length - 1} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <LineItemProductSearch
                        description={row.description}
                        onDescriptionChange={(val) => updateRow(row.key, { description: val })}
                        onProductSelect={(p) => updateRow(row.key, { description: p.name, unit_price: Number(p.price) || 0, product_id: p.id })}
                      />
                      <div className="flex items-end gap-2">
                        <div className="w-20">
                          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">Qty</label>
                          <input type="number" min={0} step={1} value={row.quantity}
                            onChange={(e) => updateRow(row.key, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">Unit Price</label>
                          <input type="number" min={0} step={0.01} value={row.unit_price}
                            onChange={(e) => updateRow(row.key, { unit_price: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="w-28 text-right">
                          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">Total</label>
                          <div className="py-1.5 text-sm font-semibold text-gray-900">{formatMoney(row.quantity * row.unit_price)}</div>
                        </div>
                        <button type="button" onClick={() => removeRow(row.key)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Remove item">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 divide-y divide-gray-100">
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  Tax
                  <input type="number" min={0} max={100} step={0.01} value={taxRate}
                    onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none" />
                  %
                </span>
                <span className="font-medium text-gray-900">{formatMoney(taxAmount)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-gray-50">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{formatMoney(total)}</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes visible on the estimate..." className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} placeholder="e.g. 50% deposit due on approval, balance on completion" className={`${inputCls} resize-none`} />
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Estimate'}
          </button>
        </div>
      </div>
    </>
  );
}
