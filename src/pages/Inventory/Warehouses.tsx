import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Warehouse, Truck, Package, DollarSign, User, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchStockLocations } from '../../lib/truckStock';
import type { StockLocationRecord } from '../../lib/truckStock';
import WarehouseFormModal from './warehouses/WarehouseFormModal';
import type { EmployeeOption } from './warehouses/WarehouseFormModal';
import WarehouseDetail from './warehouses/WarehouseDetail';

type Filter = 'all' | 'truck' | 'warehouse';
interface Summary { units: number; value: number; short: number }

export default function Warehouses() {
  const [locations, setLocations] = useState<StockLocationRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [summary, setSummary] = useState<Record<string, Summary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<StockLocationRecord | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [locRes, empRes, invRes] = await Promise.all([
      fetchStockLocations(),
      supabase.from('employees').select('id, first_name, last_name').eq('status', 'active').order('first_name'),
      supabase.from('warehouse_inventory').select('warehouse_id, quantity, products(cost)'),
    ]);
    setLocations(locRes.data);
    setEmployees((empRes.data || []) as EmployeeOption[]);
    const s: Record<string, Summary> = {};
    for (const r of (invRes.data || []) as any[]) {
      const cur = s[r.warehouse_id] || { units: 0, value: 0, short: 0 };
      const q = Number(r.quantity) || 0;
      cur.units += Math.max(0, q);
      cur.value += Math.max(0, q) * Number(r.products?.cost || 0);
      if (q < 0) cur.short += 1;
      s[r.warehouse_id] = cur;
    }
    setSummary(s);
    setError(locRes.error || (empRes.error || invRes.error ? 'Some details could not be loaded.' : null));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const empName = (id: string | null) => {
    const e = employees.find(x => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : null;
  };
  const shown = useMemo(() => locations.filter(l => filter === 'all' || l.warehouse_type === filter), [locations, filter]);
  const counts = { all: locations.length, truck: locations.filter(l => l.warehouse_type === 'truck').length, warehouse: locations.filter(l => l.warehouse_type === 'warehouse').length };
  const techsWithout = employees.filter(e => !locations.some(l => l.assigned_employee_id === e.id)).length;
  const open = locations.find(l => l.id === openId) || null;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trucks & Warehouses</h1>
          <p className="text-gray-600 mt-1">Track stock on every truck and warehouse. Parts used on jobs come off automatically.</p>
        </div>
        <button onClick={() => setEditing('new')} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors">
          <Plus className="h-5 w-5 mr-2" /> New Location
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {([['all', 'All'], ['truck', 'Trucks'], ['warehouse', 'Warehouses']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${filter === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label} <span className="ml-1 text-xs text-gray-400">{counts[id]}</span>
            </button>
          ))}
        </div>
        {!loading && techsWithout > 0 && (
          <p className="text-sm text-gray-500">
            {techsWithout} {techsWithout === 1 ? 'person has' : 'people have'} no truck set. Their parts won't be deducted from stock.
          </p>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Truck className="h-7 w-7 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No {filter === 'warehouse' ? 'warehouses' : filter === 'truck' ? 'trucks' : 'locations'} yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">Add a truck for each technician so the parts they use on jobs come off the right stock.</p>
          <button onClick={() => setEditing('new')} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(l => {
            const s = summary[l.id] || { units: 0, value: 0, short: 0 };
            const isTruck = l.warehouse_type === 'truck';
            const Icon = isTruck ? Truck : Warehouse;
            const who = empName(l.assigned_employee_id);
            return (
              <button
                key={l.id}
                onClick={() => setOpenId(l.id)}
                className={`group text-left bg-white rounded-xl border border-gray-100 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-gray-200 ${!l.is_active ? 'opacity-60' : ''}`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={`rounded-xl p-2.5 ${isTruck ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isTruck ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {isTruck ? 'Truck' : 'Warehouse'}{!l.is_active ? ' · Inactive' : ''}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{l.name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                  <User className="h-3.5 w-3.5" /> {who || (isTruck ? 'No technician assigned' : [l.city, l.state].filter(Boolean).join(', ') || 'No address')}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-[11px] text-gray-500">Units</p>
                      <p className="text-sm font-semibold text-gray-900">{s.units.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-[11px] text-gray-500">Value</p>
                      <p className="text-sm font-semibold text-gray-900">${Math.round(s.value).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                {s.short > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> {s.short} item{s.short === 1 ? '' : 's'} short
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <WarehouseDetail
          location={open}
          assignedName={empName(open.assigned_employee_id)}
          onClose={() => setOpenId(null)}
          onEdit={() => setEditing(open)}
          onChanged={load}
        />
      )}
      {editing && (
        <WarehouseFormModal
          location={editing === 'new' ? null : editing}
          employees={employees}
          locations={locations}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
