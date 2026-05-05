import { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  MapPin,
  Users,
  MessageSquare,
  TrendingUp,
  Briefcase,
  ClipboardList,
  CheckSquare,
  Package,
  DollarSign,
  Clock,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Warehouse,
  ShoppingCart,
  Box,
  LogIn,
  LogOut,
  Smartphone,
  Globe,
  LifeBuoy,
  PhoneCall,
  Camera,
  FileText,
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const topNavItems = [
  { id: 'alarm-dashboard', label: 'Alarm Dashboard', icon: Bell },
  { id: 'dispatch-calendar', label: 'Dispatch Calendar', icon: Calendar },
  { id: 'dispatch-map', label: 'Dispatch Map', icon: MapPin },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'leads', label: 'Leads', icon: PhoneCall },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'deals', label: 'Deals', icon: TrendingUp },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
  { id: 'tickets', label: 'Tickets', icon: LifeBuoy },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
];

const inventoryItems = [
  { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
  { id: 'distributors', label: 'Distributors', icon: ShoppingCart },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { id: 'products', label: 'Products', icon: Box },
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'site-inventory', label: 'Site Inventory', icon: MapPin },
];

const accountingItems = [
  { id: 'estimates', label: 'Estimates', icon: DollarSign },
  { id: 'invoices', label: 'Invoices', icon: DollarSign },
  { id: 'statements', label: 'Statements', icon: DollarSign },
  { id: 'transactions', label: 'Transactions', icon: DollarSign },
];

const bottomNavItems = [
  { id: 'time-attendance', label: 'Time & Attendance', icon: Clock },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const portalItems = [
  { id: 'technician-portal', label: 'Tech Portal', icon: Smartphone },
  { id: 'customer-portal', label: 'Customer Portal', icon: Globe },
];

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function Sidebar({ currentPage, setCurrentPage, collapsed, setCollapsed }: SidebarProps) {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [accountingOpen, setAccountingOpen] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isClockedIn) return;
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isClockedIn]);

  const handlePunch = () => {
    if (isClockedIn) {
      setIsClockedIn(false);
      setClockInTime(null);
      setElapsed(0);
    } else {
      setIsClockedIn(true);
      setClockInTime(new Date());
      setElapsed(0);
    }
  };

  const isInventoryActive = inventoryItems.some(i => i.id === currentPage);
  const isAccountingActive = accountingItems.some(i => i.id === currentPage);

  const renderNavButton = (item: { id: string; label: string; icon: React.ElementType }, indented = false) => {
    const isActive = currentPage === item.id;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => setCurrentPage(item.id)}
        className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
        } ${indented && !collapsed ? 'pl-8' : ''}`}
      >
        <Icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>

      {/* Logo / Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
        {!collapsed && (
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center focus:outline-none"
          >
            <img src="/image.png" alt="WorkHorse" className="h-8 w-auto object-contain" />
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Punch Clock */}
      <div className={`border-b border-gray-200 flex-shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}>
        {collapsed ? (
          <button
            onClick={handlePunch}
            title={isClockedIn ? 'Punch Out' : 'Punch In'}
            className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${
              isClockedIn
                ? 'bg-red-50 hover:bg-red-100 text-red-600'
                : 'bg-green-50 hover:bg-green-100 text-green-600'
            }`}
          >
            {isClockedIn ? <LogOut className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
          </button>
        ) : (
          <div className={`rounded-xl p-3 ${isClockedIn ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isClockedIn ? 'bg-green-500' : 'bg-gray-400'}`}>
                  JD
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 leading-tight">John Doe</div>
                  <div className={`text-xs leading-tight ${isClockedIn ? 'text-green-600' : 'text-gray-500'}`}>
                    {isClockedIn ? 'Clocked In' : 'Clocked Out'}
                  </div>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            </div>

            {isClockedIn && (
              <div className="mb-2">
                <div className="text-lg font-bold text-gray-900 font-mono tracking-wider text-center">
                  {formatElapsed(elapsed)}
                </div>
                <div className="text-xs text-gray-500 text-center">
                  In at {clockInTime ? formatTime(clockInTime) : ''}
                </div>
              </div>
            )}

            <button
              onClick={handlePunch}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isClockedIn
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isClockedIn ? 'Punch Out' : 'Punch In'}
            </button>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {topNavItems.map(item => renderNavButton(item))}

        {/* Inventory Dropdown */}
        <div>
          <button
            onClick={() => !collapsed && setInventoryOpen(o => !o)}
            className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              isInventoryActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Package className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">Inventory</span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${inventoryOpen ? 'rotate-0' : '-rotate-90'}`} />
              </>
            )}
          </button>
          {!collapsed && inventoryOpen && (
            <div className="mt-0.5 space-y-0.5">
              {inventoryItems.map(item => renderNavButton(item, true))}
            </div>
          )}
        </div>

        {/* Accounting Dropdown */}
        <div>
          <button
            onClick={() => !collapsed && setAccountingOpen(o => !o)}
            className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              isAccountingActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <DollarSign className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">Accounting</span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${accountingOpen ? 'rotate-0' : '-rotate-90'}`} />
              </>
            )}
          </button>
          {!collapsed && accountingOpen && (
            <div className="mt-0.5 space-y-0.5">
              {accountingItems.map(item => renderNavButton(item, true))}
            </div>
          )}
        </div>

        {bottomNavItems.map(item => renderNavButton(item))}
      </nav>

      {/* Portals section — pinned at bottom above footer */}
      <div className="border-t border-gray-200 p-3 space-y-0.5 flex-shrink-0">
        {!collapsed && (
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1">Portals</p>
        )}
        {portalItems.map(item => renderNavButton(item))}
      </div>

      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <div className={`text-xs text-gray-400 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? 'SCS' : 'Powered by WorkhorseSCS'}
        </div>
      </div>
    </div>
  );
}
