export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export type ChangeOrderStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ProgressInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
export type BillingType = 'milestone' | 'percentage' | 'time_and_materials' | 'fixed';

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  phase_order: number;
  status: PhaseStatus;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  labor_budget: number;
  materials_budget: number;
  other_budget: number;
  labor_actual: number;
  materials_actual: number;
  other_actual: number;
  gate_requirement?: string;
  gate_met: boolean;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectBudgetLine {
  id: string;
  project_id: string;
  phase_id?: string;
  cost_type: 'labor' | 'materials' | 'permits' | 'subcontract' | 'equipment' | 'other';
  description: string;
  budgeted_amount: number;
  actual_amount: number;
  notes?: string;
}

export interface ChangeOrderLineItem {
  id: string;
  change_order_id: string;
  description: string;
  cost_type: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total: number;
}

export interface ChangeOrder {
  id: string;
  project_id: string;
  co_number: string;
  title: string;
  description?: string;
  status: ChangeOrderStatus;
  reason?: string;
  submitted_date?: string;
  approved_date?: string;
  rejected_date?: string;
  approved_by?: string;
  customer_signature?: string;
  customer_signed_at?: string;
  subtotal: number;
  tax: number;
  total: number;
  impact_schedule_days: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  line_items?: ChangeOrderLineItem[];
}

export interface ProgressInvoice {
  id: string;
  project_id: string;
  invoice_id?: string;
  pi_number: string;
  title: string;
  billing_type: BillingType;
  milestone_name?: string;
  phase_id?: string;
  percent_complete: number;
  scheduled_value: number;
  work_completed: number;
  materials_stored: number;
  total_earned: number;
  less_previous_billed: number;
  current_payment_due: number;
  retainage_amount: number;
  status: ProgressInvoiceStatus;
  invoice_date?: string;
  due_date?: string;
  sent_date?: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
  phases?: { name: string };
}

export interface ProjectRMR {
  id: string;
  project_id: string;
  company_id: string;
  site_id?: string;
  monitoring_type: string;
  monthly_rate: number;
  contract_term_months: number;
  start_date?: string;
  end_date?: string;
  auto_renews: boolean;
  renewal_notice_days: number;
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  service_includes: string[];
  notes?: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  category: string;
  name: string;
  file_url?: string;
  file_type?: string;
  file_size_kb?: number;
  description?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  site_id?: string;
  deal_id?: string;
  name: string;
  project_number?: string;
  project_type: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  budget?: number;
  actual_cost: number;
  contract_value: number;
  approved_co_value: number;
  total_billed: number;
  billing_type: BillingType;
  retainage_percent: number;
  completion_percent: number;
  total_labor_budget: number;
  total_materials_budget: number;
  project_manager_id?: string;
  lead_technician_id?: string;
  description?: string;
  notes?: string;
  permit_number?: string;
  permit_status?: string;
  ahj_name?: string;
  created_at: string;
  updated_at: string;
  companies?: { name: string } | null;
  sites?: { name: string; address: string; city: string; state: string } | null;
  project_manager?: { first_name: string; last_name: string } | null;
  lead_technician?: { first_name: string; last_name: string } | null;
  phases?: ProjectPhase[];
}

export function getStatusColor(status: ProjectStatus): string {
  switch (status) {
    case 'planning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'on_hold': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case 'planning': return 'Planning';
    case 'active': return 'Active';
    case 'on_hold': return 'On Hold';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

export function getPhaseStatusColor(status: PhaseStatus): string {
  switch (status) {
    case 'not_started': return 'bg-gray-100 text-gray-600';
    case 'in_progress': return 'bg-blue-100 text-blue-700';
    case 'completed': return 'bg-green-100 text-green-700';
    case 'blocked': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export function getCOStatusColor(status: ChangeOrderStatus): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700';
    case 'submitted': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function getPIStatusColor(status: ProgressInvoiceStatus): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700';
    case 'sent': return 'bg-blue-100 text-blue-800';
    case 'paid': return 'bg-green-100 text-green-800';
    case 'overdue': return 'bg-red-100 text-red-800';
    case 'void': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
