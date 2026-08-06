import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Shield,
  Download,
  Printer,
  Pencil,
  Trash2,
  Plus,
  Search,
  X,
  Check,
  FileText,
  GripVertical,
  Package,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  useInvoiceDetail,
  addLineItem,
  updateLineItem,
  deleteLineItem,
  deleteInvoice,
  reorderLineItems,
} from './useInvoices';
import type { InvoiceLineItem } from './useInvoices';
import InvoiceActions from './InvoiceActions';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  invoiceId: string;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Product search result shape
// ---------------------------------------------------------------------------

interface ProductResult {
  id: string;
  sku: string | null;
  name: string;
  price: number;
  manufacturer: string | null;
  image_url: string | null;
}

// ---------------------------------------------------------------------------
// Currency & date helpers
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function fmtDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-500',
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Company constants
// ---------------------------------------------------------------------------

const MY_COMPANY = {
  name: 'Workhorse Investments, LLC',
  email: 'info@workhorseinvestments.com',
  phone: '(555) 867-5309',
  address: '123 Main Street, Suite 200',
  city: 'Atlanta',
  state: 'GA',
  zip: '30301',
};

// ---------------------------------------------------------------------------
// Product thumbnail helper
// ---------------------------------------------------------------------------

function ProductThumb({ url }: { url: string | null | undefined }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <Package className="h-4 w-4" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      onError={() => setBroken(true)}
      className="h-9 w-9 flex-shrink-0 rounded-lg border border-gray-100 object-cover bg-gray-50"
    />
  );
}

// ---------------------------------------------------------------------------
// Product Search Dropdown (enhanced)
// ---------------------------------------------------------------------------

function ProductSearch({
  onSelect,
}: {
  onSelect: (product: ProductResult | null, term: string) => void;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async (searchTerm: string) => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('id, sku, name, price, manufacturer, image_url')
      .eq('is_active', true)
      .limit(10);

    if (searchTerm.length >= 2) {
      query = query.or(
        `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,manufacturer.ilike.%${searchTerm}%`
      );
    }

    const { data } = await query.order('name');
    setResults((data as ProductResult[]) || []);
    setOpen(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (term.length >= 2) {
      const timeout = setTimeout(() => fetchProducts(term), 300);
      return () => clearTimeout(timeout);
    } else {
      setResults([]);
      if (term.length === 0) setOpen(false);
    }
  }, [term, fetchProducts]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            onSelect(null, e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
            else if (term.length === 0) fetchProducts('');
          }}
          placeholder="Search products or type description..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p, p.name);
                setTerm(p.name);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors"
            >
              <ProductThumb url={p.image_url} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[p.manufacturer, p.sku ? `SKU: ${p.sku}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'No SKU'}
                </p>
              </div>
              <span className="flex-shrink-0 text-sm font-semibold text-gray-700">
                {fmt.format(p.price)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InvoiceDetail Component
// ---------------------------------------------------------------------------

export default function InvoiceDetail({ invoiceId, onBack }: Props) {
  const { invoice, company, site, lineItems, loading, error, refetch } =
    useInvoiceDetail(invoiceId);

  // Line item editing state
  const [editingLineItem, setEditingLineItem] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');

  // Add line item state
  const [addingLineItem, setAddingLineItem] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newPrice, setNewPrice] = useState('');
  const [newProductId, setNewProductId] = useState<string | null>(null);

  // Saving states
  const [saving, setSaving] = useState(false);

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localItems, setLocalItems] = useState<InvoiceLineItem[]>([]);

  useEffect(() => {
    setLocalItems(lineItems);
  }, [lineItems]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  function startEdit(item: InvoiceLineItem) {
    setEditingLineItem(item.id);
    setEditDesc(item.description ?? '');
    setEditQty(String(item.quantity));
    setEditPrice(String(item.unit_price));
  }

  function cancelEdit() {
    setEditingLineItem(null);
  }

  async function saveEdit(itemId: string) {
    setSaving(true);
    const { error: err } = await updateLineItem(itemId, {
      description: editDesc,
      quantity: Number(editQty) || 0,
      unit_price: Number(editPrice) || 0,
      total: (Number(editQty) || 0) * (Number(editPrice) || 0),
    });
    setSaving(false);
    if (err) {
      alert(`Error updating line item: ${err}`);
      return;
    }
    setEditingLineItem(null);
    refetch();
  }

  async function handleDeleteLineItem(itemId: string) {
    if (!confirm('Delete this line item?')) return;
    setSaving(true);
    const { error: err } = await deleteLineItem(itemId, invoiceId);
    setSaving(false);
    if (err) {
      alert(`Error deleting line item: ${err}`);
      return;
    }
    refetch();
  }

  async function handleAddLineItem() {
    if (!newDesc.trim()) {
      alert('Description is required.');
      return;
    }
    setSaving(true);
    const { error: err } = await addLineItem(invoiceId, {
      product_id: newProductId,
      description: newDesc,
      quantity: Number(newQty) || 1,
      unit_price: Number(newPrice) || 0,
      total: (Number(newQty) || 1) * (Number(newPrice) || 0),
    });
    setSaving(false);
    if (err) {
      alert(`Error adding line item: ${err}`);
      return;
    }
    setAddingLineItem(false);
    setNewDesc('');
    setNewQty('1');
    setNewPrice('');
    setNewProductId(null);
    refetch();
  }

  function handleDownloadPdf() {
    alert('PDF download coming soon!');
  }

  function handlePrint() {
    window.print();
  }

  // -----------------------------------------------------------------------
  // Drag-and-drop handlers
  // -----------------------------------------------------------------------

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  async function handleDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...localItems];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setLocalItems(reordered);
    setDragIndex(null);
    setDragOverIndex(null);

    const ids = reordered.map((item) => item.id);
    await reorderLineItems(ids);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // -----------------------------------------------------------------------
  // Loading / Error states
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="px-4 py-16 text-center">
        <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium text-gray-700">
          {error ?? 'Invoice not found'}
        </p>
        <button
          onClick={onBack}
          className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          &larr; Back to Invoices
        </button>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Computed values
  // -----------------------------------------------------------------------

  const discountAmount =
    invoice.discount_type === 'percentage'
      ? invoice.subtotal * ((invoice.discount ?? 0) / 100)
      : invoice.discount ?? 0;

  const fullAddress = (parts: (string | null | undefined)[]) =>
    parts.filter(Boolean).join(', ');

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* --- Header Bar --- */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </button>

        <h1 className="text-2xl font-bold text-gray-900">
          {invoice.invoice_number}
        </h1>

        <StatusBadge status={invoice.status} />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* --- Actions Toolbar --- */}
      <InvoiceActions
        invoice={{
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          invoice_date: invoice.invoice_date ?? '',
          due_date: invoice.due_date ?? '',
          balance_due: Number(invoice.balance_due) || 0,
          total: Number(invoice.total) || 0,
          payment_token: invoice.payment_token ?? null,
          discount: Number(invoice.discount) || 0,
          discount_type: invoice.discount_type ?? 'flat',
          company_id: invoice.company_id ?? '',
        }}
        onRefresh={refetch}
        onDelete={async () => {
          await deleteInvoice(invoice.id);
          onBack();
        }}
      />

      {/* --- Info Cards Row --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Customer Card */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-gray-500">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Customer
            </span>
          </div>
          {company ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-900">{company.name}</p>
              {company.email && <p className="text-gray-600">{company.email}</p>}
              {company.phone && <p className="text-gray-600">{company.phone}</p>}
              {(company.billing_address ||
                company.billing_city ||
                company.billing_state ||
                company.billing_zip) && (
                <p className="text-gray-600">
                  {fullAddress([
                    company.billing_address,
                    company.billing_city,
                    company.billing_state,
                    company.billing_zip,
                  ])}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No customer assigned</p>
          )}
        </div>

        {/* Site Card */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-gray-500">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Site
            </span>
          </div>
          {site ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-900">
                {site.name || 'Unnamed Site'}
              </p>
              {(site.address || site.city || site.state || site.zip) && (
                <p className="text-gray-600">
                  {fullAddress([site.address, site.city, site.state, site.zip])}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No site assigned</p>
          )}
        </div>

        {/* Your Company Card */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-gray-500">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Your Company
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-900">{MY_COMPANY.name}</p>
            <p className="text-gray-600">{MY_COMPANY.email}</p>
            <p className="text-gray-600">{MY_COMPANY.phone}</p>
            <p className="text-gray-600">
              {MY_COMPANY.address}, {MY_COMPANY.city}, {MY_COMPANY.state}{' '}
              {MY_COMPANY.zip}
            </p>
          </div>
        </div>
      </div>

      {/* --- HTML-Rendered Invoice Body --- */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Branding Header */}
        <div className="border-b border-gray-100 px-8 py-6">
          <h2 className="text-xl font-bold text-gray-900">{MY_COMPANY.name}</h2>
          <p className="text-sm text-gray-500">
            Professional Alarm &amp; Security Services
          </p>
        </div>

        <div className="px-8 py-6">
          {/* Invoice meta */}
          <div className="mb-8 flex flex-wrap justify-between gap-6">
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-900">
                Invoice #{invoice.invoice_number}
              </p>
              <p className="text-gray-600">
                <span className="font-medium text-gray-700">Date: </span>
                {fmtDate(invoice.invoice_date)}
              </p>
              <p className="text-gray-600">
                <span className="font-medium text-gray-700">Due: </span>
                {fmtDate(invoice.due_date)}
              </p>
            </div>
          </div>

          {/* Bill To / Service Location */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Bill To
              </p>
              {company ? (
                <div className="space-y-0.5 text-sm text-gray-700">
                  <p className="font-medium">{company.name}</p>
                  {company.billing_address && <p>{company.billing_address}</p>}
                  {(company.billing_city ||
                    company.billing_state ||
                    company.billing_zip) && (
                    <p>
                      {fullAddress([
                        company.billing_city,
                        company.billing_state,
                        company.billing_zip,
                      ])}
                    </p>
                  )}
                  {company.email && <p>{company.email}</p>}
                  {company.phone && <p>{company.phone}</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-400">&mdash;</p>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Service Location
              </p>
              {site ? (
                <div className="space-y-0.5 text-sm text-gray-700">
                  <p className="font-medium">{site.name || 'Unnamed Site'}</p>
                  {site.address && <p>{site.address}</p>}
                  {(site.city || site.state || site.zip) && (
                    <p>{fullAddress([site.city, site.state, site.zip])}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No site assigned</p>
              )}
            </div>
          </div>

          {/* --- Line Items Table --- */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="w-8 pb-2" />
                  <th className="pb-2 pr-4 font-semibold text-gray-600">
                    Description
                  </th>
                  <th className="w-20 pb-2 pr-4 text-right font-semibold text-gray-600">
                    Qty
                  </th>
                  <th className="w-28 pb-2 pr-4 text-right font-semibold text-gray-600">
                    Unit Price
                  </th>
                  <th className="w-28 pb-2 pr-4 text-right font-semibold text-gray-600">
                    Amount
                  </th>
                  <th className="w-20 pb-2" />
                </tr>
              </thead>
              <tbody>
                {localItems.map((item, index) =>
                  editingLineItem === item.id ? (
                    /* -- Inline Edit Row -- */
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2" />
                      <td className="py-2 pr-4">
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 pr-4 text-right text-sm text-gray-500">
                        {fmt.format(
                          (Number(editQty) || 0) * (Number(editPrice) || 0)
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEdit(item.id)}
                            disabled={saving}
                            className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* -- Display Row (draggable) -- */
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={`group border-b transition-colors ${
                        dragIndex === index
                          ? 'opacity-40 border-gray-100'
                          : dragOverIndex === index
                          ? 'border-t-2 border-t-blue-400 border-b-gray-100'
                          : 'border-gray-100 hover:bg-gray-50/50'
                      }`}
                    >
                      <td className="py-2.5 pl-1">
                        <div className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-3">
                          {item.product_id && (
                            <ProductThumb url={item.product_image_url} />
                          )}
                          <span className="text-gray-800">
                            {item.description || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-700">
                        {fmt.format(item.unit_price)}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium text-gray-900">
                        {fmt.format(item.total)}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => startEdit(item)}
                            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLineItem(item.id)}
                            className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {/* -- Add Line Item Row -- */}
                {addingLineItem && (
                  <tr className="border-b border-gray-100 bg-blue-50/30">
                    <td className="py-2" />
                    <td className="py-2 pr-4">
                      <ProductSearch
                        onSelect={(product, term) => {
                          if (product) {
                            setNewProductId(product.id);
                            setNewDesc(product.name);
                            setNewPrice(String(product.price));
                          } else {
                            setNewProductId(null);
                            setNewDesc(term);
                          }
                        }}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={newQty}
                        onChange={(e) => setNewQty(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 pr-4 text-right text-sm text-gray-500">
                      {fmt.format(
                        (Number(newQty) || 0) * (Number(newPrice) || 0)
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={handleAddLineItem}
                          disabled={saving}
                          className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAddingLineItem(false);
                            setNewDesc('');
                            setNewQty('1');
                            setNewPrice('');
                            setNewProductId(null);
                          }}
                          className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add Line Item Button */}
          {!addingLineItem && (
            <button
              onClick={() => setAddingLineItem(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Line Item
            </button>
          )}

          {/* --- Totals --- */}
          <div className="ml-auto mt-6 w-72 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">
                {fmt.format(invoice.subtotal)}
              </span>
            </div>

            {(invoice.discount ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Discount
                  {invoice.discount_type === 'percentage'
                    ? ` (${invoice.discount}%)`
                    : ''}
                </span>
                <span className="font-medium text-red-600">
                  &minus;{fmt.format(discountAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium text-gray-900">
                {fmt.format(invoice.tax)}
              </span>
            </div>

            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-semibold text-gray-900">
                {fmt.format(invoice.total)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Payments Received</span>
              <span className="font-medium text-emerald-600">
                {fmt.format(invoice.amount_paid)}
              </span>
            </div>

            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-bold text-gray-900">Balance Due</span>
              <span className="font-bold text-gray-900">
                {fmt.format(invoice.balance_due)}
              </span>
            </div>
          </div>

          {/* --- Notes --- */}
          {invoice.notes && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* --- Terms --- */}
          {invoice.terms && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Terms &amp; Conditions
              </p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
