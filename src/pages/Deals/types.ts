export type ForecastCategory = 'commit' | 'best_case' | 'pipeline' | 'omitted';
export type ViewMode = 'kanban' | 'list' | 'forecast' | 'analytics';
export type PipelineFilter = 'sales' | 'install' | 'office';

export interface Deal {
  id: string;
  company_id: string;
  title: string;
  value: number;
  probability: number;
  sales_stage: string;
  install_status: string;
  office_status: string;
  expected_close_date: string | null;
  close_date: string | null;
  lost_reason: string | null;
  proposal_sent_date: string | null;
  proposal_viewed_date: string | null;
  agreement_sent_date: string | null;
  forecast_category: ForecastCategory;
  stage_entered_at: string;
  description: string | null;
  created_at: string;
  assigned_employee_id: string | null;
  companies?: { name: string } | null;
  assigned_employee?: { first_name: string; last_name: string } | null;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  activity_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface DealTask {
  id: string;
  deal_id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface SalesQuota {
  id: string;
  employee_id: string;
  period_type: string;
  period_year: number;
  period_month: number | null;
  quota_amount: number;
}

export const SALES_STAGES = [
  'Lead',
  'Proposal Sent',
  'Proposal Viewed',
  'Proposal Accepted',
  'Agreement Sent',
  'Sold',
  'Sold & Failed',
  'Did not sell',
  'Purchased From Another',
  'Lost',
] as const;

export const INSTALL_STATUSES = [
  'Not Scheduled',
  'Waiting on Customer',
  'Scheduled',
  'In Progress',
  'On hold',
  'Completed',
  'Sent to Office Review',
] as const;

export const OFFICE_STATUSES = [
  'Sold',
  'Contract Signed',
  'Invoices Paid',
  'Subscription Created',
  'Office Reviewed',
  'Customer Cancelled',
] as const;

export const FORECAST_CATEGORIES: { value: ForecastCategory; label: string; color: string }[] = [
  { value: 'commit', label: 'Commit', color: 'text-green-700 bg-green-100 border-green-200' },
  { value: 'best_case', label: 'Best Case', color: 'text-blue-700 bg-blue-100 border-blue-200' },
  { value: 'pipeline', label: 'Pipeline', color: 'text-gray-700 bg-gray-100 border-gray-200' },
  { value: 'omitted', label: 'Omitted', color: 'text-red-700 bg-red-100 border-red-200' },
];

export function getStageColor(stage: string): string {
  if (['Sold', 'Completed', 'Office Reviewed', 'Subscription Created', 'Invoices Paid'].includes(stage)) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (['Lost', 'Did not sell', 'Purchased From Another', 'Sold & Failed', 'Customer Cancelled'].includes(stage)) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (['Lead', 'Not Scheduled'].includes(stage)) {
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }
  if (['In Progress', 'Agreement Sent', 'Contract Signed'].includes(stage)) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  if (['On hold', 'Waiting on Customer'].includes(stage)) {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }
  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
}

export function getDaysInStage(stageEnteredAt: string): number {
  return Math.floor((Date.now() - new Date(stageEnteredAt).getTime()) / 86_400_000);
}

export function getAgingColor(days: number): string {
  if (days <= 7) return 'bg-green-100 text-green-700';
  if (days <= 21) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

export function isClosingSoon(expectedCloseDate: string | null): boolean {
  if (!expectedCloseDate) return false;
  const diff = new Date(expectedCloseDate).getTime() - Date.now();
  return diff > 0 && diff < 7 * 86_400_000;
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}
