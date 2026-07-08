export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  hourly_rate: number;
  personal_email: string | null;
  personal_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  date_of_hire: string | null;
  date_of_termination: string | null;
  employment_type: string;
  pay_type: string;
  pay_rate: number;
  overtime_rate: number;
  loaded_cost: number;
  default_billing_product_id: string | null;
  default_service_rate_id: string | null;
  department: string | null;
  title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: string;
  employee_id: string;
  cert_name: string;
  cert_number: string | null;
  issuing_authority: string | null;
  issued_date: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface ServiceRate {
  id: string;
  name: string;
  hourly_rate: number;
}

export interface BillingProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
}
