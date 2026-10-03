import { supabase } from './supabase';

export interface WorkOrderSource {
  type: 'estimate' | 'invoice';
  id: string;
}

export interface WorkOrderLine {
  key: string;
  id?: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  group_key: string | null;
  group_label: string | null;
  group_sort: number;
  source_line_item_id: string | null;
}

export interface WorkOrderPrefill {
  companyId: string;
  siteId: string;
  dealId: string | null;
  title: string;
  scopeOfWork: string;
  sourceLabel: string;
  lines: WorkOrderLine[];
}

export const UNGROUPED_KEY = '__ungrouped';
export const UNGROUPED_LABEL = 'Other Items';

interface RawLine {
  id: string;
  product_id: string | null;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  unit_cost?: number | null;
  sort_order: number | null;
  system_group_id?: string | null;
  room_id?: string | null;
  products?: { cost: number | null } | null;
}

function toLine(li: RawLine, group: { key: string; label: string; sort: number } | null): WorkOrderLine {
  return {
    key: crypto.randomUUID(),
    product_id: li.product_id,
    description: li.description || '',
    quantity: Number(li.quantity) || 1,
    unit_price: Number(li.unit_price) || 0,
    cost_price: Number(li.unit_cost ?? li.products?.cost ?? 0) || 0,
    group_key: group?.key ?? null,
    group_label: group?.label ?? null,
    group_sort: group?.sort ?? 0,
    source_line_item_id: li.id,
  };
}

async function loadEstimatePrefill(id: string): Promise<{ data: WorkOrderPrefill | null; error: string | null }> {
  const { data: est, error } = await supabase
    .from('estimates')
    .select('id, estimate_number, company_id, site_id, deal_id, grouping_mode, scope_of_work, notes')
    .eq('id', id)
    .maybeSingle();
  if (error || !est) return { data: null, error: error?.message || 'Estimate not found' };

  const { data: rawLines, error: lineErr } = await supabase
    .from('estimate_line_items')
    .select('id, product_id, description, quantity, unit_price, unit_cost, sort_order, system_group_id, room_id, products(cost)')
    .eq('estimate_id', id)
    .order('sort_order')
    .order('created_at');
  if (lineErr) return { data: null, error: lineErr.message };
  const lines = (rawLines || []) as unknown as RawLine[];

  const byRoom = est.grouping_mode === 'by_room';
  const groupIds = [...new Set(lines.map(l => (byRoom ? l.room_id : l.system_group_id)).filter(Boolean))] as string[];
  const groups = new Map<string, { name: string; sort_order: number }>();
  if (groupIds.length > 0) {
    const { data: gRows } = await supabase
      .from(byRoom ? 'proposal_rooms' : 'deal_systems')
      .select('id, name, sort_order')
      .in('id', groupIds);
    (gRows || []).forEach((g: any) => groups.set(g.id, { name: g.name || 'Unnamed', sort_order: g.sort_order ?? 0 }));
  }

  const anyGrouped = groupIds.length > 0;
  const mapped = lines.map(li => {
    const gid = byRoom ? li.room_id : li.system_group_id;
    const g = gid ? groups.get(gid) : undefined;
    if (!anyGrouped) return toLine(li, null);
    if (gid && g) return toLine(li, { key: gid, label: g.name, sort: g.sort_order });
    return toLine(li, { key: UNGROUPED_KEY, label: UNGROUPED_LABEL, sort: 9999 });
  });

  return {
    data: {
      companyId: est.company_id || '',
      siteId: est.site_id || '',
      dealId: est.deal_id || null,
      title: `Install – Estimate #${est.estimate_number}`,
      scopeOfWork: est.scope_of_work || est.notes || '',
      sourceLabel: `Estimate #${est.estimate_number}`,
      lines: mapped,
    },
    error: null,
  };
}

async function loadInvoicePrefill(id: string): Promise<{ data: WorkOrderPrefill | null; error: string | null }> {
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, company_id, site_id, estimate_id, notes, estimates(deal_id)')
    .eq('id', id)
    .maybeSingle();
  if (error || !inv) return { data: null, error: error?.message || 'Invoice not found' };

  const { data: rawLines, error: lineErr } = await supabase
    .from('invoice_line_items')
    .select('id, product_id, description, quantity, unit_price, sort_order, products(cost)')
    .eq('invoice_id', id)
    .order('sort_order');
  if (lineErr) return { data: null, error: lineErr.message };

  return {
    data: {
      companyId: inv.company_id || '',
      siteId: inv.site_id || '',
      dealId: (inv.estimates as any)?.deal_id || null,
      title: `Work – Invoice #${inv.invoice_number}`,
      scopeOfWork: inv.notes || '',
      sourceLabel: `Invoice #${inv.invoice_number}`,
      lines: ((rawLines || []) as unknown as RawLine[]).map(li => toLine(li, null)),
    },
    error: null,
  };
}

export function loadWorkOrderPrefill(source: WorkOrderSource) {
  return source.type === 'estimate' ? loadEstimatePrefill(source.id) : loadInvoicePrefill(source.id);
}

export async function acceptEstimateFromWorkOrder(estimateId: string, workOrderId: string): Promise<string | null> {
  const { data: est, error } = await supabase
    .from('estimates')
    .select('id, status, accepted_at, deal_id')
    .eq('id', estimateId)
    .maybeSingle();
  if (error || !est) return error?.message || 'Estimate not found';
  if (est.status === 'approved') return null;

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from('estimates')
    .update({ status: 'approved', accepted_at: now, accepted_via_work_order_id: workOrderId, updated_at: now })
    .eq('id', estimateId);
  if (upErr) return upErr.message;

  if (est.deal_id) {
    const { data: deal } = await supabase.from('deals').select('sales_stage').eq('id', est.deal_id).maybeSingle();
    if (deal && deal.sales_stage !== 'Sold') {
      const { error: dealErr } = await supabase
        .from('deals')
        .update({ sales_stage: 'Sold', stage_entered_at: now, updated_at: now })
        .eq('id', est.deal_id);
      if (!dealErr) {
        await supabase.from('deal_activities').insert({
          deal_id: est.deal_id,
          activity_type: 'stage_change',
          description: `Stage changed from "${deal.sales_stage || 'None'}" to "Sold" (estimate accepted via work order)`,
          old_value: deal.sales_stage,
          new_value: 'Sold',
        });
      }
    }
  }
  return null;
}

export interface LinkedWorkOrder {
  id: string;
  wo_number: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  totalUnits: number;
  installedUnits: number;
}

export async function fetchLinkedWorkOrders(source: WorkOrderSource): Promise<{ data: LinkedWorkOrder[]; error: string | null }> {
  const { data: wos, error } = await supabase
    .from('work_orders')
    .select('id, wo_number, title, status, scheduled_date, work_order_line_items(id, quantity, line_type), work_order_parts(work_order_line_item_id, quantity)')
    .eq(source.type === 'estimate' ? 'source_estimate_id' : 'source_invoice_id', source.id)
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };

  return {
    data: (wos || []).map((wo: any) => {
      const lines = (wo.work_order_line_items || []).filter((l: any) => l.line_type === 'part');
      const used = new Map<string, number>();
      (wo.work_order_parts || []).forEach((p: any) => {
        if (p.work_order_line_item_id) used.set(p.work_order_line_item_id, (used.get(p.work_order_line_item_id) || 0) + Number(p.quantity || 0));
      });
      const totalUnits = lines.reduce((s: number, l: any) => s + Number(l.quantity || 0), 0);
      const installedUnits = lines.reduce((s: number, l: any) => s + Math.min(Number(l.quantity || 0), used.get(l.id) || 0), 0);
      return { id: wo.id, wo_number: wo.wo_number, title: wo.title, status: wo.status, scheduled_date: wo.scheduled_date, totalUnits, installedUnits };
    }),
    error: null,
  };
}

export function groupLines<T extends { group_key: string | null; group_label: string | null; group_sort: number }>(lines: T[]) {
  const groups: { key: string; label: string | null; sort: number; items: T[] }[] = [];
  lines.forEach(line => {
    const key = line.group_key || '';
    let g = groups.find(x => x.key === key);
    if (!g) { g = { key, label: line.group_label, sort: line.group_sort, items: [] }; groups.push(g); }
    g.items.push(line);
  });
  return groups.sort((a, b) => a.sort - b.sort);
}
