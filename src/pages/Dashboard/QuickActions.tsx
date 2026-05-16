import {
  Plus,
  Briefcase,
  TrendingUp,
  FileText,
  Ticket,
  Users,
  DollarSign,
  PhoneCall,
  BarChart3,
  Calendar,
  MessageSquare,
  Radio,
  Hash,
  Clock,
  Package,
  Smartphone,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { ROLE_QUICK_ACTIONS } from '../../config/roleDashboard';
import type { ElementType } from 'react';

interface Props {
  onNavigate: (page: string) => void;
}

const ICON_MAP: Record<string, ElementType> = {
  TrendingUp,
  Briefcase,
  Ticket,
  FileText,
  Users,
  DollarSign,
  PhoneCall,
  BarChart3,
  Calendar,
  MessageSquare,
  Radio,
  Hash,
  Clock,
  Package,
  Smartphone,
  Plus,
};

export default function QuickActions({ onNavigate }: Props) {
  const { role } = useRole();
  const actions = ROLE_QUICK_ACTIONS[role];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4 text-gray-700" />
        <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => {
          const Icon = ICON_MAP[a.icon] || Plus;
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
