import { Users, Briefcase, DollarSign, TrendingUp, AlertTriangle, Repeat, FileWarning, Ticket, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { ElementType } from 'react';
import { useRole } from '../../contexts/RoleContext';
import { ROLE_KPIS, type KpiKey } from '../../config/roleDashboard';
import type { DashboardKpis } from './useDashboardData';

export interface KpiNavigation {
  page: string;
  filter?: string;
}

interface Props {
  kpis: DashboardKpis;
  onNavigate?: (nav: KpiNavigation) => void;
}

interface Kpi {
  key: KpiKey;
  label: string;
  value: string;
  icon: ElementType;
  iconColor: string;
  iconBg: string;
  delta?: { value: string; positive: boolean };
  sub?: string;
  nav?: KpiNavigation;
}

const money = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
    : `$${n.toFixed(0)}`;

const fullMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function KpiRow({ kpis, onNavigate }: Props) {
  const { role } = useRole();
  const visibleKeys = ROLE_KPIS[role];

  const revenueDelta =
    kpis.prevMonthRevenue > 0
      ? ((kpis.monthRevenue - kpis.prevMonthRevenue) / kpis.prevMonthRevenue) * 100
      : kpis.monthRevenue > 0
      ? 100
      : 0;

  const allItems: Kpi[] = [
    {
      key: 'activeCustomers',
      label: 'Active Customers',
      value: kpis.activeCustomers.toLocaleString(),
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      nav: { page: 'customers' },
    },
    {
      key: 'mtdRevenue',
      label: 'MTD Revenue',
      value: fullMoney(kpis.monthRevenue),
      icon: DollarSign,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      delta:
        revenueDelta !== 0
          ? { value: `${revenueDelta >= 0 ? '+' : ''}${revenueDelta.toFixed(1)}%`, positive: revenueDelta >= 0 }
          : undefined,
      sub: 'vs last month',
      nav: { page: 'invoices' },
    },
    {
      key: 'mrr',
      label: 'Monthly Recurring',
      value: fullMoney(kpis.mrr),
      icon: Repeat,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      sub: 'RMR contracts',
      nav: { page: 'invoices' },
    },
    {
      key: 'pipelineValue',
      label: 'Pipeline Value',
      value: money(kpis.pipelineValue),
      icon: TrendingUp,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      sub: `${kpis.activeDeals} active deals`,
      nav: { page: 'deals' },
    },
    {
      key: 'openWorkOrders',
      label: 'Open Work Orders',
      value: kpis.openWorkOrders.toLocaleString(),
      icon: Briefcase,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      sub: `${kpis.jobsToday} scheduled today`,
      nav: { page: 'work-orders', filter: 'open' },
    },
    {
      key: 'overdueAR',
      label: 'Overdue A/R',
      value: money(kpis.arOverdue),
      icon: FileWarning,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      sub: `of ${money(kpis.arTotal)} total`,
      nav: { page: 'invoices' },
    },
    {
      key: 'openTickets',
      label: 'Open Tickets',
      value: kpis.openTickets.toLocaleString(),
      icon: Ticket,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      sub: `${kpis.openLeads} open leads`,
      nav: { page: 'tickets' },
    },
    {
      key: 'unackedAlarms',
      label: "Today's Alarms",
      value: kpis.unackedAlarms.toLocaleString(),
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      sub: kpis.unackedAlarms > 0 ? 'Needs attention' : 'All clear',
      nav: { page: 'alarm-dashboard' },
    },
    {
      key: 'scheduledToday',
      label: 'Scheduled Today',
      value: kpis.jobsToday.toLocaleString(),
      icon: Clock,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      sub: 'jobs on today\'s board',
      nav: { page: 'work-orders', filter: 'scheduled_today' },
    },
    {
      key: 'completedToday',
      label: 'Completed Today',
      value: kpis.jobsCompletedToday.toLocaleString(),
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      sub: `of ${kpis.jobsToday} scheduled`,
      nav: { page: 'work-orders', filter: 'completed_today' },
    },
    {
      key: 'techsOnClock',
      label: 'Techs On Clock',
      value: kpis.techsOnClock.toLocaleString(),
      icon: Users,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      sub: 'currently working',
      nav: { page: 'work-orders', filter: 'in_progress' },
    },
  ];

  const items = allItems.filter(k => visibleKeys.includes(k.key));

  const gridCols =
    items.length <= 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : items.length <= 4
      ? 'grid-cols-2 md:grid-cols-4'
      : items.length <= 6
      ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6'
      : 'grid-cols-2 md:grid-cols-4 xl:grid-cols-8';

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {items.map((k) => {
        const Icon = k.icon;
        const clickable = !!k.nav && !!onNavigate;
        return (
          <div
            key={k.key}
            onClick={() => clickable && onNavigate!(k.nav!)}
            className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all ${
              clickable ? 'cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${k.iconBg} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${k.iconColor}`} />
              </div>
              {k.delta && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                    k.delta.positive ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {k.delta.positive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {k.delta.value}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{k.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{k.value}</p>
            {k.sub && <p className="text-xs text-gray-500 mt-1 truncate">{k.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}
