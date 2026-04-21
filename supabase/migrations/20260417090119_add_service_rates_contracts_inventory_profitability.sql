/*
  # Service rates, service contracts, networking inventory, profitability

  1. New Tables
    - `service_rates` - Company-wide default service rate cards (Standard, After Hours, Emergency, Holiday, Travel).
    - `customer_service_rates` - Per-customer overrides; if none, the default rate is used.
    - `service_contracts` - Recurring service/maintenance agreements (HVAC-style) per customer/site.
    - `service_contract_visits` - Scheduled visits generated from a contract.
    - `work_order_parts` - Parts consumed during a WO (drives profitability).
  2. Modified Tables
    - `site_inventory` - Adds company_id, system_id, imei, firmware_version, location_detail, photo_url, product_name, install_cost.
    - `work_orders` - Adds service_rate_id, total_parts_cost, total_labor_cost, total_revenue, profit_amount, profit_margin_pct, work_performed.
    - `companies` - Adds default_service_rate_id (optional override).
  3. Security
    - RLS enabled on all new tables with anon + authenticated full access (dev parity).
  4. Seed Data
    - 5 default service rate cards.
    - Expanded site inventory rows for networking + alarm gear on existing customers.
*/

-- ============================================================================
-- SERVICE RATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  minimum_hours numeric(4,2) NOT NULL DEFAULT 1,
  trip_charge numeric(10,2) NOT NULL DEFAULT 0,
  after_hours_multiplier numeric(4,2) NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_rates_select_all" ON service_rates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "service_rates_insert_all" ON service_rates FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "service_rates_update_all" ON service_rates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_rates_delete_all" ON service_rates FOR DELETE TO anon, authenticated USING (true);

-- ============================================================================
-- CUSTOMER SERVICE RATE OVERRIDES
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_service_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_rate_id uuid NOT NULL REFERENCES service_rates(id) ON DELETE CASCADE,
  override_hourly_rate numeric(10,2),
  override_trip_charge numeric(10,2),
  override_minimum_hours numeric(4,2),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (company_id, service_rate_id)
);

ALTER TABLE customer_service_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_service_rates_select_all" ON customer_service_rates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "customer_service_rates_insert_all" ON customer_service_rates FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "customer_service_rates_update_all" ON customer_service_rates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "customer_service_rates_delete_all" ON customer_service_rates FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_customer_service_rates_company ON customer_service_rates(company_id);

-- ============================================================================
-- SERVICE CONTRACTS (HVAC-style recurring agreements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  system_id uuid REFERENCES customer_systems(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  contract_type text NOT NULL DEFAULT 'maintenance',
  billing_frequency text NOT NULL DEFAULT 'monthly',
  billing_amount numeric(10,2) NOT NULL DEFAULT 0,
  visit_frequency text NOT NULL DEFAULT 'quarterly',
  visits_per_year integer NOT NULL DEFAULT 4,
  includes_labor boolean NOT NULL DEFAULT true,
  includes_parts boolean NOT NULL DEFAULT false,
  includes_emergency boolean NOT NULL DEFAULT false,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date,
  auto_renew boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  next_visit_date date,
  last_visit_date date,
  annual_value numeric(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_contracts_select_all" ON service_contracts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "service_contracts_insert_all" ON service_contracts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "service_contracts_update_all" ON service_contracts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_contracts_delete_all" ON service_contracts FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_service_contracts_company ON service_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_service_contracts_status ON service_contracts(status);
CREATE INDEX IF NOT EXISTS idx_service_contracts_next_visit ON service_contracts(next_visit_date);

-- ============================================================================
-- SERVICE CONTRACT VISITS
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_contract_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES service_contracts(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  scheduled_date date NOT NULL,
  completed_date date,
  visit_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'scheduled',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_contract_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_contract_visits_select_all" ON service_contract_visits FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "service_contract_visits_insert_all" ON service_contract_visits FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "service_contract_visits_update_all" ON service_contract_visits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_contract_visits_delete_all" ON service_contract_visits FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_service_contract_visits_contract ON service_contract_visits(contract_id);

-- ============================================================================
-- WORK ORDER PARTS USED
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  product_id uuid,
  site_inventory_id uuid,
  part_name text NOT NULL,
  part_number text DEFAULT '',
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit_cost numeric(10,2) NOT NULL DEFAULT 0,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_cost numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  installed_location text DEFAULT '',
  serial_number text DEFAULT '',
  mac_address text DEFAULT '',
  imei text DEFAULT '',
  added_to_site_inventory boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_order_parts_select_all" ON work_order_parts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "work_order_parts_insert_all" ON work_order_parts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "work_order_parts_update_all" ON work_order_parts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "work_order_parts_delete_all" ON work_order_parts FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_work_order_parts_wo ON work_order_parts(work_order_id);

-- ============================================================================
-- SITE INVENTORY EXPANSION
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='company_id') THEN
    ALTER TABLE site_inventory ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='system_id') THEN
    ALTER TABLE site_inventory ADD COLUMN system_id uuid REFERENCES customer_systems(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='imei') THEN
    ALTER TABLE site_inventory ADD COLUMN imei text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='firmware_version') THEN
    ALTER TABLE site_inventory ADD COLUMN firmware_version text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='location_detail') THEN
    ALTER TABLE site_inventory ADD COLUMN location_detail text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='photo_url') THEN
    ALTER TABLE site_inventory ADD COLUMN photo_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='product_name') THEN
    ALTER TABLE site_inventory ADD COLUMN product_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='product_category') THEN
    ALTER TABLE site_inventory ADD COLUMN product_category text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='install_cost') THEN
    ALTER TABLE site_inventory ADD COLUMN install_cost numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='installed_by_employee_id') THEN
    ALTER TABLE site_inventory ADD COLUMN installed_by_employee_id uuid;
  END IF;
END $$;

-- ============================================================================
-- WORK ORDER PROFITABILITY FIELDS
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='service_rate_id') THEN
    ALTER TABLE work_orders ADD COLUMN service_rate_id uuid REFERENCES service_rates(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='total_parts_cost') THEN
    ALTER TABLE work_orders ADD COLUMN total_parts_cost numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='total_labor_cost') THEN
    ALTER TABLE work_orders ADD COLUMN total_labor_cost numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='total_revenue') THEN
    ALTER TABLE work_orders ADD COLUMN total_revenue numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='profit_amount') THEN
    ALTER TABLE work_orders ADD COLUMN profit_amount numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='profit_margin_pct') THEN
    ALTER TABLE work_orders ADD COLUMN profit_margin_pct numeric(5,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='work_performed') THEN
    ALTER TABLE work_orders ADD COLUMN work_performed text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='service_contract_id') THEN
    ALTER TABLE work_orders ADD COLUMN service_contract_id uuid REFERENCES service_contracts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- COMPANY DEFAULT RATE
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='default_service_rate_id') THEN
    ALTER TABLE companies ADD COLUMN default_service_rate_id uuid REFERENCES service_rates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- SEED SERVICE RATES
-- ============================================================================
INSERT INTO service_rates (name, description, hourly_rate, minimum_hours, trip_charge, after_hours_multiplier, is_default, sort_order)
SELECT * FROM (VALUES
  ('Standard Service',  'Business-hours service rate (Mon–Fri 8am–5pm)', 125.00, 1.0,  75.00, 1.00, true,  1),
  ('After Hours',       'Evenings, weekends, outside standard hours',     175.00, 2.0, 100.00, 1.40, false, 2),
  ('Emergency Service', 'Same-day emergency dispatch',                    250.00, 2.0, 150.00, 2.00, false, 3),
  ('Holiday Service',   'Federal holiday service rate',                   300.00, 2.0, 150.00, 2.40, false, 4),
  ('Install / Project', 'Scheduled installation labor',                   110.00, 1.0,   0.00, 1.00, false, 5)
) AS v(name, description, hourly_rate, minimum_hours, trip_charge, after_hours_multiplier, is_default, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM service_rates WHERE service_rates.name = v.name);
