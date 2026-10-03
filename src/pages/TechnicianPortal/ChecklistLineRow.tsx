import { useState } from 'react';
import { Check, Minus, Plus, Truck, AlertTriangle, ChevronDown, ChevronUp, Warehouse } from 'lucide-react';
import type { ChecklistLine, CrewMember, StockLocation, UsedPart } from './partsChecklistData';
import { stockKey } from './partsChecklistData';

export interface PartDetails {
  serial_number: string;
  mac_address: string;
  imei: string;
  installed_location: string;
  add_to_inventory: boolean;
}

interface Props {
  line: ChecklistLine;
  parts: UsedPart[];
  techId: string | null;
  crew: CrewMember[];
  locations: StockLocation[];
  stock: Record<string, number>;
  busy: boolean;
  onTick: () => void;
  onUntick: (part: UsedPart) => void;
  onQuantity: (part: UsedPart, qty: number) => void;
  onSource: (part: UsedPart, warehouseId: string | null) => void;
  onSaveDetails: (part: UsedPart, details: PartDetails) => Promise<void>;
}

export default function ChecklistLineRow({
  line, parts, techId, crew, locations, stock, busy, onTick, onUntick, onQuantity, onSource, onSaveDetails,
}: Props) {
  const mine = parts.find(p => p.used_by_employee_id === techId) || null;
  const others = parts.filter(p => p !== mine);
  const used = parts.reduce((s, p) => s + Number(p.quantity || 0), 0);
  const remaining = Math.max(0, line.quantity - used);
  const complete = line.quantity > 0 && used >= line.quantity;
  const [open, setOpen] = useState(false);

  const nameOf = (id: string | null) => crew.find(c => c.id === id)?.name || 'Technician';
  const locName = (id: string | null) => locations.find(l => l.id === id)?.name || null;

  const source = mine ? locations.find(l => l.id === mine.source_warehouse_id) || null : null;
  const stockAfter = mine && source && line.product_id ? stock[stockKey(source.id, line.product_id)] : undefined;

  return (
    <div className={`rounded-xl border transition-colors ${mine ? 'border-emerald-300 bg-emerald-50/40' : complete ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-3 p-3">
        <button
          onClick={() => (mine ? onUntick(mine) : onTick())}
          disabled={busy}
          aria-label={mine ? 'Untick item' : 'Tick item as used'}
          className={`mt-0.5 h-6 w-6 flex-shrink-0 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 ${
            mine ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white hover:border-emerald-500'
          }`}
        >
          {mine && <Check className="h-4 w-4" strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-snug ${complete && !mine ? 'text-gray-500' : 'text-gray-900'}`}>{line.description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className="text-gray-500">Needed {line.quantity}</span>
            <span className={complete ? 'text-emerald-700 font-semibold' : 'text-gray-500'}>Used {used}</span>
            {!complete && <span className="text-amber-700 font-medium">{remaining} remaining</span>}
          </div>
          {others.length > 0 && (
            <div className="mt-2 space-y-1">
              {others.map(p => (
                <p key={p.id} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <Truck className="h-3 w-3 text-gray-400" />
                  {nameOf(p.used_by_employee_id)} used {Number(p.quantity)}
                  <span className="text-gray-400">· {locName(p.source_warehouse_id) || 'No truck set'}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {mine && (
        <div className="border-t border-emerald-200/70 px-3 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-300 bg-white">
              <button
                onClick={() => onQuantity(mine, Math.max(1, Number(mine.quantity) - 1))}
                disabled={busy || Number(mine.quantity) <= 1}
                className="p-2 text-gray-600 disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-bold text-gray-900">{Number(mine.quantity)}</span>
              <button
                onClick={() => onQuantity(mine, Number(mine.quantity) + 1)}
                disabled={busy}
                className="p-2 text-gray-600 disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <SourceSelect
              value={mine.source_warehouse_id}
              crew={crew}
              locations={locations}
              disabled={busy}
              onChange={id => onSource(mine, id)}
            />
          </div>

          {!mine.source_warehouse_id ? (
            <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Truck className="h-3 w-3" /> No truck set, so stock is not being deducted.
            </p>
          ) : !line.product_id ? (
            <p className="text-[11px] text-gray-500">This item isn't linked to a product, so stock isn't tracked.</p>
          ) : stockAfter !== undefined && stockAfter < 0 ? (
            <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {source?.name} shows {Math.abs(stockAfter)} short for this item. You can still continue.
            </p>
          ) : stockAfter !== undefined ? (
            <p className="text-[11px] text-gray-500">{stockAfter} left on {source?.name}</p>
          ) : null}

          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {mine.serial_number || mine.mac_address || mine.installed_location ? 'Edit install details' : 'Add serial, MAC, location'}
          </button>
          {open && <DetailsForm part={mine} busy={busy} onSave={async d => { await onSaveDetails(mine, d); setOpen(false); }} />}
        </div>
      )}
    </div>
  );
}

export function SourceSelect({ value, crew, locations, disabled, onChange }: {
  value: string | null;
  crew: CrewMember[];
  locations: StockLocation[];
  disabled?: boolean;
  onChange: (id: string | null) => void;
}) {
  const trucks = crew
    .map(c => ({ member: c, loc: locations.find(l => l.assigned_employee_id === c.id) }))
    .filter((t): t is { member: CrewMember; loc: StockLocation } => !!t.loc);
  const truckIds = new Set(trucks.map(t => t.loc.id));
  const rest = locations.filter(l => !truckIds.has(l.id));
  const isWarehouse = locations.find(l => l.id === value)?.warehouse_type === 'warehouse';
  const Icon = isWarehouse ? Warehouse : Truck;

  return (
    <label className="relative flex-1 min-w-0">
      <Icon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
      <select
        value={value || ''}
        disabled={disabled}
        onChange={e => onChange(e.target.value || null)}
        className="w-full appearance-none rounded-lg border border-gray-300 bg-white pl-8 pr-6 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
      >
        <option value="">No truck set</option>
        {trucks.length > 0 && (
          <optgroup label="Crew trucks">
            {trucks.map(t => <option key={t.loc.id} value={t.loc.id}>{t.member.name} – {t.loc.name}</option>)}
          </optgroup>
        )}
        {rest.length > 0 && (
          <optgroup label="Other locations">
            {rest.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </optgroup>
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
    </label>
  );
}

function DetailsForm({ part, busy, onSave }: { part: UsedPart; busy: boolean; onSave: (d: PartDetails) => Promise<void> }) {
  const [d, setD] = useState<PartDetails>({
    serial_number: part.serial_number || '',
    mac_address: part.mac_address || '',
    imei: part.imei || '',
    installed_location: part.installed_location || '',
    add_to_inventory: true,
  });
  const input = 'w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className="space-y-2">
      <input value={d.installed_location} onChange={e => setD({ ...d, installed_location: e.target.value })} placeholder="Installed location (e.g. Front door)" className={input} />
      <div className="grid grid-cols-3 gap-2">
        <input value={d.serial_number} onChange={e => setD({ ...d, serial_number: e.target.value })} placeholder="S/N" className={`${input} font-mono`} />
        <input value={d.mac_address} onChange={e => setD({ ...d, mac_address: e.target.value })} placeholder="MAC" className={`${input} font-mono`} />
        <input value={d.imei} onChange={e => setD({ ...d, imei: e.target.value })} placeholder="IMEI" className={`${input} font-mono`} />
      </div>
      {!part.added_to_site_inventory && (
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={d.add_to_inventory} onChange={e => setD({ ...d, add_to_inventory: e.target.checked })} />
          Add to site inventory
        </label>
      )}
      <button
        onClick={() => onSave(d)}
        disabled={busy}
        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
      >
        Save details
      </button>
    </div>
  );
}
