/*
# Create Offices Table

1. New Tables
  - `offices` - Company branch/office locations
    - `id` (uuid, primary key)
    - `name` (text, not null) - Display name e.g. "Austin HQ"
    - `city` (text) - City where office is located
    - `state` (text) - State abbreviation
    - `is_active` (boolean, default true)
    - `created_at` (timestamptz)

2. Modified Tables
  - `employees` - Adding `office_id` (uuid, FK to offices, nullable)

3. Security
  - RLS enabled on offices
  - Anon + authenticated full access (single-tenant, no auth)

4. Notes
  - Office is used for revenue reporting by branch location
  - Employees belong to an office, revenue inherits office from the employee
*/

-- Create offices table
CREATE TABLE IF NOT EXISTS offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  state text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_offices" ON offices;
CREATE POLICY "anon_select_offices" ON offices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_offices" ON offices;
CREATE POLICY "anon_insert_offices" ON offices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_offices" ON offices;
CREATE POLICY "anon_update_offices" ON offices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_offices" ON offices;
CREATE POLICY "anon_delete_offices" ON offices FOR DELETE
  TO anon, authenticated USING (true);

-- Add office_id to employees
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='office_id') THEN
    ALTER TABLE employees ADD COLUMN office_id uuid REFERENCES offices(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_office_id ON employees(office_id);
