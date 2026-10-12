import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Deal, DealActivity, DealTask, Employee, StatusField } from './types';
import { getStatusGroup } from './types';

const DEAL_SELECT = '*, companies(name, phone, email), sites(id, name, address, city, state, zip), assigned_employee:employees!deals_assigned_employee_id_fkey(first_name, last_name)';

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    const { data } = await supabase
      .from('deals')
      .select(DEAL_SELECT)
      .order('created_at', { ascending: false });
    if (data) setDeals(data as unknown as Deal[]);
  }, []);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, role')
      .order('first_name');
    if (data) setEmployees(data as Employee[]);
  }, []);

  useEffect(() => {
    Promise.all([fetchDeals(), fetchEmployees()]).finally(() => setLoading(false));
  }, [fetchDeals, fetchEmployees]);

  const replaceDeal = useCallback((fresh: Deal) => {
    setDeals(prev => prev.map(d => d.id === fresh.id ? fresh : d));
  }, []);

  const updateDealStage = useCallback(async (
    dealId: string,
    field: StatusField,
    newValue: string | null,
    oldValue: string | null,
    extra: { reason?: string; updates?: Partial<Deal> } = {}
  ): Promise<Deal | null> => {
    const { data, error } = await supabase
      .from('deals')
      .update({ ...extra.updates, [field]: newValue, updated_at: new Date().toISOString() })
      .eq('id', dealId)
      .select(DEAL_SELECT)
      .maybeSingle();
    if (error || !data) return null;
    replaceDeal(data as unknown as Deal);

    const label = getStatusGroup(field).label;
    const change = oldValue
      ? `${label} status changed from "${oldValue}" to "${newValue ?? 'empty'}"`
      : `${label} status set to "${newValue}"`;
    await supabase.from('deal_activities').insert({
      deal_id: dealId,
      activity_type: 'stage_change',
      description: extra.reason ? `${change}. Reason: ${extra.reason}` : change,
      old_value: oldValue,
      new_value: newValue,
      status_field: field,
    });
    return data as unknown as Deal;
  }, [replaceDeal]);

  const updateDeal = useCallback(async (dealId: string, updates: Partial<Deal>) => {
    const { data, error } = await supabase.from('deals').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('id', dealId).select(DEAL_SELECT).maybeSingle();
    if (!error && data) replaceDeal(data as unknown as Deal);
    return !error;
  }, [replaceDeal]);

  const createDeal = useCallback(async (deal: Partial<Deal>) => {
    const { data, error } = await supabase.from('deals').insert({
      ...deal,
      stage_entered_at: new Date().toISOString(),
    }).select(DEAL_SELECT).single();
    if (!error && data) {
      setDeals(prev => [data as Deal, ...prev]);
      return data as Deal;
    }
    return null;
  }, []);

  return { deals, employees, loading, updateDealStage, updateDeal, createDeal, refetch: fetchDeals };
}

export function useDealActivities(dealId: string | null) {
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [tasks, setTasks] = useState<DealTask[]>([]);

  const refreshActivities = useCallback(async () => {
    if (!dealId) return;
    const { data } = await supabase
      .from('deal_activities')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });
    if (data) setActivities(data);
  }, [dealId]);

  useEffect(() => {
    if (!dealId) return;
    refreshActivities();

    supabase
      .from('deal_tasks')
      .select('*')
      .eq('deal_id', dealId)
      .order('due_date', { ascending: true })
      .then(({ data }) => { if (data) setTasks(data); });
  }, [dealId, refreshActivities]);

  const addNote = useCallback(async (dealId: string, note: string) => {
    const { data } = await supabase.from('deal_activities').insert({
      deal_id: dealId,
      activity_type: 'note',
      description: note,
    }).select().single();
    if (data) setActivities(prev => [data, ...prev]);
  }, []);

  const addTask = useCallback(async (dealId: string, title: string, dueDate: string | null) => {
    const { data } = await supabase.from('deal_tasks').insert({
      deal_id: dealId,
      title,
      due_date: dueDate || null,
    }).select().single();
    if (data) setTasks(prev => [...prev, data]);
  }, []);

  const toggleTask = useCallback(async (taskId: string, isDone: boolean) => {
    await supabase.from('deal_tasks').update({ is_done: isDone }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_done: isDone } : t));
  }, []);

  return { activities, tasks, addNote, addTask, toggleTask, refreshActivities };
}
