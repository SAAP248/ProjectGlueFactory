import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, X, GripVertical, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { WizardState, WizardLineItem, ProductCatalogItem } from './types';

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

function margin(cost: number, price: number): number {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

function MarginBadge({ cost, price, threshold }: { cost: number; price: number; threshold: number }) {
  const m = margin(Number(cost), Number(price));
  const ok = m >= threshold;
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      {m.toFixed(0)}%
    </span>
  );
}

export default function Step3Products({ state, onChange }: Props) {
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activeSystemId, setActiveSystemId] = useState<string | null>(
    state.systems[0]?.id ?? 'general'
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragOverItem, setDragOverItem] = useState<{ id: string; groupId: string } | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const dragItemId = useRef<string | null>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('id,sku,name,description,category,manufacturer,cost,price,image_url,is_active')
      .eq('is_active', true)
      .order('category')
      .order('name')
      .then(({ data }) => { if (data) setProducts(data as ProductCatalogItem[]); });
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category))).sort();
    return ['All', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, search, categoryFilter]);

  const allGroups = [
    ...state.systems.map(s => ({ id: s.id, name: s.name, isGeneral: false })),
    { id: 'general', name: 'Other / General Items', isGeneral: true },
  ];

  function getItemsForGroup(groupId: string): WizardLineItem[] {
    if (groupId === 'general') {
      return state.lineItems.filter(i => !i.system_group_id).sort((a, b) => a.sort_order - b.sort_order);
    }
    return state.lineItems.filter(i => i.system_group_id === groupId).sort((a, b) => a.sort_order - b.sort_order);
  }

  function addProductToGroup(product: ProductCatalogItem, groupId: string) {
    const groupItems = getItemsForGroup(groupId);
    const newItem: WizardLineItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      system_group_id: groupId === 'general' ? null : groupId,
      description: product.name,
      quantity: 1,
      unit_cost: Number(product.cost),
      unit_price: Number(product.price),
      sort_order: groupItems.length,
    };
    onChange({ lineItems: [...state.lineItems, newItem] });
  }

  function addCustomItem(groupId: string) {
    const groupItems = getItemsForGroup(groupId);
    const newItem: WizardLineItem = {
      id: crypto.randomUUID(),
      product_id: null,
      system_group_id: groupId === 'general' ? null : groupId,
      description: '',
      quantity: 1,
      unit_cost: 0,
      unit_price: 0,
      sort_order: groupItems.length,
    };
    onChange({ lineItems: [...state.lineItems, newItem] });
  }

  function updateItem(id: string, updates: Partial<WizardLineItem>) {
    onChange({ lineItems: state.lineItems.map(i => i.id === id ? { ...i, ...updates } : i) });
  }

  function removeItem(id: string) {
    onChange({ lineItems: state.lineItems.filter(i => i.id !== id) });
  }

  function handleBrowseProducts(groupId: string) {
    setActiveSystemId(groupId);
    if (collapsed[groupId]) {
      setCollapsed(prev => ({ ...prev, [groupId]: false }));
    }
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function handleDragStart(e: React.DragEvent, itemId: string) {
    dragItemId.current = itemId;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOverItem(e: React.DragEvent, itemId: string, groupId: string) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem({ id: itemId, groupId });
    setDragOverGroup(null);
  }

  function handleDragOverGroup(e: React.DragEvent, groupId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroup(groupId);
    setDragOverItem(null);
  }

  function handleDropOnItem(e: React.DragEvent, targetItemId: string, targetGroupId: string) {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = dragItemId.current;
    if (!sourceId || sourceId === targetItemId) {
      clearDragState();
      return;
    }

    const sourceItem = state.lineItems.find(i => i.id === sourceId);
    if (!sourceItem) { clearDragState(); return; }

    const newGroupId = targetGroupId === 'general' ? null : targetGroupId;
    const targetGroupItems = getItemsForGroup(targetGroupId).filter(i => i.id !== sourceId);
    const targetIdx = targetGroupItems.findIndex(i => i.id === targetItemId);

    const movedItem: WizardLineItem = { ...sourceItem, system_group_id: newGroupId };
    const insertIdx = targetIdx === -1 ? targetGroupItems.length : targetIdx;
    targetGroupItems.splice(insertIdx, 0, movedItem);

    const reindexed = targetGroupItems.map((item, idx) => ({ ...item, sort_order: idx }));
    const reindexedIds = new Set(reindexed.map(i => i.id));
    const otherItems = state.lineItems
      .filter(i => i.id !== sourceId && !reindexedIds.has(i.id));

    onChange({ lineItems: [...otherItems, ...reindexed] });
    clearDragState();
  }

  function handleDropOnGroup(e: React.DragEvent, targetGroupId: string) {
    e.preventDefault();
    const sourceId = dragItemId.current;
    if (!sourceId) { clearDragState(); return; }

    const sourceItem = state.lineItems.find(i => i.id === sourceId);
    if (!sourceItem) { clearDragState(); return; }

    const newGroupId = targetGroupId === 'general' ? null : targetGroupId;
    const targetGroupItems = getItemsForGroup(targetGroupId).filter(i => i.id !== sourceId);
    const movedItem: WizardLineItem = { ...sourceItem, system_group_id: newGroupId, sort_order: targetGroupItems.length };
    const otherItems = state.lineItems.filter(i => i.id !== sourceId && i.id !== movedItem.id);

    onChange({ lineItems: [...otherItems, movedItem] });
    clearDragState();
  }

  function clearDragState() {
    dragItemId.current = null;
    setDragOverItem(null);
    setDragOverGroup(null);
  }

  function handleDragEnd() {
    clearDragState();
  }

  function groupTotal(items: WizardLineItem[]) {
    return items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  }
  function groupCost(items: WizardLineItem[]) {
    return items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0);
  }

  const totalRevenue = state.lineItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const totalCost = state.lineItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0);
  const overallMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Products & Pricing</h2>
            <p className="text-sm text-gray-500">Add products to each system section. Drag rows to reorder or move between sections. Prices and margins update live.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Margin:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={state.marginThreshold}
                onChange={e => onChange({ marginThreshold: Number(e.target.value) })}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        </div>

        {allGroups.map(group => {
          const items = getItemsForGroup(group.id);
          const rev = groupTotal(items);
          const cost = groupCost(items);
          const m = margin(cost, rev);
          const isCollapsed = collapsed[group.id];
          const isActive = activeSystemId === group.id;

          const isGroupDragOver = dragOverGroup === group.id;

          return (
            <div
              key={group.id}
              onDragOver={e => handleDragOverGroup(e, group.id)}
              onDrop={e => handleDropOnGroup(e, group.id)}
              className={`bg-white rounded-xl border overflow-hidden transition-all ${
                isGroupDragOver
                  ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50/30'
                  : isActive
                  ? 'border-blue-400 ring-2 ring-blue-100'
                  : 'border-gray-200'
              }`}
            >
              <div
                className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setCollapsed(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
              >
                <div className="flex items-center gap-3">
                  {group.isGeneral && <Package className="h-4 w-4 text-gray-400" />}
                  <h3 className="text-sm font-bold text-gray-900">{group.name}</h3>
                  <span className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  {isActive && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Active target
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {items.length > 0 && (
                    <>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500">Revenue</p>
                        <p className="text-sm font-bold text-gray-900">${rev.toFixed(2)}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500">Margin</p>
                        <p className={`text-sm font-bold ${m >= state.marginThreshold ? 'text-emerald-600' : 'text-red-600'}`}>{m.toFixed(0)}%</p>
                      </div>
                    </>
                  )}
                  {isCollapsed ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {!isCollapsed && (
                <div>
                  {items.length === 0 && dragItemId.current && (
                    <div className={`mx-4 my-2 rounded-lg border-2 border-dashed py-4 text-center text-xs font-medium transition-colors ${
                      isGroupDragOver ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400'
                    }`}>
                      Drop here to move to this section
                    </div>
                  )}
                  {items.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="w-6 px-2" />
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Description</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-500 w-16">Qty</th>
                            <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-24">Unit Cost</th>
                            <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-24">Unit Price</th>
                            <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-20">Margin</th>
                            <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-20">Total</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map(item => {
                            const isRowOver = dragOverItem?.id === item.id;
                            const sourceItem = dragItemId.current ? state.lineItems.find(i => i.id === dragItemId.current) : null;
                            const sourceGroupId = sourceItem?.system_group_id ?? 'general';
                            const isCrossGroup = isRowOver && sourceGroupId !== group.id;
                            return (
                            <tr
                              key={item.id}
                              draggable
                              onDragStart={e => handleDragStart(e, item.id)}
                              onDragOver={e => handleDragOverItem(e, item.id, group.id)}
                              onDrop={e => handleDropOnItem(e, item.id, group.id)}
                              onDragEnd={handleDragEnd}
                              className={`transition-colors ${
                                isRowOver
                                  ? isCrossGroup
                                    ? 'bg-amber-50 border-t-2 border-t-amber-400'
                                    : 'bg-blue-50 border-t-2 border-t-blue-400'
                                  : 'hover:bg-gray-50/50'
                              }`}
                            >
                              <td className="px-2 py-1.5 text-gray-300 cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-4 w-4" />
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={e => updateItem(item.id, { description: e.target.value })}
                                  className="w-full border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5"
                                  placeholder="Enter description…"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={item.quantity}
                                  onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })}
                                  className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center justify-end gap-0.5">
                                  <span className="text-gray-400 text-xs">$</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={item.unit_cost}
                                    onChange={e => updateItem(item.id, { unit_cost: Number(e.target.value) })}
                                    className="w-20 border border-gray-200 rounded px-1.5 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center justify-end gap-0.5">
                                  <span className="text-gray-400 text-xs">$</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={item.unit_price}
                                    onChange={e => updateItem(item.id, { unit_price: Number(e.target.value) })}
                                    className="w-20 border border-gray-200 rounded px-1.5 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <MarginBadge cost={item.unit_cost} price={item.unit_price} threshold={state.marginThreshold} />
                              </td>
                              <td className="px-2 py-1.5 text-right text-sm font-semibold text-gray-900">
                                ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                              </td>
                              <td className="px-2 py-1.5">
                                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
                    <button
                      onClick={e => { e.stopPropagation(); handleBrowseProducts(group.id); }}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Search className="h-3.5 w-3.5" /> Browse Products
                    </button>
                    <button
                      onClick={() => addCustomItem(group.id)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Custom Line Item
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-72 shrink-0">
        <div className="sticky top-0 space-y-4" ref={catalogRef}>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Product Catalog</p>
              {activeSystemId ? (
                <p className="text-xs text-blue-600 mt-0.5">
                  Adding to: {activeSystemId === 'general' ? 'General Items' : (state.systems.find(s => s.id === activeSystemId)?.name ?? '')}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">Click "Browse Products" on a section to target it</p>
              )}
            </div>

            <div className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="overflow-x-auto">
                <div className="flex gap-1.5 pb-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`whitespace-nowrap text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-96 divide-y divide-gray-50">
              {filteredProducts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No products found</p>
              ) : (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    disabled={!activeSystemId}
                    onClick={() => activeSystemId && addProductToGroup(product, activeSystemId)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded object-cover shrink-0 bg-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-100 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{product.name}</p>
                      <p className="text-xs text-gray-400">{product.sku}</p>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">${Number(product.price).toFixed(2)}</p>
                    </div>
                    <Plus className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 text-white space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Cost</span>
              <span className="font-semibold">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Revenue</span>
              <span className="font-bold text-white">${totalRevenue.toFixed(2)}</span>
            </div>
            <div className="h-px bg-gray-700" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Overall Margin</span>
              <span className={`font-bold ${overallMargin >= state.marginThreshold ? 'text-emerald-400' : 'text-red-400'}`}>
                {overallMargin.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>{state.lineItems.length} line items</span>
              <span>Target: {state.marginThreshold}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
