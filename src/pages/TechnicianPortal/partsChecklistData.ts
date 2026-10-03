import { supabase } from '../../lib/supabase';
import type { PartUsed } from './types';

export interface ChecklistLine {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  group_key: string | null;
  group_label: string | null;
  group_sort: number;
}

export interface UsedPart extends PartUsed {
  product_id: string | null;
  used_by_employee_id: string | null;
  source_warehouse_id: string | null;
  work_order_line_item_id: string | null;
}

export interface CrewMember {
  id: string;
  name: string;
}

export interface StockLocation {
  id: string;
  name: string;
  warehouse_type: 'truck' | 'warehouse';
  assigned_employee_id: string | null;
}

export interface ChecklistData {
  lines: ChecklistLine[];
  parts: UsedPart[];
  crew: CrewMember[];
  locations: StockLocation[];
  stock: Record<string, number>;
}

export const stockKey = (warehouseId: string, productId: string) => `${warehouseId}:${productId}`;

export async function loadChecklist(workOrderId: string): Promise<{ data: ChecklistData | null; error: string | null }> {
  const [linesRes, partsRes, crewRes, locRes] = await Promise.all([
    supabase
      .from('work_order_line_items')
      .select('id, product_id, description, quantity, unit_price, cost_price, group_key, group_label, group_sort, sort_order')
      .eq('work_order_id', workOrderId)
      .order('group_sort')
      .order('sort_order')
      .order('created_at'),
    supabase.from('work_order_parts').select('*').eq('work_order_id', workOrderId).order('created_at'),
    supabase
      .from('work_order_technicians')
      .select('employee_id, employees(first_name, last_name)')
      .eq('work_order_id', workOrderId),
    supabase
      .from('warehouses')
      .select('id, name, warehouse_type, assigned_employee_id')
      .eq('is_active', true)
      .order('name'),
  ]);

  if (linesRes.error || partsRes.error || crewRes.error || locRes.error) {
    return { data: null, error: 'Could not load the parts list for this job.' };
  }

  const lines: ChecklistLine[] = (linesRes.data || []).map((l: any) => ({
    id: l.id,
    product_id: l.product_id,
    description: l.description || 'Item',
    quantity: Number(l.quantity) || 0,
    unit_price: Number(l.unit_price) || 0,
    cost_price: Number(l.cost_price) || 0,
    group_key: l.group_key,
    group_label: l.group_label,
    group_sort: l.group_sort ?? 0,
  }));

  const crewMap = new Map<string, CrewMember>();
  for (const row of (crewRes.data || []) as any[]) {
    if (!row.employee_id || crewMap.has(row.employee_id)) continue;
    const e = row.employees;
    crewMap.set(row.employee_id, { id: row.employee_id, name: e ? `${e.first_name} ${e.last_name}`.trim() : 'Technician' });
  }

  const locations = (locRes.data || []) as StockLocation[];
  const parts = (partsRes.data || []) as UsedPart[];
  const missing = [...new Set(parts.map(p => p.used_by_employee_id).filter((id): id is string => !!id && !crewMap.has(id)))];
  if (missing.length) {
    const { data: emps } = await supabase.from('employees').select('id, first_name, last_name').in('id', missing);
    for (const e of (emps || []) as any[]) crewMap.set(e.id, { id: e.id, name: `${e.first_name} ${e.last_name}`.trim() });
  }
  const productIds = [...new Set(lines.map(l => l.product_id).filter(Boolean))] as string[];
  const stock: Record<string, number> = {};
  if (productIds.length && locations.length) {
    const { data: inv } = await supabase
      .from('warehouse_inventory')
      .select('warehouse_id, product_id, quantity')
      .in('product_id', productIds)
      .in('warehouse_id', locations.map(l => l.id));
    for (const r of (inv || []) as any[]) stock[stockKey(r.warehouse_id, r.product_id)] = Number(r.quantity) || 0;
  }

  return {
    data: { lines, parts, crew: [...crewMap.values()], locations, stock },
    error: null,
  };
}

export function truckFor(locations: StockLocation[], employeeId: string | null | undefined) {
  if (!employeeId) return null;
  return locations.find(l => l.assigned_employee_id === employeeId) || null;
}

export async function recomputeWorkOrderTotals(job: {
  id: string;
  total_labor_cost: number | null;
  total_revenue: number | null;
  billing_type: string | null;
  fixed_amount: number | null;
}) {
  const { data: partsRows } = await supabase.from('work_order_parts').select('total_cost, total_price').eq('work_order_id', job.id);
  const partsCost = (partsRows || []).reduce((s: number, p: any) => s + Number(p.total_cost || 0), 0);
  const partsRevenue = (partsRows || []).reduce((s: number, p: any) => s + Number(p.total_price || 0), 0);

  const laborCost = Number(job.total_labor_cost || 0);
  const existingRevenue = Number(job.total_revenue || 0);
  const fixedRevenue = job.billing_type === 'fixed' ? Number(job.fixed_amount || 0) : 0;
  const totalRevenue = fixedRevenue > 0 ? fixedRevenue : Math.max(existingRevenue, partsRevenue + laborCost);
  const profit = totalRevenue - partsCost - laborCost;
  const margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 10000) / 100 : 0;

  await supabase.from('work_orders').update({
    total_parts_cost: partsCost,
    total_revenue: totalRevenue,
    profit_amount: profit,
    profit_margin_pct: margin,
  }).eq('id', job.id);
}
