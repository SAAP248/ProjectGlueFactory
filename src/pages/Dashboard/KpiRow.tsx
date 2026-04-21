import { Users, Briefcase, DollarSign, TrendingUp, AlertTriangle, Repeat, FileWarning, Ticket, Video as LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DashboardKpis } from './useDashboardData';

interface Props {
  kpis: DashboardKpis;
}

interface Kpi {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  delta?: { value: string; positive: boolean };
  sub?: string;
}

const money = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
    : `$${n.toFixed(0)}`;

const fullMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function KpiRow({ kpis }: Props) {
  const revenueDelta =
    kpis.prevMonthRevenue > 0
      ? ((kpis.monthRevenue - kpis.prevMonthRevenue) / kpis.prevMonthRevenue) * 100
      : kpis.monthRevenue > 0
      ? 100
      : 0;

  const items: Kpi[] = [
    {
      label: 'Active Customers',
      value: kpis.activeCustomers.toLocaleString(),
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
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
    },
    {
      label: 'Monthly Recurring',
      value: fullMoney(kpis.mrr),
      icon: Repeat,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      sub: 'RMR contracts',
    },
    {
      label: 'Pipeline Value',
      value: money(kpis.pipelineValue),
      icon: TrendingUp,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      sub: `${kpis.activeDeals} active deals`,
    },
    {
      label: 'Open Work Orders',
      value: kpis.openWorkOrders.toLocaleString(),
      icon: Briefcase,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      sub: `${kpis.jobsToday} scheduled today`,
    },
    {
      label: 'Overdue A/R',
      value: money(kpis.arOverdue),
      icon: FileWarning,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      sub: `of ${money(kpis.arTotal)} total`,
    },
    {
      label: 'Open Tickets',
      value: kpis.openTickets.toLocaleString(),
      icon: Ticket,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      sub: `${kpis.openLeads} open leads`,
    },
    {
      label: 'Unacked Alarms',
      value: kpis.unackedAlarms.toLocaleString(),
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      sub: kpis.unackedAlarms > 0 ? 'Needs attention' : 'All clear',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {items.map((k, i) => {
        const Icon = k.icon;
        return (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
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
