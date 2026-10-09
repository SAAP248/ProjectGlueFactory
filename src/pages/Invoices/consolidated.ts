import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { recordPayment, type Invoice } from './useInvoices';

export interface ConsolidatedInvoice {
  id: string;
  consolidated_number: string;
  company_id: string | null;
  invoice_date: string | null;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  companies?: { name: string } | null;
  invoices: Invoice[];
}

export interface ConsolidatedSummary {
  total: number;
  paid: number;
  balance: number;
  count: number;
  paidCount: number;
  status: string;
}

const SELECT = '*, companies(name), invoices(*, companies(name))';

function isClosed(inv: Invoice) {
  return inv.status === 'paid' || inv.status === 'void';
}

export function summarize(ci: Pick<ConsolidatedInvoice, 'invoices' | 'due_date' | 'status'>): ConsolidatedSummary {
  const children = ci.invoices || [];
  const total = children.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const paid = children.reduce((s, i) => s + (Number(i.amount_paid) || 0), 0);
  const balance = children.reduce((s, i) => s + (isClosed(i) ? 0 : Number(i.balance_due) || 0), 0);
  const paidCount = children.filter(isClosed).length;
  const today = new Date().toISOString().slice(0, 10);

  let status = ci.status === 'draft' ? 'draft' : 'sent';
  if (children.length > 0 && paidCount === children.length) status = 'paid';
  else if (ci.status === 'void') status = 'void';
  else if (ci.due_date && ci.due_date < today && balance > 0) status = 'overdue';
  else if (paid > 0) status = 'partial';

  return { total, paid, balance, count: children.length, paidCount, status };
}

function sortChildren(ci: ConsolidatedInvoice): ConsolidatedInvoice {
  return {
    ...ci,
    invoices: [...(ci.invoices || [])].sort((a, b) => a.invoice_number.localeCompare(b.invoice_number)),
  };
}

export function useConsolidatedList(companyIds?: string[]) {
  const [items, setItems] = useState<ConsolidatedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = companyIds?.join(',') ?? '';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from('consolidated_invoices').select(SELECT).order('invoice_date', { ascending: false });
    if (key) query = query.in('company_id', key.split(','));
    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
      setItems([]);
    } else {
      setItems(((data || []) as ConsolidatedInvoice[]).map(sortChildren));
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { items, loading, error, refetch: fetchAll };
}

export function useConsolidatedDetail(id: string) {
  const [ci, setCi] = useState<ConsolidatedInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase.from('consolidated_invoices').select(SELECT).eq('id', id).maybeSingle();
    if (err) setError(err.message);
    else if (!data) setError('Consolidated invoice not found');
    else setCi(sortChildren(data as ConsolidatedInvoice));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  return { ci, loading, error, refetch: fetchOne };
}

export async function syncConsolidatedStatus(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('consolidated_invoices')
    .select('status, due_date, invoices(*)')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return error?.message || 'Consolidated invoice not found';
  const { status } = summarize(data as unknown as ConsolidatedInvoice);
  const { error: upErr } = await supabase
    .from('consolidated_invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  return upErr?.message ?? null;
}

async function nextConsolidatedNumber(): Promise<string> {
  const { data } = await supabase.from('consolidated_invoices').select('consolidated_number');
  const max = (data || []).reduce((m, r) => {
    const n = parseInt(String(r.consolidated_number).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 1000);
  return `CI-${max + 1}`;
}

export async function createConsolidated(input: {
  companyId: string;
  invoiceIds: string[];
  dueDate: string | null;
  notes: string;
}): Promise<{ id: string | null; error: string | null }> {
  const consolidated_number = await nextConsolidatedNumber();
  const { data, error } = await supabase
    .from('consolidated_invoices')
    .insert({
      consolidated_number,
      company_id: input.companyId,
      due_date: input.dueDate,
      notes: input.notes || null,
      status: 'sent',
    })
    .select('id')
    .single();
  if (error || !data) return { id: null, error: error?.message || 'Could not create consolidated invoice' };

  const linkErr = await addInvoicesToConsolidated(data.id, input.invoiceIds);
  return { id: data.id, error: linkErr };
}

export async function addInvoicesToConsolidated(id: string, invoiceIds: string[]): Promise<string | null> {
  if (invoiceIds.length === 0) return null;
  const { error } = await supabase
    .from('invoices')
    .update({ consolidated_invoice_id: id, updated_at: new Date().toISOString() })
    .in('id', invoiceIds);
  if (error) return error.message;
  return syncConsolidatedStatus(id);
}

export async function removeInvoiceFromConsolidated(id: string, invoiceId: string): Promise<string | null> {
  const { error } = await supabase
    .from('invoices')
    .update({ consolidated_invoice_id: null, updated_at: new Date().toISOString() })
    .eq('id', invoiceId);
  if (error) return error.message;
  return syncConsolidatedStatus(id);
}

export async function payConsolidatedChildren(
  id: string,
  children: Invoice[],
  method: string,
  reference: string
): Promise<string | null> {
  for (const child of children) {
    const balance = Number(child.balance_due) || 0;
    if (balance <= 0) continue;
    const { error } = await recordPayment(child.id, balance, method, reference);
    if (error) return `${child.invoice_number}: ${error}`;
  }
  return syncConsolidatedStatus(id);
}

export interface BillingCompany {
  id: string;
  name: string;
  parent_company_id: string | null;
  bill_with_parent: boolean;
}

export async function fetchBillingCompanies(): Promise<BillingCompany[]> {
  const { data } = await supabase
    .from('companies')
    .select('id, name, parent_company_id, bill_with_parent')
    .order('name');
  return (data || []) as BillingCompany[];
}

export async function fetchEligibleInvoices(companyId: string): Promise<Invoice[]> {
  const { data: subs } = await supabase
    .from('companies')
    .select('id')
    .eq('parent_company_id', companyId)
    .eq('bill_with_parent', true);
  const ids = [companyId, ...(subs || []).map((s) => s.id as string)];
  const { data } = await supabase
    .from('invoices')
    .select('*, companies(name)')
    .in('company_id', ids)
    .is('consolidated_invoice_id', null)
    .not('status', 'in', '("paid","void")')
    .order('invoice_date', { ascending: false });
  return (data || []) as Invoice[];
}
