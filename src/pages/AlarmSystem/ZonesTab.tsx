import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SystemZone } from '../CustomerProfile/types';

interface Props {
  systemId: string;
  zones: SystemZone[];
  onZonesChange: (zones: SystemZone[]) => void;
}

const ZONE_TYPES = ['Motion', 'Door', 'Window', 'Glass Break', 'Smoke', 'Heat', 'CO', 'Flood', 'Panic', 'Fire', 'Tamper', 'Other'];

const emptyZone = (systemId: string): Partial<SystemZone> => ({
  system_id: systemId,
  zone_number: 1,
  zone_name: '',
  zone_type: 'Motion',
  bypass_status: false,
  install_date: '',
  area: '',
  event_type: '',
  cs_flag: false,
  comm_partner_flag: false,
  tested: false,
  existing_zone: false,
  smoke_detector_test_date: '',
  notes: '',
});

interface ZoneModalProps {
  zone: Partial<SystemZone>;
  onClose: () => void;
  onSave: (zone: Partial<SystemZone>) => Promise<void>;
}

function ZoneModal({ zone: initial, onClose, onSave }: ZoneModalProps) {
  const [form, setForm] = useState<Partial<SystemZone>>({ ...initial });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof SystemZone, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{initial.id ? 'Edit Zone' : 'Add Zone'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Zone Number</label>
              <input className={inputCls} type="number" min={1} value={form.zone_number || ''} onChange={e => set('zone_number', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className={labelCls}>Zone Name / Description</label>
              <input className={inputCls} value={form.zone_name || ''} onChange={e => set('zone_name', e.target.value)} placeholder="e.g. Front Door" />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.zone_type || 'Motion'} onChange={e => set('zone_type', e.target.value)}>
                {ZONE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Area</label>
              <input className={inputCls} value={form.area || ''} onChange={e => set('area', e.target.value)} placeholder="e.g. Main Floor" />
            </div>
            <div>
              <label className={labelCls}>Event Type</label>
              <input className={inputCls} value={form.event_type || ''} onChange={e => set('event_type', e.target.value)} placeholder="e.g. Burglary" />
            </div>
            <div>
              <label className={labelCls}>Install Date</label>
              <input className={inputCls} type="date" value={form.install_date || ''} onChange={e => set('install_date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Smoke Detector Test Date</label>
              <input className={inputCls} type="date" value={form.smoke_detector_test_date || ''} onChange={e => set('smoke_detector_test_date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(['bypass_status', 'cs_flag', 'comm_partner_flag', 'tested', 'existing_zone'] as const).map(field => (
              <label key={field} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form[field]}
                  onChange={e => set(field, e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.zone_name}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Zone'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ZonesTab({ systemId, zones, onZonesChange }: Props) {
  const [modalZone, setModalZone] = useState<Partial<SystemZone> | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSave = async (zone: Partial<SystemZone>) => {
    if (zone.id) {
      const { data } = await supabase
        .from('system_zones')
        .update({
          zone_number: zone.zone_number,
          zone_name: zone.zone_name,
          zone_type: zone.zone_type,
          bypass_status: zone.bypass_status,
          install_date: zone.install_date || null,
          area: zone.area,
          event_type: zone.event_type,
          cs_flag: zone.cs_flag,
          comm_partner_flag: zone.comm_partner_flag,
          tested: zone.tested,
          existing_zone: zone.existing_zone,
          smoke_detector_test_date: zone.smoke_detector_test_date || null,
          notes: zone.notes,
        })
        .eq('id', zone.id)
        .select()
        .maybeSingle();
      if (data) {
        onZonesChange(zones.map(z => z.id === data.id ? (data as SystemZone) : z));
      }
    } else {
      const { data } = await supabase
        .from('system_zones')
        .insert({
          system_id: systemId,
          zone_number: zone.zone_number,
          zone_name: zone.zone_name,
          zone_type: zone.zone_type,
          bypass_status: zone.bypass_status,
          install_date: zone.install_date || null,
          area: zone.area,
          event_type: zone.event_type,
          cs_flag: zone.cs_flag,
          comm_partner_flag: zone.comm_partner_flag,
          tested: zone.tested,
          existing_zone: zone.existing_zone,
          smoke_detector_test_date: zone.smoke_detector_test_date || null,
          notes: zone.notes,
        })
        .select()
        .maybeSingle();
      if (data) onZonesChange([...zones, data as SystemZone]);
    }
    setModalZone(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from('system_zones').delete().eq('id', id);
    onZonesChange(zones.filter(z => z.id !== id));
    setDeleting(null);
  };

  const sorted = [...zones].sort((a, b) => a.zone_number - b.zone_number);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Zone Management</h3>
        <button
          onClick={() => setModalZone(emptyZone(systemId))}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Zone
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Zone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Install Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Area</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Type</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">CS</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Comm Partner</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Tested</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Existing</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Smoke Detector<br/>Test Date</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(zone => (
              <tr key={zone.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-700 text-xs font-semibold">
                  {String(zone.zone_number).padStart(2, '0')}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{zone.zone_name}</td>
                <td className="px-4 py-3 text-gray-600">{zone.zone_type}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {zone.install_date ? new Date(zone.install_date).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{zone.area || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{zone.event_type || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {zone.cs_flag ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}
                </td>
                <td className="px-4 py-3 text-center">
                  {zone.comm_partner_flag ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}
                </td>
                <td className="px-4 py-3 text-center">
                  {zone.tested ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}
                </td>
                <td className="px-4 py-3 text-center">
                  {zone.existing_zone ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {zone.smoke_detector_test_date ? new Date(zone.smoke_detector_test_date).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setModalZone(zone)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(zone.id)}
                      disabled={deleting === zone.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {zones.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            No zones added yet. Click "Add Zone" to get started.
          </div>
        )}
      </div>

      {modalZone && (
        <ZoneModal zone={modalZone} onClose={() => setModalZone(null)} onSave={handleSave} />
      )}
    </div>
  );
}
