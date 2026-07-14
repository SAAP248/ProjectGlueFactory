/*
# Create Revenue Entries Table

1. New Tables
  - `revenue_entries` - Single source of truth for revenue reporting
    - `id` (uuid, primary key)
    - `revenue_date` (date, not null) - When the revenue was recognized
    - `revenue_type` (text, not null) - One of: 'Sales', 'Service', 'RMR'
    - `system_type_id` (uuid, FK to system_types, nullable) - System category (Alarm, CCTV, etc.)
    - `amount` (numeric 12,2, not null) - Revenue amount in dollars
    - `employee_id` (uuid, FK to employees, nullable) - Salesperson or tech who generated it
    - `office_id` (uuid, FK to offices, nullable) - Branch office
    - `company_id` (uuid, FK to companies, nullable) - Customer
    - `deal_id` (uuid, FK to deals, nullable) - Related deal if Sales revenue
    - `work_order_id` (uuid, FK to work_orders, nullable) - Related WO if Service revenue
    - `invoice_id` (uuid, FK to invoices, nullable) - Related invoice
    - `service_contract_id` (uuid, FK to service_contracts, nullable) - Related contract for RMR
    - `notes` (text, nullable) - Description or notes
    - `created_at` (timestamptz)

2. Security
  - RLS enabled on revenue_entries
  - Anon + authenticated full access (single-tenant, no auth)

3. Indexes
  - revenue_date for date range queries
  - revenue_type for type filtering
  - employee_id for salesperson filtering
  - office_id for office filtering
  - system_type_id for system breakdown

4. Notes
  - Revenue types: Sales (new installations/deals), Service (T&M work orders), RMR (recurring monitoring revenue)
  - A single deal can produce multiple revenue entries (one per system type)
  - This table is optimized for reporting aggregations
*/

CREATE TABLE IF NOT EXISTS revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_date date NOT NULL,
  revenue_type text NOT NULL,
  system_type_id uuid REFERENCES system_types(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  office_id uuid REFERENCES offices(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  service_contract_id uuid REFERENCES service_contracts(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_revenue_entries" ON revenue_entries;
CREATE POLICY "anon_select_revenue_entries" ON revenue_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_revenue_entries" ON revenue_entries;
CREATE POLICY "anon_insert_revenue_entries" ON revenue_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_revenue_entries" ON revenue_entries;
CREATE POLICY "anon_update_revenue_entries" ON revenue_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_revenue_entries" ON revenue_entries;
CREATE POLICY "anon_delete_revenue_entries" ON revenue_entries FOR DELETE
  TO anon, authenticated USING (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_revenue_entries_date ON revenue_entries(revenue_date);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_type ON revenue_entries(revenue_type);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_employee ON revenue_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_office ON revenue_entries(office_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_system_type ON revenue_entries(system_type_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_company ON revenue_entries(company_id);
