import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Truck, Warehouse, Pencil, Package, ClipboardList, Search, Plus, Loader2, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { StockLocationRecord } from '../../../lib/truckStock';

interface StockRow {
  id: string;
  product_id: string;
  quantity: number;
  reorder_point: number | null;
  products: { name: string; sku: string | null; cost: number | null } | null;
}

interface UsageRow {
  id: string;
  part_name: string;
  quantity: number;
  total_cost: number;
  created_at: string;
  work_orders: { wo_number: string | null; title: string | null; companies: { name: string } | null } | null;
  employees: { first_name: string; last_name: string } | null;
}

interface ProductOption { id: string; name: string; sku: string | null }

interface Props {
  location: StockLocationRecord;
  assignedName: string | null;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function WarehouseDetail({ location, assignedName, onClose, onEdit, onChanged }: Props) {
  const [tab, setTab] = useState<'stock' | 'usage'>('stock');
  const [stock, setStock] = useState<StockRow[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [s, u] = await Promise.all([
      supabase
        .from('warehouse_inventory')
        .select('id, product_id, quantity, reorder_point, products(name, sku, cost)')
        .eq('warehouse_id', location.id),
      supabase
        .from('work_order_parts')
        .select('id, part_name, quantity, total_cost, created_at, work_orders(wo_number, title, companies(name)), employees(first_name, last_name)')
        .eq('source_warehouse_id', location.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (s.error || u.error) setError('Could not load this location.');
    setStock(((s.data || []) as unknown as StockRow[]).sort((a, b) => (a.products?.name || '').localeCompare(b.products?.name || '')));
    setUsage((u.data || []) as unknown as UsageRow[]);
    setLoading(false);
  }, [location.id]);

  useEffect(() => { load(); }, [load]);

  async function setQuantity(row: StockRow, qty: number) {
    const { error: err } = await supabase
      .from('warehouse_inventory')
      .update({ quantity: qty, last_counted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (err) { setError('Could not update that quantity.'); return; }
    await load();
    onChanged();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter(r => `${r.products?.name} ${r.products?.sku}`.toLowerCase().includes(q));
  }, [stock, query]);

  const totalUnits = stock.reduce((s, r) => s + Math.max(0, r.quantity), 0);
  const totalValue = stock.reduce((s, r) => s + Math.max(0, r.quantity) * Number(r.products?.cost || 0), 0);
  const shortCount = stock.filter(r => r.quantity < 0 || (r.reorder_point != null && r.quantity <= r.reorder_point)).length;
  const Icon = location.warehouse_type === 'truck' ? Truck : Warehouse;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-gray-900/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-gray-50 shadow-2xl">
        <header className="bg-white border-b border-gray-200 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${location.warehouse_type === 'truck' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">{location.name}</h2>
              <p className="text-sm text-gray-500">
                {location.warehouse_type === 'truck' ? 'Truck' : 'Warehouse'} · {assignedName || 'No technician assigned'}
              </p>
            </div>
            <button onClick={onEdit} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Units on hand" value={totalUnits.toLocaleString()} />
            <Stat label="Stock value" value={money(totalValue)} />
            <Stat label="Low or short" value={String(shortCount)} tone={shortCount > 0 ? 'warn' : undefined} />
          </div>
          <div className="mt-5 flex gap-1 rounded-lg bg-gray-100 p-1">
            {([['stock', 'Stock', Package], ['usage', 'Recent Job Usage', ClipboardList]] as const).map(([id, label, TabIcon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-all ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <TabIcon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : tab === 'stock' ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search stock" className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  <Plus className="h-4 w-4" /> Add Stock
                </button>
              </div>
              {adding && (
                <AddStockForm
                  warehouseId={location.id}
                  existing={new Set(stock.map(s => s.product_id))}
                  onCancel={() => setAdding(false)}
                  onAdded={async () => { setAdding(false); await load(); onChanged(); }}
                />
              )}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {filtered.length === 0 ? (
                  <p className="px-4 py-12 text-center text-sm text-gray-500">
                    {stock.length === 0 ? 'No stock recorded yet. Add products to start tracking what is on hand.' : 'No matching items.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filtered.map(r => <StockLine key={r.id} row={r} onSave={qty => setQuantity(r, qty)} />)}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {usage.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-gray-500">No parts have been pulled from here on a job yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {usage.map(u => (
                    <li key={u.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.part_name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {u.work_orders?.wo_number || 'Work order'}{u.work_orders?.companies?.name ? ` · ${u.work_orders.companies.name}` : ''}
                          {u.employees ? ` · ${u.employees.first_name} ${u.employees.last_name}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">-{Number(u.quantity)}</p>
                        <p className="text-[11px] text-gray-400">{new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${tone === 'warn' ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function StockLine({ row, onSave }: { row: StockRow; onSave: (qty: number) => Promise<void> }) {
  const [value, setValue] = useState(String(row.quantity));
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(String(row.quantity)), [row.quantity]);
  const dirty = value !== String(row.quantity) && value.trim() !== '' && !Number.isNaN(Number(value));
  const low = row.quantity < 0 || (row.reorder_point != null && row.quantity <= row.reorder_point);

  return (
    <li className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/60 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{row.products?.name || 'Unknown product'}</p>
        <p className="text-xs text-gray-500">{row.products?.sku || 'No SKU'}</p>
      </div>
      {low && (
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          <AlertTriangle className="h-3 w-3" /> {row.quantity < 0 ? 'Short' : 'Low'}
        </span>
      )}
      <input
        type="number"
        step="1"
        value={value}
        onChange={e => setValue(e.target.value)}
        className={`w-20 rounded-lg border px-2 py-1.5 text-right text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${row.quantity < 0 ? 'border-amber-300 text-amber-700' : 'border-gray-300 text-gray-900'}`}
      />
      <button
        onClick={async () => { setSaving(true); await onSave(Math.round(Number(value))); setSaving(false); }}
        disabled={!dirty || saving}
        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 disabled:invisible"
        aria-label="Save quantity"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
    </li>
  );
}

function AddStockForm({ warehouseId, existing, onCancel, onAdded }: {
  warehouseId: string;
  existing: Set<string>;
  onCancel: () => void;
  onAdded: () => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ProductOption[]>([]);
  const [selected, setSelected] = useState<ProductOption | null>(null);
  const [qty, setQty] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = search.trim();
    if (selected || term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const safe = term.replace(/[%,()]/g, ' ');
      const { data } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('is_active', true)
        .or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`)
        .limit(8);
      setResults(((data || []) as ProductOption[]).filter(p => !existing.has(p.id)));
    }, 200);
    return () => clearTimeout(t);
  }, [search, selected, existing]);

  async function add() {
    if (!selected) return;
    setSaving(true);
    const { error: err } = await supabase
      .from('warehouse_inventory')
      .insert({ warehouse_id: warehouseId, product_id: selected.id, quantity: Math.round(Number(qty) || 0), last_counted_at: new Date().toISOString() });
    setSaving(false);
    if (err) { setError('Could not add that product.'); return; }
    await onAdded();
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
      <div className="relative">
        <input
          value={selected ? selected.name : search}
          onChange={e => { setSelected(null); setSearch(e.target.value); }}
          placeholder="Search products by name or SKU"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {results.map(p => (
              <li key={p.id}>
                <button onClick={() => { setSelected(p); setResults([]); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                  <span className="font-medium text-gray-900">{p.name}</span>
                  {p.sku && <span className="ml-2 text-xs text-gray-500">{p.sku}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Quantity</label>
        <input type="number" step="1" value={qty} onChange={e => setQty(e.target.value)} className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm" />
        <div className="flex-1" />
        <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white">Cancel</button>
        <button onClick={add} disabled={!selected || saving} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Adding...' : 'Add'}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
