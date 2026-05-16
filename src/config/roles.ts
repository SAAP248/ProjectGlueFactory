export const ROLES = [
  'admin',
  'accounting',
  'sales_manager',
  'sales',
  'csr',
  'dispatcher',
  'tech_manager',
  'tech',
  'limited_tech',
] as const;

export type Role = (typeof ROLES)[number];

export interface RoleMeta {
  id: Role;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  avatarBg: string;
  defaultPage: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  admin: {
    id: 'admin',
    label: 'Administrator',
    shortLabel: 'Admin',
    description: 'Full access to all features and settings',
    color: 'text-blue-700',
    avatarBg: 'bg-blue-600',
    defaultPage: 'dashboard',
  },
  accounting: {
    id: 'accounting',
    label: 'Accounting',
    shortLabel: 'Acct',
    description: 'Financial operations, invoicing, and reporting',
    color: 'text-emerald-700',
    avatarBg: 'bg-emerald-600',
    defaultPage: 'dashboard',
  },
  sales_manager: {
    id: 'sales_manager',
    label: 'Sales Manager',
    shortLabel: 'Sales Mgr',
    description: 'Oversee all salespeople, pipelines, and forecasts',
    color: 'text-amber-700',
    avatarBg: 'bg-amber-600',
    defaultPage: 'dashboard',
  },
  sales: {
    id: 'sales',
    label: 'Salesperson',
    shortLabel: 'Sales',
    description: 'Manage your own leads, deals, and customers',
    color: 'text-orange-700',
    avatarBg: 'bg-orange-600',
    defaultPage: 'dashboard',
  },
  csr: {
    id: 'csr',
    label: 'Customer Service Rep',
    shortLabel: 'CSR',
    description: 'Handle incoming calls, tickets, and customer support',
    color: 'text-sky-700',
    avatarBg: 'bg-sky-600',
    defaultPage: 'dashboard',
  },
  dispatcher: {
    id: 'dispatcher',
    label: 'Dispatcher',
    shortLabel: 'Dispatch',
    description: 'Coordinate technicians, schedules, and field work',
    color: 'text-rose-700',
    avatarBg: 'bg-rose-600',
    defaultPage: 'dashboard',
  },
  tech_manager: {
    id: 'tech_manager',
    label: 'Tech Manager',
    shortLabel: 'Tech Mgr',
    description: 'Oversee all technician schedules and field operations',
    color: 'text-teal-700',
    avatarBg: 'bg-teal-600',
    defaultPage: 'dashboard',
  },
  tech: {
    id: 'tech',
    label: 'Technician',
    shortLabel: 'Tech',
    description: 'View your schedule, complete jobs, and collect payments',
    color: 'text-slate-700',
    avatarBg: 'bg-slate-600',
    defaultPage: 'technician-portal',
  },
  limited_tech: {
    id: 'limited_tech',
    label: 'Limited Technician',
    shortLabel: 'Ltd Tech',
    description: 'View your schedule and complete jobs (no pricing)',
    color: 'text-gray-600',
    avatarBg: 'bg-gray-500',
    defaultPage: 'technician-portal',
  },
};
