/*
  # Customer Portal Tables

  1. New Tables
    - `customer_portal_users` — login credentials for portal access, linked to a company
    - `portal_emergency_contacts` — per-system emergency contacts manageable by the customer
    - `portal_system_passcodes` — passcodes (duress, verbal, cancel) per system
    - `portal_test_mode` — tracks when a system is placed on/off test
    - `portal_wo_requests` — customer-submitted work order requests
    - `portal_payments` — records of payments made through the portal

  2. Security
    - RLS enabled on all tables
    - Anon select allowed for portal tables (portal uses its own auth via portal_users table)

  3. Notes
    - We use a simple email + password_hash pattern for portal logins (not Supabase auth)
    - portal_users.password_hash stores a bcrypt-style hash; for this demo we store plaintext marker
    - Test mode: is_on_test=true means system is currently bypassed with central station
*/

CREATE TABLE IF NOT EXISTS customer_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL DEFAULT '',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portal users anon select"
  ON customer_portal_users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Portal users anon update"
  ON customer_portal_users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS portal_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES customer_systems(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  relationship text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  phone_alt text DEFAULT '',
  priority_order integer NOT NULL DEFAULT 1,
  has_key boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE portal_emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emergency contacts anon select"
  ON portal_emergency_contacts FOR SELECT
  TO anon USING (true);

CREATE POLICY "Emergency contacts anon insert"
  ON portal_emergency_contacts FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Emergency contacts anon update"
  ON portal_emergency_contacts FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Emergency contacts anon delete"
  ON portal_emergency_contacts FOR DELETE
  TO anon USING (true);

CREATE TABLE IF NOT EXISTS portal_system_passcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES customer_systems(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  code_type text NOT NULL DEFAULT 'verbal',
  passcode text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE portal_system_passcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Passcodes anon select"
  ON portal_system_passcodes FOR SELECT
  TO anon USING (true);

CREATE POLICY "Passcodes anon insert"
  ON portal_system_passcodes FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Passcodes anon update"
  ON portal_system_passcodes FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS portal_test_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES customer_systems(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  is_on_test boolean NOT NULL DEFAULT false,
  test_start_at timestamptz,
  test_end_at timestamptz,
  reason text DEFAULT '',
  placed_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE portal_test_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Test mode anon select"
  ON portal_test_mode FOR SELECT
  TO anon USING (true);

CREATE POLICY "Test mode anon insert"
  ON portal_test_mode FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Test mode anon update"
  ON portal_test_mode FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS portal_wo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  site_id uuid REFERENCES sites(id),
  portal_user_id uuid REFERENCES customer_portal_users(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal',
  preferred_date date,
  preferred_time text,
  status text NOT NULL DEFAULT 'pending',
  converted_wo_id uuid REFERENCES work_orders(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE portal_wo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WO requests anon select"
  ON portal_wo_requests FOR SELECT
  TO anon USING (true);

CREATE POLICY "WO requests anon insert"
  ON portal_wo_requests FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "WO requests anon update"
  ON portal_wo_requests FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS portal_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  invoice_id uuid REFERENCES invoices(id),
  portal_user_id uuid REFERENCES customer_portal_users(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'credit_card',
  reference_number text DEFAULT '',
  notes text DEFAULT '',
  paid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE portal_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portal payments anon select"
  ON portal_payments FOR SELECT
  TO anon USING (true);

CREATE POLICY "Portal payments anon insert"
  ON portal_payments FOR INSERT
  TO anon WITH CHECK (true);

INSERT INTO customer_portal_users (id, company_id, email, password_hash, first_name, last_name)
VALUES
  (gen_random_uuid(), '3773c9c5-5fb1-4c4c-8cb7-942b3223db26', 'admin@acme.com', 'demo1234', 'Jane', 'Smith'),
  (gen_random_uuid(), '4e03b73c-77a4-4c05-803d-4048b62d8d38', 'john@smith.com', 'demo1234', 'John', 'Smith'),
  (gen_random_uuid(), '7851e39e-4e37-4d65-ac1c-be09fb1a4c4b', 'manager@mall.com', 'demo1234', 'Mike', 'Johnson')
ON CONFLICT (email) DO NOTHING;
