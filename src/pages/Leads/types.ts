export interface LeadSource {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lead_source_id: string | null;
  notes: string | null;
  status: 'new' | 'contacted' | 'scheduled' | 'converted' | 'lost';
  assigned_employee_id: string | null;
  converted_deal_id: string | null;
  created_at: string;
  updated_at: string;
  lead_sources?: LeadSource | null;
  employees?: { id: string; first_name: string; last_name: string } | null;
}

export interface LeadActivityLog {
  id: string;
  lead_id: string;
  action: string;
  notes: string | null;
  created_at: string;
}

export interface LeadSystem {
  id: string;
  lead_id: string;
  system_type_id: string | null;
  system_type_name: string;
  system_type_icon: string;
  system_type_color: string;
  package_id: string | null;
  package_name: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface LeadLineItem {
  id: string;
  lead_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  sort_order: number;
  created_at: string;
}

export interface LeadPhoto {
  id: string;
  lead_id: string;
  file_url: string;
  caption: string | null;
  created_at: string;
}

export interface LeadAppointment {
  id: string;
  appointment_date: string;
  start_time: string | null;
  end_time: string | null;
  appointment_type: string;
  notes: string | null;
  status: string;
  lead_id: string | null;
  leads?: Pick<Lead, 'id' | 'contact_name' | 'contact_phone' | 'address' | 'city' | 'state' | 'status' | 'assigned_employee_id'> & {
    employees?: { id: string; first_name: string; last_name: string } | null;
    lead_sources?: { name: string } | null;
  };
}

export type LeadStatus = Lead['status'];

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; border: string }> = {
  new: { label: 'New', color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-200' },
  contacted: { label: 'Contacted', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
  scheduled: { label: 'Scheduled', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  converted: { label: 'Converted', color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' },
  lost: { label: 'Lost', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
};

export const APPOINTMENT_METHODS = ['In-Home Visit', 'Phone Call', 'Email Follow-Up', 'Text Follow-Up', 'Virtual Meeting'];
