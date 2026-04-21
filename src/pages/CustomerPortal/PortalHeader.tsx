import { LogOut, Shield, ChevronDown } from 'lucide-react';
import type { PortalUser, PortalCompany, PortalTab } from './types';

interface Props {
  user: PortalUser;
  company: PortalCompany | null;
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
  onLogout: () => void;
}

const TABS: { id: PortalTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'estimates', label: 'Estimates' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'payments', label: 'Payments' },
  { id: 'systems', label: 'My Systems' },
  { id: 'work-orders', label: 'Work Orders' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'support', label: 'Support' },
];

export default function PortalHeader({ user, company, activeTab, onTabChange, onLogout }: Props) {
  return (
    <div className="bg-white border-b border-gray-200 flex-shrink-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{company?.name || 'Customer Portal'}</p>
            <p className="text-xs text-gray-500">Welcome back, {user.first_name}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">Sign Out</span>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto scrollbar-none px-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
