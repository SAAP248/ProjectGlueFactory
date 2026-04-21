import { useEffect, useState } from 'react';
import { Wrench, Plus, Trash2, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PartUsed, TechWO } from './types';

interface Props {
  job: TechWO;
  onChange?: () => void;
}

export default function PartsUsedPanel({ job, onChange }: Props) {
  const [parts, setParts] = useState<PartUsed[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    part_name: '',
    quantity: '1',
    unit_cost: '',
    unit_price: '',
    installed_location: '',
    serial_number: '',
    mac_address: '',
    imei: '',
    add_to_inventory: true,
  });

  async function load() {
    const { data } = await supabase
      .from('work_order_parts')
      .select('*')
      .eq('work_order_id', job.id)
      .order('created_at');
    setParts((data as PartUsed[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [job.id]);

  async function addPart() {
    if (!form.part_name.trim()) return;
    const qty = parseFloat(form.quantity) || 1;
    const cost = parseFloat(form.unit_cost) || 0;
    const price = parseFloat(form.unit_price) || 0;

    const { data: newPart } = await supabase.from('work_order_parts').insert({
      work_order_id: job.id,
      part_name: form.part_name.trim(),
      quantity: qty,
      unit_cost: cost,
      unit_price: price,
      total_cost: cost * qty,
      total_price: price * qty,
      installed_location: form.installed_location.trim() || null,
      serial_number: form.serial_number.trim() || null,
      mac_address: form.mac_address.trim() || null,
      imei: form.imei.trim() || null,
      added_to_site_inventory: form.add_to_inventory,
    }).select().maybeSingle();

    if (newPart && form.add_to_inventory && job.site_id) {
      await supabase.from('site_inventory').insert({
        company_id: job.company_id,
        site_id: job.site_id,
        system_id: job.system_id,
        product_name: form.part_name.trim(),
        product_category: job.customer_systems?.system_types?.name || 'Service Part',
        serial_number: form.serial_number.trim() || null,
        mac_address: form.mac_address.trim() || null,
        imei: form.imei.trim() || null,
        location_detail: form.installed_location.trim() || null,
        installation_date: new Date().toISOString().slice(0, 10),
        install_cost: cost,
        status: 'active',
      });
    }

    await recomputeTotals();
    await load();
    setForm({ part_name: '', quantity: '1', unit_cost: '', unit_price: '', installed_location: '', serial_number: '', mac_address: '', imei: '', add_to_inventory: true });
    setAdding(false);
    onChange?.();
  }

  async function removePart(id: string) {
    await supabase.from('work_order_parts').delete().eq('id', id);
    await recomputeTotals();
    await load();
    onChange?.();
  }

  async function recomputeTotals() {
    const { data: partsRows } = await supabase.from('work_order_parts').select('total_cost, total_price').eq('work_order_id', job.id);
    const partsCost = (partsRows || []).reduce((s: number, p: any) => s + Number(p.total_cost || 0), 0);
    const partsRevenue = (partsRows || []).reduce((s: number, p: any) => s + Number(p.total_price || 0), 0);

    const laborCost = Number(job.total_labor_cost || 0);
    const existingRevenue = Number(job.total_revenue || 0);
    const fixedRevenue = job.billing_type === 'fixed' ? Number(job.fixed_amount || 0) : 0;
    const totalRevenue = fixedRevenue > 0 ? fixedRevenue : Math.max(existingRevenue, partsRevenue + laborCost);
    const profit = totalRevenue - partsCost - laborCost;
    const margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 10000) / 100 : 0;

    await supabase.from('work_orders').update({
      total_parts_cost: partsCost,
      total_revenue: totalRevenue,
      profit_amount: profit,
      profit_margin_pct: margin,
    }).eq('id', job.id);
  }

  const totalCost = parts.reduce((s, p) => s + Number(p.total_cost || 0), 0);
  const totalPrice = parts.reduce((s, p) => s + Number(p.total_price || 0), 0);
  const laborCost = Number(job.total_labor_cost || 0);
  const revenue = job.billing_type === 'fixed' ? Number(job.fixed_amount || 0) : (Number(job.total_revenue) || totalPrice + laborCost);
  const profit = revenue - totalCost - laborCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Wrench className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">Parts & Materials Used</p>
          <p className="text-[11px] text-gray-500">Tracked for inventory & profitability</p>
        </div>
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> {adding ? 'Cancel' : 'Add Part'}
        </button>
      </div>

      {adding && (
        <div className="p-4 bg-gray-50 border-b border-gray-100 space-y-2">
          <input
            type="text"
            value={form.part_name}
            onChange={e => setForm(f => ({ ...f, part_name: e.target.value }))}
            placeholder="Part name (e.g. DMP Motion Sensor)"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" step="0.01" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Qty" className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
            <input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="Cost $" className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
            <input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="Price $" className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <input
            type="text"
            value={form.installed_location}
            onChange={e => setForm(f => ({ ...f, installed_location: e.target.value }))}
            placeholder="Installed location (e.g. Server Rack 2, U12)"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
          />
          <div className="grid grid-cols-3 gap-2">
            <input type="text" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} placeholder="S/N" className="text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono" />
            <input type="text" value={form.mac_address} onChange={e => setForm(f => ({ ...f, mac_address: e.target.value }))} placeholder="MAC" className="text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono" />
            <input type="text" value={form.imei} onChange={e => setForm(f => ({ ...f, imei: e.target.value }))} placeholder="IMEI" className="text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono" />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={form.add_to_inventory} onChange={e => setForm(f => ({ ...f, add_to_inventory: e.target.checked }))} />
            Add to site inventory
          </label>
          <button
            onClick={addPart}
            disabled={!form.part_name.trim()}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
          >
            Save Part
          </button>
        </div>
      )}

      <div className="p-4 space-y-2">
        {loading ? (
          <p className="text-xs text-gray-400">Loading parts...</p>
        ) : parts.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2 text-center">No parts recorded yet.</p>
        ) : (
          parts.map(p => (
            <div key={p.id} className="border border-gray-200 rounded-xl p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{p.part_name}</p>
                <p className="text-[11px] text-gray-500">Qty {p.quantity} · Cost ${Number(p.total_cost).toFixed(2)} · Price ${Number(p.total_price).toFixed(2)}</p>
                {(p.serial_number || p.mac_address || p.imei) && (
                  <div className="mt-1 flex gap-3 text-[10px] font-mono text-gray-600">
                    {p.serial_number && <span>S/N: {p.serial_number}</span>}
                    {p.mac_address && <span>MAC: {p.mac_address}</span>}
                    {p.imei && <span>IMEI: {p.imei}</span>}
                  </div>
                )}
                {p.installed_location && <p className="text-[11px] text-gray-500 mt-0.5">{p.installed_location}</p>}
              </div>
              <button onClick={() => removePart(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Profitability summary */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Profitability</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-gray-500">Revenue</p>
            <p className="text-sm font-bold text-gray-900">${revenue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Parts</p>
            <p className="text-sm font-bold text-gray-700">${totalCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Labor</p>
            <p className="text-sm font-bold text-gray-700">${laborCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Profit</p>
            <p className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              ${profit.toFixed(2)}
              <span className="text-[10px] font-normal ml-1">({margin.toFixed(0)}%)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
