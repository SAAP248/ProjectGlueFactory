import { supabase } from './supabase';

export type SalesCallStatus = 'none' | 'enroute' | 'onsite' | 'working' | 'paused' | 'completed' | 'cancelled';

export type SalesCallAction = 'start_driving' | 'arrived' | 'begin_work' | 'pause' | 'resume' | 'complete' | 'cancel';

export type SalesCallOutcome = 'proposal_sent' | 'verbal_yes' | 'follow_up_needed' | 'customer_declined' | 'rescheduled' | 'other';

const OUTCOME_LABELS: Record<SalesCallOutcome, string> = {
  proposal_sent: 'Proposal Sent',
  verbal_yes: 'Verbal Yes',
  follow_up_needed: 'Follow-Up Needed',
  customer_declined: 'Customer Declined',
  rescheduled: 'Rescheduled',
  other: 'Other',
};

export function getOutcomeLabel(outcome: string): string {
  return OUTCOME_LABELS[outcome as SalesCallOutcome] || outcome;
}

export function getStatusLabel(status: SalesCallStatus): string {
  switch (status) {
    case 'none': return 'Not Started';
    case 'enroute': return 'En Route';
    case 'onsite': return 'On Site';
    case 'working': return 'Working';
    case 'paused': return 'Paused';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

export function getStatusColor(status: SalesCallStatus): string {
  switch (status) {
    case 'none': return 'bg-gray-100 text-gray-600';
    case 'enroute': return 'bg-blue-100 text-blue-700';
    case 'onsite': return 'bg-teal-100 text-teal-700';
    case 'working': return 'bg-emerald-100 text-emerald-700';
    case 'paused': return 'bg-amber-100 text-amber-700';
    case 'completed': return 'bg-green-100 text-green-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

interface RunActionOptions {
  dealId: string;
  employeeId: string;
  action: SalesCallAction;
  notes?: string;
  outcome?: SalesCallOutcome;
}

export async function runSalesCallAction({ dealId, employeeId, action, notes, outcome }: RunActionOptions) {
  const now = new Date().toISOString();

  let entryType: string;
  let newStatus: SalesCallStatus;
  const dealUpdate: Record<string, any> = { updated_at: now };

  switch (action) {
    case 'start_driving':
      entryType = 'enroute';
      newStatus = 'enroute';
      dealUpdate.sales_call_status = 'enroute';
      dealUpdate.sales_call_employee_id = employeeId;
      dealUpdate.enroute_at = now;
      break;
    case 'arrived':
      entryType = 'arrived';
      newStatus = 'onsite';
      dealUpdate.sales_call_status = 'onsite';
      dealUpdate.onsite_at = now;
      break;
    case 'begin_work':
      entryType = 'work_start';
      newStatus = 'working';
      dealUpdate.sales_call_status = 'working';
      break;
    case 'pause':
      entryType = 'pause';
      newStatus = 'paused';
      dealUpdate.sales_call_status = 'paused';
      break;
    case 'resume':
      entryType = 'resume';
      newStatus = 'working';
      dealUpdate.sales_call_status = 'working';
      break;
    case 'complete':
      entryType = 'complete';
      newStatus = 'completed';
      dealUpdate.sales_call_status = 'completed';
      dealUpdate.completed_at = now;
      if (notes) dealUpdate.sales_call_notes = notes;
      if (outcome) dealUpdate.sales_call_outcome = outcome;
      break;
    case 'cancel':
      entryType = 'cancelled';
      newStatus = 'cancelled';
      dealUpdate.sales_call_status = 'cancelled';
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }

  await Promise.all([
    supabase.from('deals').update(dealUpdate).eq('id', dealId),
    supabase.from('deal_time_entries').insert({
      deal_id: dealId,
      employee_id: employeeId,
      entry_type: entryType,
      recorded_at: now,
      notes: notes || null,
      outcome: outcome || null,
    }),
  ]);

  return newStatus;
}

export async function getDealTimeEntries(dealId: string) {
  const { data } = await supabase
    .from('deal_time_entries')
    .select('*, employees(first_name, last_name)')
    .eq('deal_id', dealId)
    .order('recorded_at', { ascending: true });
  return data || [];
}

export function calculateSalesCallDuration(entries: Array<{ entry_type: string; recorded_at: string }>): {
  totalMinutes: number;
  driveMinutes: number;
  onsiteMinutes: number;
} {
  let driveStart: Date | null = null;
  let onsiteStart: Date | null = null;
  let driveMinutes = 0;
  let onsiteMinutes = 0;

  for (const entry of entries) {
    const t = new Date(entry.recorded_at);
    switch (entry.entry_type) {
      case 'enroute':
        driveStart = t;
        break;
      case 'arrived':
        if (driveStart) driveMinutes += (t.getTime() - driveStart.getTime()) / 60000;
        driveStart = null;
        onsiteStart = t;
        break;
      case 'complete':
      case 'cancelled':
        if (onsiteStart) onsiteMinutes += (t.getTime() - onsiteStart.getTime()) / 60000;
        onsiteStart = null;
        break;
    }
  }

  return {
    totalMinutes: Math.round(driveMinutes + onsiteMinutes),
    driveMinutes: Math.round(driveMinutes),
    onsiteMinutes: Math.round(onsiteMinutes),
  };
}
