/*
# Create Inspection Module Tables

## Summary
Creates the core database schema for the NFPA 72 inspection workflow.
Inspections are linked to work orders, customers, sites, and technicians.
Form definitions are stored as versioned JSON templates so future form editions
do not break previously completed inspections.

## New Tables

### inspection_templates
Stores versioned form definitions (sections, fields, validation rules) as JSON.
- `id` (uuid, PK)
- `name` (text) -- e.g. "NFPA 72 Fire Alarm Inspection"
- `code` (text, unique) -- e.g. "nfpa72"
- `version` (integer) -- increments per edition
- `edition` (text) -- human-readable edition label
- `pages` (jsonb) -- full form definition: array of pages, each with sections and fields
- `is_active` (boolean) -- only one active version per code
- `created_at` (timestamptz)

### inspections
Main inspection record linking to work order, customer, site, technician.
- `id` (uuid, PK)
- `inspection_number` (text, unique) -- auto-generated display number
- `template_id` (uuid, FK -> inspection_templates)
- `work_order_id` (uuid, FK -> work_orders)
- `company_id` (uuid, FK -> companies)
- `site_id` (uuid, FK -> sites)
- `technician_id` (uuid, FK -> employees)
- `contact_id` (uuid, FK -> contacts) -- selected site/customer contact
- `status` (text) -- draft, completed
- `inspection_date` (date)
- `inspection_start_time` (time)
- `prefill_data` (jsonb) -- snapshot of prefilled customer/site info at creation
- `completed_at` (timestamptz)
- `completed_by` (text) -- name of completing user
- `is_edit_unlocked` (boolean) -- temporarily unlocked for edits after completion
- `created_at` / `updated_at` (timestamptz)

### inspection_field_values
Every form answer keyed by inspection ID and field ID.
- `id` (uuid, PK)
- `inspection_id` (uuid, FK -> inspections)
- `field_id` (text) -- matches the field ID in the template JSON
- `page_index` (integer) -- which page (0-3)
- `value` (jsonb) -- the answer (string, boolean, array, object for repeating rows)
- `updated_at` (timestamptz)

### inspection_signatures
Technician and customer signatures with timestamps.
- `id` (uuid, PK)
- `inspection_id` (uuid, FK -> inspections)
- `signer_role` (text) -- "technician" or "customer"
- `signer_name` (text)
- `signature_data` (text) -- base64 PNG data
- `signed_at` (timestamptz)

## Security
- RLS enabled on all tables.
- Full anon + authenticated CRUD policies (single-tenant, no auth).

## Indexes
- inspections by work_order_id, company_id, site_id, status, inspection_date
- inspection_field_values by inspection_id
- inspection_signatures by inspection_id
*/

-- =====================================================
-- INSPECTION TEMPLATES
-- =====================================================
CREATE TABLE IF NOT EXISTS inspection_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  edition text,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(code, version)
);

ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inspection_templates" ON inspection_templates;
CREATE POLICY "anon_select_inspection_templates" ON inspection_templates FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inspection_templates" ON inspection_templates;
CREATE POLICY "anon_insert_inspection_templates" ON inspection_templates FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inspection_templates" ON inspection_templates;
CREATE POLICY "anon_update_inspection_templates" ON inspection_templates FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inspection_templates" ON inspection_templates;
CREATE POLICY "anon_delete_inspection_templates" ON inspection_templates FOR DELETE
  TO anon, authenticated USING (true);

-- =====================================================
-- INSPECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number text UNIQUE NOT NULL,
  template_id uuid NOT NULL REFERENCES inspection_templates(id) ON DELETE RESTRICT,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  inspection_date date,
  inspection_start_time time,
  prefill_data jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  completed_by text,
  is_edit_unlocked boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inspections" ON inspections;
CREATE POLICY "anon_select_inspections" ON inspections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inspections" ON inspections;
CREATE POLICY "anon_insert_inspections" ON inspections FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inspections" ON inspections;
CREATE POLICY "anon_update_inspections" ON inspections FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inspections" ON inspections;
CREATE POLICY "anon_delete_inspections" ON inspections FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_inspections_work_order ON inspections(work_order_id);
CREATE INDEX IF NOT EXISTS idx_inspections_company ON inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_site ON inspections(site_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_technician ON inspections(technician_id);

-- =====================================================
-- INSPECTION FIELD VALUES
-- =====================================================
CREATE TABLE IF NOT EXISTS inspection_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  field_id text NOT NULL,
  page_index integer NOT NULL DEFAULT 0,
  value jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(inspection_id, field_id)
);

ALTER TABLE inspection_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inspection_field_values" ON inspection_field_values;
CREATE POLICY "anon_select_inspection_field_values" ON inspection_field_values FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inspection_field_values" ON inspection_field_values;
CREATE POLICY "anon_insert_inspection_field_values" ON inspection_field_values FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inspection_field_values" ON inspection_field_values;
CREATE POLICY "anon_update_inspection_field_values" ON inspection_field_values FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inspection_field_values" ON inspection_field_values;
CREATE POLICY "anon_delete_inspection_field_values" ON inspection_field_values FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_inspection_field_values_inspection ON inspection_field_values(inspection_id);

-- =====================================================
-- INSPECTION SIGNATURES
-- =====================================================
CREATE TABLE IF NOT EXISTS inspection_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  signer_role text NOT NULL,
  signer_name text NOT NULL DEFAULT '',
  signature_data text NOT NULL DEFAULT '',
  signed_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inspection_signatures" ON inspection_signatures;
CREATE POLICY "anon_select_inspection_signatures" ON inspection_signatures FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inspection_signatures" ON inspection_signatures;
CREATE POLICY "anon_insert_inspection_signatures" ON inspection_signatures FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inspection_signatures" ON inspection_signatures;
CREATE POLICY "anon_update_inspection_signatures" ON inspection_signatures FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inspection_signatures" ON inspection_signatures;
CREATE POLICY "anon_delete_inspection_signatures" ON inspection_signatures FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_inspection_signatures_inspection ON inspection_signatures(inspection_id);
