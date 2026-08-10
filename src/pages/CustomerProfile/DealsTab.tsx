import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, Repeat, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DealSlideOver from '../Deals/DealSlideOver';
import type { Deal as FullDeal, Employee } from '../Deals/types';

interface DealRow {
  id: string;
  title: string;
  value: number;
  rmr: number;
  sales_stage: string | null;
  created_at: string;
  expected_close_date: string | null;
  systemTypes: { name: string; color: string }[];
}

interface Props {
  companyId: string;
}

const STAGE_STYLES: Record<string, { bg: string; text: string }> = {
  Lead:              { bg: 'bg-slate-100',   text: 'text-slate-700' },
  'Proposal Sent':   { bg: 'bg-blue-50',     text: 'text-blue-700' },
  'Proposal Viewed': { bg: 'bg-cyan-50',     text: 'text-cyan-700' },
  'Proposal Accepted': { bg: 'bg-teal-50',   text: 'text-teal-700' },
  'Agreement Sent':  { bg: 'bg-indigo-50',   text: 'text-indigo-700' },
  Sold:              { bg: 'bg-emerald-50',   text: 'text-emerald-700' },
  Lost:              { bg: 'bg-red-50',       text: 'text-red-600' },
  'Did not sell':    { bg: 'bg-orange-50',    text: 'text-orange-700' },
};

function stageStyle(stage: string | null) {
  if (!stage) return { bg: 'bg-gray-100', text: 'text-gray-500' };
  return STAGE_STYLES[stage] || { bg: 'bg-gray-100', text: 'text-gray-600' };
}

function formatCurrency(v: unknown) {
  const n = Number(v);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

function formatDate(d: string | null | undefined) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type SortKey = 'title' | 'sales_stage' | 'value' | 'rmr' | 'created_at';

export default function DealsTab({ companyId }: Props) {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const [selectedDeal, setSelectedDeal] = useState<FullDeal | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    loadDeals();
    loadEmployees();
  }, [companyId]);

  async function loadDeals() {
    setLoading(true);

    const { data: rawDeals } = await supabase
      .from('deals')
      .select('id, title, value, rmr, sales_stage, created_at, expected_close_date')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (!rawDeals || rawDeals.length === 0) {
      setDeals([]);
      setLoading(false);
      return;
    }

    const dealIds = rawDeals.map(d => d.id);
    const { data: dealSystems } = await supabase
      .from('deal_systems')
      .select('deal_id, system_types(name, color)')
      .in('deal_id', dealIds);

    const systemsByDeal = new Map<string, { name: string; color: string }[]>();
    for (const ds of dealSystems || []) {
      const st = ds.system_types as any;
      if (!st) continue;
      const arr = systemsByDeal.get(ds.deal_id) || [];
      arr.push({ name: st.name, color: st.color });
      systemsByDeal.set(ds.deal_id, arr);
    }

    setDeals(rawDeals.map(d => ({
      id: d.id,
      title: d.title,
      value: Number(d.value) || 0,
      rmr: Number(d.rmr) || 0,
      sales_stage: d.sales_stage,
      created_at: d.created_at,
      expected_close_date: d.expected_close_date,
      systemTypes: systemsByDeal.get(d.id) || [],
    })));
    setLoading(false);
  }

  async function loadEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, role')
      .order('first_name');
    if (data) setEmployees(data as Employee[]);
  }

  async function openDeal(dealId: string) {
    const { data } = await supabase
      .from('deals')
      .select('*, companies(name), assigned_employee:employees!deals_assigned_employee_id_fkey(first_name, last_name)')
      .eq('id', dealId)
      .maybeSingle();
    if (data) setSelectedDeal(data as unknown as FullDeal);
  }

  const handleUpdateDeal = useCallback(async (dealId: string, updates: Partial<FullDeal>) => {
    const { error } = await supabase.from('deals').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('id', dealId);
    if (!error) {
      setSelectedDeal(prev => prev ? { ...prev, ...updates } : prev);
      loadDeals();
    }
    return !error;
  }, [companyId]);

  function handleCloseSlideOver() {
    setSelectedDeal(null);
    loadDeals();
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'title');
    }
  }

  const sorted = [...deals].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'title': cmp = a.title.localeCompare(b.title); break;
      case 'sales_stage': cmp = (a.sales_stage || '').localeCompare(b.sales_stage || ''); break;
      case 'value': cmp = a.value - b.value; break;
      case 'rmr': cmp = a.rmr - b.rmr; break;
      case 'created_at': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const totalSales = deals.reduce((s, d) => s + d.value, 0);
  const totalRmr = deals.reduce((s, d) => s + d.rmr, 0);
  const wonDeals = deals.filter(d => d.sales_stage === 'Sold').length;

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc
      ? <ChevronUp className="h-3.5 w-3.5 text-blue-600" />
      : <ChevronDown className="h-3.5 w-3.5 text-blue-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-sm text-gray-400">Loading deals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Deals</p>
              <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
              <p className="text-xs text-gray-400">{wonDeals} won</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
              <Repeat className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total RMR</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRmr)}<span className="text-sm font-normal text-gray-400">/mo</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Deals list */}
      {deals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700 mb-1">No deals yet</p>
          <p className="text-xs text-gray-400">Deals associated with this customer will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3">
                    <button onClick={() => handleSort('title')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                      Deal <SortIcon col="title" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</span>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button onClick={() => handleSort('sales_stage')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                      Status <SortIcon col="sales_stage" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3">
                    <button onClick={() => handleSort('value')} className="flex items-center gap-1 justify-end text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                      Sales <SortIcon col="value" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3">
                    <button onClick={() => handleSort('rmr')} className="flex items-center gap-1 justify-end text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                      RMR <SortIcon col="rmr" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3">
                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                      Created <SortIcon col="created_at" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(deal => {
                  const ss = stageStyle(deal.sales_stage);
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => openDeal(deal.id)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-[260px] group-hover:text-blue-700 transition-colors">{deal.title}</p>
                            {deal.expected_close_date && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                Close {formatDate(deal.expected_close_date)}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {deal.systemTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {deal.systemTypes.map((st, i) => (
                              <span
                                key={i}
                                className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: st.color + '18',
                                  color: st.color,
                                }}
                              >
                                {st.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${ss.bg} ${ss.text}`}>
                          {deal.sales_stage || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(deal.value)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {deal.rmr > 0 ? (
                          <span className="font-semibold text-gray-900">{formatCurrency(deal.rmr)}<span className="text-xs font-normal text-gray-400">/mo</span></span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                        {formatDate(deal.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedDeal && (
        <DealSlideOver
          deal={selectedDeal}
          employees={employees}
          onClose={handleCloseSlideOver}
          onUpdate={handleUpdateDeal}
        />
      )}
    </div>
  );
}
