import type { ElementType } from 'react';
import {
  Bell, Calendar, MapPin, Radio, Users, MessageSquare, TrendingUp, Briefcase, ClipboardCheck,
  ClipboardList, CheckSquare, Package, DollarSign, Clock, BarChart3, Settings, Warehouse,
  ShoppingCart, Box, Hash, UserCog, ShieldCheck, LifeBuoy, PhoneCall, Camera, FileText,
} from 'lucide-react';
import { useAppSetting, saveAppSetting } from '../lib/useAppSettings';

export interface MenuItem { id: string; label: string; icon: ElementType }
export interface MenuGroup { id: GroupKey; label: string; icon: ElementType; items: MenuItem[] }
export type GroupKey = 'inventory' | 'accounting';

export interface SidebarLayout {
  main: string[];
  inventory: string[];
  accounting: string[];
  hidden: string[];
}

export const LOCKED_VISIBLE = new Set(['settings']);

const topItems: MenuItem[] = [
  { id: 'alarm-dashboard', label: 'Alarm Dashboard', icon: Bell },
  { id: 'dispatch', label: 'Dispatch', icon: Radio },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'chat', label: 'Messages', icon: MessageSquare },
  { id: 'team-chat', label: 'Team Chat', icon: Hash },
  { id: 'leads', label: 'Leads', icon: PhoneCall },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'deals', label: 'Deals', icon: TrendingUp },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
  { id: 'service-plans', label: 'Service Plans', icon: ShieldCheck },
  { id: 'tickets', label: 'Tickets', icon: LifeBuoy },
  { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
];

const bottomItems: MenuItem[] = [
  { id: 'time-attendance', label: 'Time & Attendance', icon: Clock },
  { id: 'user-management', label: 'User Management', icon: UserCog },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const MENU_GROUPS: Record<GroupKey, MenuGroup> = {
  inventory: {
    id: 'inventory', label: 'Inventory', icon: Package, items: [
      { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
      { id: 'distributors', label: 'Distributors', icon: ShoppingCart },
      { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
      { id: 'products', label: 'Products', icon: Box },
      { id: 'packages', label: 'Packages', icon: Package },
      { id: 'site-inventory', label: 'Site Inventory', icon: MapPin },
    ],
  },
  accounting: {
    id: 'accounting', label: 'Accounting', icon: DollarSign, items: [
      { id: 'estimates', label: 'Estimates', icon: DollarSign },
      { id: 'invoices', label: 'Invoices', icon: DollarSign },
      { id: 'statements', label: 'Statements', icon: DollarSign },
      { id: 'transactions', label: 'Transactions', icon: DollarSign },
    ],
  },
};

export const groupEntryId = (g: GroupKey) => `group:${g}`;

export type MainEntry = { kind: 'item'; item: MenuItem } | { kind: 'group'; group: MenuGroup };

const mainEntries: Record<string, MainEntry> = Object.fromEntries([
  ...topItems.map(item => [item.id, { kind: 'item', item }] as const),
  [groupEntryId('inventory'), { kind: 'group', group: MENU_GROUPS.inventory }] as const,
  [groupEntryId('accounting'), { kind: 'group', group: MENU_GROUPS.accounting }] as const,
  ...bottomItems.map(item => [item.id, { kind: 'item', item }] as const),
]);

export const DEFAULT_LAYOUT: SidebarLayout = {
  main: Object.keys(mainEntries),
  inventory: MENU_GROUPS.inventory.items.map(i => i.id),
  accounting: MENU_GROUPS.accounting.items.map(i => i.id),
  hidden: [],
};

function mergeOrder(saved: unknown, defaults: string[]): string[] {
  const kept = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string' && defaults.includes(id)) : [];
  return [...new Set(kept), ...defaults.filter(id => !kept.includes(id))];
}

export function normalizeLayout(raw: unknown): SidebarLayout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof SidebarLayout, unknown>>;
  return {
    main: mergeOrder(r.main, DEFAULT_LAYOUT.main),
    inventory: mergeOrder(r.inventory, DEFAULT_LAYOUT.inventory),
    accounting: mergeOrder(r.accounting, DEFAULT_LAYOUT.accounting),
    hidden: Array.isArray(r.hidden)
      ? r.hidden.filter((id): id is string => typeof id === 'string' && !LOCKED_VISIBLE.has(id))
      : [],
  };
}

export function mainEntriesInOrder(layout: SidebarLayout): MainEntry[] {
  return layout.main.map(id => mainEntries[id]).filter(Boolean);
}

export function groupItemsInOrder(layout: SidebarLayout, g: GroupKey): MenuItem[] {
  const byId = Object.fromEntries(MENU_GROUPS[g].items.map(i => [i.id, i]));
  return layout[g].map(id => byId[id]).filter(Boolean);
}

export function menuLabel(id: string): string {
  const entry = mainEntries[id];
  if (entry) return entry.kind === 'item' ? entry.item.label : `${entry.group.label} (whole group)`;
  for (const g of Object.values(MENU_GROUPS)) {
    const item = g.items.find(i => i.id === id);
    if (item) return `${item.label} (${g.label})`;
  }
  return id;
}

const SETTING_KEY = 'sidebar_layout';

export function useSidebarLayout(): [SidebarLayout, boolean] {
  const [raw, loading] = useAppSetting(SETTING_KEY);
  let parsed: unknown = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
  return [normalizeLayout(parsed), loading];
}

export function saveSidebarLayout(layout: SidebarLayout) {
  return saveAppSetting(SETTING_KEY, JSON.stringify(normalizeLayout(layout)));
}
