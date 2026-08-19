import { useState, useEffect, useMemo } from 'react';
import { Search, LayoutGrid, List, Filter, X, Package, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PCProduct } from './types';
import ProductDetail from './ProductDetail';

export default function ProductCentral() {
  const [products, setProducts] = useState<PCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('manufacturer')
      .order('name');
    setProducts((data ?? []) as PCProduct[]);
    setLoading(false);
  }

  const brands = useMemo(() => {
    const set = new Set(products.map(p => p.manufacturer).filter(Boolean) as string[]);
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean) as string[]);
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (brandFilter !== 'All' && p.manufacturer !== brandFilter) return false;
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.manufacturer || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.model_number || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, brandFilter, categoryFilter, search]);

  if (selectedProductId) {
    return (
      <ProductDetail
        productId={selectedProductId}
        onBack={() => setSelectedProductId(null)}
      />
    );
  }

  const hasActiveFilters = brandFilter !== 'All' || categoryFilter !== 'All' || search !== '';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Central</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse the full product catalog -- photos, documents, and community notes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name, SKU, brand, or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={brandFilter}
              onChange={e => setBrandFilter(e.target.value)}
              className="pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {brands.map(b => (
                <option key={b} value={b}>{b === 'All' ? 'All Brands' : b}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearch(''); setBrandFilter('All'); setCategoryFilter('All'); }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Showing {filtered.length} of {products.length} products
        </div>
      </div>

      {/* Products */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-sm text-gray-400">Loading products...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700 mb-1">No products found</p>
          <p className="text-xs text-gray-400">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(product => (
            <button
              key={product.id}
              onClick={() => setSelectedProductId(product.id)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden text-left hover:shadow-md hover:border-gray-300 transition-all group"
            >
              <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <Package className="h-16 w-16 text-gray-200" />
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">
                  {product.manufacturer || 'Unknown Brand'}
                </p>
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">{product.category}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-mono text-gray-500">{product.sku}</span>
                  {product.msrp ? (
                    <span className="text-sm font-bold text-gray-900">
                      ${Number(product.msrp).toLocaleString()}
                    </span>
                  ) : product.price ? (
                    <span className="text-sm font-bold text-gray-900">
                      ${Number(product.price).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(product => (
                <tr
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <Package className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                          {product.name}
                        </p>
                        {product.model_number && (
                          <p className="text-xs text-gray-400 truncate">{product.model_number}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-auto" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.manufacturer || '--'}</td>
                  <td className="px-4 py-3 text-gray-600">{product.category || '--'}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{product.sku}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900 tabular-nums">
                    {product.msrp ? `$${Number(product.msrp).toLocaleString()}` : product.price ? `$${Number(product.price).toLocaleString()}` : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
