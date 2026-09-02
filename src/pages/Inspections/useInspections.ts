import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Inspection } from './types';

export function useInspections() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inspections')
      .select(`
        *,
        companies(name),
        sites(name, address),
        employees(first_name, last_name),
        work_orders(wo_number, title),
        inspection_templates(name, code, edition)
      `)
      .order('created_at', { ascending: false });
    setInspections((data as Inspection[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { inspections, loading, reload: load };
}
