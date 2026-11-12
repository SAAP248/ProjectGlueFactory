import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { errMsg } from '../../lib/api';
import { usePortal } from '../../lib/context';
import type { Bill, Vendor } from '../../lib/types';

export function useVendors() {
  const { refreshKey } = usePortal();
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('acct_vendors').select('*').order('name');
    if (error) setError(errMsg(error));
    else setVendors((data ?? []) as Vendor[]);
  }, []);
  useEffect(() => { reload(); }, [reload, refreshKey]);
  const byId = useMemo(() => new Map((vendors ?? []).map(v => [v.id, v])), [vendors]);
  return { vendors, byId, error, reload };
}

export function useBills() {
  const { refreshKey } = usePortal();
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('acct_bills').select('*').order('due_date', { ascending: false }).limit(2000);
    if (error) setError(errMsg(error));
    else setBills(((data ?? []) as Bill[]).map(b => ({ ...b, total: Number(b.total), amount_paid: Number(b.amount_paid) })));
  }, []);
  useEffect(() => { reload(); }, [reload, refreshKey]);
  return { bills, error, reload };
}

export function termsDays(terms: string | null | undefined) {
  if (!terms) return 30;
  if (/receipt/i.test(terms)) return 0;
  const m = terms.match(/(\d+)/);
  return m ? Number(m[1]) : 30;
}

export const METHOD_LABEL: Record<string, string> = { check: 'Check', ach: 'ACH', card: 'Card', credit: 'Vendor credit' };
