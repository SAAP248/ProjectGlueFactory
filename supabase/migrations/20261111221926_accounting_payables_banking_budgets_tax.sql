/*
# Accounting portal - payables, banking, budgets, sales tax filings, repeating entries

Plain English: adds the tables behind the Bills, Banking, Budgets, Sales Tax and Repeating Entries
screens of the accounting portal.

1. New tables
- acct_vendors: who you pay (distributors, subcontractors, landlord, utilities...). Holds 1099 info:
  tax ID, entity type and whether the vendor gets a 1099. Can link to a WorkHorse distributor.
- acct_bills / acct_bill_lines: bills (and vendor credits, kind = 'credit') split across expense accounts,
  optionally tied to a WorkHorse customer (job) or purchase order.
- acct_bill_payments: payments made on bills (check, ACH, card, or applying a vendor credit).
- acct_bank_txns: the simulated bank / credit card feed. Positive = money in, negative = money out.
  status: pending, matched (to an existing entry), added (new entry created), excluded.
- acct_bank_rules: "if the description contains X, file it under account Y".
- acct_deposit_items: which payments were included in which bank deposit.
- acct_reconciliations / acct_recon_items: monthly statement matching and the lines that were cleared.
- acct_budgets: monthly budget amount per account per year.
- acct_tax_filings: Florida sales tax returns filed (amounts, collection allowance, payment).
- acct_recurring: repeating journal entries (rent, depreciation, loan payments...).

2. Security
- RLS on every table; open to anon + authenticated (single company, no sign-in, by user request).
*/

CREATE TABLE IF NOT EXISTS acct_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vendor_type text NOT NULL DEFAULT 'other',
  distributor_id uuid REFERENCES distributors(id) ON DELETE SET NULL,
  contact_name text, email text, phone text, address text, city text, state text, zip text,
  payment_terms text NOT NULL DEFAULT 'Net 30',
  default_account_id uuid REFERENCES acct_accounts(id) ON DELETE SET NULL,
  tax_id text,
  entity_type text NOT NULL DEFAULT 'llc',
  is_1099 boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS acct_vendors_distributor_uq ON acct_vendors(distributor_id) WHERE distributor_id IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'acct_entries_vendor_fk') THEN
    ALTER TABLE acct_entries ADD CONSTRAINT acct_entries_vendor_fk FOREIGN KEY (vendor_id) REFERENCES acct_vendors(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'acct_entry_lines_vendor_fk') THEN
    ALTER TABLE acct_entry_lines ADD CONSTRAINT acct_entry_lines_vendor_fk FOREIGN KEY (vendor_id) REFERENCES acct_vendors(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS acct_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES acct_vendors(id),
  kind text NOT NULL DEFAULT 'bill' CHECK (kind IN ('bill','credit')),
  bill_number text,
  bill_date date NOT NULL,
  due_date date NOT NULL,
  memo text DEFAULT '',
  total numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partial','paid','void')),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS acct_bills_vendor_idx ON acct_bills(vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS acct_bills_po_uq ON acct_bills(purchase_order_id) WHERE purchase_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS acct_bill_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES acct_bills(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES acct_accounts(id),
  description text DEFAULT '',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS acct_bill_lines_bill_idx ON acct_bill_lines(bill_id);

CREATE TABLE IF NOT EXISTS acct_bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES acct_bills(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES acct_vendors(id),
  pay_date date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'check' CHECK (method IN ('check','ach','card','credit')),
  check_number text,
  bank_account_id uuid REFERENCES acct_accounts(id),
  credit_bill_id uuid REFERENCES acct_bills(id) ON DELETE CASCADE,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS acct_bill_payments_bill_idx ON acct_bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS acct_bill_payments_vendor_idx ON acct_bill_payments(vendor_id, pay_date);

CREATE TABLE IF NOT EXISTS acct_bank_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES acct_accounts(id),
  txn_date date NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','matched','added','excluded')),
  matched_entry_id uuid REFERENCES acct_entries(id) ON DELETE SET NULL,
  hint_entry_ids uuid[],
  external_id text UNIQUE,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS acct_bank_txns_acct_idx ON acct_bank_txns(account_id, status, txn_date);

CREATE TABLE IF NOT EXISTS acct_bank_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_text text NOT NULL,
  account_id uuid NOT NULL REFERENCES acct_accounts(id),
  vendor_id uuid REFERENCES acct_vendors(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acct_deposit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_entry_id uuid NOT NULL REFERENCES acct_entries(id) ON DELETE CASCADE,
  payment_entry_id uuid NOT NULL UNIQUE REFERENCES acct_entries(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS acct_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES acct_accounts(id),
  statement_date date NOT NULL,
  beginning_balance numeric(14,2) NOT NULL DEFAULT 0,
  statement_balance numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  completed_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (account_id, statement_date)
);

CREATE TABLE IF NOT EXISTS acct_recon_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid NOT NULL REFERENCES acct_reconciliations(id) ON DELETE CASCADE,
  line_id uuid NOT NULL UNIQUE REFERENCES acct_entry_lines(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS acct_recon_items_recon_idx ON acct_recon_items(reconciliation_id);

CREATE TABLE IF NOT EXISTS acct_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year int NOT NULL,
  account_id uuid NOT NULL REFERENCES acct_accounts(id) ON DELETE CASCADE,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount numeric(14,2) NOT NULL DEFAULT 0,
  UNIQUE (fiscal_year, account_id, month)
);

CREATE TABLE IF NOT EXISTS acct_tax_filings (
  period_start date PRIMARY KEY,
  gross_sales numeric(14,2) NOT NULL DEFAULT 0,
  exempt_sales numeric(14,2) NOT NULL DEFAULT 0,
  taxable_sales numeric(14,2) NOT NULL DEFAULT 0,
  state_tax numeric(14,2) NOT NULL DEFAULT 0,
  county_tax numeric(14,2) NOT NULL DEFAULT 0,
  city_tax numeric(14,2) NOT NULL DEFAULT 0,
  total_tax numeric(14,2) NOT NULL DEFAULT 0,
  collection_allowance numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  filed_date date NOT NULL,
  confirmation text,
  entry_id uuid REFERENCES acct_entries(id) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acct_recurring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  memo text NOT NULL DEFAULT '',
  day_of_month int NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  next_date date NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_posted date,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['acct_vendors','acct_bills','acct_bill_lines','acct_bill_payments','acct_bank_txns','acct_bank_rules',
    'acct_deposit_items','acct_reconciliations','acct_recon_items','acct_budgets','acct_tax_filings','acct_recurring'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO anon, authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "anon_select_%s" ON %I FOR SELECT TO anon, authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "anon_insert_%s" ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "anon_update_%s" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "anon_delete_%s" ON %I FOR DELETE TO anon, authenticated USING (true)', t, t);
  END LOOP;
END $$;
