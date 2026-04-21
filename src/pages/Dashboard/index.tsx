import { RefreshCw, Loader2 } from 'lucide-react';
import { useDashboardData } from './useDashboardData';
import KpiRow from './KpiRow';
import RevenueChart from './RevenueChart';
import SalesPipeline from './SalesPipeline';
import FinancialHealth from './FinancialHealth';
import AlarmFeed from './AlarmFeed';
import TodaySchedule from './TodaySchedule';
import TicketsPanel from './TicketsPanel';
import TeamActivity from './TeamActivity';
import QuickActions from './QuickActions';

interface Props {
  onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const { data, loading, error, reload } = useDashboardData();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const navigate = (page: string) => {
    if (onNavigate) onNavigate(page);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, Admin</h1>
          <p className="text-sm text-gray-500 mt-1">{today} — here's your operations overview.</p>
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">
          Failed to load some dashboard data: {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading dashboard...
        </div>
      ) : data ? (
        <>
          <KpiRow kpis={data.kpis} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RevenueChart data={data.revenueTrend} />
            </div>
            <QuickActions onNavigate={navigate} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AlarmFeed alarms={data.alarms} unackedCount={data.kpis.unackedAlarms} />
            <TodaySchedule
              jobs={data.schedule}
              jobsToday={data.kpis.jobsToday}
              completedToday={data.kpis.jobsCompletedToday}
            />
            <TicketsPanel tickets={data.tickets} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SalesPipeline pipeline={data.pipeline} topDeals={data.topDeals} />
            <FinancialHealth aging={data.aging} transactions={data.transactions} />
            <TeamActivity techs={data.techsOnClock} />
          </div>
        </>
      ) : null}
    </div>
  );
}
