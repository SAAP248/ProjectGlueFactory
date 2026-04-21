import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { PhaseTemplate } from './types';

export function usePhaseTemplates() {
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('phase_templates')
      .select('*, items:phase_template_items(*)')
      .order('is_builtin', { ascending: false })
      .order('created_at', { ascending: true });
    if (data) {
      const sorted = data.map(t => ({
        ...t,
        items: (t.items || []).sort((a: { phase_order: number }, b: { phase_order: number }) => a.phase_order - b.phase_order),
      }));
      setTemplates(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { templates, loading, refetch: fetch };
}
