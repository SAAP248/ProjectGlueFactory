import { supabase } from './supabase';

export type LifecycleAction =
  | 'start_driving'
  | 'arrived'
  | 'take_break'
  | 'resume_work'
  | 'complete'
  | 'cannot_complete'
  | 'go_back';

export interface LifecycleContext {
  wotId: string;
  workOrderId: string;
  employeeId: string;
  currentStatus: string;
  enrouteAt: string | null;
  onsiteAt: string | null;
  pausedAt: string | null;
  totalPausedMinutes?: number | null;
}

export interface LifecycleExtras {
  resolutionNotes?: string;
  signature?: string | null;
  paymentCollected?: number | null;
  paymentMethod?: string | null;
  pauseReason?: string | null;
  pauseNotes?: string | null;
}

export async function runLifecycleAction(
  ctx: LifecycleContext,
  action: LifecycleAction,
  extras?: LifecycleExtras
): Promise<void> {
  const now = new Date().toISOString();
  const wotUpdate: Record<string, any> = {};
  const woUpdate: Record<string, any> = { updated_at: now };
  const timeEntry: Record<string, any> = {
    work_order_id: ctx.workOrderId,
    employee_id: ctx.employeeId,
    recorded_at: now,
    entry_type: action,
  };

  switch (action) {
    case 'start_driving':
      wotUpdate.status = 'enroute';
      wotUpdate.enroute_at = now;
      woUpdate.enroute_at = now;
      woUpdate.status = 'in_progress';
      timeEntry.entry_type = 'start_drive';
      break;
    case 'arrived':
      wotUpdate.status = 'working';
      wotUpdate.onsite_at = now;
      wotUpdate.work_started_at = now;
      woUpdate.onsite_at = now;
      timeEntry.entry_type = 'arrived';
      break;
    case 'take_break':
      wotUpdate.status = 'on_break';
      wotUpdate.paused_at = now;
      wotUpdate.current_pause_reason = extras?.pauseReason ?? null;
      wotUpdate.current_pause_notes = extras?.pauseNotes ?? null;
      timeEntry.entry_type = 'paused';
      timeEntry.pause_reason = extras?.pauseReason ?? null;
      timeEntry.pause_notes = extras?.pauseNotes ?? null;
      break;
    case 'resume_work': {
      wotUpdate.status = 'working';
      wotUpdate.paused_at = null;
      wotUpdate.current_pause_reason = null;
      wotUpdate.current_pause_notes = null;
      let addMin = 0;
      if (ctx.pausedAt) {
        const pausedMs = new Date(now).getTime() - new Date(ctx.pausedAt).getTime();
        addMin = Math.max(0, Math.round(pausedMs / 60000));
        wotUpdate.total_paused_minutes = (ctx.totalPausedMinutes || 0) + addMin;
      }
      timeEntry.entry_type = 'resumed';
      timeEntry.duration_minutes = addMin;
      break;
    }
    case 'complete':
      wotUpdate.status = 'completed';
      wotUpdate.completed_at = now;
      woUpdate.completed_at = now;
      woUpdate.status = 'completed';
      if (extras?.resolutionNotes) woUpdate.resolution_notes = extras.resolutionNotes;
      if (extras?.signature) woUpdate.customer_signature = extras.signature;
      if (extras?.paymentCollected != null) woUpdate.payment_collected = extras.paymentCollected;
      if (extras?.paymentMethod) woUpdate.payment_method = extras.paymentMethod;
      timeEntry.entry_type = 'completed';
      break;
    case 'cannot_complete':
      wotUpdate.status = 'completed';
      woUpdate.status = 'on_hold';
      timeEntry.entry_type = 'cannot_complete';
      break;
    case 'go_back':
      wotUpdate.status = 'completed';
      woUpdate.status = 'go_back';
      woUpdate.is_go_back = true;
      timeEntry.entry_type = 'go_back';
      break;
  }

  await Promise.all([
    supabase.from('work_order_technicians').update(wotUpdate).eq('id', ctx.wotId),
    supabase.from('work_orders').update(woUpdate).eq('id', ctx.workOrderId),
    supabase.from('work_order_time_entries').insert(timeEntry),
  ]);
}
