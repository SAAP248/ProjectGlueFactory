export interface PortalUser {
  id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export interface PortalCompany {
  id: string;
  name: string;
  phone: string;
  email: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  outstanding_balance: number;
  past_due_amount: number;
}

export interface PortalInvoice {
  id: string;
  invoice_number: string;
  status: string;
  invoice_date: string;
  due_date: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
}

export interface PortalEstimate {
  id: string;
  estimate_number: string;
  status: string;
  estimate_date: string;
  expiration_date: string | null;
  total: number;
  notes: string | null;
}

export interface PortalPayment {
  id: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  paid_at: string;
  invoice_id: string | null;
  invoices?: { invoice_number: string };
}

export interface PortalSystem {
  id: string;
  name: string;
  panel_make: string | null;
  panel_model: string | null;
  monitoring_account_number: string | null;
  status: string;
  installation_date: string | null;
  notes: string | null;
  site_id: string | null;
  sites?: { name: string; address: string | null };
  system_types?: { name: string; icon_name: string; color: string };
}

export interface EmergencyContact {
  id: string;
  system_id: string;
  name: string;
  relationship: string;
  phone: string;
  phone_alt: string | null;
  priority_order: number;
  has_key: boolean;
  notes: string | null;
}

export interface SystemPasscode {
  id: string;
  system_id: string;
  code_type: string;
  passcode: string;
  notes: string | null;
}

export interface TestMode {
  id: string;
  system_id: string;
  is_on_test: boolean;
  test_start_at: string | null;
  test_end_at: string | null;
  reason: string | null;
  placed_by: string | null;
}

export interface PortalWorkOrder {
  id: string;
  wo_number: string;
  title: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  work_order_type: string;
  description: string | null;
  resolution_notes: string | null;
  created_at: string;
  sites?: { name: string };
}

export interface PortalAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size_bytes: number | null;
  caption: string | null;
  created_at: string;
  work_orders?: { wo_number: string; title: string };
}

export interface WORequest {
  id: string;
  title: string;
  description: string;
  priority: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  created_at: string;
  sites?: { name: string } | null;
}

export type PortalTab = 'dashboard' | 'estimates' | 'invoices' | 'payments' | 'systems' | 'work-orders' | 'attachments' | 'support';
