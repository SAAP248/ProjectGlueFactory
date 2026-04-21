import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, Box, CreditCard as Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  model_number: string | null;
  category: string;
  manufacturer: string;
  cost: number;
  price: number;
  image_url: string | null;
  is_active: boolean;
  track_serial: boolean;
}

const EMPTY_FORM: Omit<Product, 'id'> = {
  sku: '',
  name: '',
  description: '',
  model_number: '',
  category: '',
  manufacturer: '',
  cost: 0,
  price: 0,
  image_url: '',
  is_active: true,
  track_serial: false,
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showPanel, setShowPanel] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchProducts() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id,sku,name,description,model_number,category,manufacturer,cost,price,image_url,is_active,track_serial')
      .order('category')
      .order('name');
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => { fetchProducts(); }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
    return ['All', ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const q = search.toLowerCase();
      const matchSearch = !q
        || p.name.toLowerCase().includes(q)
        || p.sku.toLowerCase().includes(q)
        || (p.manufacturer ?? '').toLowerCase().includes(q)
        || (p.category ?? '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, search, categoryFilter]);

  function openNew() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowPanel(true);
  }

  function openEdit(p: Product) {
    setEditTarget(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description ?? '',
      model_number: p.model_number ?? '',
      category: p.category,
      manufacturer: p.manufacturer,
      cost: p.cost,
      price: p.price,
      image_url: p.image_url ?? '',
      is_active: p.is_active,
      track_serial: p.track_serial,
    });
    setError('');
    setShowPanel(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.sku.trim()) { setError('SKU is required.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description || null,
      model_number: form.model_number || null,
      category: form.category.trim(),
      manufacturer: form.manufacturer.trim(),
      cost: Number(form.cost),
      price: Number(form.price),
      image_url: form.image_url || null,
      is_active: form.is_active,
      track_serial: form.track_serial,
    };

    if (editTarget) {
      const { error: err } = await supabase.from('products').update(payload).eq('id', editTarget.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('products').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowPanel(false);
    fetchProducts();
  }

  async function toggleActive(p: Product) {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  }

  const margin = (cost: number, price: number) =>
    price > 0 ? (((price - cost) / price) * 100).toFixed(0) + '%' : '—';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-0.5 text-sm">{products.length} products in catalog</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> New Product
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products, SKU, manufacturer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Box className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Manufacturer</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Margin</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Box className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category}</td>
                    <td className="px-4 py-3 text-gray-600">{p.manufacturer}</td>
                    <td className="px-4 py-3 text-right text-gray-700">${Number(p.cost).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">${Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-bold ${Number(p.price) > 0 && ((Number(p.price) - Number(p.cost)) / Number(p.price)) * 100 >= 30 ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {margin(Number(p.cost), Number(p.price))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(p)} title={p.is_active ? 'Deactivate' : 'Activate'}>
                        {p.is_active
                          ? <ToggleRight className="h-5 w-5 text-emerald-500 mx-auto" />
                          : <ToggleLeft className="h-5 w-5 text-gray-300 mx-auto" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPanel && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editTarget ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Product Name *</label>
                  <input
                    type="text"
                    placeholder="XR550 Commercial Security Panel"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">SKU *</label>
                  <input
                    type="text"
                    placeholder="DMP-XR550"
                    value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Model Number</label>
                  <input
                    type="text"
                    placeholder="XR550"
                    value={form.model_number ?? ''}
                    onChange={e => setForm(f => ({ ...f, model_number: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                  <input
                    type="text"
                    placeholder="Control Panels"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="DMP"
                    value={form.manufacturer}
                    onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cost</label>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={form.cost}
                      onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Retail Price{' '}
                    {form.price > 0 && form.cost >= 0 && (
                      <span className={`normal-case font-normal ${form.price > form.cost ? 'text-emerald-600' : 'text-red-500'}`}>
                        — {margin(form.cost, form.price)} margin
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={form.image_url ?? ''}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Product description shown on proposals and in the catalog…"
                    value={form.description ?? ''}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Active (available in proposals)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.track_serial}
                    onChange={e => setForm(f => ({ ...f, track_serial: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Track serial numbers for this product</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowPanel(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold"
              >
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
