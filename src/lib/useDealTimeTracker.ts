import { useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';

const SESSION_ID = crypto.randomUUID();
const FLUSH_INTERVAL_MS = 30000;

interface PendingEntry {
  deal_id: string;
  employee_id: string;
  session_id: string;
  action: string;
  details: string | null;
  tab: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

let pendingEntries: PendingEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function flushEntries() {
  if (pendingEntries.length === 0) return;
  const batch = [...pendingEntries];
  pendingEntries = [];
  await supabase.from('deal_activity_log').insert(batch);
}

function ensureFlushTimer() {
  if (!flushTimer) {
    flushTimer = setInterval(flushEntries, FLUSH_INTERVAL_MS);
  }
}

function queueEntry(entry: PendingEntry) {
  pendingEntries.push(entry);
  ensureFlushTimer();
}

interface UseDealTimeTrackerOptions {
  dealId: string | null;
  employeeId: string;
  enabled?: boolean;
}

export function useDealTimeTracker({ dealId, employeeId, enabled = true }: UseDealTimeTrackerOptions) {
  const currentTabRef = useRef<string | null>(null);
  const tabStartRef = useRef<string | null>(null);
  const sessionStartRef = useRef<string | null>(null);

  useEffect(() => {
    if (!dealId || !employeeId || !enabled) return;

    sessionStartRef.current = new Date().toISOString();
    queueEntry({
      deal_id: dealId,
      employee_id: employeeId,
      session_id: SESSION_ID,
      action: 'session_start',
      details: null,
      tab: null,
      started_at: sessionStartRef.current,
      ended_at: null,
      duration_seconds: null,
    });

    return () => {
      const now = new Date().toISOString();
      // Close current tab entry
      if (currentTabRef.current && tabStartRef.current) {
        const dur = Math.round((Date.now() - new Date(tabStartRef.current).getTime()) / 1000);
        queueEntry({
          deal_id: dealId,
          employee_id: employeeId,
          session_id: SESSION_ID,
          action: 'tab_view',
          details: null,
          tab: currentTabRef.current,
          started_at: tabStartRef.current,
          ended_at: now,
          duration_seconds: dur,
        });
      }
      // Log session end
      const sessionDur = sessionStartRef.current
        ? Math.round((Date.now() - new Date(sessionStartRef.current).getTime()) / 1000)
        : 0;
      queueEntry({
        deal_id: dealId,
        employee_id: employeeId,
        session_id: SESSION_ID,
        action: 'session_end',
        details: null,
        tab: null,
        started_at: sessionStartRef.current || now,
        ended_at: now,
        duration_seconds: sessionDur,
      });
      flushEntries();
    };
  }, [dealId, employeeId, enabled]);

  const trackTabChange = useCallback((tab: string) => {
    if (!dealId || !employeeId || !enabled) return;
    const now = new Date().toISOString();

    // Close previous tab entry
    if (currentTabRef.current && tabStartRef.current && currentTabRef.current !== tab) {
      const dur = Math.round((Date.now() - new Date(tabStartRef.current).getTime()) / 1000);
      queueEntry({
        deal_id: dealId,
        employee_id: employeeId,
        session_id: SESSION_ID,
        action: 'tab_view',
        details: null,
        tab: currentTabRef.current,
        started_at: tabStartRef.current,
        ended_at: now,
        duration_seconds: dur,
      });
    }

    currentTabRef.current = tab;
    tabStartRef.current = now;
  }, [dealId, employeeId, enabled]);

  const trackAction = useCallback((action: string, details?: string) => {
    if (!dealId || !employeeId || !enabled) return;
    const now = new Date().toISOString();
    queueEntry({
      deal_id: dealId,
      employee_id: employeeId,
      session_id: SESSION_ID,
      action,
      details: details || null,
      tab: currentTabRef.current,
      started_at: now,
      ended_at: now,
      duration_seconds: 0,
    });
  }, [dealId, employeeId, enabled]);

  return { trackTabChange, trackAction, sessionId: SESSION_ID };
}
