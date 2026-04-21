export interface PhoneEntry {
  label: string;
  number: string;
}

export interface EmailEntry {
  label: string;
  address: string;
}

export interface Company {
  id: string;
  name: string;
  status: string;
  customer_type: string;
  account_number: string;
  quickbooks_id: string;
  phone: string;
  email: string;
  phones: PhoneEntry[];
  company_emails: EmailEntry[];
  website: string;
  billing_address: string;
  billing_address_2: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
  tags: string[];
  is_vip: boolean;
  total_revenue: number;
  outstanding_balance: number;
  past_due_amount: number;
  payment_terms: string;
  notes: string;
  critical_notes: string;
  parent_company_id: string | null;
  bill_with_parent: boolean;
  is_sub_customer: boolean;
  qb_sync_status: 'synced' | 'pending' | 'error' | 'not_synced';
  qb_last_synced_at: string | null;
}

export interface Site {
  id: string;
  company_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  site_type: string;
  alarm_code: string;
  access_instructions: string;
}

export interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone: string;
  mobile: string;
  is_primary: boolean;
  notes: string;
}

export interface SystemType {
  id: string;
  name: string;
  icon_name: string;
  color: string;
}

export interface CustomerSystem {
  id: string;
  company_id: string;
  site_id: string;
  system_type_id: string;
  name: string;
  panel_make: string;
  panel_model: string;
  monitoring_account_number: string;
  status: string;
  installation_date: string;
  notes: string;
  system_types: SystemType;
  cs_name: string;
  cs_status: string;
  cs_data_entry_phone: string;
  cs_number: string;
  is_synced_cs: boolean;
  is_on_test: boolean;
  is_out_of_service: boolean;
  comm_partner_name: string;
  comm_partner_serial: string;
  comm_receiver_number: string;
  comm_account_id: string;
  comm_username: string;
  comm_password: string;
  is_synced_comm: boolean;
  panel_type: string;
  panel_battery_date: string;
  panel_location: string;
  transformer_location: string;
  antenna_location: string;
  warranty_information: string;
  online_date: string;
  installer_code: string;
  takeover_module_location: string;
  permit_number: string;
}

export interface SystemZone {
  id: string;
  system_id: string;
  zone_number: number;
  zone_name: string;
  zone_type: string;
  bypass_status: boolean;
  install_date: string;
  area: string;
  event_type: string;
  cs_flag: boolean;
  comm_partner_flag: boolean;
  tested: boolean;
  existing_zone: boolean;
  smoke_detector_test_date: string;
  notes: string;
}

export interface AlarmEmergencyContact {
  id: string;
  system_id: string;
  contact_order: number;
  first_name: string;
  last_name: string;
  phone: string;
  has_ecv_ctv: boolean;
  has_key: boolean;
  access_level: string;
  relation: string;
}

export interface AlarmCodeWord {
  id: string;
  system_id: string;
  passcode: string;
  authority: string;
  is_duress: boolean;
}

export interface AlarmEventHistory {
  id: string;
  system_id: string;
  zone_id_ref: string;
  zone_name: string;
  signal_code: string;
  event_code: string;
  description: string;
  event_at: string;
}

export interface SystemDevice {
  id: string;
  system_id: string;
  device_name: string;
  device_type: string;
  make: string;
  model: string;
  serial_number: string;
  mac_address: string;
  ip_address: string;
  location: string;
  status: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string;
  site_id: string;
  status: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string;
  terms: string;
}

export interface Estimate {
  id: string;
  estimate_number: string;
  company_id: string;
  site_id: string;
  status: string;
  estimate_date: string;
  expiration_date: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

export interface Transaction {
  id: string;
  transaction_number: string;
  company_id: string;
  invoice_id: string;
  transaction_type: string;
  payment_method: string;
  amount: number;
  transaction_date: string;
  reference_number: string;
  notes: string;
}

export interface Credit {
  id: string;
  company_id: string;
  amount: number;
  reason: string;
  issued_date: string;
  expiration_date: string;
  status: string;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  company_id: string;
  site_id: string | null;
  system_id: string | null;
  project_id: string | null;
  deal_id: string | null;
  invoice_id: string | null;
  title: string;
  description: string | null;
  work_order_type: string;
  status: string;
  priority: string;
  billing_type: string;
  billing_rate: number;
  fixed_amount: number;
  billing_status: string;
  reason_for_visit: string | null;
  scope_of_work: string | null;
  technician_notes: string | null;
  resolution_notes: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  estimated_duration: number;
  enroute_at: string | null;
  onsite_at: string | null;
  completed_at: string | null;
  enroute_duration_minutes: number | null;
  onsite_duration_minutes: number | null;
  labor_cost: number;
  parts_cost: number;
  payment_collected: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string };
  sites?: { name: string; address: string };
  employees?: { first_name: string; last_name: string };
  work_order_technicians?: WorkOrderTechnician[];
}

export interface WorkOrderTechnician {
  id: string;
  work_order_id: string;
  employee_id: string;
  is_lead: boolean;
  enroute_at: string | null;
  onsite_at: string | null;
  completed_at: string | null;
  notes: string | null;
  employees?: { first_name: string; last_name: string; role: string };
}

export interface WorkOrderLineItem {
  id: string;
  work_order_id: string;
  product_id: string | null;
  line_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_taxable: boolean;
  sort_order: number;
}

export interface WorkOrderAttachment {
  id: string;
  work_order_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size_bytes: number | null;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  company_id: string;
  note_type: string;
  note: string;
  is_important: boolean;
  created_at: string;
}

export interface CallLog {
  id: string;
  company_id: string;
  contact_id: string | null;
  direction: 'inbound' | 'outbound';
  call_date: string;
  duration_minutes: number;
  source: string;
  caller_number: string;
  notes: string;
  created_at: string;
}

export interface CustomerEmail {
  id: string;
  company_id: string;
  contact_id: string | null;
  direction: 'inbound' | 'outbound';
  subject: string;
  body: string;
  from_address: string;
  to_address: string;
  email_date: string;
  is_read: boolean;
  created_at: string;
}

export interface SmsMessage {
  id: string;
  company_id: string;
  contact_id: string | null;
  direction: 'inbound' | 'outbound';
  body: string;
  phone_number: string;
  sent_at: string;
  is_read: boolean;
  source: string;
  created_at: string;
}
