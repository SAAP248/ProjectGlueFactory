/*
# Consolidated invoices

Lets several regular invoices for one customer be grouped into a single bill
("consolidated invoice") that is sent to the customer. Each invoice inside the
group keeps its own status/balance so they can be paid or closed individually.

1. New Tables
- `consolidated_invoices`
  - `id` (uuid, primary key)
  - `consolidated_number` (text, unique, e.g. CI-1001)
  - `company_id` (uuid, billing customer)
  - `invoice_date`, `due_date` (date)
  - `status` (text: draft, sent, partial, overdue, paid, void) - kept in sync from child invoices by the app
  - `notes` (text)
  - `created_at`, `updated_at`

2. Modified Tables
- `invoices`: new nullable `consolidated_invoice_id` linking an invoice to its container.
  Removing a consolidated invoice simply un-links its invoices (ON DELETE SET NULL).

3. Security
- RLS enabled on `consolidated_invoices`; anon + authenticated CRUD, matching the
  rest of this single-tenant demo app.

4. Demo data
- Adds sub-customer "Acme Corporation - North Warehouse" under Acme.
- Seeds CI-1001..CI-1006 with 3-5 monthly subscription invoices each (SUB-2001+),
  covering open, partially paid, overdue and fully paid examples. Seeding only
  runs if CI-1001 does not exist yet.
*/

CREATE TABLE IF NOT EXISTS consolidated_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidated_number text UNIQUE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  invoice_date date DEFAULT current_date,
  due_date date,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consolidated_invoices_company ON consolidated_invoices(company_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoices' AND column_name='consolidated_invoice_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN consolidated_invoice_id uuid REFERENCES consolidated_invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_consolidated ON invoices(consolidated_invoice_id);

ALTER TABLE consolidated_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_consolidated_invoices" ON consolidated_invoices;
CREATE POLICY "anon_select_consolidated_invoices" ON consolidated_invoices FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_consolidated_invoices" ON consolidated_invoices;
CREATE POLICY "anon_insert_consolidated_invoices" ON consolidated_invoices FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_consolidated_invoices" ON consolidated_invoices;
CREATE POLICY "anon_update_consolidated_invoices" ON consolidated_invoices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_consolidated_invoices" ON consolidated_invoices;
CREATE POLICY "anon_delete_consolidated_invoices" ON consolidated_invoices FOR DELETE
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION pg_temp.ci_child(
  p_ci uuid, p_company uuid, p_num text, p_desc text, p_amount numeric,
  p_date date, p_due date, p_status text
) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE
  v_id uuid;
  v_paid numeric := CASE WHEN p_status = 'paid' THEN p_amount ELSE 0 END;
BEGIN
  INSERT INTO invoices (invoice_number, company_id, status, invoice_date, due_date,
    subtotal, tax, total, amount_paid, balance_due, notes, terms, discount, discount_type,
    payment_token, consolidated_invoice_id)
  VALUES (p_num, p_company, p_status, p_date, p_due,
    p_amount, 0, p_amount, v_paid, p_amount - v_paid, p_desc, 'Net 30', 0, 'flat',
    md5(random()::text || p_num), p_ci)
  RETURNING id INTO v_id;

  INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order)
  VALUES (v_id, p_desc, 1, p_amount, p_amount, 0);
END $f$;

DO $$
DECLARE
  acme uuid := '3773c9c5-5fb1-4c4c-8cb7-942b3223db26';
  tech uuid := 'da674d5a-a5a2-4ee3-bee2-b363512bb134';
  mall uuid := '7851e39e-4e37-4d65-ac1c-be09fb1a4c4b';
  smith uuid := '4e03b73c-77a4-4c05-803d-4048b62d8d38';
  johnson uuid := '725e05fc-7c80-4ef7-8903-ebc1424b69b2';
  harris uuid := '02c74de8-dbf7-4009-b636-7a58c9c2055f';
  acme_sub uuid;
  ci uuid;
  d date := date_trunc('month', current_date)::date;
BEGIN
  IF EXISTS (SELECT 1 FROM consolidated_invoices WHERE consolidated_number = 'CI-1001') THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id IN (acme, tech, mall, smith, johnson, harris) HAVING count(*) = 6) THEN
    RETURN;
  END IF;

  SELECT id INTO acme_sub FROM companies WHERE name = 'Acme Corporation - North Warehouse' LIMIT 1;
  IF acme_sub IS NULL THEN
    INSERT INTO companies (name, customer_type, parent_company_id, bill_with_parent)
    SELECT 'Acme Corporation - North Warehouse', customer_type, acme, true FROM companies WHERE id = acme
    RETURNING id INTO acme_sub;
  END IF;

  -- CI-1001 Acme: parent + sub-customer, partially paid
  INSERT INTO consolidated_invoices (consolidated_number, company_id, invoice_date, due_date, status, notes)
  VALUES ('CI-1001', acme, d, d + 30, 'partial', 'Monthly services - HQ and North Warehouse') RETURNING id INTO ci;
  PERFORM pg_temp.ci_child(ci, acme, 'SUB-2001', 'Alarm Monitoring - HQ (monthly)', 89.00, d, d + 30, 'paid');
  PERFORM pg_temp.ci_child(ci, acme, 'SUB-2002', 'Video Surveillance Cloud Plan - HQ', 149.00, d, d + 30, 'paid');
  PERFORM pg_temp.ci_child(ci, acme, 'SUB-2003', 'Access Control Service - HQ', 65.00, d, d + 30, 'sent');
  PERFORM pg_temp.ci_child(ci, acme_sub, 'SUB-2004', 'Alarm Monitoring - North Warehouse', 79.00, d, d + 30, 'sent');
  PERFORM pg_temp.ci_child(ci, acme_sub, 'SUB-2005', 'Fire Monitoring - North Warehouse', 45.00, d, d + 30, 'sent');

  -- CI-1002 Tech Solutions: fully open
  INSERT INTO consolidated_invoices (consolidated_number, company_id, invoice_date, due_date, status, notes)
  VALUES ('CI-1002', tech, d, d + 30, 'sent', 'Monthly subscriptions') RETURNING id INTO ci;
  PERFORM pg_temp.ci_child(ci, tech, 'SUB-2006', 'Alarm Monitoring (monthly)', 69.00, d, d + 30, 'sent');
  PERFORM pg_temp.ci_child(ci, tech, 'SUB-2007', 'Cellular Backup Communicator', 25.00, d, d + 30, 'sent');
  PERFORM pg_temp.ci_child(ci, tech, 'SUB-2008', 'Video Surveillance Cloud Plan', 120.00, d, d + 30, 'sent');
  PERFORM pg_temp.ci_child(ci, tech, 'SUB-2009', 'Service Plan - Gold', 55.00, d, d + 30, 'sent');

  -- CI-1003 Downtown Mall: overdue
  INSERT INTO consolidated_invoices (consolidated_number, company_id, invoice_date, due_date, status, notes)
  VALUES ('CI-1003', mall, (d - interval '2 months')::date, (d - interval '1 month')::date, 'overdue', 'Mall-wide monitoring bundle') RETURNING id INTO ci;
  PERFORM pg_temp.ci_child(ci, mall, 'SUB-2010', 'Alarm Monitoring - Building A', 99.00, (d - interval '2 months')::date, (d - interval '1 month')::date, 'overdue');
  PERFORM pg_temp.ci_child(ci, mall, 'SUB-2011', 'Alarm Monitoring - Building B', 99.00, (d - interval '2 months')::date, (d - interval '1 month')::date, 'overdue');
  PERFORM pg_temp.ci_child(ci, mall, 'SUB-2012', 'Video Surveillance - Parking Deck', 210.00, (d - interval '2 months')::date, (d - interval '1 month')::date, 'overdue');

  -- CI-1004 Smith Residence: fully paid
  INSERT INTO consolidated_invoices (consolidated_number, company_id, invoice_date, due_date, status, notes)
  VALUES ('CI-1004', smith, (d - interval '1 month')::date, d, 'paid', 'Home services bundle') RETURNING id INTO ci;
  PERFORM pg_temp.ci_child(ci, smith, 'SUB-2013', 'Home Alarm Monitoring', 39.99, (d - interval '1 month')::date, d, 'paid');
  PERFORM pg_temp.ci_child(ci, smith, 'SUB-2014', 'Doorbell Camera Cloud Plan', 9.99, (d - interval '1 month')::date, d, 'paid');
  PERFORM pg_temp.ci_child(ci, smith, 'SUB-2015', 'Smart Home Automation', 14.99, (d - interval '1 month')::date, d, 'paid');

  -- CI-1005 Johnson Family: partially paid
  INSERT INTO consolidated_invoices (consolidated_number, company_id, invoice_date, due_date, status, notes)
  VALUES ('CI-1005', johnson, d, d + 30, 'partial', 'Home + rental property services') RETURNING id INTO ci;
  PERFORM pg_temp.ci_child(ci, johnson, 'SUB-2016', 'Home Alarm Monitoring - Main', 42.00, d, d + 30, 'paid');
  PERFORM pg_temp.ci_child(ci, johnson, 'SUB-2017', 'Home Alarm Monitoring - Rental', 42.00, d, d + 30, 'sent');
  PERFORM pg_temp.ci_child(ci, johnson, 'SUB-2018', 'Video Doorbell Plan - Main', 12.00, d, d + 30, 'sent');
  PERFORM pg_temp.ci_child(ci, johnson, 'SUB-2019', 'Video Doorbell Plan - Rental', 12.00, d, d + 30, 'sent');

  -- CI-1006 Matthew Harris: open
  INSERT INTO consolidated_invoices (consolidated_number, company_id, invoice_date, due_date, status, notes)
  VALUES ('CI-1006', harris, d, d + 30, 'sent', 'Monthly subscriptions') RETURNING id INTO ci;
  PERFORM pg_temp.ci_child(ci, harris, 'SUB-2020', 'Alarm Monitoring', 45.00, d, d + 30, 'sent');
  PERFORM pg_temp.ci_child(ci, harris, 'SUB-2021', 'Environmental Sensors Plan', 18.00, d, d + 30, 'sent');
  PERFORM pg_temp.ci_child(ci, harris, 'SUB-2022', 'Service Plan - Silver', 30.00, d, d + 30, 'sent');
END $$;
