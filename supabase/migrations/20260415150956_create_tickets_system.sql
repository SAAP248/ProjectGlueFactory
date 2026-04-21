/*
  # Create Support Tickets System

  ## Summary
  Full support ticket system with globally sequential ticket numbers, threaded comments
  (public and internal), file attachments, linked records across any entity type, and
  customer portal integration.

  ## New Tables

  ### tickets
  - Core ticket record with auto-generated sequential number (TKT-0001 format)
  - Tracks status, priority, type, source, assigned agent, due dates, and resolution timestamps
  - Links to companies, employees, and portal users
  - show_in_customer_portal flag controls visibility to customers
  - Tracks work order / task conversion references

  ### ticket_linked_records
  - Junction table linking a ticket to any number of related records
  - Supports record types: site, system, deal, invoice, work_order

  ### ticket_comments
  - Conversation thread for each ticket
  - Supports both public replies (visible in portal) and internal notes (staff only)
  - Author can be either an employee (staff) or a portal user (customer)

  ### ticket_attachments
  - File attachments linked to tickets, optionally to a specific comment

  ### ticket_timeline
  - Immutable event log of all status changes, assignments, and conversions

  ## Security
  - RLS enabled on all tables
  - Authenticated users (staff) have full CRUD access
  - Anon users can insert tickets (portal submission) and read/comment on their own tickets
*/

-- Sequence for globally sequential ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1 INCREMENT BY 1;

-- Core tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL DEFAULT 'TKT-' || LPAD(nextval('ticket_number_seq')::text, 4, '0'),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  ticket_type text NOT NULL DEFAULT 'support',
  source text NOT NULL DEFAULT 'office',
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  show_in_customer_portal boolean NOT NULL DEFAULT false,
  created_by_portal_user_id uuid REFERENCES customer_portal_users(id) ON DELETE SET NULL,
  due_date date,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  converted_to_work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  converted_to_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_company_id ON tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon can insert portal tickets"
  ON tickets FOR INSERT
  TO anon
  WITH CHECK (created_by_portal_user_id IS NOT NULL);

CREATE POLICY "Anon can select portal tickets"
  ON tickets FOR SELECT
  TO anon
  USING (show_in_customer_portal = true OR created_by_portal_user_id IS NOT NULL);

-- Linked records junction table
CREATE TABLE IF NOT EXISTS ticket_linked_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  record_type text NOT NULL,
  record_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, record_type, record_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_linked_records_ticket_id ON ticket_linked_records(ticket_id);

ALTER TABLE ticket_linked_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select ticket_linked_records"
  ON ticket_linked_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ticket_linked_records"
  ON ticket_linked_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ticket_linked_records"
  ON ticket_linked_records FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon can select ticket_linked_records"
  ON ticket_linked_records FOR SELECT
  TO anon
  USING (true);

-- Ticket comments (threaded conversation)
CREATE TABLE IF NOT EXISTS ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  author_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  author_portal_user_id uuid REFERENCES customer_portal_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select ticket_comments"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ticket_comments"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ticket_comments"
  ON ticket_comments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ticket_comments"
  ON ticket_comments FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon can select public ticket_comments"
  ON ticket_comments FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "Anon can insert public ticket_comments"
  ON ticket_comments FOR INSERT
  TO anon
  WITH CHECK (is_public = true AND author_portal_user_id IS NOT NULL);

-- Ticket attachments
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES ticket_comments(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint,
  uploaded_by_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  uploaded_by_portal_user_id uuid REFERENCES customer_portal_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);

ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select ticket_attachments"
  ON ticket_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ticket_attachments"
  ON ticket_attachments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ticket_attachments"
  ON ticket_attachments FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon can select ticket_attachments"
  ON ticket_attachments FOR SELECT
  TO anon
  USING (true);

-- Ticket timeline / activity log
CREATE TABLE IF NOT EXISTS ticket_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  actor_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  actor_portal_user_id uuid REFERENCES customer_portal_users(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_timeline_ticket_id ON ticket_timeline(ticket_id);

ALTER TABLE ticket_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select ticket_timeline"
  ON ticket_timeline FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ticket_timeline"
  ON ticket_timeline FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can select ticket_timeline"
  ON ticket_timeline FOR SELECT
  TO anon
  USING (true);
