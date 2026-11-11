import { supabase } from './supabase';
import { useAppSetting } from './useAppSettings';

export type FeeSource = 'estimated' | 'actual' | 'manual';
export type FeeKind = 'card' | 'ach' | 'none';

export interface FeeRates {
  cardPct: number;
  cardFlat: number;
  achPct: number;
  achFlat: number;
  surchargePct: number;
}

export const DEFAULT_FEE_RATES: FeeRates = {
  cardPct: 2.89,
  cardFlat: 0.25,
  achPct: 0,
  achFlat: 0.65,
  surchargePct: 3,
};

export const FEE_SETTING_KEYS = {
  cardPct: 'merchant_fee_card_pct',
  cardFlat: 'merchant_fee_card_flat',
  achPct: 'merchant_fee_ach_pct',
  achFlat: 'merchant_fee_ach_flat',
  surchargePct: 'merchant_surcharge_pct',
  lastSync: 'merchant_forte_last_sync',
} as const;

function num(v: string, fallback: number) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function useFeeRates(): { rates: FeeRates; loading: boolean } {
  const [cardPct, l1] = useAppSetting(FEE_SETTING_KEYS.cardPct);
  const [cardFlat, l2] = useAppSetting(FEE_SETTING_KEYS.cardFlat);
  const [achPct, l3] = useAppSetting(FEE_SETTING_KEYS.achPct);
  const [achFlat, l4] = useAppSetting(FEE_SETTING_KEYS.achFlat);
  const [surchargePct, l5] = useAppSetting(FEE_SETTING_KEYS.surchargePct);
  return {
    rates: {
      cardPct: num(cardPct, DEFAULT_FEE_RATES.cardPct),
      cardFlat: num(cardFlat, DEFAULT_FEE_RATES.cardFlat),
      achPct: num(achPct, DEFAULT_FEE_RATES.achPct),
      achFlat: num(achFlat, DEFAULT_FEE_RATES.achFlat),
      surchargePct: num(surchargePct, DEFAULT_FEE_RATES.surchargePct),
    },
    loading: l1 || l2 || l3 || l4 || l5,
  };
}

export function feeKind(method: string | null | undefined): FeeKind {
  const m = (method || '').toLowerCase();
  if (['credit_card', 'card', 'credit', 'debit', 'debit_card', 'cc'].includes(m)) return 'card';
  if (['ach', 'echeck', 'e-check', 'bank', 'bank_transfer'].includes(m)) return 'ach';
  return 'none';
}

export function methodLabel(method: string | null | undefined): string {
  const kind = feeKind(method);
  if (kind === 'card') return 'Credit Card';
  if (kind === 'ach') return 'ACH';
  const m = (method || '').toLowerCase();
  if (!m) return 'Unknown';
  return m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, ' ');
}

export function estimateFee(method: string | null | undefined, amount: number, rates: FeeRates): number {
  const kind = feeKind(method);
  if (kind === 'none' || amount <= 0) return 0;
  const pct = kind === 'card' ? rates.cardPct : rates.achPct;
  const flat = kind === 'card' ? rates.cardFlat : rates.achFlat;
  return Math.round((amount * pct / 100 + flat) * 100) / 100;
}

export interface FeePayment {
  id: string;
  table: 'transactions' | 'portal_payments';
  invoice_id: string | null;
  amount: number;
  payment_method: string | null;
  paid_on: string | null;
  merchant_fee: number;
  fee_source: FeeSource;
  fee_synced_at: string | null;
  reference: string | null;
}

const TXN_COLS = 'id, invoice_id, amount, payment_method, transaction_date, created_at, merchant_fee, fee_source, fee_synced_at, reference_number, transaction_type';
const PORTAL_COLS = 'id, invoice_id, amount, payment_method, paid_at, merchant_fee, fee_source, fee_synced_at, reference_number';

function mapTxn(r: any): FeePayment {
  return {
    id: r.id,
    table: 'transactions',
    invoice_id: r.invoice_id,
    amount: Number(r.amount) || 0,
    payment_method: r.payment_method,
    paid_on: r.transaction_date || r.created_at,
    merchant_fee: Number(r.merchant_fee) || 0,
    fee_source: (r.fee_source || 'estimated') as FeeSource,
    fee_synced_at: r.fee_synced_at,
    reference: r.reference_number,
  };
}

function mapPortal(r: any): FeePayment {
  return {
    id: r.id,
    table: 'portal_payments',
    invoice_id: r.invoice_id,
    amount: Number(r.amount) || 0,
    payment_method: r.payment_method,
    paid_on: r.paid_at,
    merchant_fee: Number(r.merchant_fee) || 0,
    fee_source: (r.fee_source || 'estimated') as FeeSource,
    fee_synced_at: r.fee_synced_at,
    reference: r.reference_number,
  };
}

export async function fetchPaymentsForInvoices(invoiceIds: string[]): Promise<{ data: FeePayment[]; error: string | null }> {
  if (invoiceIds.length === 0) return { data: [], error: null };
  const out: FeePayment[] = [];
  const chunk = 200;
  for (let i = 0; i < invoiceIds.length; i += chunk) {
    const ids = invoiceIds.slice(i, i + chunk);
    const [txn, portal] = await Promise.all([
      supabase.from('transactions').select(TXN_COLS).in('invoice_id', ids).eq('transaction_type', 'payment'),
      supabase.from('portal_payments').select(PORTAL_COLS).in('invoice_id', ids),
    ]);
    if (txn.error) return { data: [], error: txn.error.message };
    if (portal.error) return { data: [], error: portal.error.message };
    out.push(...(txn.data || []).map(mapTxn), ...(portal.data || []).map(mapPortal));
  }
  out.sort((a, b) => (a.paid_on || '').localeCompare(b.paid_on || ''));
  return { data: out, error: null };
}

export async function setManualFee(p: FeePayment, fee: number): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from(p.table)
    .update({ merchant_fee: Math.max(0, Math.round(fee * 100) / 100), fee_source: 'manual' })
    .eq('id', p.id);
  return { error: error?.message ?? null };
}

function hashUnit(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// Sandbox stand-in for the CSG Forte settlement API: card mix varies the effective rate per payment.
function simulatedActualFee(p: FeePayment, rates: FeeRates): number {
  const kind = feeKind(p.payment_method);
  const u = hashUnit(p.id);
  if (kind === 'ach') return Math.round((p.amount * rates.achPct / 100 + rates.achFlat) * 100) / 100;
  const pctAdj = u < 0.2 ? -0.9 : u < 0.65 ? 0 : u < 0.9 ? 0.3 : 0.6;
  const pct = Math.max(0, rates.cardPct + pctAdj);
  return Math.round((p.amount * pct / 100 + rates.cardFlat) * 100) / 100;
}

export async function syncWithForte(payments: FeePayment[], rates: FeeRates): Promise<{ synced: number; error: string | null }> {
  const targets = payments.filter((p) => p.fee_source === 'estimated' && feeKind(p.payment_method) !== 'none' && p.amount > 0);
  const now = new Date().toISOString();
  let synced = 0;
  for (let i = 0; i < targets.length; i += 25) {
    const batch = targets.slice(i, i + 25);
    const results = await Promise.all(batch.map((p) =>
      supabase.from(p.table)
        .update({ merchant_fee: simulatedActualFee(p, rates), fee_source: 'actual', fee_synced_at: now, processor: 'csg_forte' })
        .eq('id', p.id)
    ));
    const failed = results.find((r) => r.error);
    if (failed?.error) return { synced, error: failed.error.message };
    synced += batch.length;
  }
  return { synced, error: null };
}

export interface PnlLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCost: number | null;
  revenue: number;
  cost: number;
  profit: number;
}

export interface InvoicePnl {
  lines: PnlLine[];
  lineRevenue: number;
  discount: number;
  sales: number;
  productCost: number;
  merchantFees: number;
  grossProfit: number;
  margin: number;
  surcharge: number;
  unknownCostCount: number;
}

interface PnlInvoice {
  subtotal: number;
  total: number;
  surcharge_amount?: number | null;
}

interface PnlLineItem {
  id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  unit_cost?: number | null;
}

export function computeInvoicePnl(invoice: PnlInvoice, items: PnlLineItem[], payments: FeePayment[]): InvoicePnl {
  const lines: PnlLine[] = items.map((li) => {
    const qty = Number(li.quantity) || 0;
    const revenue = Number(li.total) || 0;
    const unitCost = li.unit_cost === null || li.unit_cost === undefined ? null : Number(li.unit_cost);
    const cost = unitCost === null ? 0 : unitCost * qty;
    return {
      id: li.id,
      description: li.description || 'Item',
      quantity: qty,
      unitPrice: Number(li.unit_price) || 0,
      unitCost,
      revenue,
      cost,
      profit: revenue - cost,
    };
  });
  const lineRevenue = lines.reduce((s, l) => s + l.revenue, 0);
  const surcharge = Number(invoice.surcharge_amount) || 0;
  const sales = Math.max((Number(invoice.total) || 0) - surcharge, 0);
  const discount = Math.max(lineRevenue - sales, 0);
  const productCost = lines.reduce((s, l) => s + l.cost, 0);
  const merchantFees = payments.reduce((s, p) => s + p.merchant_fee, 0);
  const grossProfit = sales - productCost - merchantFees;
  return {
    lines,
    lineRevenue,
    discount,
    sales,
    productCost,
    merchantFees,
    grossProfit,
    margin: sales > 0 ? (grossProfit / sales) * 100 : 0,
    surcharge,
    unknownCostCount: lines.filter((l) => l.unitCost === null).length,
  };
}
