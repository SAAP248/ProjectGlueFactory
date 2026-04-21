/*
  # Add Critical Notes, Call Logs, and Customer Emails

  ## Summary
  Enhances the customer profile with three major additions:

  1. **Critical Notes on Companies**
     - Adds `critical_notes` column to the `companies` table
     - Used for gate codes, alarm codes, access instructions, and other must-see information
     - Always displayed prominently in the customer profile header

  2. **New Table: `call_logs`**
     - Tracks inbound and outbound phone calls for each customer
     - Supports logging calls from RingCentral, manual entry, or other phone sources
     - Fields: direction (inbound/outbound), contact linked (optional), date/time,
       duration in minutes, source system (e.g., RingCentral, Manual), and notes
     - Linked to companies and optionally to a specific contact

  3. **New Table: `customer_emails`**
     - Stores email correspondence between staff and customer contacts
     - Supports inbound and outbound direction
     - Fields: subject, body preview, direction, linked contact (optional),
       sent date, read status, from/to address
     - Emails from any contact at the company all appear in the same email log

  ## Security
  - RLS enabled on both new tables
  - All authenticated employees can view and manage records
*/

-- Add critical_notes column to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'critical_notes'
  ) THEN
    ALTER TABLE companies ADD COLUMN critical_notes text DEFAULT '';
  END IF;
END $$;

-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'inbound',
  call_date timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer DEFAULT 0,
  source text DEFAULT 'manual',
  caller_number text DEFAULT '',
  notes text DEFAULT '',
  logged_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all call logs"
  ON call_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert call logs"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update call logs"
  ON call_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete call logs"
  ON call_logs FOR DELETE
  TO authenticated
  USING (true);

-- Also allow anon access to match existing table policies
CREATE POLICY "Anon can view call logs"
  ON call_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can manage call logs"
  ON call_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create customer_emails table
CREATE TABLE IF NOT EXISTS customer_emails (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'inbound',
  subject text NOT NULL DEFAULT '',
  body text DEFAULT '',
  from_address text DEFAULT '',
  to_address text DEFAULT '',
  email_date timestamptz NOT NULL DEFAULT now(),
  is_read boolean DEFAULT false,
  logged_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all customer emails"
  ON customer_emails FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert customer emails"
  ON customer_emails FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update customer emails"
  ON customer_emails FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete customer emails"
  ON customer_emails FOR DELETE
  TO authenticated
  USING (true);

-- Anon access to match existing pattern
CREATE POLICY "Anon can view customer emails"
  ON customer_emails FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can manage customer emails"
  ON customer_emails FOR INSERT
  TO anon
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_company_id ON call_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_date ON call_logs(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_emails_company_id ON customer_emails(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_emails_email_date ON customer_emails(email_date DESC);
