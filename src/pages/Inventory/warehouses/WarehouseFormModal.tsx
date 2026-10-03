import { useState } from 'react';
import { X, Truck, Warehouse, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { setHomeLocation } from '../../../lib/truckStock';
import type { StockLocationRecord } from '../../../lib/truckStock';

export interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  location: StockLocationRecord | null;
  employees: EmployeeOption[];
  locations: StockLocationRecord[];
  onClose: () => void;
  onSaved: () => void;
}

export default function WarehouseFormModal({ location, employees, locations, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: location?.name || '',
    warehouse_type: location?.warehouse_type || 'truck',
    assigned_employee_id: location?.assigned_employee_id || '',
    address: location?.address || '',
    city: location?.city || '',
    state: location?.state || '',
    zip: location?.zip || '',
    phone: location?.phone || '',
    is_active: location?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takenBy = (empId: string) => locations.find(l => l.assigned_employee_id === empId && l.id !== location?.id);

  async function save() {
    if (!form.name.trim()) { setError('Please enter a name.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      warehouse_type: form.warehouse_type,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip: form.zip.trim() || null,
      phone: form.phone.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
    const res = location
      ? await supabase.from('warehouses').update(payload).eq('id', location.id).select('id').maybeSingle()
      : await supabase.from('warehouses').insert(payload).select('id').maybeSingle();
    if (res.error || !res.data) { setError('Could not save. Please try again.'); setSaving(false); return; }

    const id = res.data.id as string;
    const prev = location?.assigned_employee_id || '';
    let assignErr: string | null = null;
    if (form.assigned_employee_id && form.assigned_employee_id !== prev) {
      assignErr = await setHomeLocation(form.assigned_employee_id, id);
    } else if (!form.assigned_employee_id && prev) {
      const { error: e } = await supabase.from('warehouses').update({ assigned_employee_id: null }).eq('id', id);
      if (e) assignErr = 'Could not update the assigned technician.';
    }
    setSaving(false);
    if (assignErr) { setError(assignErr); return; }
    onSaved();
  }

  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const label = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{location ? 'Edit Location' : 'New Truck or Warehouse'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            {(['truck', 'warehouse'] as const).map(t => {
              const Icon = t === 'truck' ? Truck : Warehouse;
              const active = form.warehouse_type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, warehouse_type: t }))}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-blue-900' : 'text-gray-800'}`}>{t === 'truck' ? 'Truck' : 'Warehouse'}</p>
                    <p className="text-[11px] text-gray-500">{t === 'truck' ? 'Rolling stock for a tech' : 'Main stock location'}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <label className={label}>Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={form.warehouse_type === 'truck' ? 'e.g. Truck 12' : 'e.g. Main Warehouse'} className={input} />
          </div>

          <div>
            <label className={label}>{form.warehouse_type === 'truck' ? 'Assigned technician' : 'Home location for (optional)'}</label>
            <select value={form.assigned_employee_id} onChange={e => setForm(f => ({ ...f, assigned_employee_id: e.target.value }))} className={input}>
              <option value="">Nobody</option>
              {employees.map(e => {
                const other = takenBy(e.id);
                return (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}{other ? ` (moves from ${other.name})` : ''}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-[11px] text-gray-500">Parts this person uses on jobs come out of this location by default.</p>
          </div>

          {form.warehouse_type === 'warehouse' && (
            <>
              <div>
                <label className={label}>Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={input} />
              </div>
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-3">
                  <label className={label}>City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={input} />
                </div>
                <div className="col-span-1">
                  <label className={label}>State</label>
                  <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={input} />
                </div>
                <div className="col-span-2">
                  <label className={label}>ZIP</label>
                  <input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} className={input} />
                </div>
              </div>
              <div>
                <label className={label}>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={input} />
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded border-gray-300" />
            Active
          </label>

          {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {location ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
