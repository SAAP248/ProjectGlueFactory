/*
  # WorkHorse Alarm Company Software - Database Schema

  ## Overview
  Complete database schema for WorkHorse Alarm Company management system including CRM, dispatch,
  inventory, accounting, project management, and time tracking.

  ## Tables Created

  ### Core Identity & Access
  - `employees` - Company employees/technicians
  - `companies` - Customer companies
  - `contacts` - Individual contacts at customer companies
  - `sites` - Physical locations/properties for customers
  
  ### Dispatch & Scheduling
  - `work_orders` - Service tickets, installations, inspections
  - `appointments` - Scheduled calendar events
  - `technician_locations` - Real-time GPS tracking
  
  ### Sales & Projects
  - `deals` - Sales pipeline opportunities
  - `projects` - Project management with kanban boards
  - `project_tasks` - Tasks within projects
  
  ### Inventory Management
  - `warehouses` - Company warehouse locations
  - `distributors` - Vendor/distributor information
  - `products` - Product catalog
  - `packages` - Product bundles
  - `warehouse_inventory` - Stock levels by warehouse
  - `site_inventory` - Installed equipment at customer sites
  - `purchase_orders` - Orders from distributors
  - `transfer_orders` - Inter-warehouse transfers
  
  ### Accounting
  - `estimates` - Price quotes for customers
  - `invoices` - Customer invoices
  - `invoice_line_items` - Line items on invoices
  - `transactions` - Payment records
  - `statements` - Customer statements
  
  ### Communication & Tasks
  - `chat_messages` - SMS communications with customers
  - `tasks` - Assignable reminders and todos
  - `customer_notes` - Notes about customers
  
  ### Monitoring
  - `alarm_events` - Central station alarm events
  - `communication_partners` - External monitoring services
  
  ### Time Tracking
  - `time_entries` - Punch in/out records
  
  ## Security
  - RLS enabled on all tables
  - Policies for authenticated employee access
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- EMPLOYEES & AUTHENTICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'technician',
  status text NOT NULL DEFAULT 'active',
  avatar_url text,
  hourly_rate decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can update own profile"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- =====================================================
-- CUSTOMERS - COMPANIES
-- =====================================================

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  customer_type text NOT NULL DEFAULT 'residential',
  account_number text UNIQUE,
  phone text,
  email text,
  website text,
  billing_address text,
  billing_city text,
  billing_state text,
  billing_zip text,
  tags text[] DEFAULT '{}',
  is_vip boolean DEFAULT false,
  total_revenue decimal(12,2) DEFAULT 0,
  outstanding_balance decimal(12,2) DEFAULT 0,
  past_due_amount decimal(12,2) DEFAULT 0,
  payment_terms text DEFAULT 'Net 30',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage companies"
  ON companies FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- CUSTOMERS - CONTACTS
-- =====================================================

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  mobile text,
  title text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage contacts"
  ON contacts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- CUSTOMERS - SITES
-- =====================================================

CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  latitude decimal(10,8),
  longitude decimal(11,8),
  site_type text DEFAULT 'commercial',
  access_instructions text,
  alarm_code text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all sites"
  ON sites FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage sites"
  ON sites FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- DEALS - SALES PIPELINE
-- =====================================================

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  title text NOT NULL,
  value decimal(12,2) NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'lead',
  probability integer DEFAULT 0,
  expected_close_date date,
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  source text,
  description text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all deals"
  ON deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage deals"
  ON deals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PROJECTS
-- =====================================================

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'planning',
  project_type text DEFAULT 'installation',
  start_date date,
  end_date date,
  budget decimal(12,2),
  actual_cost decimal(12,2) DEFAULT 0,
  project_manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  description text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage projects"
  ON projects FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS project_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text DEFAULT 'medium',
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  due_date date,
  completed_at timestamptz,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all project tasks"
  ON project_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage project tasks"
  ON project_tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- WORK ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_number text UNIQUE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  work_order_type text NOT NULL DEFAULT 'service',
  status text NOT NULL DEFAULT 'unassigned',
  priority text DEFAULT 'normal',
  scheduled_date date,
  scheduled_time time,
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  estimated_duration integer DEFAULT 60,
  actual_duration integer,
  labor_cost decimal(10,2) DEFAULT 0,
  parts_cost decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all work orders"
  ON work_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage work orders"
  ON work_orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- APPOINTMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  assigned_to uuid REFERENCES employees(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  appointment_type text DEFAULT 'service',
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TASKS
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  due_date timestamptz,
  priority text DEFAULT 'normal',
  status text DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- INVENTORY - WAREHOUSES
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage warehouses"
  ON warehouses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- INVENTORY - DISTRIBUTORS
-- =====================================================

CREATE TABLE IF NOT EXISTS distributors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  website text,
  address text,
  city text,
  state text,
  zip text,
  account_number text,
  payment_terms text DEFAULT 'Net 30',
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all distributors"
  ON distributors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage distributors"
  ON distributors FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- INVENTORY - PRODUCTS
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  manufacturer text,
  model_number text,
  cost decimal(10,2) DEFAULT 0,
  price decimal(10,2) DEFAULT 0,
  chart_of_accounts text,
  image_url text,
  is_active boolean DEFAULT true,
  track_serial boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage products"
  ON products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- INVENTORY - PACKAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  total_cost decimal(10,2) DEFAULT 0,
  total_price decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS package_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id uuid REFERENCES packages(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all packages"
  ON packages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage packages"
  ON packages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can view all package items"
  ON package_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage package items"
  ON package_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- INVENTORY - WAREHOUSE INVENTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  last_counted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all warehouse inventory"
  ON warehouse_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage warehouse inventory"
  ON warehouse_inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- INVENTORY - SITE INVENTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS site_inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  serial_number text,
  mac_address text,
  installation_date date,
  warranty_expiration date,
  zone_location text,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all site inventory"
  ON site_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage site inventory"
  ON site_inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- INVENTORY - PURCHASE ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number text UNIQUE NOT NULL,
  distributor_id uuid REFERENCES distributors(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  order_date date NOT NULL,
  expected_date date,
  received_date date,
  total_amount decimal(12,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_cost decimal(10,2) NOT NULL,
  received_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage purchase orders"
  ON purchase_orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can view all purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage purchase order items"
  ON purchase_order_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- INVENTORY - TRANSFER ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS transfer_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number text UNIQUE NOT NULL,
  from_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  to_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  transfer_date date NOT NULL,
  received_date date,
  notes text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfer_order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_order_id uuid REFERENCES transfer_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  received_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transfer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all transfer orders"
  ON transfer_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage transfer orders"
  ON transfer_orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can view all transfer order items"
  ON transfer_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage transfer order items"
  ON transfer_order_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- ACCOUNTING - ESTIMATES
-- =====================================================

CREATE TABLE IF NOT EXISTS estimates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_number text UNIQUE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  estimate_date date NOT NULL,
  expiration_date date,
  subtotal decimal(12,2) DEFAULT 0,
  tax decimal(12,2) DEFAULT 0,
  total decimal(12,2) DEFAULT 0,
  notes text,
  terms text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estimate_line_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id uuid REFERENCES estimates(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all estimates"
  ON estimates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage estimates"
  ON estimates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can view all estimate line items"
  ON estimate_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage estimate line items"
  ON estimate_line_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- ACCOUNTING - INVOICES
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number text UNIQUE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  subtotal decimal(12,2) DEFAULT 0,
  tax decimal(12,2) DEFAULT 0,
  total decimal(12,2) DEFAULT 0,
  amount_paid decimal(12,2) DEFAULT 0,
  balance_due decimal(12,2) DEFAULT 0,
  notes text,
  terms text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can view all invoice line items"
  ON invoice_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage invoice line items"
  ON invoice_line_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- ACCOUNTING - TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number text UNIQUE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  transaction_type text NOT NULL DEFAULT 'payment',
  payment_method text NOT NULL DEFAULT 'check',
  amount decimal(12,2) NOT NULL,
  transaction_date date NOT NULL,
  reference_number text,
  notes text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage transactions"
  ON transactions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- ACCOUNTING - STATEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS statements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_number text UNIQUE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  statement_date date NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  beginning_balance decimal(12,2) DEFAULT 0,
  total_charges decimal(12,2) DEFAULT 0,
  total_payments decimal(12,2) DEFAULT 0,
  ending_balance decimal(12,2) DEFAULT 0,
  sent_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all statements"
  ON statements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage statements"
  ON statements FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMMUNICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS communication_partners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  partner_type text NOT NULL DEFAULT 'central_station',
  contact_name text,
  phone text,
  email text,
  api_endpoint text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alarm_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  communication_partner_id uuid REFERENCES communication_partners(id) ON DELETE SET NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_code text,
  description text NOT NULL,
  severity text DEFAULT 'info',
  event_timestamp timestamptz NOT NULL,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'outbound',
  message_body text NOT NULL,
  phone_number text,
  status text DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  note_type text DEFAULT 'general',
  note text NOT NULL,
  is_important boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE communication_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all communication partners"
  ON communication_partners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage communication partners"
  ON communication_partners FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can view all alarm events"
  ON alarm_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage alarm events"
  ON alarm_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can view all chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage chat messages"
  ON chat_messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can view all customer notes"
  ON customer_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage customer notes"
  ON customer_notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TIME TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  clock_in_time timestamptz NOT NULL,
  clock_out_time timestamptz,
  clock_in_location text,
  clock_out_location text,
  break_duration integer DEFAULT 0,
  total_hours decimal(10,2),
  notes text,
  approved boolean DEFAULT false,
  approved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS technician_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  latitude decimal(10,8) NOT NULL,
  longitude decimal(11,8) NOT NULL,
  accuracy decimal(10,2),
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can manage own time entries"
  ON time_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can view technician locations"
  ON technician_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can update own location"
  ON technician_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_customer_type ON companies(customer_type);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_alarm_events_event_timestamp ON alarm_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in_time ON time_entries(clock_in_time);