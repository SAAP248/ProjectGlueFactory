import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { createInvoice } from '../Invoices/useInvoices';

export interface EstimateRecord {
  id: string;
  estimate_number: string;
  company_id: string | null;
  site_id: string | null;
  deal_id: string | null;
  status: string;
  estimate_date: string | null;
  expiration_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  terms: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  declined_reason: string | null;
  customer_name_signed: string | null;
  customer_email_signed: string | null;
  public_token: string;
  view_mode: 'estimate' | 'proposal';
  viewed_at: string | null;
  last_viewed_at: string | null;
  signature_type: 'typed' | 'drawn' | null;
  signature_data: string | null;
  cover_title: string | null;
  cover_image_url: string | null;
  scope_of_work: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string } | null;
  sites?: { name: string | null; address: string | null; city: string | null; state: string | null; zip: string | null } | null;
}

export interface EstimateLineItem {
  id: string;
  estimate_id: string;
  product_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number | null;
}

export interface EstimateDetailData {
  estimate: EstimateRecord;
  lineItems: EstimateLineItem[];
  invoice: { id: string; invoice_number: string } | null;
  deal: { id: string; title: string | null } | null;
}

export interface LineItemInput {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  product_id: string | null;
}

export interface EstimateInput {
  company_id: string;
  site_id: string | null;
  estimate_date: string;
  expiration_date: string | null;
  tax: number;
  notes: string | null;
  terms: string | null;
}

export const ESTIMATE_STATUSES = ['draft', 'sent', 'approved', 'declined', 'expired'] as const;

export const estimateStatusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-800',
};

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

export function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function generateEstimateNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  return `EST-${new Date().toISOString().slice(0, 10)}-${suffix}`;
}

export function useEstimateList(companyId?: string) {
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimates = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('estimates')
      .select('*, companies(name), sites(name, address, city, state, zip)')
      .order('created_at', { ascending: false });
    if (companyId) query = query.eq('company_id', companyId);

    const [{ data, error: fetchError }, { data: invData }, { data: unreadData }] = await Promise.all([
      query,
      supabase.from('invoices').select('estimate_id').not('estimate_id', 'is', null),
      supabase.from('proposal_messages').select('estimate_id').eq('sender_type', 'customer').is('read_at', null),
    ]);

    if (fetchError) {
      setError('Could not load estimates. Please try again.');
      setEstimates([]);
    } else {
      setEstimates((data || []) as EstimateRecord[]);
    }
    setConvertedIds(new Set((invData || []).map((r: { estimate_id: string }) => r.estimate_id)));
    const counts: Record<string, number> = {};
    (unreadData || []).forEach((r: { estimate_id: string }) => { counts[r.estimate_id] = (counts[r.estimate_id] || 0) + 1; });
    setUnreadCounts(counts);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  return { estimates, convertedIds, unreadCounts, loading, error, refetch: fetchEstimates };
}

export async function fetchEstimateDetail(id: string): Promise<{ data: EstimateDetailData | null; error: string | null }> {
  const [estRes, itemsRes, invRes] = await Promise.all([
    supabase
      .from('estimates')
      .select('*, companies(name), sites(name, address, city, state, zip)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('estimate_line_items').select('*').eq('estimate_id', id).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at'),
    supabase.from('invoices').select('id, invoice_number').eq('estimate_id', id).limit(1).maybeSingle(),
  ]);

  if (estRes.error || itemsRes.error) return { data: null, error: 'Could not load this estimate.' };
  if (!estRes.data) return { data: null, error: 'This estimate could not be found.' };

  const estimate = estRes.data as EstimateRecord;
  let deal: EstimateDetailData['deal'] = null;
  if (estimate.deal_id) {
    const { data: dealData } = await supabase.from('deals').select('id, title').eq('id', estimate.deal_id).maybeSingle();
    deal = (dealData as EstimateDetailData['deal']) || null;
  }

  return {
    data: {
      estimate,
      lineItems: (itemsRes.data || []) as EstimateLineItem[],
      invoice: (invRes.data as EstimateDetailData['invoice']) || null,
      deal,
    },
    error: null,
  };
}

function totalsFor(items: LineItemInput[], tax: number) {
  const subtotal = items.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);
  return { subtotal, tax, total: subtotal + tax };
}

export async function saveEstimate(
  estimateId: string | null,
  input: EstimateInput,
  items: LineItemInput[]
): Promise<{ id: string | null; error: string | null }> {
  const totals = totalsFor(items, input.tax);
  const now = new Date().toISOString();
  let id = estimateId;

  if (id) {
    const { error } = await supabase.from('estimates').update({ ...input, ...totals, updated_at: now }).eq('id', id);
    if (error) return { id: null, error: 'Could not save the estimate.' };
  } else {
    const { data, error } = await supabase
      .from('estimates')
      .insert({ ...input, ...totals, status: 'draft', estimate_number: generateEstimateNumber() })
      .select('id')
      .single();
    if (error || !data) return { id: null, error: 'Could not create the estimate.' };
    id = data.id as string;
  }

  if (estimateId) {
    const { data: existing, error: exErr } = await supabase
      .from('estimate_line_items').select('id').eq('estimate_id', estimateId);
    if (exErr) return { id, error: 'Estimate saved, but line items could not be updated.' };
    const keep = new Set(items.filter((i) => i.id).map((i) => i.id));
    const removeIds = (existing || []).map((r: { id: string }) => r.id).filter((x) => !keep.has(x));
    if (removeIds.length) {
      const { error } = await supabase.from('estimate_line_items').delete().in('id', removeIds);
      if (error) return { id, error: 'Estimate saved, but some line items could not be removed.' };
    }
  }

  const results = await Promise.all(
    items.map((li, index) => {
      const row = {
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        total: (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
        product_id: li.product_id,
        sort_order: index,
      };
      return li.id
        ? supabase.from('estimate_line_items').update(row).eq('id', li.id)
        : supabase.from('estimate_line_items').insert({ ...row, estimate_id: id });
    })
  );
  if (results.some((r) => r.error)) return { id, error: 'Estimate saved, but some line items failed to save.' };

  return { id, error: null };
}

export async function updateEstimateStatus(id: string, status: string): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'approved') updates.accepted_at = new Date().toISOString();
  const { error } = await supabase.from('estimates').update(updates).eq('id', id);
  return { error: error ? 'Could not update the status.' : null };
}

export async function duplicateEstimate(detail: EstimateDetailData): Promise<{ id: string | null; error: string | null }> {
  const { estimate, lineItems } = detail;
  if (!estimate.company_id) return { id: null, error: 'This estimate has no customer to copy.' };
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);
  return saveEstimate(
    null,
    {
      company_id: estimate.company_id,
      site_id: estimate.site_id,
      estimate_date: new Date().toISOString().slice(0, 10),
      expiration_date: expires.toISOString().slice(0, 10),
      tax: Number(estimate.tax) || 0,
      notes: estimate.notes,
      terms: estimate.terms,
    },
    lineItems.map((li) => ({
      description: li.description || '',
      quantity: Number(li.quantity) || 0,
      unit_price: Number(li.unit_price) || 0,
      product_id: li.product_id,
    }))
  );
}

export async function convertEstimateToInvoice(detail: EstimateDetailData): Promise<{ invoiceId: string | null; error: string | null }> {
  const { estimate, lineItems } = detail;

  const { data: already } = await supabase
    .from('invoices').select('id').eq('estimate_id', estimate.id).limit(1).maybeSingle();
  if (already) return { invoiceId: already.id as string, error: null };

  // Invoices recalculate totals from line items with no separate tax, so tax is carried as its own line.
  const rows = lineItems.map((li, index) => ({
    product_id: li.product_id,
    description: li.description || 'Item',
    quantity: Number(li.quantity) || 0,
    unit_price: Number(li.unit_price) || 0,
    total: (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
    sort_order: index,
  }));
  const tax = Number(estimate.tax) || 0;
  if (tax > 0) {
    rows.push({ product_id: null, description: 'Sales Tax', quantity: 1, unit_price: tax, total: tax, sort_order: rows.length });
  }
  const total = rows.reduce((s, r) => s + r.total, 0);

  const due = new Date();
  due.setDate(due.getDate() + 30);
  const { data: invoice, error } = await createInvoice({
    company_id: estimate.company_id,
    site_id: estimate.site_id,
    estimate_id: estimate.id,
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: due.toISOString().slice(0, 10),
    notes: estimate.notes,
    terms: 'Net 30',
    status: 'draft',
    subtotal: total,
    tax: 0,
    total,
    amount_paid: 0,
    balance_due: total,
  });
  if (error || !invoice) return { invoiceId: null, error: 'Could not create the invoice.' };

  if (rows.length) {
    const { error: liErr } = await supabase
      .from('invoice_line_items')
      .insert(rows.map((r) => ({ ...r, invoice_id: invoice.id })));
    if (liErr) return { invoiceId: invoice.id, error: 'Invoice created, but its line items could not be copied.' };
  }

  return { invoiceId: invoice.id, error: null };
}
