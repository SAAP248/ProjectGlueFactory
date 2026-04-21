/*
  # Create Lead Sources and Leads Tables

  ## Summary
  Creates the lead management system for tracking sales leads separate from the
  customer/company database. Leads remain in their own table until explicitly
  converted to a deal, preventing pollution of the customer database.

  ## New Tables

  ### lead_sources
  - `id` (uuid, pk) - unique identifier
  - `name` (text, unique) - display name of the lead source (e.g. "Partner Referral", "Website Form")
  - `is_active` (boolean) - soft-disable without deleting
  - `created_at` (timestamptz)

  ### leads
  - `id` (uuid, pk)
  - `contact_name` (text) - prospect's full name
  - `contact_phone` (text, nullable)
  - `contact_email` (text, nullable)
  - `address` (text, nullable)
  - `city` (text, nullable)
  - `state` (text, nullable)
  - `zip` (text, nullable)
  - `lead_source_id` (uuid, FK → lead_sources)
  - `notes` (text, nullable)
  - `status` (text) - new / contacted / scheduled / converted / lost
  - `assigned_employee_id` (uuid, FK → employees, nullable)
  - `converted_deal_id` (uuid, FK → deals, nullable) - set when lead is converted
  - `created_at`, `updated_at`

  ### appointments.lead_id (new column)
  - Links appointments back to the lead record for sales call appointments

  ## Security
  - RLS enabled on both tables
  - Anon select/insert/update allowed (consistent with existing pattern in this project)

  ## Notes
  - lead_sources is seeded with 8 common default values
  - leads are never deleted, just marked converted or lost
*/

CREATE TABLE IF NOT EXISTS lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select lead_sources"
  ON lead_sources FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert lead_sources"
  ON lead_sources FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update lead_sources"
  ON lead_sources FOR UPDATE TO anon USING (true) WITH CHECK (true);

INSERT INTO lead_sources (name) VALUES
  ('Partner Referral'),
  ('Customer Referral'),
  ('Inbound Call'),
  ('Website Form'),
  ('Door Knock / Cold Call'),
  ('Marketing Mailer'),
  ('Social Media'),
  ('Walk-In')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  contact_phone text,
  contact_email text,
  address text,
  city text,
  state text,
  zip text,
  lead_source_id uuid REFERENCES lead_sources(id) ON DELETE SET NULL,
  notes text,
  status text NOT NULL DEFAULT 'new',
  assigned_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  converted_deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select leads"
  ON leads FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert leads"
  ON leads FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update leads"
  ON leads FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS lead_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  action text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select lead_activity_log"
  ON lead_activity_log FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert lead_activity_log"
  ON lead_activity_log FOR INSERT TO anon WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;
  END IF;
END $$;
