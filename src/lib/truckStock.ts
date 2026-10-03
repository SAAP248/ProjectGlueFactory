import { supabase } from './supabase';

export interface StockLocationRecord {
  id: string;
  name: string;
  warehouse_type: 'truck' | 'warehouse';
  assigned_employee_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export async function fetchStockLocations(): Promise<{ data: StockLocationRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from('warehouses')
    .select('id, name, warehouse_type, assigned_employee_id, address, city, state, zip, phone, is_active, created_at')
    .order('warehouse_type', { ascending: false })
    .order('name');
  if (error) return { data: [], error: 'Could not load trucks and warehouses.' };
  return { data: (data || []) as StockLocationRecord[], error: null };
}

export async function setHomeLocation(employeeId: string, warehouseId: string | null): Promise<string | null> {
  const clear = supabase.from('warehouses').update({ assigned_employee_id: null }).eq('assigned_employee_id', employeeId);
  const { error: clearErr } = warehouseId ? await clear.neq('id', warehouseId) : await clear;
  if (clearErr) return 'Could not update the home truck.';
  if (!warehouseId) return null;
  const { error } = await supabase.from('warehouses').update({ assigned_employee_id: employeeId }).eq('id', warehouseId);
  return error ? 'Could not update the home truck.' : null;
}
