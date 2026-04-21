export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  avatar_url?: string;
}

export interface Company {
  id: string;
  name: string;
  status: string;
  customer_type: string;
  account_number?: string;
  phone?: string;
  email?: string;
  tags?: string[];
  is_vip: boolean;
  total_revenue: number;
  outstanding_balance: number;
  past_due_amount: number;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  company_id: string;
  title: string;
  description?: string;
  work_order_type: string;
  status: string;
  priority: string;
  scheduled_date?: string;
  scheduled_time?: string;
  assigned_to?: string;
  created_at: string;
}

export interface Deal {
  id: string;
  company_id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expected_close_date?: string;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  status: string;
  project_type: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  actual_cost: number;
  created_at: string;
}

export interface AlarmEvent {
  id: string;
  site_id?: string;
  company_id?: string;
  event_type: string;
  description: string;
  severity: string;
  event_timestamp: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time?: string;
  clock_in_location?: string;
  total_hours?: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string;
  status: string;
  invoice_date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  assigned_to?: string;
  work_order_id?: string;
  company_id?: string;
  appointment_type: string;
  status: string;
}
