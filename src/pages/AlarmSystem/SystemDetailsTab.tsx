import { useState } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CustomerSystem } from '../CustomerProfile/types';

interface Props {
  system: CustomerSystem;
  onUpdate: (updated: CustomerSystem) => void;
}

export default function SystemDetailsTab({ system, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<CustomerSystem>({ ...system });

  const set = (field: keyof CustomerSystem, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('customer_systems')
      .update({
        cs_name: form.cs_name,
        cs_status: form.cs_status,
        cs_data_entry_phone: form.cs_data_entry_phone,
        cs_number: form.cs_number,
        is_synced_cs: form.is_synced_cs,
        is_on_test: form.is_on_test,
        is_out_of_service: form.is_out_of_service,
        comm_partner_name: form.comm_partner_name,
        comm_partner_serial: form.comm_partner_serial,
        comm_receiver_number: form.comm_receiver_number,
        comm_account_id: form.comm_account_id,
        comm_username: form.comm_username,
        comm_password: form.comm_password,
        is_synced_comm: form.is_synced_comm,
        panel_make: form.panel_make,
        panel_model: form.panel_model,
        panel_type: form.panel_type,
        panel_battery_date: form.panel_battery_date || null,
        panel_location: form.panel_location,
        transformer_location: form.transformer_location,
        antenna_location: form.antenna_location,
        warranty_information: form.warranty_information,
        installation_date: form.installation_date || null,
        online_date: form.online_date || null,
        installer_code: form.installer_code,
        takeover_module_location: form.takeover_module_location,
        permit_number: form.permit_number,
        status: form.status,
        monitoring_account_number: form.monitoring_account_number,
        notes: form.notes,
      })
      .eq('id', system.id)
      .select('*, system_types(*)')
      .maybeSingle();
    setSaving(false);
    if (!error && data) onUpdate(data as CustomerSystem);
  };

  const toggleField = async (field: 'is_on_test' | 'is_out_of_service' | 'is_synced_cs' | 'is_synced_comm') => {
    const newVal = !form[field];
    setForm(prev => ({ ...prev, [field]: newVal }));
    await supabase.from('customer_systems').update({ [field]: newVal }).eq('id', system.id);
    onUpdate({ ...form, [field]: newVal });
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-900">Central Station</h3>
            {form.is_synced_cs && (
              <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-600 rounded border border-blue-200 tracking-wide">SYNCED</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className={labelCls}>Central Station</p>
              <input className={inputCls} value={form.cs_name || ''} onChange={e => set('cs_name', e.target.value)} placeholder="e.g. Avantguard" />
            </div>
            <div>
              <p className={labelCls}>CS Status</p>
              <div className="flex items-center h-9">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  form.cs_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {form.cs_status || 'active'}
                </span>
              </div>
            </div>
            <div>
              <p className={labelCls}>Data Entry Phone</p>
              <input className={inputCls} value={form.cs_data_entry_phone || ''} onChange={e => set('cs_data_entry_phone', e.target.value)} placeholder="(000) 000-0000" />
            </div>
            <div>
              <p className={labelCls}>CS Number</p>
              <input className={inputCls} value={form.cs_number || ''} onChange={e => set('cs_number', e.target.value)} placeholder="e.g. R14565" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleField('is_synced_cs')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors ${
                form.is_synced_cs ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {form.is_synced_cs ? 'UNSYNC' : 'SYNC'}
            </button>
            <button
              onClick={() => toggleField('is_out_of_service')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors ${
                form.is_out_of_service ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              OUT OF SERVICE
            </button>
            <button
              onClick={() => toggleField('is_on_test')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors ${
                form.is_on_test ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              ON TEST
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-900">Communication Partner</h3>
            {form.is_synced_comm && (
              <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-600 rounded border border-blue-200 tracking-wide">SYNCED</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className={labelCls}>Communication Partner</p>
              <input className={inputCls} value={form.comm_partner_name || ''} onChange={e => set('comm_partner_name', e.target.value)} placeholder="e.g. Alarm.com" />
            </div>
            <div>
              <p className={labelCls}>Serial Number</p>
              <input className={inputCls} value={form.comm_partner_serial || ''} onChange={e => set('comm_partner_serial', e.target.value)} placeholder="e.g. ALM-12345" />
            </div>
            <div>
              <p className={labelCls}>Receiver Number / Key</p>
              <input className={inputCls} value={form.comm_receiver_number || ''} onChange={e => set('comm_receiver_number', e.target.value)} placeholder="7268590" />
            </div>
            <div>
              <p className={labelCls}>Account ID</p>
              <input className={inputCls} value={form.comm_account_id || ''} onChange={e => set('comm_account_id', e.target.value)} placeholder="7268590" />
            </div>
            <div>
              <p className={labelCls}>Username</p>
              <input className={inputCls} value={form.comm_username || ''} onChange={e => set('comm_username', e.target.value)} placeholder="user123" />
            </div>
            <div>
              <p className={labelCls}>Password</p>
              <div className="relative">
                <input
                  className={inputCls + ' pr-10'}
                  type={showPassword ? 'text' : 'password'}
                  value={form.comm_password || ''}
                  onChange={e => set('comm_password', e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => toggleField('is_synced_comm')}
              className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors ${
                form.is_synced_comm ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {form.is_synced_comm ? 'UNSYNC' : 'SYNC'}
            </button>
            <button className="px-3 py-2 rounded-lg text-xs font-bold tracking-wide bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              SEND WELCOME
            </button>
            <button className="px-3 py-2 rounded-lg text-xs font-bold tracking-wide bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              SILENCE BEEPS
            </button>
            <button className="px-3 py-2 rounded-lg text-xs font-bold tracking-wide bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              COMMUNICATION TEST
            </button>
            <button className="px-3 py-2 rounded-lg text-xs font-bold tracking-wide bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              DEVICE RESET
            </button>
            <button className="px-3 py-2 rounded-lg text-xs font-bold tracking-wide bg-orange-600 text-white hover:bg-orange-700 transition-colors">
              PARTNER PORTAL
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">Panel Details</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className={labelCls}>Panel Type</label>
            <input className={inputCls} value={form.panel_type || ''} onChange={e => set('panel_type', e.target.value)} placeholder="e.g. Honeywell Vista 20P" />
          </div>
          <div>
            <label className={labelCls}>Panel Battery Date</label>
            <input className={inputCls} type="date" value={form.panel_battery_date || ''} onChange={e => set('panel_battery_date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Panel Location</label>
            <input className={inputCls} value={form.panel_location || ''} onChange={e => set('panel_location', e.target.value)} placeholder="" />
          </div>

          <div>
            <label className={labelCls}>Transformer Location</label>
            <input className={inputCls} value={form.transformer_location || ''} onChange={e => set('transformer_location', e.target.value)} placeholder="" />
          </div>
          <div>
            <label className={labelCls}>Antenna Location</label>
            <input className={inputCls} value={form.antenna_location || ''} onChange={e => set('antenna_location', e.target.value)} placeholder="" />
          </div>
          <div>
            <label className={labelCls}>Warranty Information</label>
            <input className={inputCls} value={form.warranty_information || ''} onChange={e => set('warranty_information', e.target.value)} placeholder="" />
          </div>
          <div>
            <label className={labelCls}>Install Date</label>
            <input className={inputCls} type="date" value={form.installation_date || ''} onChange={e => set('installation_date', e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Online Date</label>
            <input className={inputCls} type="date" value={form.online_date || ''} onChange={e => set('online_date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Installer Code</label>
            <input className={inputCls} value={form.installer_code || ''} onChange={e => set('installer_code', e.target.value)} placeholder="" />
          </div>
          <div>
            <label className={labelCls}>Takeover Module Location</label>
            <input className={inputCls} value={form.takeover_module_location || ''} onChange={e => set('takeover_module_location', e.target.value)} placeholder="" />
          </div>
          <div>
            <label className={labelCls}>Permit Number</label>
            <input className={inputCls} value={form.permit_number || ''} onChange={e => set('permit_number', e.target.value)} placeholder="" />
          </div>
        </div>

        <div className="mb-4">
          <label className={labelCls}>Monitoring Account #</label>
          <input className={inputCls + ' max-w-xs'} value={form.monitoring_account_number || ''} onChange={e => set('monitoring_account_number', e.target.value)} placeholder="" />
        </div>

        <div className="mb-5">
          <label className={labelCls}>Notes</label>
          <textarea
            className={inputCls + ' resize-none'}
            rows={3}
            value={form.notes || ''}
            onChange={e => set('notes', e.target.value)}
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
