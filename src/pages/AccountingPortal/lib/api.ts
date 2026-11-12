import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Account, AccountTotal, MonthlyTotal } from './types';

export function errMsg(e: unknown) {
  if (!e) return 'Something went wrong.';
  if (typeof e === 'string') return e;
  const m = (e as { message?: string }).message;
  return m || 'Something went wrong.';
}

const PAGE = 1000;

export async function fetchAllRows<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('acct_accounts').select('*').order('code');
    if (error) setError(errMsg(error));
    else setAccounts((data ?? []) as Account[]);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const byId = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const byCode = useMemo(() => new Map(accounts.map(a => [a.code, a])), [accounts]);
  return { accounts, byId, byCode, loading, error, reload };
}

function num(v: unknown) {
  return Number(v ?? 0);
}

export async function fetchTotals(from: string | null, to: string): Promise<Map<string, AccountTotal>> {
  const { data, error } = await supabase.rpc('acct_account_totals', { p_from: from, p_to: to });
  if (error) throw error;
  const map = new Map<string, AccountTotal>();
  for (const r of (data ?? []) as AccountTotal[]) {
    map.set(r.account_id, { account_id: r.account_id, debit: num(r.debit), credit: num(r.credit) });
  }
  return map;
}

export async function fetchMonthly(from: string, to: string): Promise<MonthlyTotal[]> {
  const { data, error } = await supabase.rpc('acct_monthly_totals', { p_from: from, p_to: to });
  if (error) throw error;
  return ((data ?? []) as MonthlyTotal[]).map(r => ({ ...r, debit: num(r.debit), credit: num(r.credit) }));
}

export async function syncWorkhorse() {
  const { data, error } = await supabase.rpc('acct_sync_workhorse');
  if (error) throw error;
  const po = await supabase.rpc('acct_sync_purchase_orders');
  if (po.error) throw po.error;
  const rec = await supabase.rpc('acct_run_recurring', { p_through: new Date().toISOString().slice(0, 10) });
  if (rec.error) throw rec.error;
  return data as Record<string, number>;
}

export const ACTOR_KEY = 'acct_actor_name';

export function getActor() {
  return localStorage.getItem(ACTOR_KEY) || 'Staff';
}

export function setActor(name: string) {
  localStorage.setItem(ACTOR_KEY, name);
}
