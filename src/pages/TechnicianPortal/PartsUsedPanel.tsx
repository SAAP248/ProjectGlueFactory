import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wrench, Plus, Trash2, TrendingUp, Loader2, AlertCircle, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { TechWO } from './types';
import type { ChecklistData, ChecklistLine, UsedPart } from './partsChecklistData';
import { loadChecklist, recomputeWorkOrderTotals, truckFor } from './partsChecklistData';
import ChecklistLineRow, { SourceSelect } from './ChecklistLineRow';
import type { PartDetails } from './ChecklistLineRow';

interface Props {
  job: TechWO;
  techId: string | null;
  onChange?: () => void;
}

const EMPTY_FORM = { part_name: '', quantity: '1', unit_cost: '', unit_price: '', installed_location: '', serial_number: '', mac_address: '', imei: '', add_to_inventory: true };

export default function PartsUsedPanel({ job, techId, onChange }: Props) {
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [extraSource, setExtraSource] = useState<string | null | undefined>(undefined);

  const load = useCallback(async () => {
    const res = await loadChecklist(job.id);
    setData(res.data);
    setError(res.error);
    setLoading(false);
  }, [job.id]);

  useEffect(() => { load(); }, [load]);

  const crew = data?.crew || [];
  const locations = data?.locations || [];
  const actingTech = techId || (crew.length === 1 ? crew[0].id : null);
  const defaultSource = truckFor(locations, actingTech)?.id ?? null;
  const myTruck = truckFor(locations, actingTech);

  async function mutate(fn: () => PromiseLike<{ error: unknown }>) {
    setBusy(true);
    setError(null);
    const { error: err } = await fn();
    if (err) setError('That change could not be saved. Please try again.');
    await recomputeWorkOrderTotals(job);
    await load();
    setBusy(false);
    onChange?.();
  }

  function tick(line: ChecklistLine, used: number) {
    const qty = Math.max(1, Math.round(line.quantity - used));
    return mutate(() => supabase.from('work_order_parts').insert({
      work_order_id: job.id,
      work_order_line_item_id: line.id,
      product_id: line.product_id,
      part_name: line.description,
      quantity: qty,
      unit_cost: line.cost_price,
      unit_price: line.unit_price,
      total_cost: line.cost_price * qty,
      total_price: line.unit_price * qty,
      used_by_employee_id: actingTech,
      source_warehouse_id: defaultSource,
      added_to_site_inventory: false,
    }));
  }

  const setQuantity = (p: UsedPart, qty: number) => mutate(() => supabase.from('work_order_parts').update({
    quantity: qty,
    total_cost: Number(p.unit_cost) * qty,
    total_price: Number(p.unit_price) * qty,
  }).eq('id', p.id));

  const setSource = (p: UsedPart, warehouseId: string | null) =>
    mutate(() => supabase.from('work_order_parts').update({ source_warehouse_id: warehouseId }).eq('id', p.id));

  const removePart = (p: UsedPart) => mutate(() => supabase.from('work_order_parts').delete().eq('id', p.id));

  async function saveDetails(p: UsedPart, d: PartDetails) {
    const fields = {
      serial_number: d.serial_number.trim() || null,
      mac_address: d.mac_address.trim() || null,
      imei: d.imei.trim() || null,
      installed_location: d.installed_location.trim() || null,
    };
    await mutate(async () => {
      let siteInventoryId: string | null = null;
      if (d.add_to_inventory && !p.added_to_site_inventory && job.site_id) {
        const { data: inv, error: invErr } = await supabase.from('site_inventory').insert({
          company_id: job.company_id,
          site_id: job.site_id,
          system_id: job.system_id,
          product_name: p.part_name,
          product_category: job.customer_systems?.system_types?.name || 'Installed Part',
          serial_number: fields.serial_number,
          mac_address: fields.mac_address,
          imei: fields.imei,
          location_detail: fields.installed_location,
          installation_date: new Date().toISOString().slice(0, 10),
          install_cost: Number(p.unit_cost) || 0,
          status: 'active',
        }).select('id').maybeSingle();
        if (invErr) return { error: invErr };
        siteInventoryId = inv?.id ?? null;
      }
      return supabase.from('work_order_parts').update({
        ...fields,
        ...(siteInventoryId ? { added_to_site_inventory: true, site_inventory_id: siteInventoryId } : {}),
      }).eq('id', p.id);
    });
  }

  async function addExtraPart() {
    if (!form.part_name.trim()) return;
    const qty = parseFloat(form.quantity) || 1;
    const cost = parseFloat(form.unit_cost) || 0;
    const price = parseFloat(form.unit_price) || 0;
    const fields = {
      installed_location: form.installed_location.trim() || null,
      serial_number: form.serial_number.trim() || null,
      mac_address: form.mac_address.trim() || null,
      imei: form.imei.trim() || null,
    };
    await mutate(async () => {
      const res = await supabase.from('work_order_parts').insert({
        work_order_id: job.id,
        part_name: form.part_name.trim(),
        quantity: qty,
        unit_cost: cost,
        unit_price: price,
        total_cost: cost * qty,
        total_price: price * qty,
        used_by_employee_id: actingTech,
        source_warehouse_id: extraSource === undefined ? defaultSource : extraSource,
        added_to_site_inventory: form.add_to_inventory && !!job.site_id,
        ...fields,
      });
      if (!res.error && form.add_to_inventory && job.site_id) {
        await supabase.from('site_inventory').insert({
          company_id: job.company_id,
          site_id: job.site_id,
          system_id: job.system_id,
          product_name: form.part_name.trim(),
          product_category: job.customer_systems?.system_types?.name || 'Service Part',
          serial_number: fields.serial_number,
          mac_address: fields.mac_address,
          imei: fields.imei,
          location_detail: fields.installed_location,
          installation_date: new Date().toISOString().slice(0, 10),
          install_cost: cost,
          status: 'active',
        });
      }
      return res;
    });
    setForm(EMPTY_FORM);
    setExtraSource(undefined);
    setAdding(false);
  }

  const partsByLine = useMemo(() => {
    const map = new Map<string, UsedPart[]>();
    for (const p of data?.parts || []) {
      if (!p.work_order_line_item_id) continue;
      map.set(p.work_order_line_item_id, [...(map.get(p.work_order_line_item_id) || []), p]);
    }
    return map;
  }, [data]);

  const lineIds = new Set((data?.lines || []).map(l => l.id));
  const extras = (data?.parts || []).filter(p => !p.work_order_line_item_id || !lineIds.has(p.work_order_line_item_id));

  const groups = useMemo(() => {
    const out: { key: string; label: string | null; lines: ChecklistLine[] }[] = [];
    for (const l of data?.lines || []) {
      const key = l.group_key || '__none';
      let g = out.find(x => x.key === key);
      if (!g) { g = { key, label: l.group_label, lines: [] }; out.push(g); }
      g.lines.push(l);
    }
    return out;
  }, [data]);
  const showGroupHeaders = groups.some(g => g.label);

  const totalUnits = (data?.lines || []).reduce((s, l) => s + l.quantity, 0);
  const installedUnits = (data?.lines || []).reduce((s, l) => {
    const used = (partsByLine.get(l.id) || []).reduce((a, p) => a + Number(p.quantity || 0), 0);
    return s + Math.min(l.quantity, used);
  }, 0);
  const pct = totalUnits > 0 ? Math.round((installedUnits / totalUnits) * 100) : 0;

  const allParts = data?.parts || [];
  const totalCost = allParts.reduce((s, p) => s + Number(p.total_cost || 0), 0);
  const totalPrice = allParts.reduce((s, p) => s + Number(p.total_price || 0), 0);
  const laborCost = Number(job.total_labor_cost || 0);
  const revenue = job.billing_type === 'fixed' ? Number(job.fixed_amount || 0) : (Number(job.total_revenue) || totalPrice + laborCost);
  const profit = revenue - totalCost - laborCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const crewName = (id: string | null) => crew.find(c => c.id === id)?.name;
  const locName = (id: string | null) => locations.find(l => l.id === id)?.name;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Wrench className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Parts & Materials</p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
            <Truck className="h-3 w-3 flex-shrink-0" />
            {myTruck ? `Pulling from ${myTruck.name}` : 'No truck set'}
          </p>
        </div>
        {busy && <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />}
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <p className="p-4 text-xs text-gray-400">Loading parts...</p>
      ) : (
        <>
          {totalUnits > 0 && (
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-semibold text-gray-700">{installedUnits} of {totalUnits} items installed</span>
                <span className="text-gray-500">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <div className="p-4 space-y-4">
            {groups.length === 0 && extras.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2 text-center">No items on this job yet. Add any parts you use below.</p>
            )}
            {groups.map(g => (
              <div key={g.key} className="space-y-2">
                {showGroupHeaders && (
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{g.label || 'Other Items'}</p>
                )}
                {g.lines.map(line => {
                  const lineParts = partsByLine.get(line.id) || [];
                  const used = lineParts.reduce((s, p) => s + Number(p.quantity || 0), 0);
                  return (
                    <ChecklistLineRow
                      key={line.id}
                      line={line}
                      parts={lineParts}
                      techId={actingTech}
                      crew={crew}
                      locations={locations}
                      stock={data?.stock || {}}
                      busy={busy}
                      onTick={() => tick(line, used)}
                      onUntick={removePart}
                      onQuantity={setQuantity}
                      onSource={setSource}
                      onSaveDetails={saveDetails}
                    />
                  );
                })}
              </div>
            ))}

            {extras.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Extra Parts</p>
                {extras.map(p => (
                  <div key={p.id} className="border border-gray-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{p.part_name}</p>
                      <p className="text-[11px] text-gray-500">
                        Qty {Number(p.quantity)} · Cost ${Number(p.total_cost).toFixed(2)} · Price ${Number(p.total_price).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {crewName(p.used_by_employee_id) || 'Technician'} · {locName(p.source_warehouse_id) || 'No truck set'}
                      </p>
                      {(p.serial_number || p.mac_address || p.imei) && (
                        <div className="mt-1 flex gap-3 text-[10px] font-mono text-gray-600">
                          {p.serial_number && <span>S/N: {p.serial_number}</span>}
                          {p.mac_address && <span>MAC: {p.mac_address}</span>}
                          {p.imei && <span>IMEI: {p.imei}</span>}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removePart(p)} disabled={busy} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50" aria-label="Remove part">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {adding ? (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <input
                  type="text"
                  value={form.part_name}
                  onChange={e => setForm(f => ({ ...f, part_name: e.target.value }))}
                  placeholder="Part name (e.g. Wire, connectors)"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" step="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Qty" className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
                  <input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="Cost $" className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
                  <input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="Price $" className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <SourceSelect
                  value={extraSource === undefined ? defaultSource : extraSource}
                  crew={crew}
                  locations={locations}
                  onChange={setExtraSource}
                />
                <input
                  type="text"
                  value={form.installed_location}
                  onChange={e => setForm(f => ({ ...f, installed_location: e.target.value }))}
                  placeholder="Installed location"
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
                <div className="flex gap-2">
                  <button onClick={() => { setAdding(false); setForm(EMPTY_FORM); }} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-white">
                    Cancel
                  </button>
                  <button onClick={addExtraPart} disabled={!form.part_name.trim() || busy} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">
                    Save Part
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-semibold text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add extra part
              </button>
            )}
          </div>
        </>
      )}

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
