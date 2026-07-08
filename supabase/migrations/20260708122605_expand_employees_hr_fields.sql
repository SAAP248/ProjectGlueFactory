/*
# Expand Employees Table with HR Management Fields

1. Modified Tables
   - `employees` - Adding comprehensive HR fields:
     - `personal_email` (text) - personal/non-work email
     - `personal_phone` (text) - personal phone number
     - `emergency_contact_name` (text) - emergency contact full name
     - `emergency_contact_phone` (text) - emergency contact phone
     - `date_of_hire` (date) - employment start date
     - `date_of_termination` (date) - employment end date if terminated
     - `employment_type` (text) - full_time, part_time, contractor, 1099
     - `pay_type` (text) - hourly or salary
     - `pay_rate` (numeric) - base pay rate (hourly rate or annual salary)
     - `overtime_rate` (numeric) - OT hourly rate
     - `loaded_cost` (numeric) - fully loaded cost per hour (benefits, taxes, etc)
     - `default_billing_product_id` (uuid, FK to products) - product billed to customers for this employee's time
     - `default_service_rate_id` (uuid, FK to service_rates) - default rate card for their hours
     - `department` (text) - organizational department
     - `title` (text) - job title
     - `address` (text) - home address
     - `city` (text) - home city
     - `state` (text) - home state
     - `zip` (text) - home zip code
     - `notes` (text) - internal HR notes
     - `color` (text) - calendar/dispatch color

2. New Tables
   - `employee_certifications` - tracks certifications and licenses
     - `id` (uuid, primary key)
     - `employee_id` (uuid, FK to employees)
     - `cert_name` (text) - certification name
     - `cert_number` (text) - certification/license number
     - `issuing_authority` (text) - who issued it
     - `issued_date` (date) - date issued
     - `expiration_date` (date) - expiration date
     - `notes` (text) - additional notes
     - `created_at` (timestamptz)

3. Security
   - RLS enabled on employee_certifications
   - Open anon + authenticated policies (single-tenant, no auth)
*/

-- Expand employees table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='personal_email') THEN
    ALTER TABLE employees ADD COLUMN personal_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='personal_phone') THEN
    ALTER TABLE employees ADD COLUMN personal_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='emergency_contact_name') THEN
    ALTER TABLE employees ADD COLUMN emergency_contact_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='emergency_contact_phone') THEN
    ALTER TABLE employees ADD COLUMN emergency_contact_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='date_of_hire') THEN
    ALTER TABLE employees ADD COLUMN date_of_hire date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='date_of_termination') THEN
    ALTER TABLE employees ADD COLUMN date_of_termination date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='employment_type') THEN
    ALTER TABLE employees ADD COLUMN employment_type text NOT NULL DEFAULT 'full_time';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='pay_type') THEN
    ALTER TABLE employees ADD COLUMN pay_type text NOT NULL DEFAULT 'hourly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='pay_rate') THEN
    ALTER TABLE employees ADD COLUMN pay_rate numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='overtime_rate') THEN
    ALTER TABLE employees ADD COLUMN overtime_rate numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='loaded_cost') THEN
    ALTER TABLE employees ADD COLUMN loaded_cost numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='default_billing_product_id') THEN
    ALTER TABLE employees ADD COLUMN default_billing_product_id uuid REFERENCES products(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='default_service_rate_id') THEN
    ALTER TABLE employees ADD COLUMN default_service_rate_id uuid REFERENCES service_rates(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='department') THEN
    ALTER TABLE employees ADD COLUMN department text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='title') THEN
    ALTER TABLE employees ADD COLUMN title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='address') THEN
    ALTER TABLE employees ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='city') THEN
    ALTER TABLE employees ADD COLUMN city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='state') THEN
    ALTER TABLE employees ADD COLUMN state text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='zip') THEN
    ALTER TABLE employees ADD COLUMN zip text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='notes') THEN
    ALTER TABLE employees ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='color') THEN
    ALTER TABLE employees ADD COLUMN color text DEFAULT '#2563eb';
  END IF;
END $$;

-- Employee certifications table
CREATE TABLE IF NOT EXISTS employee_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cert_name text NOT NULL,
  cert_number text,
  issuing_authority text,
  issued_date date,
  expiration_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_employee_certifications" ON employee_certifications;
CREATE POLICY "anon_select_employee_certifications" ON employee_certifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employee_certifications" ON employee_certifications;
CREATE POLICY "anon_insert_employee_certifications" ON employee_certifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_employee_certifications" ON employee_certifications;
CREATE POLICY "anon_update_employee_certifications" ON employee_certifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_employee_certifications" ON employee_certifications;
CREATE POLICY "anon_delete_employee_certifications" ON employee_certifications FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_employee_certifications_employee ON employee_certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);