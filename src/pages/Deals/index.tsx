import { useState, useMemo } from 'react';
import {
  Plus, DollarSign, Trophy, Target, TrendingUp,
  Search, LayoutGrid, List, BarChart2, TrendingDown as ForecastIcon,
  Calendar, Filter, X,
} from 'lucide-react';
import { useDeals } from './useDeals';
import KanbanBoard from './KanbanBoard';
import DealSlideOver from './DealSlideOver';
import ForecastView from './ForecastView';
import AnalyticsView from './AnalyticsView';
import NewDealWizard from './NewDealWizard/index';
import type { Deal, ViewMode, PipelineFilter } from './types';
import {
  SALES_STAGES, INSTALL_STATUSES, OFFICE_STATUSES,
  formatCurrency, getStageColor,
} from './types';

export default function Deals() {
  const { deals, employees, loading, updateDealStage, updateDeal, refetch } = useDeals();

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'date' | 'company'>('value');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [quickAddStage, setQuickAddStage] = useState<string | undefined>();
  const [statsTimeframe, setStatsTimeframe] = useState<'all' | '7d' | '30d' | '90d' | 'mtd' | 'qtd' | 'ytd'>('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('all');
  const [installStatusFilter, setInstallStatusFilter] = useState<string>('all');
  const [officeStatusFilter, setOfficeStatusFilter] = useState<string>('all');

  const TIMEFRAME_OPTIONS: { value: typeof statsTimeframe; label: string }[] = [
    { value: 'all', label: 'All time' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'mtd', label: 'Month to date' },
    { value: 'qtd', label: 'Quarter to date' },
    { value: 'ytd', label: 'Year to date' },
  ];

  function timeframeCutoff(tf: typeof statsTimeframe): Date | null {
    const now = new Date();
    switch (tf) {
      case 'all': return null;
      case '7d': return new Date(now.getTime() - 7 * 86_400_000);
      case '30d': return new Date(now.getTime() - 30 * 86_400_000);
      case '90d': return new Date(now.getTime() - 90 * 86_400_000);
      case 'mtd': return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'qtd': {
        const q = Math.floor(now.getMonth() / 3) * 3;
        return new Date(now.getFullYear(), q, 1);
      }
      case 'ytd': return new Date(now.getFullYear(), 0, 1);
    }
  }

  const statsDeals = useMemo(() => {
    const cutoff = timeframeCutoff(statsTimeframe);
    if (!cutoff) return deals;
    const cutoffMs = cutoff.getTime();
    return deals.filter(d => {
      const anchor = d.close_date || d.created_at;
      return anchor ? new Date(anchor).getTime() >= cutoffMs : false;
    });
  }, [deals, statsTimeframe]);

  const filteredDeals = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return deals.filter(d => {
      const matchSearch =
        d.title.toLowerCase().includes(q) ||
        (d.companies?.name ?? '').toLowerCase().includes(q);
      const matchSales = salesStatusFilter === 'all' || d.sales_stage === salesStatusFilter;
      const matchInstall = installStatusFilter === 'all' || d.install_status === installStatusFilter;
      const matchOffice = officeStatusFilter === 'all' || (d.office_status ?? '') === officeStatusFilter;
      return matchSearch && matchSales && matchInstall && matchOffice;
    });
  }, [deals, searchQuery, salesStatusFilter, installStatusFilter, officeStatusFilter]);

  const sortedDeals = useMemo(() => {
    return [...filteredDeals].sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'date') {
        if (!a.expected_close_date) return 1;
        if (!b.expected_close_date) return -1;
        return new Date(a.expected_close_date).getTime() - new Date(b.expected_close_date).getTime();
      }
      return (a.companies?.name ?? '').localeCompare(b.companies?.name ?? '');
    });
  }, [filteredDeals, sortBy]);

  const getStages = () => {
    switch (pipelineFilter) {
      case 'sales': return SALES_STAGES as unknown as string[];
      case 'install': return INSTALL_STATUSES as unknown as string[];
      case 'office': return OFFICE_STATUSES as unknown as string[];
    }
  };

  const getStageValue = (deal: Deal): string => {
    switch (pipelineFilter) {
      case 'sales': return deal.sales_stage;
      case 'install': return deal.install_status;
      case 'office': return deal.office_status ?? '';
    }
  };

  const kanbanColumns = useMemo(() =>
    getStages().map(stage => ({
      stage,
      deals: sortedDeals.filter(d => getStageValue(d) === stage),
    })),
    [sortedDeals, pipelineFilter]
  );

  const wonDeals = statsDeals.filter(d => d.sales_stage === 'Sold');
  const lostDeals = statsDeals.filter(d =>
    ['Lost', 'Did not sell', 'Purchased From Another', 'Sold & Failed'].includes(d.sales_stage)
  );
  const activeDeals = statsDeals.filter(d =>
    !['Lost', 'Did not sell', 'Purchased From Another', 'Sold & Failed'].includes(d.sales_stage)
  );
  const totalPipeline = activeDeals.reduce((s, d) => s + d.value, 0);
  const winRate = wonDeals.length + lostDeals.length > 0
    ? ((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100).toFixed(1)
    : '0';
  const avgDeal = statsDeals.length > 0 ? statsDeals.reduce((s, d) => s + d.value, 0) / statsDeals.length : 0;
  const timeframeLabel = TIMEFRAME_OPTIONS.find(o => o.value === statsTimeframe)?.label || 'All time';

  const activeStatusFilters =
    (salesStatusFilter !== 'all' ? 1 : 0) +
    (installStatusFilter !== 'all' ? 1 : 0) +
    (officeStatusFilter !== 'all' ? 1 : 0);

  const clearStatusFilters = () => {
    setSalesStatusFilter('all');
    setInstallStatusFilter('all');
    setOfficeStatusFilter('all');
  };

  const handleStageChange = (dealId: string, newStage: string, oldStage: string) => {
    const field: 'sales_stage' | 'install_status' | 'office_status' =
      pipelineFilter === 'sales' ? 'sales_stage' :
      pipelineFilter === 'install' ? 'install_status' : 'office_status';
    updateDealStage(dealId, field, newStage, oldStage);
    if (selectedDeal?.id === dealId) {
      setSelectedDeal(prev => prev ? { ...prev, [field]: newStage } : null);
    }
  };

  const viewTabs: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'kanban', label: 'Kanban', icon: <LayoutGrid className="h-4 w-4" /> },
    { mode: 'list', label: 'List', icon: <List className="h-4 w-4" /> },
    { mode: 'forecast', label: 'Forecast', icon: <ForecastIcon className="h-4 w-4" /> },
    { mode: 'analytics', label: 'Analytics', icon: <BarChart2 className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals Pipeline</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Track and manage your sales opportunities</p>
        </div>
        <button
          onClick={() => { setQuickAddStage(undefined); setShowNewDeal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Proposal
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Showing metrics for</span>
            <span className="font-semibold text-gray-900">{timeframeLabel}</span>
            {statsTimeframe !== 'all' && (
              <span className="text-gray-400">· {statsDeals.length} deals</span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            {TIMEFRAME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatsTimeframe(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statsTimeframe === opt.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Pipeline Value',
              value: formatCurrency(totalPipeline),
              sub: `${activeDeals.length} active deals`,
              icon: DollarSign,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              label: 'Closed Won',
              value: String(wonDeals.length),
              sub: `${formatCurrency(wonDeals.reduce((s, d) => s + d.value, 0))} revenue`,
              icon: Trophy,
              color: 'bg-yellow-100 text-yellow-600',
            },
            {
              label: 'Win Rate',
              value: `${winRate}%`,
              sub: `${wonDeals.length} won / ${lostDeals.length} lost`,
              icon: Target,
              color: 'bg-green-100 text-green-600',
            },
            {
              label: 'Avg Deal Size',
              value: formatCurrency(avgDeal),
              sub: `across ${statsDeals.length} deals`,
              icon: TrendingUp,
              color: 'bg-gray-100 text-gray-600',
            },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                <span className={`p-1.5 rounded-lg ${color}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-100">
          {viewTabs.map(tab => (
            <button
              key={tab.mode}
              onClick={() => setViewMode(tab.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === tab.mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {(viewMode === 'kanban' || viewMode === 'list') && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search deals or companies…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {viewMode === 'kanban' && (
                <select
                  value={pipelineFilter}
                  onChange={e => setPipelineFilter(e.target.value as PipelineFilter)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="sales">Sales Pipeline</option>
                  <option value="install">Install Status</option>
                  <option value="office">Office Status</option>
                </select>
              )}

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="value">Sort: Value</option>
                <option value="date">Sort: Close Date</option>
                <option value="company">Sort: Company</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-1">
                <Filter className="h-3.5 w-3.5" />
                Filter by
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">Sales</label>
                <select
                  value={salesStatusFilter}
                  onChange={e => setSalesStatusFilter(e.target.value)}
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors ${
                    salesStatusFilter !== 'all' ? 'border-blue-400 text-blue-700' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  <option value="all">Any</option>
                  {SALES_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">Install</label>
                <select
                  value={installStatusFilter}
                  onChange={e => setInstallStatusFilter(e.target.value)}
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors ${
                    installStatusFilter !== 'all' ? 'border-blue-400 text-blue-700' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  <option value="all">Any</option>
                  {INSTALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">Office</label>
                <select
                  value={officeStatusFilter}
                  onChange={e => setOfficeStatusFilter(e.target.value)}
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors ${
                    officeStatusFilter !== 'all' ? 'border-blue-400 text-blue-700' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  <option value="all">Any</option>
                  {OFFICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {activeStatusFilters > 0 && (
                <button
                  onClick={clearStatusFilters}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-white rounded-md transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear ({activeStatusFilters})
                </button>
              )}

              <span className="text-xs text-gray-400 ml-auto">
                {sortedDeals.length} deal{sortedDeals.length === 1 ? '' : 's'} match
              </span>
            </div>
          </div>
        )}

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading deals…</p>
              </div>
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              columns={kanbanColumns}
              onStageChange={handleStageChange}
              onDealClick={setSelectedDeal}
              onQuickAdd={stage => { setQuickAddStage(stage); setShowNewDeal(true); }}
            />
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Deal', 'Company', 'Value', 'Sales Stage', 'Install', 'Office', 'Close Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedDeals.map(deal => (
                    <tr key={deal.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDeal(deal)}>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{deal.title}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{deal.companies?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{formatCurrency(deal.value)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStageColor(deal.sales_stage)}`}>
                          {deal.sales_stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStageColor(deal.install_status)}`}>
                          {deal.install_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStageColor(deal.office_status ?? '')}`}>
                          {deal.office_status ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {deal.expected_close_date
                          ? new Date(deal.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          onClick={e => { e.stopPropagation(); setSelectedDeal(deal); }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sortedDeals.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No deals match your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'forecast' ? (
            <ForecastView deals={deals} employees={employees} />
          ) : (
            <AnalyticsView deals={deals} employees={employees} />
          )}
        </div>
      </div>

      <DealSlideOver
        deal={selectedDeal}
        employees={employees}
        onClose={() => setSelectedDeal(null)}
        onUpdate={updateDeal}
      />

      {showNewDeal && (
        <NewDealWizard
          initialStage={quickAddStage}
          onClose={() => { setShowNewDeal(false); setQuickAddStage(undefined); }}
          onDealCreated={() => { refetch(); }}
        />
      )}
    </div>
  );
}
