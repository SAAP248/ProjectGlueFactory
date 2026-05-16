import type { Role } from './roles';

export type DashboardWidget =
  | 'kpis'
  | 'revenue_chart'
  | 'quick_actions'
  | 'alarm_feed'
  | 'today_schedule'
  | 'tickets_panel'
  | 'sales_pipeline'
  | 'financial_health'
  | 'team_activity';

export const ROLE_WIDGETS: Record<Role, DashboardWidget[]> = {
  admin: [
    'kpis',
    'revenue_chart',
    'quick_actions',
    'alarm_feed',
    'today_schedule',
    'tickets_panel',
    'sales_pipeline',
    'financial_health',
    'team_activity',
  ],

  accounting: [
    'kpis',
    'revenue_chart',
    'quick_actions',
    'financial_health',
    'sales_pipeline',
    'tickets_panel',
  ],

  sales_manager: [
    'kpis',
    'revenue_chart',
    'quick_actions',
    'sales_pipeline',
    'team_activity',
    'today_schedule',
  ],

  sales: [
    'kpis',
    'quick_actions',
    'sales_pipeline',
    'today_schedule',
  ],

  csr: [
    'kpis',
    'quick_actions',
    'tickets_panel',
    'today_schedule',
    'alarm_feed',
  ],

  dispatcher: [
    'kpis',
    'quick_actions',
    'today_schedule',
    'alarm_feed',
    'team_activity',
    'tickets_panel',
  ],

  tech_manager: [
    'kpis',
    'quick_actions',
    'today_schedule',
    'team_activity',
    'tickets_panel',
  ],

  tech: [
    'kpis',
    'quick_actions',
    'today_schedule',
  ],

  limited_tech: [
    'kpis',
    'quick_actions',
    'today_schedule',
  ],
};

export interface QuickAction {
  label: string;
  icon: string;
  page: string;
  color: string;
}

export const ROLE_QUICK_ACTIONS: Record<Role, QuickAction[]> = {
  admin: [
    { label: 'New Deal', icon: 'TrendingUp', page: 'deals', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'New Work Order', icon: 'Briefcase', page: 'work-orders', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'New Ticket', icon: 'Ticket', page: 'tickets', color: 'bg-orange-500 hover:bg-orange-600' },
    { label: 'New Estimate', icon: 'FileText', page: 'estimates', color: 'bg-teal-500 hover:bg-teal-600' },
    { label: 'New Customer', icon: 'Users', page: 'customers', color: 'bg-sky-500 hover:bg-sky-600' },
  ],

  accounting: [
    { label: 'New Invoice', icon: 'FileText', page: 'invoices', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'New Estimate', icon: 'FileText', page: 'estimates', color: 'bg-teal-500 hover:bg-teal-600' },
    { label: 'Transactions', icon: 'DollarSign', page: 'transactions', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Statements', icon: 'FileText', page: 'statements', color: 'bg-slate-500 hover:bg-slate-600' },
  ],

  sales_manager: [
    { label: 'New Deal', icon: 'TrendingUp', page: 'deals', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'View Pipeline', icon: 'TrendingUp', page: 'deals', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Manage Leads', icon: 'PhoneCall', page: 'leads', color: 'bg-orange-500 hover:bg-orange-600' },
    { label: 'New Estimate', icon: 'FileText', page: 'estimates', color: 'bg-teal-500 hover:bg-teal-600' },
    { label: 'Reports', icon: 'BarChart3', page: 'reports', color: 'bg-slate-500 hover:bg-slate-600' },
  ],

  sales: [
    { label: 'New Deal', icon: 'TrendingUp', page: 'deals', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'New Lead', icon: 'PhoneCall', page: 'leads', color: 'bg-orange-500 hover:bg-orange-600' },
    { label: 'New Estimate', icon: 'FileText', page: 'estimates', color: 'bg-teal-500 hover:bg-teal-600' },
    { label: 'My Calendar', icon: 'Calendar', page: 'calendar', color: 'bg-sky-500 hover:bg-sky-600' },
  ],

  csr: [
    { label: 'New Ticket', icon: 'Ticket', page: 'tickets', color: 'bg-orange-500 hover:bg-orange-600' },
    { label: 'Find Customer', icon: 'Users', page: 'customers', color: 'bg-sky-500 hover:bg-sky-600' },
    { label: 'New Work Order', icon: 'Briefcase', page: 'work-orders', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Messages', icon: 'MessageSquare', page: 'chat', color: 'bg-slate-500 hover:bg-slate-600' },
  ],

  dispatcher: [
    { label: 'Dispatch Board', icon: 'Radio', page: 'dispatch', color: 'bg-rose-500 hover:bg-rose-600' },
    { label: 'New Work Order', icon: 'Briefcase', page: 'work-orders', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'New Ticket', icon: 'Ticket', page: 'tickets', color: 'bg-orange-500 hover:bg-orange-600' },
    { label: 'Team Chat', icon: 'Hash', page: 'team-chat', color: 'bg-slate-500 hover:bg-slate-600' },
  ],

  tech_manager: [
    { label: 'Dispatch Board', icon: 'Radio', page: 'dispatch', color: 'bg-rose-500 hover:bg-rose-600' },
    { label: 'New Work Order', icon: 'Briefcase', page: 'work-orders', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Time & Attendance', icon: 'Clock', page: 'time-attendance', color: 'bg-teal-500 hover:bg-teal-600' },
    { label: 'View Inventory', icon: 'Package', page: 'products', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'Reports', icon: 'BarChart3', page: 'reports', color: 'bg-slate-500 hover:bg-slate-600' },
  ],

  tech: [
    { label: 'My Jobs', icon: 'Smartphone', page: 'technician-portal', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'My Calendar', icon: 'Calendar', page: 'calendar', color: 'bg-sky-500 hover:bg-sky-600' },
    { label: 'Message Dispatch', icon: 'MessageSquare', page: 'chat', color: 'bg-slate-500 hover:bg-slate-600' },
    { label: 'Parts Catalog', icon: 'Package', page: 'products', color: 'bg-amber-500 hover:bg-amber-600' },
  ],

  limited_tech: [
    { label: 'My Jobs', icon: 'Smartphone', page: 'technician-portal', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'My Calendar', icon: 'Calendar', page: 'calendar', color: 'bg-sky-500 hover:bg-sky-600' },
    { label: 'Message Dispatch', icon: 'MessageSquare', page: 'chat', color: 'bg-slate-500 hover:bg-slate-600' },
  ],
};

export const ROLE_GREETING: Record<Role, string> = {
  admin: 'Admin',
  accounting: 'Accounting',
  sales_manager: 'Sales Manager',
  sales: 'Sales',
  csr: 'Support',
  dispatcher: 'Dispatch',
  tech_manager: 'Tech Manager',
  tech: 'Tech',
  limited_tech: 'Tech',
};
