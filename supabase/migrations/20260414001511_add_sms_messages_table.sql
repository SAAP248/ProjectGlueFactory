/*
  # Add SMS Messages Table

  ## Summary
  Adds a dedicated `sms_messages` table for logging text message conversations
  with customers.

  ## New Table: `sms_messages`
  - Tracks inbound and outbound SMS messages per customer
  - Optionally linked to a specific contact at the company
  - Fields: direction, message body, phone number, sent datetime,
    read status, source (Manual, RingCentral, etc.), and logged_by employee
  - Ordered newest-first for conversation-style display

  ## Security
  - RLS enabled
  - All authenticated and anon users can view and manage (matches existing pattern)

  ## Indexes
  - Index on company_id for fast per-customer lookups
  - Index on sent_at for chronological ordering
*/

CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'inbound',
  body text NOT NULL DEFAULT '',
  phone_number text DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean DEFAULT false,
  source text DEFAULT 'manual',
  logged_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all sms messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert sms messages"
  ON sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update sms messages"
  ON sms_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Employees can delete sms messages"
  ON sms_messages FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon can view sms messages"
  ON sms_messages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert sms messages"
  ON sms_messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sms_messages_company_id ON sms_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at ON sms_messages(sent_at DESC);
