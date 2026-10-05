import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchAgreements, fetchCatalog, fetchLedger, fetchOccurrences } from './lib/queries';
import type { SpAgreement, SpBillingOccurrence, SpLedgerEntry, SpMonitoringAccount, SpPlan } from './lib/types';

export interface ModuleData {
  agreements: SpAgreement[];
  occurrences: SpBillingOccurrence[];
  ledger: SpLedgerEntry[];
  plans: SpPlan[];
  monitoring: SpMonitoringAccount[];
}

export function useModuleData() {
  const [data, setData] = useState<ModuleData | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const [agreements, occurrences, ledger, plans, mon] = await Promise.all([
        fetchAgreements(), fetchOccurrences(), fetchLedger(), fetchCatalog(),
        supabase.from('sp_monitoring_accounts').select('*').eq('status', 'active'),
      ]);
      if (mon.error) throw new Error(mon.error.message);
      setData({ agreements, occurrences, ledger, plans, monitoring: (mon.data ?? []) as SpMonitoringAccount[] });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load service plans.');
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { data, error, reload };
}

export function benefitsById(plans: SpPlan[]) {
  const map = new Map<string, SpPlan['versions'][number]['sp_benefits'][number]>();
  for (const p of plans) for (const v of p.versions) for (const b of v.sp_benefits) map.set(b.id, b);
  return map;
}
