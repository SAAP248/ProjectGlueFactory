/*
  # Add Customer Systems, Zones, Devices, System Types, and Credits

  ## Overview
  Extends the customer profile with detailed system tracking capabilities.
  Security companies monitor multiple system types per customer site, and
  this migration adds the tables needed to track all installed systems, their
  components, and customer account credits.

  ## New Tables

  ### 1. `system_types`
  - Stores configurable system type definitions (Burg, Fire, etc.)
  - Includes default types and supports custom types added via Settings
  - Columns: id, name, icon_name, color, is_default, is_active, sort_order

  ### 2. `customer_systems`
  - Links a system type to a specific site for a company
  - Tracks panel/make/model, monitoring account number, status
  - Columns: id, company_id, site_id, system_type_id, name, panel_make, panel_model,
    monitoring_account_number, status, installation_date, notes

  ### 3. `system_zones`
  - Individual alarm zones within a system (burglar/fire panels)
  - Columns: id, system_id, zone_number, zone_name, zone_type, bypass_status, notes

  ### 4. `system_devices`
  - Individual physical devices associated with a system (cameras, access readers, etc.)
  - Columns: id, system_id, device_name, device_type, make, model, serial_number,
    mac_address, ip_address, location, status, notes

  ### 5. `customer_credits`
  - Account credits issued to customers
  - Columns: id, company_id, amount, reason, issued_date, expiration_date,
    invoice_id (nullable), status (unapplied/applied/expired)

  ## Security
  - RLS enabled on all new tables
  - Authenticated access policies matching existing pattern
*/

-- =====================================================
-- SYSTEM TYPES
-- =====================================================

CREATE TABLE IF NOT EXISTS system_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  icon_name text NOT NULL DEFAULT 'Shield',
  color text NOT NULL DEFAULT '#2563eb',
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 99,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view system types"
  ON system_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert system types"
  ON system_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update system types"
  ON system_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete non-default system types"
  ON system_types FOR DELETE
  TO authenticated
  USING (is_default = false);

-- Seed default system types
INSERT INTO system_types (name, icon_name, color, is_default, is_active, sort_order)
VALUES
  ('Burg', 'ShieldAlert', '#dc2626', true, true, 1),
  ('Fire', 'Flame', '#ea580c', true, true, 2),
  ('Burg & Fire', 'ShieldCheck', '#b45309', true, true, 3),
  ('Access Control', 'KeyRound', '#16a34a', true, true, 4),
  ('Networking', 'Network', '#0891b2', true, true, 5),
  ('Audio Video', 'Tv2', '#7c3aed', true, true, 6),
  ('Gates', 'DoorOpen', '#4f46e5', true, true, 7)
ON CONFLICT DO NOTHING;

-- =====================================================
-- CUSTOMER SYSTEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_systems (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  system_type_id uuid REFERENCES system_types(id) ON DELETE SET NULL,
  name text NOT NULL,
  panel_make text,
  panel_model text,
  monitoring_account_number text,
  status text NOT NULL DEFAULT 'active',
  installation_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer systems"
  ON customer_systems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer systems"
  ON customer_systems FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer systems"
  ON customer_systems FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer systems"
  ON customer_systems FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_customer_systems_company_id ON customer_systems(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_systems_site_id ON customer_systems(site_id);

-- =====================================================
-- SYSTEM ZONES
-- =====================================================

CREATE TABLE IF NOT EXISTS system_zones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  system_id uuid REFERENCES customer_systems(id) ON DELETE CASCADE,
  zone_number integer NOT NULL,
  zone_name text NOT NULL,
  zone_type text NOT NULL DEFAULT 'motion',
  bypass_status boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view system zones"
  ON system_zones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert system zones"
  ON system_zones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update system zones"
  ON system_zones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete system zones"
  ON system_zones FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_system_zones_system_id ON system_zones(system_id);

-- =====================================================
-- SYSTEM DEVICES
-- =====================================================

CREATE TABLE IF NOT EXISTS system_devices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  system_id uuid REFERENCES customer_systems(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  device_type text NOT NULL,
  make text,
  model text,
  serial_number text,
  mac_address text,
  ip_address text,
  location text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view system devices"
  ON system_devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert system devices"
  ON system_devices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update system devices"
  ON system_devices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete system devices"
  ON system_devices FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_system_devices_system_id ON system_devices(system_id);

-- =====================================================
-- CUSTOMER CREDITS
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_credits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  reason text NOT NULL,
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  expiration_date date,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unapplied',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer credits"
  ON customer_credits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer credits"
  ON customer_credits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer credits"
  ON customer_credits FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer credits"
  ON customer_credits FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_customer_credits_company_id ON customer_credits(company_id);
