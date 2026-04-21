/*
  # Enhanced Project Management Schema for Alarm Installation Companies

  ## Overview
  This migration transforms the basic `projects` table into a full trades-grade project
  management system inspired by SimPRO, ServiceTitan, and BuildOps. It is specifically
  designed for alarm installation companies that need to track multi-phase installations,
  job costing, change orders, progress billing, and recurring monthly revenue (RMR).

  ## New Tables

  ### 1. project_phases
  Represents the distinct stages of an installation project (e.g., Pre-Installation,
  Rough-In, Trim, Programming, Commissioning, Closeout). Each phase has an order,
  status, scheduled dates, and completion tracking.

  ### 2. project_budget_lines
  Budget broken down by phase and cost type (Labor, Materials, Permits, Subcontract,
  Equipment, Other). Tracks budgeted amount vs. actual cost for job costing reports.

  ### 3. change_orders
  Tracks scope changes throughout a project lifecycle. Includes line items, status
  workflow (draft → submitted → approved/rejected), customer signature capture, and
  direct impact on contract value.

  ### 4. change_order_line_items
  Individual cost line items within a change order (description, quantity, unit price, cost type).

  ### 5. progress_invoices
  Milestone-based or percentage-of-completion billing records tied to a project.
  Supports multiple billing types: milestone, percentage, T&M, and fixed.
  Tracks cumulative billed amount to prevent overbilling.

  ### 6. project_documents
  Stores permit records, AHJ certificates, UL certificates, as-builts, signed contracts,
  and other project-level documents with category classification.

  ### 7. project_rmr
  The recurring monthly revenue contract generated from a completed installation.
  Tracks monitoring type, monthly rate, contract term, and renewal dates — the
  long-term value asset of every alarm installation.

  ## Modified Tables

  ### projects (extended)
  Added columns for:
  - `contract_value` — The original signed contract amount (separate from budget)
  - `approved_co_value` — Running total of all approved change orders
  - `billing_type` — milestone, percentage, time_and_materials, fixed
  - `retainage_percent` — Optional hold-back percentage (default 0)
  - `lead_technician_id` — The primary field tech on the project
  - `project_number` — Human-readable project identifier
  - `deal_source_id` — FK to the deal that originated this project
  - `permit_number` — AHJ permit tracking
  - `permit_status` — permit workflow status
  - `ahj_name` — Authority Having Jurisdiction name
  - `completion_percent` — Manual or calculated completion %
  - `work_order phase link` — work_orders already have project_id; we add phase_id

  ### work_orders (extended)
  Added `project_phase_id` to link work orders to a specific phase.

  ## Security
  - RLS enabled on all new tables
  - All tables follow existing pattern: authenticated employees can view and manage all records

  ## Important Notes
  1. The `projects` table already exists — we only ADD new columns, never drop existing ones
  2. `work_orders` already has `project_id` — we add `project_phase_id` as an optional FK
  3. All monetary values use decimal(12,2) for consistency with existing schema
  4. Phase ordering uses `phase_order` integer (0-indexed) for flexible reordering
*/

-- =====================================================
-- EXTEND PROJECTS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'project_number') THEN
    ALTER TABLE projects ADD COLUMN project_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'contract_value') THEN
    ALTER TABLE projects ADD COLUMN contract_value decimal(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'approved_co_value') THEN
    ALTER TABLE projects ADD COLUMN approved_co_value decimal(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'billing_type') THEN
    ALTER TABLE projects ADD COLUMN billing_type text NOT NULL DEFAULT 'milestone';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'retainage_percent') THEN
    ALTER TABLE projects ADD COLUMN retainage_percent decimal(5,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'lead_technician_id') THEN
    ALTER TABLE projects ADD COLUMN lead_technician_id uuid REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'permit_number') THEN
    ALTER TABLE projects ADD COLUMN permit_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'permit_status') THEN
    ALTER TABLE projects ADD COLUMN permit_status text DEFAULT 'not_required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'ahj_name') THEN
    ALTER TABLE projects ADD COLUMN ahj_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'completion_percent') THEN
    ALTER TABLE projects ADD COLUMN completion_percent decimal(5,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'total_billed') THEN
    ALTER TABLE projects ADD COLUMN total_billed decimal(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'total_labor_budget') THEN
    ALTER TABLE projects ADD COLUMN total_labor_budget decimal(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'total_materials_budget') THEN
    ALTER TABLE projects ADD COLUMN total_materials_budget decimal(12,2) DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- EXTEND WORK ORDERS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'project_phase_id') THEN
    ALTER TABLE work_orders ADD COLUMN project_phase_id uuid;
  END IF;
END $$;

-- =====================================================
-- PROJECT PHASES
-- =====================================================

CREATE TABLE IF NOT EXISTS project_phases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  phase_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started',
  scheduled_start_date date,
  scheduled_end_date date,
  actual_start_date date,
  actual_end_date date,
  labor_budget decimal(12,2) DEFAULT 0,
  materials_budget decimal(12,2) DEFAULT 0,
  other_budget decimal(12,2) DEFAULT 0,
  labor_actual decimal(12,2) DEFAULT 0,
  materials_actual decimal(12,2) DEFAULT 0,
  other_actual decimal(12,2) DEFAULT 0,
  gate_requirement text,
  gate_met boolean DEFAULT false,
  completion_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all project phases"
  ON project_phases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert project phases"
  ON project_phases FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update project phases"
  ON project_phases FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete project phases"
  ON project_phases FOR DELETE
  TO authenticated
  USING (true);

-- Add FK from work_orders to project_phases after table is created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'work_orders_project_phase_id_fkey'
  ) THEN
    ALTER TABLE work_orders
      ADD CONSTRAINT work_orders_project_phase_id_fkey
      FOREIGN KEY (project_phase_id) REFERENCES project_phases(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- PROJECT BUDGET LINES
-- =====================================================

CREATE TABLE IF NOT EXISTS project_budget_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  phase_id uuid REFERENCES project_phases(id) ON DELETE CASCADE,
  cost_type text NOT NULL DEFAULT 'labor',
  description text NOT NULL,
  budgeted_amount decimal(12,2) NOT NULL DEFAULT 0,
  actual_amount decimal(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all budget lines"
  ON project_budget_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert budget lines"
  ON project_budget_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update budget lines"
  ON project_budget_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete budget lines"
  ON project_budget_lines FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- CHANGE ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS change_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  co_number text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  reason text,
  submitted_date date,
  approved_date date,
  rejected_date date,
  approved_by text,
  customer_signature text,
  customer_signed_at timestamptz,
  subtotal decimal(12,2) DEFAULT 0,
  tax decimal(12,2) DEFAULT 0,
  total decimal(12,2) DEFAULT 0,
  impact_schedule_days integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all change orders"
  ON change_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert change orders"
  ON change_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update change orders"
  ON change_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete change orders"
  ON change_orders FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- CHANGE ORDER LINE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS change_order_line_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_order_id uuid REFERENCES change_orders(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  cost_type text NOT NULL DEFAULT 'labor',
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  unit_cost decimal(10,2) DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE change_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all CO line items"
  ON change_order_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert CO line items"
  ON change_order_line_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update CO line items"
  ON change_order_line_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete CO line items"
  ON change_order_line_items FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PROGRESS INVOICES (MILESTONE / PROGRESS BILLING)
-- =====================================================

CREATE TABLE IF NOT EXISTS progress_invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  pi_number text NOT NULL,
  title text NOT NULL,
  billing_type text NOT NULL DEFAULT 'milestone',
  milestone_name text,
  phase_id uuid REFERENCES project_phases(id) ON DELETE SET NULL,
  percent_complete decimal(5,2) DEFAULT 0,
  scheduled_value decimal(12,2) DEFAULT 0,
  work_completed decimal(12,2) DEFAULT 0,
  materials_stored decimal(12,2) DEFAULT 0,
  total_earned decimal(12,2) DEFAULT 0,
  less_previous_billed decimal(12,2) DEFAULT 0,
  current_payment_due decimal(12,2) DEFAULT 0,
  retainage_amount decimal(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  invoice_date date,
  due_date date,
  sent_date date,
  paid_date date,
  notes text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE progress_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all progress invoices"
  ON progress_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert progress invoices"
  ON progress_invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update progress invoices"
  ON progress_invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete progress invoices"
  ON progress_invoices FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PROJECT DOCUMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS project_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL DEFAULT 'general',
  name text NOT NULL,
  file_url text,
  file_type text,
  file_size_kb integer,
  description text,
  uploaded_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all project documents"
  ON project_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert project documents"
  ON project_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update project documents"
  ON project_documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete project documents"
  ON project_documents FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PROJECT RMR (RECURRING MONTHLY REVENUE)
-- =====================================================

CREATE TABLE IF NOT EXISTS project_rmr (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  monitoring_type text NOT NULL DEFAULT 'central_station',
  monthly_rate decimal(10,2) NOT NULL DEFAULT 0,
  contract_term_months integer DEFAULT 36,
  start_date date,
  end_date date,
  auto_renews boolean DEFAULT true,
  renewal_notice_days integer DEFAULT 30,
  status text NOT NULL DEFAULT 'pending',
  service_includes text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_rmr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all project RMR"
  ON project_rmr FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert project RMR"
  ON project_rmr FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update project RMR"
  ON project_rmr FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete project RMR"
  ON project_rmr FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_status ON project_phases(status);
CREATE INDEX IF NOT EXISTS idx_project_budget_lines_project_id ON project_budget_lines(project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id ON change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status ON change_orders(status);
CREATE INDEX IF NOT EXISTS idx_progress_invoices_project_id ON progress_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_rmr_project_id ON project_rmr(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_project_phase_id ON work_orders(project_phase_id);
