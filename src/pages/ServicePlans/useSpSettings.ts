import { useCallback, useEffect, useState } from 'react';
import { companyDate, fetchSettings } from './lib/queries';
import type { SpSettings } from './lib/types';

export function useSpSettings() {
  const [settings, setSettings] = useState<SpSettings | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setSettings(await fetchSettings());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Service Plans settings.');
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { settings, today: companyDate(settings), error, reload };
}
