import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string | null;
  site_id: string | null;
  work_order_id: string | null;
  estimate_id: string | null;
  status: string;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  created_by: string | null;
  discount: number;
  discount_type: string;
  payment_token: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string } | null;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
  created_at: string;
  product_image_url?: string | null;
}

export interface Transaction {
  id: string;
  transaction_number: string;
  company_id: string | null;
  invoice_id: string | null;
  transaction_type: string;
  payment_method: string;
  amount: number;
  transaction_date: string | null;
  reference_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  status: string | null;
  customer_type: string | null;
  account_number: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  tags: string[] | null;
  is_vip: boolean;
  total_revenue: number;
  outstanding_balance: number;
  past_due_amount: number;
}

export interface Site {
  id: string;
  company_id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  site_type: string | null;
  access_instructions: string | null;
  alarm_code: string | null;
  notes: string | null;
}

export interface InvoiceStats {
  totalCount: number;
  outstandingBalance: number;
  paidThisMonth: number;
  overdueCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePaymentToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ---------------------------------------------------------------------------
// useInvoiceList
// ---------------------------------------------------------------------------

export function useInvoiceList(searchTerm = '', statusFilter = '') {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('invoices')
      .select('*, companies(name)')
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (searchTerm) {
      query = query.or(
        `invoice_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,companies.name.ilike.%${searchTerm}%`
      );
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setInvoices([]);
    } else {
      // When searching by company name via the join, Supabase may return rows
      // where the join didn't match (companies is null). Filter those out when
      // a search term is active so only genuine matches remain.
      let results = (data || []) as Invoice[];
      if (searchTerm) {
        results = results.filter((inv) => {
          const term = searchTerm.toLowerCase();
          const matchesNumber = inv.invoice_number?.toLowerCase().includes(term);
          const matchesNotes = inv.notes?.toLowerCase().includes(term);
          const matchesCompany = (inv.companies as { name: string } | null)?.name
            ?.toLowerCase()
            .includes(term);
          return matchesNumber || matchesNotes || matchesCompany;
        });
      }
      setInvoices(results);
    }

    setLoading(false);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const stats: InvoiceStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    return {
      totalCount: invoices.length,
      outstandingBalance: invoices.reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0),
      paidThisMonth: invoices.reduce((sum, inv) => {
        if (inv.status === 'paid' && inv.updated_at >= monthStart) {
          return sum + (Number(inv.amount_paid) || 0);
        }
        return sum;
      }, 0),
      overdueCount: invoices.filter((inv) => {
        if (inv.status === 'paid' || inv.status === 'void') return false;
        if (!inv.due_date) return false;
        return new Date(inv.due_date) < now && (Number(inv.balance_due) || 0) > 0;
      }).length,
    };
  }, [invoices]);

  return { invoices, loading, error, refetch: fetchInvoices, stats };
}

// ---------------------------------------------------------------------------
// useInvoiceDetail
// ---------------------------------------------------------------------------

export function useInvoiceDetail(invoiceId: string | null) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!invoiceId) {
      setInvoice(null);
      setCompany(null);
      setSite(null);
      setLineItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch invoice
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceError) {
      setError(invoiceError.message);
      setLoading(false);
      return;
    }

    if (!invoiceData) {
      setError('Invoice not found');
      setLoading(false);
      return;
    }

    setInvoice(invoiceData as Invoice);

    // Fetch related data in parallel
    const fetchCompany = async () => {
      if (invoiceData.company_id) {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .eq('id', invoiceData.company_id)
          .maybeSingle();
        setCompany((data as Company) || null);
      } else {
        setCompany(null);
      }
    };

    const fetchSite = async () => {
      if (invoiceData.site_id) {
        const { data } = await supabase
          .from('sites')
          .select('*')
          .eq('id', invoiceData.site_id)
          .maybeSingle();
        setSite((data as Site) || null);
      } else {
        setSite(null);
      }
    };

    const fetchLineItems = async () => {
      const { data } = await supabase
        .from('invoice_line_items')
        .select('*, products(image_url)')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true });
      const items = (data || []).map((row: any) => ({
        ...row,
        product_image_url: row.products?.image_url ?? null,
        products: undefined,
      })) as InvoiceLineItem[];
      setLineItems(items);
    };

    await Promise.all([fetchCompany(), fetchSite(), fetchLineItems()]);
    setLoading(false);
  }, [invoiceId]);

  const refetchLineItems = useCallback(async () => {
    if (!invoiceId) return;
    const [{ data: itemsData }, { data: invData }] = await Promise.all([
      supabase
        .from('invoice_line_items')
        .select('*, products(image_url)')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true }),
      supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle(),
    ]);
    const items = (itemsData || []).map((row: any) => ({
      ...row,
      product_image_url: row.products?.image_url ?? null,
      products: undefined,
    })) as InvoiceLineItem[];
    setLineItems(items);
    if (invData) setInvoice(invData as Invoice);
  }, [invoiceId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { invoice, company, site, lineItems, loading, error, refetch: fetchDetail, refetchLineItems };
}

// ---------------------------------------------------------------------------
// Mutation functions (non-hook, return { data, error })
// ---------------------------------------------------------------------------

export async function createInvoice(
  data: Partial<Omit<Invoice, 'id' | 'invoice_number' | 'payment_token' | 'created_at' | 'updated_at'>>
): Promise<{ data: Invoice | null; error: string | null }> {
  try {
    // Generate next invoice number by finding the max existing one
    const { data: latest, error: seqError } = await supabase
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', 'INV-%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (seqError) {
      return { data: null, error: seqError.message };
    }

    let nextNum = 1001;
    if (latest?.invoice_number) {
      const match = latest.invoice_number.match(/INV-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    const invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`;
    const paymentToken = generatePaymentToken();

    const { data: created, error: insertError } = await supabase
      .from('invoices')
      .insert({
        ...data,
        invoice_number: invoiceNumber,
        payment_token: paymentToken,
        status: data.status || 'draft',
        subtotal: data.subtotal ?? 0,
        tax: data.tax ?? 0,
        total: data.total ?? 0,
        amount_paid: data.amount_paid ?? 0,
        balance_due: data.balance_due ?? data.total ?? 0,
        discount: data.discount ?? 0,
        discount_type: data.discount_type || 'flat',
      })
      .select('*')
      .single();

    if (insertError) {
      return { data: null, error: insertError.message };
    }

    return { data: created as Invoice, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error creating invoice';
    return { data: null, error: message };
  }
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, 'id' | 'invoice_number' | 'created_at'>>
): Promise<{ data: Invoice | null; error: string | null }> {
  try {
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    return { data: updated as Invoice, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error updating invoice';
    return { data: null, error: message };
  }
}

export async function deleteInvoice(
  id: string
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { data: null, error: deleteError.message };
    }

    return { data: { id }, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting invoice';
    return { data: null, error: message };
  }
}

// ---------------------------------------------------------------------------
// Line item mutations
// ---------------------------------------------------------------------------

export async function addLineItem(
  invoiceId: string,
  item: Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'created_at'>
): Promise<{ data: InvoiceLineItem | null; error: string | null }> {
  try {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);

    // Get max sort_order for this invoice to append at end
    const { data: existing } = await supabase
      .from('invoice_line_items')
      .select('sort_order')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;

    const { data: created, error: insertError } = await supabase
      .from('invoice_line_items')
      .insert({
        invoice_id: invoiceId,
        product_id: item.product_id || null,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: lineTotal,
        sort_order: nextOrder,
      })
      .select('*')
      .single();

    if (insertError) {
      return { data: null, error: insertError.message };
    }

    // Recalculate invoice totals
    const { error: recalcError } = await recalculateInvoiceTotals(invoiceId);
    if (recalcError) {
      return { data: created as InvoiceLineItem, error: recalcError };
    }

    return { data: created as InvoiceLineItem, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error adding line item';
    return { data: null, error: message };
  }
}

export async function updateLineItem(
  id: string,
  data: Partial<Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'created_at'>>
): Promise<{ data: InvoiceLineItem | null; error: string | null }> {
  try {
    // If quantity or unit_price changed, recalculate line total
    const updates: Record<string, unknown> = { ...data };
    if (data.quantity !== undefined || data.unit_price !== undefined) {
      // Need current values if only one field is being updated
      const { data: current, error: fetchError } = await supabase
        .from('invoice_line_items')
        .select('quantity, unit_price, invoice_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !current) {
        return { data: null, error: fetchError?.message || 'Line item not found' };
      }

      const qty = data.quantity !== undefined ? Number(data.quantity) : Number(current.quantity);
      const price = data.unit_price !== undefined ? Number(data.unit_price) : Number(current.unit_price);
      updates.total = qty * price;

      const { data: updated, error: updateError } = await supabase
        .from('invoice_line_items')
        .update(updates)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      const { error: recalcError } = await recalculateInvoiceTotals(current.invoice_id);
      if (recalcError) {
        return { data: updated as InvoiceLineItem, error: recalcError };
      }

      return { data: updated as InvoiceLineItem, error: null };
    }

    // No quantity/price changes — simple update
    const { data: updated, error: updateError } = await supabase
      .from('invoice_line_items')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    return { data: updated as InvoiceLineItem, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error updating line item';
    return { data: null, error: message };
  }
}

export async function deleteLineItem(
  id: string,
  invoiceId: string
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const { error: deleteError } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { data: null, error: deleteError.message };
    }

    const { error: recalcError } = await recalculateInvoiceTotals(invoiceId);
    if (recalcError) {
      return { data: { id }, error: recalcError };
    }

    return { data: { id }, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting line item';
    return { data: null, error: message };
  }
}

// ---------------------------------------------------------------------------
// Recalculate invoice totals
// ---------------------------------------------------------------------------

export async function recalculateInvoiceTotals(
  invoiceId: string
): Promise<{ data: Invoice | null; error: string | null }> {
  try {
    // Fetch all line items for this invoice
    const { data: items, error: itemsError } = await supabase
      .from('invoice_line_items')
      .select('total')
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      return { data: null, error: itemsError.message };
    }

    const subtotal = (items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);

    // Fetch current invoice to get discount info and amount_paid
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('discount, discount_type, amount_paid')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return { data: null, error: invoiceError?.message || 'Invoice not found' };
    }

    const discount = Number(invoice.discount) || 0;
    const discountType = invoice.discount_type || 'flat';
    const amountPaid = Number(invoice.amount_paid) || 0;

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discount / 100);
    } else {
      discountAmount = discount;
    }

    const tax = 0;
    const total = Math.max(subtotal - discountAmount + tax, 0);
    const balanceDue = Math.max(total - amountPaid, 0);

    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        subtotal,
        tax,
        total,
        balance_due: balanceDue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select('*')
      .maybeSingle();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    return { data: updated as Invoice, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error recalculating totals';
    return { data: null, error: message };
  }
}

// ---------------------------------------------------------------------------
// Record payment
// ---------------------------------------------------------------------------

export async function recordPayment(
  invoiceId: string,
  amount: number,
  method = 'check',
  reference = ''
): Promise<{ data: Transaction | null; error: string | null }> {
  try {
    // Fetch current invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('company_id, amount_paid, total, balance_due')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return { data: null, error: invoiceError?.message || 'Invoice not found' };
    }

    // Generate transaction number
    const { data: latestTxn } = await supabase
      .from('transactions')
      .select('transaction_number')
      .ilike('transaction_number', 'TXN-%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextTxnNum = 1001;
    if (latestTxn?.transaction_number) {
      const match = latestTxn.transaction_number.match(/TXN-(\d+)/);
      if (match) {
        nextTxnNum = parseInt(match[1], 10) + 1;
      }
    }

    const transactionNumber = `TXN-${String(nextTxnNum).padStart(4, '0')}`;

    // Insert transaction
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        transaction_number: transactionNumber,
        company_id: invoice.company_id,
        invoice_id: invoiceId,
        transaction_type: 'payment',
        payment_method: method,
        amount,
        transaction_date: new Date().toISOString().split('T')[0],
        reference_number: reference || null,
      })
      .select('*')
      .single();

    if (txnError) {
      return { data: null, error: txnError.message };
    }

    // Update invoice payment fields
    const newAmountPaid = (Number(invoice.amount_paid) || 0) + amount;
    const newBalanceDue = Math.max((Number(invoice.total) || 0) - newAmountPaid, 0);
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'sent';

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      return { data: transaction as Transaction, error: updateError.message };
    }

    return { data: transaction as Transaction, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error recording payment';
    return { data: null, error: message };
  }
}

// ---------------------------------------------------------------------------
// Reorder line items (drag-and-drop)
// ---------------------------------------------------------------------------

export async function reorderLineItems(
  orderedIds: string[]
): Promise<{ error: string | null }> {
  try {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('invoice_line_items')
        .update({ sort_order: index })
        .eq('id', id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      return { error: failed.error.message };
    }
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error reordering';
    return { error: message };
  }
}
