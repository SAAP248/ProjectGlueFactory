import { useState, useEffect } from 'react';
import { supabase } from './supabase';

let cache: Record<string, string> = {};
let fetched = false;
let listeners: (() => void)[] = [];

async function loadAll() {
  const { data } = await supabase.from('app_settings').select('key, value');
  if (data) {
    cache = {};
    data.forEach(r => { cache[r.key] = r.value; });
  }
  fetched = true;
  listeners.forEach(fn => fn());
}

export function useAppSetting(key: string): [string, boolean] {
  const [value, setValue] = useState(fetched ? (cache[key] ?? '') : '');
  const [loading, setLoading] = useState(!fetched);

  useEffect(() => {
    if (fetched) {
      setValue(cache[key] ?? '');
      setLoading(false);
      return;
    }
    const listener = () => {
      setValue(cache[key] ?? '');
      setLoading(false);
    };
    listeners.push(listener);
    if (!fetched) loadAll();
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, [key]);

  return [value, loading];
}

export async function saveAppSetting(key: string, value: string) {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
  cache[key] = value;
  listeners.forEach(fn => fn());
}

export function invalidateAppSettings() {
  fetched = false;
  cache = {};
  loadAll();
}
