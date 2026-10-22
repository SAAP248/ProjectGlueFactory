import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { workedMinutes, laborCostFor, productCost, isProductLine } from './jobCosting';

export interface DealAccountingDeal {
  id: string;
  title: string;
  value: number;
  commission_amount: number;
  commission_payroll_date: string | null;
  assigned_employee: { first_name: string; last_name: string } | null;
}

export interface DealEstimate {
  id: string;
  estimate_number: string;
  status: string;
  estimate_date: string | null;
  total: number;
  accepted_at: string | null;
}

export interface DealInvoice {
  id: string;
  invoice_number: string;
  status: string;
  invoice_date: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
}

export interface DealPayment {
  id: string;
  transaction_number: string;
  payment_method: string | null;
  amount: number;
  transaction_date: string;
  reference_number: string | null;
  invoice_id: string | null;
}

export interface LaborLine {
  id: string;
  employeeName: string;
  workDate: string | null;
  minutes: number;
  rate: number;
  cost: number;
}

export interface DealWorkOrderCost {
  id: string;
  wo_number: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  labor: LaborLine[];
  laborMinutes: number;
  laborCost: number;
}

export interface ProductLine {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
}

export interface DealAccounting {
  deal: DealAccountingDeal;
  estimates: DealEstimate[];
  invoices: DealInvoice[];
  payments: DealPayment[];
  workOrders: DealWorkOrderCost[];
  products: ProductLine[];
  productsSource: 'work_orders' | 'estimate' | 'none';
  soldFor: number;
  collected: number;
  balanceDue: number;
  productCost: number;
  laborMinutes: number;
  laborCost: number;
  commission: number;
  netProfit: number;
  marginPct: number;
}

function pickPrimaryEstimate(estimates: DealEstimate[]): DealEstimate | null {
  return estimates.find(e => e.status === 'accepted' || e.status === 'approved') ?? estimates[0] ?? null;
}

async function loadDealAccounting(dealId: string): Promise<DealAccounting> {
  const [dealRes, estRes, woRes] = await Promise.all([
    supabase
      .from('deals')
      .select('id, title, value, commission_amount, commission_payroll_date, assigned_employee:employees!deals_assigned_employee_id_fkey(first_name, last_name)')
      .eq('id', dealId)
      .maybeSingle(),
    supabase
      .from('estimates')
      .select('id, estimate_number, status, estimate_date, total, accepted_at')
      .eq('deal_id', dealId)
      .order('estimate_date', { ascending: false }),
    supabase
      .from('work_orders')
      .select('id, wo_number, title, status, scheduled_date')
      .eq('deal_id', dealId)
      .order('scheduled_date', { ascending: true }),
  ]);
  if (dealRes.error) throw dealRes.error;
  if (estRes.error) throw estRes.error;
  if (woRes.error) throw woRes.error;
  if (!dealRes.data) throw new Error('Deal not found');

  const deal = dealRes.data as unknown as DealAccountingDeal;
  const estimates = (estRes.data ?? []) as DealEstimate[];
  const woRows = (woRes.data ?? []) as Omit<DealWorkOrderCost, 'labor' | 'laborMinutes' | 'laborCost'>[];
  const woIds = woRows.map(w => w.id);
  const estIds = estimates.map(e => e.id);
  const primary = pickPrimaryEstimate(estimates);

  const invoiceFilters = [
    woIds.length ? `work_order_id.in.(${woIds.join(',')})` : null,
    estIds.length ? `estimate_id.in.(${estIds.join(',')})` : null,
  ].filter(Boolean).join(',');

  const [techRes, lineRes, invRes, estLineRes] = await Promise.all([
    woIds.length
      ? supabase
          .from('work_order_technicians')
          .select('id, work_order_id, scheduled_date, onsite_at, completed_at, total_paused_minutes, employees(first_name, last_name, loaded_cost)')
          .in('work_order_id', woIds)
      : Promise.resolve({ data: [], error: null }),
    woIds.length
      ? supabase
          .from('work_order_line_items')
          .select('id, line_type, description, quantity, unit_price, cost_price')
          .in('work_order_id', woIds)
      : Promise.resolve({ data: [], error: null }),
    invoiceFilters
      ? supabase
          .from('invoices')
          .select('id, invoice_number, status, invoice_date, total, amount_paid, balance_due')
          .or(invoiceFilters)
          .order('invoice_date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    primary
      ? supabase
          .from('estimate_line_items')
          .select('id, description, quantity, unit_price, unit_cost')
          .eq('estimate_id', primary.id)
          .order('sort_order')
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [techRes, lineRes, invRes, estLineRes]) if (r.error) throw r.error;

  const invoices = ((invRes.data ?? []) as DealInvoice[]).filter(i => i.status !== 'void');
  const invoiceIds = invoices.map(i => i.id);

  let payments: DealPayment[] = [];
  if (invoiceIds.length) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, transaction_number, payment_method, amount, transaction_date, reference_number, invoice_id')
      .in('invoice_id', invoiceIds)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    payments = (data ?? []) as DealPayment[];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const techRows = (techRes.data ?? []) as any[];
  const workOrders: DealWorkOrderCost[] = woRows.map(wo => {
    const labor: LaborLine[] = techRows
      .filter(t => t.work_order_id === wo.id)
      .map(t => {
        const minutes = workedMinutes(t);
        const rate = Number(t.employees?.loaded_cost) || 0;
        return {
          id: t.id,
          employeeName: `${t.employees?.first_name ?? ''} ${t.employees?.last_name ?? ''}`.trim() || 'Unknown',
          workDate: t.completed_at ?? t.onsite_at ?? t.scheduled_date ?? null,
          minutes,
          rate,
          cost: laborCostFor(minutes, rate),
        };
      });
    return {
      ...wo,
      labor,
      laborMinutes: labor.reduce((s, l) => s + l.minutes, 0),
      laborCost: labor.reduce((s, l) => s + l.cost, 0),
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const woLines = (lineRes.data ?? []) as any[];
  const woProductLines = woLines.filter(isProductLine);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const estLines = (estLineRes.data ?? []) as any[];

  let products: ProductLine[];
  let productsSource: DealAccounting['productsSource'];
  let productTotalCost: number;
  if (woProductLines.length) {
    productsSource = 'work_orders';
    products = woProductLines.map(li => ({
      id: li.id, description: li.description, quantity: Number(li.quantity),
      unitCost: Number(li.cost_price) || 0, unitPrice: Number(li.unit_price) || 0,
    }));
    productTotalCost = productCost(woLines);
  } else if (estLines.length) {
    productsSource = 'estimate';
    products = estLines.map(li => ({
      id: li.id, description: li.description, quantity: Number(li.quantity),
      unitCost: Number(li.unit_cost) || 0, unitPrice: Number(li.unit_price) || 0,
    }));
    productTotalCost = products.reduce((s, p) => s + p.unitCost * p.quantity, 0);
  } else {
    productsSource = 'none';
    products = [];
    productTotalCost = 0;
  }

  const soldFor = Number(deal.value) || Number(primary?.total) || 0;
  const laborMinutes = workOrders.reduce((s, w) => s + w.laborMinutes, 0);
  const laborCost = workOrders.reduce((s, w) => s + w.laborCost, 0);
  const commission = Number(deal.commission_amount) || 0;
  const netProfit = soldFor - productTotalCost - laborCost - commission;

  return {
    deal,
    estimates,
    invoices,
    payments,
    workOrders,
    products,
    productsSource,
    soldFor,
    collected: invoices.reduce((s, i) => s + (Number(i.amount_paid) || 0), 0),
    balanceDue: invoices.reduce((s, i) => s + (Number(i.balance_due) || 0), 0),
    productCost: productTotalCost,
    laborMinutes,
    laborCost,
    commission,
    netProfit,
    marginPct: soldFor > 0 ? (netProfit / soldFor) * 100 : 0,
  };
}

export function useDealAccounting(dealId: string | null) {
  const [data, setData] = useState<DealAccounting | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!dealId) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      setData(await loadDealAccounting(dealId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load accounting data');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
