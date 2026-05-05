export interface TechWO {
  id: string;
  wo_number: string;
  title: string;
  priority: string;
  work_order_type: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  description: string | null;
  reason_for_visit: string | null;
  scope_of_work: string | null;
  technician_notes: string | null;
  resolution_notes: string | null;
  work_performed: string | null;
  billing_type: string;
  billing_rate: number | null;
  fixed_amount: number | null;
  payment_collected: number | null;
  payment_method: string | null;
  customer_signature: string | null;
  company_id: string | null;
  site_id: string | null;
  system_id: string | null;
  total_parts_cost: number | null;
  total_labor_cost: number | null;
  total_revenue: number | null;
  profit_amount: number | null;
  profit_margin_pct: number | null;
  companies?: { name: string };
  sites?: { name: string; address: string | null };
  customer_systems?: {
    id: string;
    name: string;
    panel_make: string | null;
    panel_model: string | null;
    monitoring_account_number: string | null;
    cs_name: string | null;
    cs_number: string | null;
    comm_partner_name: string | null;
    comm_account_id: string | null;
    is_on_test: boolean | null;
    is_out_of_service: boolean | null;
    system_types?: { id: string; name: string; icon_name: string | null; color: string | null };
  } | null;
  wot_id: string;
  wot_status: string;
  wot_enroute_at: string | null;
  wot_onsite_at: string | null;
  wot_completed_at: string | null;
  wot_drive_minutes: number | null;
  wot_paused_at: string | null;
  wot_total_paused_minutes: number | null;
  wot_scheduled_date: string | null;
  wot_scheduled_start_time: string | null;
  wot_scheduled_end_time: string | null;
  wot_estimated_duration_minutes: number | null;
  wot_assignment_notes: string | null;
  wot_is_lead: boolean;
}

export type TechAction =
  | 'start_driving'
  | 'arrived'
  | 'begin_work'
  | 'take_break'
  | 'resume_work'
  | 'complete'
  | 'cannot_complete'
  | 'go_back';

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

export interface PartUsed {
  id: string;
  work_order_id: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  total_cost: number;
  total_price: number;
  installed_location: string | null;
  serial_number: string | null;
  mac_address: string | null;
  imei: string | null;
  added_to_site_inventory: boolean;
  notes: string | null;
}

export interface SiteInventoryItem {
  id: string;
  product_name: string | null;
  product_category: string | null;
  serial_number: string | null;
  mac_address: string | null;
  imei: string | null;
  firmware_version: string | null;
  location_detail: string | null;
  zone_location: string | null;
  installation_date: string | null;
  warranty_expiration: string | null;
  status: string | null;
  system_id: string | null;
  notes: string | null;
}

export interface SystemAccessData {
  zones: Array<{ id: string; zone_number: number; zone_name: string; zone_type: string | null; bypass_status: boolean | null; area: string | null }>;
  contacts: Array<{ id: string; contact_order: number; first_name: string; last_name: string; phone: string; relation: string | null; has_key: boolean | null; access_level: string | null }>;
  passcodes: Array<{ id: string; passcode: string; authority: string | null; is_duress: boolean | null }>;
  events: Array<{ id: string; zone_name: string | null; signal_code: string | null; description: string | null; event_at: string }>;
}
