/*
  # Expand Work Orders - Full Field Service Schema

  ## Summary
  Comprehensive expansion of the work orders system to support full field service operations
  including billing, dispatch, time tracking, attachments, line items, and multi-technician assignments.

  ## Changes to Existing Tables

  ### work_orders (expanded)
  - Added `billing_type` - 'hourly', 'fixed', or 'not_billable'
  - Added `billing_rate` - hourly rate when billing_type is 'hourly'
  - Added `fixed_amount` - fixed price amount when billing_type is 'fixed'
  - Added `deal_id` - FK to deals table, links WO to a sale/project deal
  - Added `invoice_id` - FK to invoices table, links WO to its invoice
  - Added `system_id` - FK to customer_systems, the specific system being serviced
  - Added `reason_for_visit` - WHY we are going out (customer-stated reason)
  - Added `scope_of_work` - WHAT we will do (internal planned scope)
  - Added `technician_notes` - Field notes from the tech on site
  - Added `resolution_notes` - What was done to resolve the issue
  - Added `enroute_at` - Timestamp when tech starts driving
  - Added `onsite_at` - Timestamp when tech arrives on site
  - Added `enroute_duration_minutes` - Calculated drive time in minutes
  - Added `onsite_duration_minutes` - Calculated on-site time in minutes
  - Added `billing_status` - 'unbilled', 'invoiced', 'paid'
  - Added `customer_signature` - Base64 or URL to customer signature
  - Added `payment_collected` - Amount collected on-site
  - Added `payment_method` - Method of on-site payment

  ## New Tables

  ### work_order_technicians
  - Junction table for many-to-many: work orders to technicians
  - Tracks lead technician flag, individual time tracking per tech

  ### work_order_line_items
  - Parts and labor line items on a work order (before invoicing)
  - Supports products from catalog or manual entries
  - Type: 'labor', 'part', 'fee', 'discount'

  ### work_order_attachments
  - Photos and file attachments for a work order
  - Tracks file type, URL, uploaded by, and caption

  ## Security
  - RLS enabled on all new tables
  - Anon select allowed (matching existing pattern)
  - Authenticated users can manage records
*/

-- =====================================================
-- EXPAND WORK ORDERS TABLE
-- =====================================================

DO $$
BEGIN
  -- Billing fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'billing_type') THEN
    ALTER TABLE work_orders ADD COLUMN billing_type text NOT NULL DEFAULT 'not_billable';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'billing_rate') THEN
    ALTER TABLE work_orders ADD COLUMN billing_rate decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'fixed_amount') THEN
    ALTER TABLE work_orders ADD COLUMN fixed_amount decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'deal_id') THEN
    ALTER TABLE work_orders ADD COLUMN deal_id uuid REFERENCES deals(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'invoice_id') THEN
    ALTER TABLE work_orders ADD COLUMN invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'system_id') THEN
    ALTER TABLE work_orders ADD COLUMN system_id uuid REFERENCES customer_systems(id) ON DELETE SET NULL;
  END IF;

  -- Reason and scope
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'reason_for_visit') THEN
    ALTER TABLE work_orders ADD COLUMN reason_for_visit text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'scope_of_work') THEN
    ALTER TABLE work_orders ADD COLUMN scope_of_work text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'technician_notes') THEN
    ALTER TABLE work_orders ADD COLUMN technician_notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'resolution_notes') THEN
    ALTER TABLE work_orders ADD COLUMN resolution_notes text;
  END IF;

  -- Time tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'enroute_at') THEN
    ALTER TABLE work_orders ADD COLUMN enroute_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'onsite_at') THEN
    ALTER TABLE work_orders ADD COLUMN onsite_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'enroute_duration_minutes') THEN
    ALTER TABLE work_orders ADD COLUMN enroute_duration_minutes integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'onsite_duration_minutes') THEN
    ALTER TABLE work_orders ADD COLUMN onsite_duration_minutes integer;
  END IF;

  -- Billing status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'billing_status') THEN
    ALTER TABLE work_orders ADD COLUMN billing_status text NOT NULL DEFAULT 'unbilled';
  END IF;

  -- On-site payment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'payment_collected') THEN
    ALTER TABLE work_orders ADD COLUMN payment_collected decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'payment_method') THEN
    ALTER TABLE work_orders ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'customer_signature') THEN
    ALTER TABLE work_orders ADD COLUMN customer_signature text;
  END IF;
END $$;

-- =====================================================
-- WORK ORDER TECHNICIANS (many-to-many)
-- =====================================================

CREATE TABLE IF NOT EXISTS work_order_technicians (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  is_lead boolean DEFAULT false,
  enroute_at timestamptz,
  onsite_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(work_order_id, employee_id)
);

ALTER TABLE work_order_technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view work order technicians"
  ON work_order_technicians FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view work order technicians"
  ON work_order_technicians FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert work order technicians"
  ON work_order_technicians FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update work order technicians"
  ON work_order_technicians FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete work order technicians"
  ON work_order_technicians FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- WORK ORDER LINE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS work_order_line_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  line_type text NOT NULL DEFAULT 'part',
  description text NOT NULL,
  quantity decimal(10,3) DEFAULT 1,
  unit_price decimal(10,2) DEFAULT 0,
  total_price decimal(10,2) DEFAULT 0,
  is_taxable boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE work_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view work order line items"
  ON work_order_line_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view work order line items"
  ON work_order_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert work order line items"
  ON work_order_line_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update work order line items"
  ON work_order_line_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete work order line items"
  ON work_order_line_items FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- WORK ORDER ATTACHMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS work_order_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_url text NOT NULL,
  file_size_bytes integer,
  caption text,
  uploaded_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view work order attachments"
  ON work_order_attachments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view work order attachments"
  ON work_order_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert work order attachments"
  ON work_order_attachments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update work order attachments"
  ON work_order_attachments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete work order attachments"
  ON work_order_attachments FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_work_order_technicians_wo ON work_order_technicians(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_technicians_emp ON work_order_technicians(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_order_line_items_wo ON work_order_line_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_attachments_wo ON work_order_attachments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_billing_status ON work_orders(billing_status);
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON work_orders(company_id);
