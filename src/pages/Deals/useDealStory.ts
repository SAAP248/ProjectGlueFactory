import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Deal, DealActivity, Employee, StatusField } from './types';
import { getStatusGroup, isOffPath } from './types';

export interface StoryEstimate {
  id: string;
  estimate_number: string | null;
  status: string | null;
  total: number | null;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number | null;
  accepted_at: string | null;
  declined_at: string | null;
  declined_reason: string | null;
  customer_name_signed: string | null;
}

export interface StoryWorkOrder {
  id: string;
  wo_number: string | null;
  status: string;
  scheduled_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface StoryInvoice {
  id: string;
  invoice_number: string | null;
  status: string | null;
  total: number | null;
  balance_due: number | null;
  invoice_date: string | null;
  created_at: string;
  updated_at: string | null;
}

export type StoryLink =
  | { type: 'estimate' }
  | { type: 'work_order' }
  | { type: 'invoice'; id: string };

export type StoryGroup = 'sales' | 'install' | 'office';
export type StoryState = 'done' | 'declined' | 'current' | 'upcoming' | 'skipped';

export interface StoryEvent {
  key: string;
  label: string;
  group: StoryGroup;
  state: StoryState;
  date: string | null;
  detail?: string;
  actor?: string;
  link?: StoryLink;
}

export type NextAction =
  | 'create_estimate' | 'send_estimate' | 'follow_up' | 'mark_sold'
  | 'create_work_order' | 'view_work_orders' | 'open_invoice' | 'office_reviewed';

export interface NextStep {
  message: string;
  tone: 'info' | 'warn' | 'bad' | 'good';
  action?: { kind: NextAction; label: string; invoiceId?: string };
}

export function useDealStoryData(dealId: string | null, refreshKey: unknown) {
  const [estimates, setEstimates] = useState<StoryEstimate[]>([]);
  const [workOrders, setWorkOrders] = useState<StoryWorkOrder[]>([]);
  const [invoices, setInvoices] = useState<StoryInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!dealId) return;
    setError(false);
    const estRes = await supabase
      .from('estimates')
      .select('id, estimate_number, status, total, created_at, sent_at, viewed_at, last_viewed_at, view_count, accepted_at, declined_at, declined_reason, customer_name_signed')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });
    if (estRes.error) { setError(true); setLoading(false); return; }
    const ests = (estRes.data ?? []) as StoryEstimate[];
    const estIds = ests.map(e => e.id);

    let woQuery = supabase
      .from('work_orders')
      .select('id, wo_number, status, scheduled_date, completed_at, created_at')
      .order('created_at', { ascending: true });
    woQuery = estIds.length
      ? woQuery.or(`deal_id.eq.${dealId},source_estimate_id.in.(${estIds.join(',')})`)
      : woQuery.eq('deal_id', dealId);
    const woRes = await woQuery;
    if (woRes.error) { setError(true); setLoading(false); return; }
    const wos = (woRes.data ?? []) as StoryWorkOrder[];
    const woIds = wos.map(w => w.id);

    let invs: StoryInvoice[] = [];
    const filters = [
      estIds.length ? `estimate_id.in.(${estIds.join(',')})` : '',
      woIds.length ? `work_order_id.in.(${woIds.join(',')})` : '',
    ].filter(Boolean);
    if (filters.length) {
      const invRes = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total, balance_due, invoice_date, created_at, updated_at')
        .or(filters.join(','))
        .order('created_at', { ascending: true });
      if (invRes.error) { setError(true); setLoading(false); return; }
      invs = (invRes.data ?? []) as StoryInvoice[];
    }

    setEstimates(ests);
    setWorkOrders(wos);
    setInvoices(invs);
    setLoading(false);
  }, [dealId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return { estimates, workOrders, invoices, loading, error };
}

function reachedAt(activities: DealActivity[], field: StatusField, value: string): DealActivity | undefined {
  const matches = activities.filter(a =>
    a.activity_type === 'stage_change' && a.new_value === value &&
    (a.status_field ? a.status_field === field : field === 'sales_stage'));
  return matches[matches.length - 1];
}

function statusReached(deal: Deal, field: StatusField, value: string): boolean {
  const path = getStatusGroup(field).mainPath;
  const cur = deal[field] as string | null;
  if (!cur) return false;
  const ci = path.indexOf(cur);
  const ti = path.indexOf(value);
  return ci >= 0 && ti >= 0 && ci >= ti;
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function agoText(days: number | null) {
  if (days === null) return '';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function buildDealStory(
  deal: Deal & Record<string, unknown>,
  activities: DealActivity[],
  employees: Employee[],
  estimates: StoryEstimate[],
  workOrders: StoryWorkOrder[],
  invoices: StoryInvoice[],
): { events: StoryEvent[]; next: NextStep } {
  const chronological = [...activities].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const empName = (id: unknown) => {
    const e = employees.find(x => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : undefined;
  };
  const actorOf = (a?: DealActivity) => a ? (a.is_automatic ? 'Automatic' : empName((a as unknown as { created_by?: string }).created_by)) : undefined;
  const fromStatus = (field: StatusField, value: string) => {
    const a = reachedAt(chronological, field, value);
    return { date: a?.created_at ?? null, actor: actorOf(a), reached: !!a || statusReached(deal, field, value) };
  };

  const est = estimates[estimates.length - 1] ?? null;
  const estName = est?.estimate_number ? `Estimate ${est.estimate_number}` : 'Estimate';
  const sold = deal.sales_stage === 'Sold' || deal.sales_stage === 'Sold & Failed' || deal.install_status != null;
  const raw: (Omit<StoryEvent, 'state'> & { done: boolean; optional?: boolean; declined?: boolean })[] = [];

  raw.push({ key: 'lead', label: 'Lead created', group: 'sales', date: deal.created_at, done: true, actor: empName(deal.assigned_employee_id) });

  const callDone = !!deal.completed_at;
  raw.push({
    key: 'sales_call', label: 'Sales call', group: 'sales', optional: true,
    date: (deal.completed_at as string) || (deal.onsite_at as string) || null,
    done: callDone,
    detail: (deal.sales_call_outcome as string) || (deal.onsite_at && !callDone ? 'On site now' : deal.enroute_at && !callDone ? 'On the way' : undefined),
    actor: empName(deal.sales_call_employee_id),
  });

  raw.push({ key: 'est_created', label: 'Estimate created', group: 'sales', date: est?.created_at ?? null, done: !!est, detail: est ? `${estName}${est.total ? ` \u00b7 $${Number(est.total).toLocaleString()}` : ''}` : undefined, link: est ? { type: 'estimate' } : undefined });

  const sentStatus = fromStatus('sales_stage', 'Proposal Sent');
  const sentAt = est?.sent_at ?? deal.proposal_sent_date ?? sentStatus.date;
  raw.push({ key: 'est_sent', label: 'Sent to customer', group: 'sales', date: sentAt, done: !!sentAt || sentStatus.reached, actor: sentStatus.actor, link: est ? { type: 'estimate' } : undefined });

  const viewedStatus = fromStatus('sales_stage', 'Proposal Viewed');
  const viewedAt = est?.viewed_at ?? deal.proposal_viewed_date ?? viewedStatus.date;
  const views = est?.view_count ?? 0;
  raw.push({
    key: 'est_opened', label: 'Customer opened it', group: 'sales', date: viewedAt, done: !!viewedAt || viewedStatus.reached, actor: viewedAt ? 'Customer' : undefined,
    detail: views > 0 ? `Viewed ${views} time${views === 1 ? '' : 's'}${est?.last_viewed_at && views > 1 ? ` \u00b7 last ${agoText(daysAgo(est.last_viewed_at))}` : ''}` : undefined,
    link: est ? { type: 'estimate' } : undefined,
  });

  if (est?.declined_at) {
    raw.push({ key: 'est_declined', label: 'Customer declined', group: 'sales', date: est.declined_at, done: true, declined: true, actor: 'Customer', detail: est.declined_reason ?? undefined, link: { type: 'estimate' } });
  } else {
    const accStatus = fromStatus('sales_stage', 'Proposal Accepted');
    const accAt = est?.accepted_at ?? accStatus.date;
    raw.push({ key: 'est_signed', label: 'Customer signed', group: 'sales', date: accAt, done: !!accAt || accStatus.reached || sold, actor: est?.customer_name_signed ?? accStatus.actor, link: est ? { type: 'estimate' } : undefined });
  }

  const agrStatus = fromStatus('sales_stage', 'Agreement Sent');
  raw.push({ key: 'agreement', label: 'Agreement sent', group: 'sales', optional: true, date: deal.agreement_sent_date ?? agrStatus.date, done: !!deal.agreement_sent_date || agrStatus.reached, actor: agrStatus.actor });

  const soldStatus = fromStatus('sales_stage', 'Sold');
  raw.push({ key: 'sold', label: 'Sold', group: 'sales', date: soldStatus.date ?? deal.close_date, done: sold, actor: soldStatus.actor });

  const offSales = isOffPath(deal.sales_stage) && deal.sales_stage !== 'Sold & Failed';
  if (offSales) {
    const a = reachedAt(chronological, 'sales_stage', deal.sales_stage);
    const events = finalize(raw.filter(r => r.key !== 'sold'));
    events.push({ key: 'closed', label: `Marked "${deal.sales_stage}"`, group: 'sales', state: 'declined', date: a?.created_at ?? deal.stage_entered_at, actor: actorOf(a), detail: deal.lost_reason ?? undefined });
    return { events, next: { message: `This deal was closed as "${deal.sales_stage}"${deal.lost_reason ? `: ${deal.lost_reason}` : '.'}`, tone: 'bad' } };
  }

  const firstWo = workOrders[0] ?? null;
  const schedStatus = fromStatus('install_status', 'Scheduled');
  const scheduledWo = workOrders.find(w => w.scheduled_date);
  raw.push({ key: 'inst_sched', label: 'Install scheduled', group: 'install', date: scheduledWo?.scheduled_date ?? schedStatus.date, done: !!scheduledWo || schedStatus.reached, actor: schedStatus.actor, detail: firstWo?.wo_number ? `Work order ${firstWo.wo_number}` : undefined, link: firstWo ? { type: 'work_order' } : undefined });

  const startStatus = fromStatus('install_status', 'In Progress');
  raw.push({ key: 'inst_start', label: 'Install started', group: 'install', date: startStatus.date, done: startStatus.reached || workOrders.some(w => w.status === 'in_progress' || w.status === 'completed'), actor: startStatus.actor, link: firstWo ? { type: 'work_order' } : undefined });

  const doneStatus = fromStatus('install_status', 'Completed');
  const completedWo = workOrders.find(w => w.completed_at);
  raw.push({ key: 'inst_done', label: 'Install completed', group: 'install', date: completedWo?.completed_at ?? doneStatus.date, done: doneStatus.reached || workOrders.some(w => w.status === 'completed'), actor: doneStatus.actor, link: firstWo ? { type: 'work_order' } : undefined });

  const firstInv = invoices[0] ?? null;
  const invTotal = invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);
  raw.push({ key: 'invoiced', label: 'Invoiced', group: 'office', date: firstInv ? (firstInv.invoice_date ?? firstInv.created_at) : null, done: !!firstInv, detail: firstInv ? `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} \u00b7 $${invTotal.toLocaleString()}` : undefined, link: firstInv ? { type: 'invoice', id: firstInv.id } : undefined });

  const paidStatus = fromStatus('office_status', 'Invoices Paid');
  const allPaid = invoices.length > 0 && invoices.every(i => i.status === 'paid');
  const lastPaid = allPaid ? invoices.map(i => i.updated_at ?? i.created_at).sort().pop() ?? null : null;
  const balance = invoices.reduce((s, i) => s + Number(i.balance_due ?? 0), 0);
  raw.push({ key: 'paid', label: 'Paid in full', group: 'office', date: lastPaid ?? paidStatus.date, done: allPaid || paidStatus.reached, actor: paidStatus.actor, detail: !allPaid && balance > 0 ? `$${balance.toLocaleString()} still due` : undefined, link: firstInv ? { type: 'invoice', id: (invoices.find(i => i.status !== 'paid') ?? firstInv).id } : undefined });

  const revStatus = fromStatus('office_status', 'Office Reviewed');
  raw.push({ key: 'reviewed', label: 'Office reviewed', group: 'office', date: revStatus.date, done: revStatus.reached, actor: revStatus.actor });

  const events = finalize(raw);
  return { events, next: nextStep(deal, events, est, workOrders, invoices, balance) };
}

function finalize(raw: (Omit<StoryEvent, 'state'> & { done: boolean; optional?: boolean; declined?: boolean })[]): StoryEvent[] {
  const lastDone = raw.reduce((idx, r, i) => (r.done ? i : idx), -1);
  let currentSet = false;
  return raw.flatMap(({ done, optional, declined, ...rest }, i) => {
    if (!done && i < lastDone) return optional ? [] : [{ ...rest, state: 'skipped' as StoryState }];
    let state: StoryState = done ? (declined ? 'declined' : 'done') : 'upcoming';
    if (!done && !currentSet && !optional) { state = 'current'; currentSet = true; }
    return [{ ...rest, state }];
  });
}

function nextStep(deal: Deal, events: StoryEvent[], est: StoryEstimate | null, workOrders: StoryWorkOrder[], invoices: StoryInvoice[], balance: number): NextStep {
  if (deal.install_status === 'On hold') return { message: 'Install is on hold. Check in with the customer or crew to get it moving again.', tone: 'warn' };
  if (deal.office_status === 'Customer Cancelled') return { message: `The customer cancelled${deal.lost_reason ? `: ${deal.lost_reason}` : '.'}`, tone: 'bad' };
  if (est?.declined_at) return { message: `Customer declined ${est.estimate_number ? `estimate ${est.estimate_number}` : 'the estimate'} ${agoText(daysAgo(est.declined_at))}${est.declined_reason ? `: "${est.declined_reason}"` : ''}. Revise it or close the deal.`, tone: 'bad', action: { kind: 'create_estimate', label: 'Open proposal' } };

  const current = events.find(e => e.state === 'current');
  if (!current) return { message: 'Every step is done. This deal is complete.', tone: 'good' };

  switch (current.key) {
    case 'est_created':
      return { message: 'No estimate yet. Build one so you can send it to the customer.', tone: 'info', action: { kind: 'create_estimate', label: 'Open proposal' } };
    case 'est_sent':
      return { message: 'The estimate is ready but has not been sent yet.', tone: 'info', action: { kind: 'send_estimate', label: 'Send to customer' } };
    case 'est_opened': {
      const d = daysAgo(est?.sent_at ?? deal.proposal_sent_date);
      return { message: `Sent ${agoText(d)} and the customer has not opened it yet.${d !== null && d >= 2 ? ' Follow up to make sure they got it.' : ''}`, tone: d !== null && d >= 3 ? 'warn' : 'info', action: { kind: 'follow_up', label: 'Add follow-up task' } };
    }
    case 'est_signed': {
      const d = daysAgo(est?.last_viewed_at ?? est?.viewed_at ?? deal.proposal_viewed_date);
      const views = est?.view_count ?? 0;
      return { message: `Customer opened the estimate ${agoText(d)}${views > 1 ? ` (${views} views)` : ''} but has not signed. Follow up.`, tone: d !== null && d >= 3 ? 'warn' : 'info', action: { kind: 'follow_up', label: 'Add follow-up task' } };
    }
    case 'sold':
      return deal.agreement_sent_date
        ? { message: `Agreement sent ${agoText(daysAgo(deal.agreement_sent_date))}. Mark the deal sold once it is signed.`, tone: 'info', action: { kind: 'mark_sold', label: 'Mark as Sold' } }
        : { message: 'The customer signed. Send the agreement or mark the deal sold.', tone: 'good', action: { kind: 'mark_sold', label: 'Mark as Sold' } };
    case 'inst_sched':
      return workOrders.length
        ? { message: 'There is a work order but no install date yet. Get it on the schedule.', tone: 'info', action: { kind: 'view_work_orders', label: 'View work orders' } }
        : { message: 'Deal is sold. Create the install work order to get it scheduled.', tone: 'info', action: { kind: 'create_work_order', label: 'Create work order' } };
    case 'inst_start': {
      const wo = workOrders.find(w => w.scheduled_date);
      return { message: wo?.scheduled_date ? `Install is scheduled for ${new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.` : 'Install is scheduled.', tone: 'info', action: { kind: 'view_work_orders', label: 'View work orders' } };
    }
    case 'inst_done':
      return { message: 'Install is in progress.', tone: 'info', action: { kind: 'view_work_orders', label: 'View work orders' } };
    case 'invoiced':
      return { message: 'Install is complete. Time to invoice the customer.', tone: 'info', action: { kind: 'view_work_orders', label: 'View work orders' } };
    case 'paid': {
      const open = invoices.find(i => i.status !== 'paid');
      return { message: `Waiting on payment${balance > 0 ? `: $${balance.toLocaleString()} still due` : ''}.`, tone: invoices.some(i => i.status === 'overdue') ? 'warn' : 'info', action: open ? { kind: 'open_invoice', label: 'Open invoice', invoiceId: open.id } : undefined };
    }
    case 'reviewed':
      return { message: 'Everything is paid. Ready for office review.', tone: 'good', action: { kind: 'office_reviewed', label: 'Mark Office Reviewed' } };
    default:
      return { message: `Next up: ${current.label.toLowerCase()}.`, tone: 'info' };
  }
}
