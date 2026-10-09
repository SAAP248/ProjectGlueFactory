import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { inRange, type DateRange } from '../../../lib/dateRange';

export type MethodKey = 'credit_card' | 'ach' | 'check' | 'cash' | 'wire' | 'other';

export const METHODS: { key: MethodKey; label: string; bar: string; pill: string; dot: string }[] = [
  { key: 'credit_card', label: 'Credit Card', bar: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  { key: 'ach', label: 'ACH', bar: 'bg-teal-500', pill: 'bg-teal-50 text-teal-700 ring-teal-200', dot: 'bg-teal-500' },
  { key: 'check', label: 'Check', bar: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  { key: 'wire', label: 'Wire', bar: 'bg-rose-400', pill: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-400' },
  { key: 'cash', label: 'Cash', bar: 'bg-lime-500', pill: 'bg-lime-50 text-lime-700 ring-lime-200', dot: 'bg-lime-500' },
  { key: 'other', label: 'Other', bar: 'bg-gray-400', pill: 'bg-gray-100 text-gray-700 ring-gray-200', dot: 'bg-gray-400' },
];

export const methodMeta = (key: MethodKey) => METHODS.find((m) => m.key === key) || METHODS[METHODS.length - 1];

export interface Txn {
  id: string;
  number: string;
  type: 'payment' | 'refund';
  method: MethodKey;
  amount: number;
  date: string;
  reference: string | null;
  notes: string | null;
  companyId: string | null;
  companyName: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
}

function normalizeMethod(raw: string | null): MethodKey {
  const v = (raw || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (v === 'credit_card' || v === 'card') return 'credit_card';
  if (v === 'ach' || v === 'ach_transfer') return 'ach';
  if (v === 'check') return 'check';
  if (v === 'cash') return 'cash';
  if (v === 'wire' || v === 'wire_transfer') return 'wire';
  return 'other';
}

interface Row {
  id: string;
  transaction_number: string | null;
  transaction_type: string | null;
  payment_method: string | null;
  amount: number | string | null;
  transaction_date: string | null;
  reference_number: string | null;
  notes: string | null;
  company_id: string | null;
  invoice_id: string | null;
  companies: { name: string } | null;
  invoices: { invoice_number: string } | null;
}

const PAGE = 1000;

export async function fetchAllTransactions(): Promise<Txn[]> {
  const out: Txn[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('transactions')
      .select(
        'id, transaction_number, transaction_type, payment_method, amount, transaction_date, reference_number, notes, company_id, invoice_id, companies(name), invoices(invoice_number)'
      )
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data || []) as unknown as Row[];
    for (const r of rows) {
      if (!r.transaction_date) continue;
      out.push({
        id: r.id,
        number: r.transaction_number || '—',
        type: r.transaction_type === 'refund' ? 'refund' : 'payment',
        method: normalizeMethod(r.payment_method),
        amount: Math.abs(Number(r.amount) || 0),
        date: r.transaction_date.slice(0, 10),
        reference: r.reference_number,
        notes: r.notes,
        companyId: r.company_id,
        companyName: r.companies?.name || 'Unknown customer',
        invoiceId: r.invoice_id,
        invoiceNumber: r.invoices?.invoice_number || null,
      });
    }
    if (rows.length < PAGE) break;
  }
  return out;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTransactions(await fetchAllTransactions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { transactions, loading, error, refetch: load };
}

export interface TxnSummary {
  gross: number;
  refunds: number;
  refundCount: number;
  net: number;
  count: number;
  average: number;
  byMethod: Record<MethodKey, { amount: number; count: number }>;
}

export function summarize(txns: Txn[], range: DateRange | null): TxnSummary {
  const byMethod = Object.fromEntries(METHODS.map((m) => [m.key, { amount: 0, count: 0 }])) as TxnSummary['byMethod'];
  let gross = 0;
  let refunds = 0;
  let refundCount = 0;
  let count = 0;
  if (range) {
    for (const t of txns) {
      if (!inRange(t.date, range)) continue;
      if (t.type === 'refund') {
        refunds += t.amount;
        refundCount++;
        byMethod[t.method].amount -= t.amount;
      } else {
        gross += t.amount;
        count++;
        byMethod[t.method].amount += t.amount;
        byMethod[t.method].count++;
      }
    }
  }
  return { gross, refunds, refundCount, net: gross - refunds, count, average: count ? gross / count : 0, byMethod };
}

export function formatMoney(n: number, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
  }).format(n || 0);
}
