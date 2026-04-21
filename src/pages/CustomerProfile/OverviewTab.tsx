import { DollarSign, AlertCircle, TrendingUp, CreditCard, Shield, MapPin, Wrench, Clock } from 'lucide-react';
import type { Company, WorkOrder, Invoice, CustomerNote } from './types';

interface Props {
  company: Company;
  workOrders: WorkOrder[];
  invoices: Invoice[];
  notes: CustomerNote[];
  systemsCount: number;
  sitesCount: number;
  onNavigate: (tab: string) => void;
}

export default function OverviewTab({ company, workOrders, invoices, notes, systemsCount, sitesCount, onNavigate }: Props) {
  const openWOs = workOrders.filter(w => !['completed', 'cancelled'].includes(w.status)).length;
  const lastService = workOrders
    .filter(w => w.status === 'completed' && w.scheduled_date)
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))[0];

  const financialCards = [
    {
      label: 'Total Revenue',
      value: `$${Number(company.total_revenue).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Outstanding Balance',
      value: `$${Number(company.outstanding_balance).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Past Due',
      value: `$${Number(company.past_due_amount).toLocaleString()}`,
      icon: AlertCircle,
      color: Number(company.past_due_amount) > 0 ? 'text-red-600' : 'text-gray-400',
      bg: Number(company.past_due_amount) > 0 ? 'bg-red-50' : 'bg-gray-50',
    },
    {
      label: 'Payment Terms',
      value: company.payment_terms || 'Net 30',
      icon: CreditCard,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
    },
  ];

  const quickStats = [
    { label: 'Active Systems', value: systemsCount, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'sites-systems' },
    { label: 'Sites', value: sitesCount, icon: MapPin, color: 'text-teal-600', bg: 'bg-teal-50', tab: 'sites-systems' },
    { label: 'Open Work Orders', value: openWOs, icon: Wrench, color: openWOs > 0 ? 'text-amber-600' : 'text-gray-400', bg: openWOs > 0 ? 'bg-amber-50' : 'bg-gray-50', tab: 'work-orders' },
    { label: 'Last Service', value: lastService ? new Date(lastService.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A', icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', tab: null },
  ];

  const recentActivity = [
    ...workOrders.slice(0, 3).map(w => ({
      id: w.id,
      type: 'work_order' as const,
      title: w.title,
      subtitle: `WO #${w.wo_number} · ${w.status.replace('_', ' ')}`,
      date: w.scheduled_date,
      status: w.status,
    })),
    ...invoices.slice(0, 3).map(i => ({
      id: i.id,
      type: 'invoice' as const,
      title: `Invoice ${i.invoice_number}`,
      subtitle: `$${Number(i.total).toLocaleString()} · ${i.status}`,
      date: i.invoice_date,
      status: i.status,
    })),
    ...notes.slice(0, 2).map(n => ({
      id: n.id,
      type: 'note' as const,
      title: n.note.length > 60 ? n.note.slice(0, 60) + '…' : n.note,
      subtitle: `${n.note_type} note`,
      date: n.created_at?.split('T')[0],
      status: n.is_important ? 'important' : 'normal',
    })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);

  const statusDot = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-emerald-500',
      paid: 'bg-emerald-500',
      in_progress: 'bg-amber-500',
      scheduled: 'bg-blue-500',
      sent: 'bg-blue-500',
      overdue: 'bg-red-500',
      partial: 'bg-amber-500',
      important: 'bg-red-500',
    };
    return map[status] || 'bg-gray-400';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {financialCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{card.label}</span>
                <div className={`${card.bg} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => {
          const Icon = stat.icon;
          const isClickable = stat.tab !== null;
          const Wrapper = isClickable ? 'button' : 'div';
          return (
            <Wrapper
              key={i}
              {...(isClickable ? { onClick: () => onNavigate(stat.tab!) } : {})}
              className={`bg-white rounded-xl border border-gray-100 p-5 text-left w-full ${
                isClickable
                  ? 'hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium text-gray-500 ${isClickable ? 'group-hover:text-gray-700' : ''}`}>{stat.label}</span>
                <div className={`${stat.bg} p-2 rounded-lg ${isClickable ? 'group-hover:scale-105 transition-transform' : ''}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </Wrapper>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.map((item) => (
            <div key={item.id} className="px-6 py-4 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot(item.status)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{item.subtitle}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              </span>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}
