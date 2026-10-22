import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogIn,
  LogOut,
  Smartphone,
  Globe,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { canAccessPage } from '../config/roleAccess';
import { useSidebarLayout, mainEntriesInOrder, groupItemsInOrder, groupEntryId } from '../config/sidebarMenu';
import type { GroupKey, MenuItem } from '../config/sidebarMenu';
import SidebarMenuEditor from './SidebarMenuEditor';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const portalItems = [
  { id: 'technician-portal', label: 'Tech Portal', icon: Smartphone },
  { id: 'customer-portal', label: 'Customer Portal', icon: Globe },
  { id: 'product-central', label: 'Product Central', icon: ShoppingBag },
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
  const { role, meta } = useRole();
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>({ inventory: false, accounting: false });
  const [editing, setEditing] = useState(false);
  const [layout] = useSidebarLayout();
  const isAdmin = role === 'admin';
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

  const hidden = new Set(layout.hidden);
  const visible = (id: string) => !hidden.has(id) && canAccessPage(role, id);
  const filteredPortals = portalItems.filter(i => canAccessPage(role, i.id));

  const renderNavButton = (item: MenuItem, indented = false) => {
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
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isClockedIn ? 'bg-green-500' : meta.avatarBg}`}>
                  {meta.shortLabel.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 leading-tight">{meta.shortLabel}</div>
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

      {isAdmin && !editing && (
        <div className={`flex-shrink-0 border-b border-gray-100 ${collapsed ? 'px-2 py-1.5' : 'flex items-center justify-between px-4 py-1.5'}`}>
          {!collapsed && <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu</span>}
          <button
            onClick={() => { setCollapsed(false); setEditing(true); }}
            title="Rearrange or hide menu pages"
            className={`flex items-center gap-1.5 rounded-md text-xs font-medium text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 ${
              collapsed ? 'w-full justify-center p-2' : 'px-2 py-1'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {!collapsed && 'Edit menu'}
          </button>
        </div>
      )}

      {editing && !collapsed ? (
        <SidebarMenuEditor initial={layout} onClose={() => setEditing(false)} />
      ) : (
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {mainEntriesInOrder(layout).map(entry => {
          if (entry.kind === 'item') return visible(entry.item.id) ? renderNavButton(entry.item) : null;
          const { group } = entry;
          if (hidden.has(groupEntryId(group.id))) return null;
          const items = groupItemsInOrder(layout, group.id).filter(i => visible(i.id));
          if (items.length === 0) return null;
          const open = openGroups[group.id];
          const active = items.some(i => i.id === currentPage);
          const GroupIcon = group.icon;
          return (
            <div key={group.id}>
              <button
                onClick={() => !collapsed && setOpenGroups(o => ({ ...o, [group.id]: !o[group.id] }))}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <GroupIcon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-left">{group.label}</span>
                    <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
                  </>
                )}
              </button>
              {!collapsed && open && (
                <div className="mt-0.5 space-y-0.5">
                  {items.map(item => renderNavButton(item, true))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      )}

      {/* Portals section — pinned at bottom above footer */}
      {filteredPortals.length > 0 && (
        <div className="border-t border-gray-200 p-3 space-y-0.5 flex-shrink-0">
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1">Portals</p>
          )}
          {filteredPortals.map(item => renderNavButton(item))}
        </div>
      )}

      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <div className={`text-xs text-gray-400 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? 'SCS' : 'Powered by WorkhorseSCS'}
        </div>
      </div>
    </div>
  );
}
