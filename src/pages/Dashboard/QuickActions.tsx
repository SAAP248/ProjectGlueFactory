import { Plus, Briefcase, TrendingUp, FileText, Ticket, Users } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

const actions = [
  { label: 'New Deal', icon: TrendingUp, page: 'deals', color: 'bg-amber-500 hover:bg-amber-600' },
  { label: 'New Work Order', icon: Briefcase, page: 'work-orders', color: 'bg-blue-500 hover:bg-blue-600' },
  { label: 'New Ticket', icon: Ticket, page: 'tickets', color: 'bg-orange-500 hover:bg-orange-600' },
  { label: 'New Estimate', icon: FileText, page: 'estimates', color: 'bg-teal-500 hover:bg-teal-600' },
  { label: 'New Customer', icon: Users, page: 'customers', color: 'bg-sky-500 hover:bg-sky-600' },
];

export default function QuickActions({ onNavigate }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4 text-gray-700" />
        <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => onNavigate(a.page)}
              className={`${a.color} text-white rounded-lg p-3 flex flex-col items-start gap-2 transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold text-left">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
