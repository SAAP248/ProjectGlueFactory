import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Deal, DealActivity, DealTask, Employee } from './types';

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    const { data } = await supabase
      .from('deals')
      .select('*, companies(name), assigned_employee:employees!deals_assigned_employee_id_fkey(first_name, last_name)')
      .order('created_at', { ascending: false });
    if (data) setDeals(data as Deal[]);
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

  const updateDealStage = useCallback(async (
    dealId: string,
    field: 'sales_stage' | 'install_status' | 'office_status',
    newValue: string,
    oldValue: string
  ) => {
    const updates: Partial<Deal> & { stage_entered_at?: string } = {
      [field]: newValue,
      updated_at: new Date().toISOString(),
    };
    if (field === 'sales_stage') {
      updates.stage_entered_at = new Date().toISOString();
    }

    const { error } = await supabase.from('deals').update(updates).eq('id', dealId);
    if (!error) {
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updates } : d));
      await supabase.from('deal_activities').insert({
        deal_id: dealId,
        activity_type: 'stage_change',
        description: `Stage changed from "${oldValue}" to "${newValue}"`,
        old_value: oldValue,
        new_value: newValue,
      });
    }
    return !error;
  }, []);

  const updateDeal = useCallback(async (dealId: string, updates: Partial<Deal>) => {
    const { error } = await supabase.from('deals').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('id', dealId);
    if (!error) {
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updates } : d));
    }
    return !error;
  }, []);

  const createDeal = useCallback(async (deal: Partial<Deal>) => {
    const { data, error } = await supabase.from('deals').insert({
      ...deal,
      stage_entered_at: new Date().toISOString(),
    }).select('*, companies(name), assigned_employee:employees!deals_assigned_employee_id_fkey(first_name, last_name)').single();
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

  useEffect(() => {
    if (!dealId) return;
    supabase
      .from('deal_activities')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setActivities(data); });

    supabase
      .from('deal_tasks')
      .select('*')
      .eq('deal_id', dealId)
      .order('due_date', { ascending: true })
      .then(({ data }) => { if (data) setTasks(data); });
  }, [dealId]);

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

  return { activities, tasks, addNote, addTask, toggleTask };
}
