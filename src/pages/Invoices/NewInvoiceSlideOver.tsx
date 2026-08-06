import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Plus,
  Search,
  Trash2,
  Package,
  Building2,
  MapPin,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { createInvoice, addLineItem } from './useInvoices';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (invoiceId: string) => void;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface SiteOption {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  price: number | null;
  sku: string;
  manufacturer: string | null;
  image_url: string | null;
}

interface LineItemRow {
  key: string;
  description: string;
  quantity: number;
  unit_price: number;
  product_id: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function plus30(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `li-${keyCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewInvoiceSlideOver({ open, onClose, onCreated }: Props) {
  // ── Customer search ──────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CompanyOption[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  // ── Sites ────────────────────────────────────────────────────────────
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  // ── Invoice fields ───────────────────────────────────────────────────
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState(plus30());
  const [terms, setTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');

  // ── Line items ───────────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState<LineItemRow[]>([
    { key: nextKey(), description: '', quantity: 1, unit_price: 0, product_id: null },
  ]);

  // ── Product search (per row) ─────────────────────────────────────────
  const [activeProductRow, setActiveProductRow] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // ── Submission ───────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ====================================================================
  // Reset form whenever the panel opens
  // ====================================================================
  useEffect(() => {
    if (open) {
      setCustomerSearch('');
      setCustomerResults([]);
      setSelectedCompany(null);
      setSites([]);
      setSelectedSiteId('');
      setInvoiceDate(today());
      setDueDate(plus30());
      setTerms('Net 30');
      setNotes('');
      setLineItems([{ key: nextKey(), description: '', quantity: 1, unit_price: 0, product_id: null }]);
      setError(null);
      setValidationErrors({});
      setActiveProductRow(null);
      setProductSearch('');
      setProductResults([]);
    }
  }, [open]);

  // ====================================================================
  // Customer search debounce
  // ====================================================================
  useEffect(() => {
    if (!customerSearch.trim() || selectedCompany) {
      setCustomerResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setCustomerLoading(true);
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', `%${customerSearch.trim()}%`)
        .order('name')
        .limit(20);

      setCustomerResults((data ?? []) as CompanyOption[]);
      setCustomerLoading(false);
      setShowCustomerDropdown(true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [customerSearch, selectedCompany]);

  // ====================================================================
  // Load sites when company changes
  // ====================================================================
  useEffect(() => {
    if (!selectedCompany) {
      setSites([]);
      setSelectedSiteId('');
      return;
    }

    (async () => {
      setSitesLoading(true);
      const { data } = await supabase
        .from('sites')
        .select('id, name, address, city, state, zip')
        .eq('company_id', selectedCompany.id)
        .order('name');

      setSites((data ?? []) as SiteOption[]);
      setSitesLoading(false);
    })();
  }, [selectedCompany]);

  // ====================================================================
  // Product search debounce
  // ====================================================================
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setProductLoading(true);
      const { data } = await supabase
        .from('products')
        .select('id, name, price, sku, manufacturer, image_url')
        .eq('is_active', true)
        .or(`name.ilike.%${productSearch.trim()}%,sku.ilike.%${productSearch.trim()}%,manufacturer.ilike.%${productSearch.trim()}%`)
        .order('name')
        .limit(10);

      setProductResults((data ?? []) as ProductOption[]);
      setProductLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [productSearch]);

  // ====================================================================
  // Click-outside handlers
  // ====================================================================
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setActiveProductRow(null);
        setProductSearch('');
        setProductResults([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ====================================================================
  // Line item helpers
  // ====================================================================
  const updateLineItem = useCallback(
    (key: string, field: keyof LineItemRow, value: string | number | null) => {
      setLineItems((prev) =>
        prev.map((li) => (li.key === key ? { ...li, [field]: value } : li))
      );
    },
    []
  );

  const removeLineItem = useCallback((key: string) => {
    setLineItems((prev) => {
      const next = prev.filter((li) => li.key !== key);
      return next.length ? next : [{ key: nextKey(), description: '', quantity: 1, unit_price: 0, product_id: null }];
    });
  }, []);

  const addEmptyLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      { key: nextKey(), description: '', quantity: 1, unit_price: 0, product_id: null },
    ]);
  }, []);

  const selectProduct = useCallback(
    (rowKey: string, product: ProductOption) => {
      setLineItems((prev) =>
        prev.map((li) =>
          li.key === rowKey
            ? {
                ...li,
                description: product.name,
                unit_price: Number(product.price) || 0,
                product_id: product.id,
              }
            : li
        )
      );
      setActiveProductRow(null);
      setProductSearch('');
      setProductResults([]);
    },
    []
  );

  // ====================================================================
  // Computed values
  // ====================================================================
  const subtotal = lineItems.reduce(
    (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
    0
  );

  // ====================================================================
  // Validation
  // ====================================================================
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!selectedCompany) errs.customer = 'Customer is required';
    if (!invoiceDate) errs.invoiceDate = 'Invoice date is required';
    if (!dueDate) errs.dueDate = 'Due date is required';

    const filledItems = lineItems.filter((li) => li.description.trim());
    if (filledItems.length === 0) errs.lineItems = 'At least one line item is required';

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ====================================================================
  // Submit
  // ====================================================================
  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      const filledItems = lineItems.filter((li) => li.description.trim());
      const calculatedSubtotal = filledItems.reduce(
        (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
        0
      );

      // Create invoice
      const { data: invoice, error: createError } = await createInvoice({
        company_id: selectedCompany!.id,
        site_id: selectedSiteId || null,
        invoice_date: invoiceDate,
        due_date: dueDate,
        terms: terms || null,
        notes: notes || null,
        status: 'draft',
        subtotal: calculatedSubtotal,
        tax: 0,
        total: calculatedSubtotal,
        amount_paid: 0,
        balance_due: calculatedSubtotal,
      });

      if (createError || !invoice) {
        setError(createError || 'Failed to create invoice');
        setSubmitting(false);
        return;
      }

      // Add line items sequentially
      for (const item of filledItems) {
        const { error: lineError } = await addLineItem(invoice.id, {
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          total: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
          product_id: item.product_id || null,
        });

        if (lineError) {
          setError(`Invoice created but failed adding line item: ${lineError}`);
          setSubmitting(false);
          onCreated(invoice.id);
          return;
        }
      }

      setSubmitting(false);
      onCreated(invoice.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setSubmitting(false);
    }
  };

  // ====================================================================
  // Render
  // ====================================================================
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[500px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">New Invoice</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Global error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Customer ──────────────────────────────────────────── */}
          <div ref={customerRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>

            {selectedCompany ? (
              <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {selectedCompany.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompany(null);
                    setCustomerSearch('');
                    setSites([]);
                    setSelectedSiteId('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers…"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => customerSearch.trim() && setShowCustomerDropdown(true)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {customerLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </div>
            )}

            {/* Dropdown */}
            {showCustomerDropdown && !selectedCompany && customerResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCompany(c);
                      setCustomerSearch(c.name);
                      setShowCustomerDropdown(false);
                      setValidationErrors((prev) => {
                        const next = { ...prev };
                        delete next.customer;
                        return next;
                      });
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {showCustomerDropdown &&
              !selectedCompany &&
              customerSearch.trim() &&
              !customerLoading &&
              customerResults.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
                  No customers found
                </div>
              )}

            {validationErrors.customer && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.customer}</p>
            )}
          </div>

          {/* ── Site ───────────────────────────────────────────────── */}
          {selectedCompany && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline w-4 h-4 mr-1 text-gray-400 -mt-0.5" />
                Site
              </label>
              {sitesLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading sites…
                </div>
              ) : (
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">No specific site</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || 'Unnamed'}{' '}
                      {s.address ? `— ${s.address}, ${s.city || ''} ${s.state || ''}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── Dates row ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1 text-gray-400 -mt-0.5" />
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => {
                  setInvoiceDate(e.target.value);
                  setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.invoiceDate;
                    return next;
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {validationErrors.invoiceDate && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.invoiceDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1 text-gray-400 -mt-0.5" />
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.dueDate;
                    return next;
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {validationErrors.dueDate && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.dueDate}</p>
              )}
            </div>
          </div>

          {/* ── Terms ─────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
            <input
              type="text"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="e.g. Net 30"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* ── Notes ─────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Invoice notes…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* ── Line Items ────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-gray-400" />
                Line Items
              </h3>
              <button
                type="button"
                onClick={addEmptyLineItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {validationErrors.lineItems && (
              <p className="mb-2 text-xs text-red-600">{validationErrors.lineItems}</p>
            )}

            <div className="space-y-3">
              {lineItems.map((item) => (
                <div
                  key={item.key}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 space-y-2"
                >
                  {/* Description with product search */}
                  <div className="relative" ref={activeProductRow === item.key ? productDropdownRef : undefined}>
                    <input
                      type="text"
                      placeholder="Description — type to search products"
                      value={
                        activeProductRow === item.key
                          ? productSearch
                          : item.description
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeProductRow === item.key) {
                          setProductSearch(val);
                        } else {
                          updateLineItem(item.key, 'description', val);
                        }
                      }}
                      onFocus={() => {
                        setActiveProductRow(item.key);
                        setProductSearch(item.description);
                      }}
                      onBlur={() => {
                        // Small delay so click on dropdown can register
                        setTimeout(() => {
                          if (activeProductRow === item.key) {
                            // Sync the typed text back if user didn't select a product
                            updateLineItem(item.key, 'description', productSearch);
                            setActiveProductRow(null);
                            setProductSearch('');
                            setProductResults([]);
                          }
                        }, 200);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />

                    {/* Product dropdown */}
                    {activeProductRow === item.key && productResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {productResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectProduct(item.key, p);
                            }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 flex items-center gap-3"
                          >
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="h-9 w-9 rounded-lg border border-gray-100 object-cover bg-gray-50 flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {[p.manufacturer, p.sku ? `SKU: ${p.sku}` : null].filter(Boolean).join(' · ') || 'No SKU'}
                              </p>
                            </div>
                            <span className="font-semibold text-gray-700 flex-shrink-0">
                              {formatCurrency(Number(p.price) || 0)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {activeProductRow === item.key &&
                      productSearch.trim() &&
                      !productLoading &&
                      productResults.length === 0 && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs text-gray-500">
                          No matching products — text will be used as description
                        </div>
                      )}
                  </div>

                  {/* Qty / Price / Total / Delete */}
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.key, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unit_price}
                        onChange={(e) =>
                          updateLineItem(item.key, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="w-24 text-right">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                        Total
                      </label>
                      <div className="py-1.5 text-sm font-medium text-gray-900">
                        {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLineItem(item.key)}
                      className="mt-4 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Subtotal</span>
              <span className="text-base font-semibold text-gray-900">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </>
  );
}
