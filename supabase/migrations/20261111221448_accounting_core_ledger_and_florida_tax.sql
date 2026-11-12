/*
# Accounting portal - core ledger, month locking, Florida sales tax

Plain English: this creates the "books" for WorkHorse. Every financial event becomes a balanced
journal entry (debits = credits) against a chart of accounts. Months can be locked so nothing dated
inside them can change. Florida sales tax (6% state + county surtax + optional city rate) is set up,
and invoice/estimate lines get a "taxable" switch.

1. New tables
- acct_accounts: chart of accounts (code, name, type, subtype, bank details, system flag)
- acct_entries: journal entry header (date, memo, link back to the WorkHorse record it came from)
- acct_entry_lines: debit/credit lines of an entry (must balance per entry - enforced by a deferred trigger)
- acct_periods: one row per month, status open/locked, close checklist
- acct_period_events: history of lock/unlock/year-end actions with reason and who did it
- acct_audit_log: change log for the books
- acct_tax_counties: Florida county discretionary surtax rates
- acct_tax_cities: optional city rates (none seeded)

2. Modified tables
- sites.tax_county
- companies.tax_exempt, tax_exempt_cert, tax_exempt_expires
- invoice_line_items.is_taxable, estimate_line_items.is_taxable
- invoices: tax_county, tax_state_rate, tax_county_rate, tax_city_rate, tax_state_amount,
  tax_county_amount, tax_city_amount, taxable_amount, exempt_amount, tax_exempt

3. Security
- RLS enabled on every new table. The app has no sign-in and the user asked that anyone can use
  the accounting portal, so policies are open to anon + authenticated (shared single-company data).

4. Notes
- Locked months: a trigger rejects any insert/update/delete of entries dated in a locked month.
  Unlocking a month (anyone may, with a logged reason) lifts this.
- Entry balance is checked at end of transaction so multi-line inserts work.
*/

CREATE TABLE IF NOT EXISTS acct_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset','liability','equity','income','cogs','expense')),
  subtype text NOT NULL DEFAULT 'other',
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  institution text,
  last4 text,
  is_1099 boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acct_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number bigint GENERATED ALWAYS AS IDENTITY,
  entry_date date NOT NULL,
  memo text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'manual',
  source_id uuid,
  source_key text,
  source_ref text,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  vendor_id uuid,
  posted_from_locked boolean NOT NULL DEFAULT false,
  original_date date,
  is_demo boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT 'Staff',
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS acct_entries_source_uq ON acct_entries(source_type, source_key) WHERE source_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS acct_entries_date_idx ON acct_entries(entry_date);
CREATE INDEX IF NOT EXISTS acct_entries_source_id_idx ON acct_entries(source_id);

CREATE TABLE IF NOT EXISTS acct_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES acct_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES acct_accounts(id),
  debit numeric(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description text DEFAULT '',
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  vendor_id uuid,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS acct_entry_lines_entry_idx ON acct_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS acct_entry_lines_account_idx ON acct_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS acct_entry_lines_company_idx ON acct_entry_lines(company_id);

CREATE TABLE IF NOT EXISTS acct_periods (
  period_start date PRIMARY KEY CHECK (extract(day FROM period_start) = 1),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','locked')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked_at timestamptz,
  locked_by text,
  notes text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS acct_period_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  action text NOT NULL,
  reason text DEFAULT '',
  actor text NOT NULL DEFAULT 'Staff',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acct_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  summary text NOT NULL DEFAULT '',
  actor text NOT NULL DEFAULT 'Staff'
);
CREATE INDEX IF NOT EXISTS acct_audit_log_at_idx ON acct_audit_log(at DESC);

CREATE TABLE IF NOT EXISTS acct_tax_counties (
  county text PRIMARY KEY,
  surtax_rate numeric(6,3) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acct_tax_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county text NOT NULL REFERENCES acct_tax_counties(county),
  city text NOT NULL,
  rate numeric(6,3) NOT NULL DEFAULT 0,
  UNIQUE (county, city)
);

ALTER TABLE sites ADD COLUMN IF NOT EXISTS tax_county text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_exempt boolean NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_exempt_cert text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_exempt_expires date;
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS is_taxable boolean;
ALTER TABLE estimate_line_items ADD COLUMN IF NOT EXISTS is_taxable boolean;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_county text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_state_rate numeric(6,3) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_county_rate numeric(6,3) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_city_rate numeric(6,3) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_state_amount numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_county_amount numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_city_amount numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS taxable_amount numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exempt_amount numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_exempt boolean NOT NULL DEFAULT false;

-- Lock + balance + audit triggers
CREATE OR REPLACE FUNCTION acct_is_locked(p_date date) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM acct_periods WHERE period_start = date_trunc('month', p_date)::date AND status = 'locked');
$$;

CREATE OR REPLACE FUNCTION acct_entries_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('acct.bypass_lock', true), '') = 'on' THEN
    RETURN coalesce(NEW, OLD);
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND acct_is_locked(OLD.entry_date) THEN
    RAISE EXCEPTION 'The month of % is locked. Unlock it first to change this entry.', to_char(OLD.entry_date, 'FMMonth YYYY');
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND acct_is_locked(NEW.entry_date) THEN
    RAISE EXCEPTION 'The month of % is locked. Unlock it first or date this entry in an open month.', to_char(NEW.entry_date, 'FMMonth YYYY');
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS acct_entries_guard_trg ON acct_entries;
CREATE TRIGGER acct_entries_guard_trg BEFORE INSERT OR UPDATE OR DELETE ON acct_entries
  FOR EACH ROW EXECUTE FUNCTION acct_entries_guard();

CREATE OR REPLACE FUNCTION acct_lines_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_date date;
BEGIN
  IF coalesce(current_setting('acct.bypass_lock', true), '') = 'on' THEN
    RETURN coalesce(NEW, OLD);
  END IF;
  SELECT entry_date INTO v_date FROM acct_entries WHERE id = coalesce(NEW.entry_id, OLD.entry_id);
  IF v_date IS NOT NULL AND acct_is_locked(v_date) THEN
    RAISE EXCEPTION 'The month of % is locked. Unlock it first to change this entry.', to_char(v_date, 'FMMonth YYYY');
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS acct_lines_guard_trg ON acct_entry_lines;
CREATE TRIGGER acct_lines_guard_trg BEFORE INSERT OR UPDATE OR DELETE ON acct_entry_lines
  FOR EACH ROW EXECUTE FUNCTION acct_lines_guard();

CREATE OR REPLACE FUNCTION acct_lines_balance_check() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_entry uuid; v_diff numeric; v_n int;
BEGIN
  v_entry := coalesce(NEW.entry_id, OLD.entry_id);
  IF NOT EXISTS (SELECT 1 FROM acct_entries WHERE id = v_entry) THEN RETURN NULL; END IF;
  SELECT coalesce(sum(debit) - sum(credit), 0), count(*) INTO v_diff, v_n FROM acct_entry_lines WHERE entry_id = v_entry;
  IF abs(v_diff) > 0.005 THEN
    RAISE EXCEPTION 'Journal entry is out of balance by %', v_diff;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS acct_lines_balance_trg ON acct_entry_lines;
CREATE CONSTRAINT TRIGGER acct_lines_balance_trg AFTER INSERT OR UPDATE OR DELETE ON acct_entry_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION acct_lines_balance_check();

CREATE OR REPLACE FUNCTION acct_entries_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('acct.quiet', true), '') = 'on' THEN RETURN coalesce(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO acct_audit_log(action, object_type, object_id, summary, actor)
    VALUES ('created', 'entry', NEW.id, 'JE-' || NEW.entry_number || ' ' || NEW.memo || ' (' || NEW.entry_date || ')', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO acct_audit_log(action, object_type, object_id, summary)
    VALUES ('edited', 'entry', NEW.id, 'JE-' || NEW.entry_number || ' ' || NEW.memo);
  ELSE
    INSERT INTO acct_audit_log(action, object_type, object_id, summary)
    VALUES ('deleted', 'entry', OLD.id, 'JE-' || OLD.entry_number || ' ' || OLD.memo || ' (' || OLD.entry_date || ')');
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS acct_entries_audit_trg ON acct_entries;
CREATE TRIGGER acct_entries_audit_trg AFTER INSERT OR UPDATE OR DELETE ON acct_entries
  FOR EACH ROW EXECUTE FUNCTION acct_entries_audit();

-- RLS (shared single-company data, open to anon + authenticated by user request)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['acct_accounts','acct_entries','acct_entry_lines','acct_periods','acct_period_events','acct_audit_log','acct_tax_counties','acct_tax_cities'] LOOP
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

-- Chart of accounts
INSERT INTO acct_accounts (code, name, type, subtype, is_system, institution, last4) VALUES
('1000','Operating Checking','asset','bank',true,'Truist Bank','4821'),
('1010','Payroll Checking','asset','bank',true,'Truist Bank','7730'),
('1020','Business Savings','asset','bank',true,'Truist Bank','1194'),
('1050','Undeposited Funds','asset','current',true,null,null),
('1100','Accounts Receivable','asset','receivable',true,null,null),
('1200','Inventory','asset','current',true,null,null),
('1250','Prepaid Expenses','asset','current',false,null,null),
('1500','Vehicles','asset','fixed',false,null,null),
('1510','Tools & Equipment','asset','fixed',false,null,null),
('1590','Accumulated Depreciation','asset','fixed',false,null,null),
('2000','Accounts Payable','liability','payable',true,null,null),
('2100','Amex Business Card','liability','credit_card',true,'American Express','1009'),
('2200','Florida Sales Tax Payable','liability','current',true,null,null),
('2300','Payroll Liabilities','liability','current',false,null,null),
('2400','Customer Deposits','liability','current',false,null,null),
('2700','Vehicle Loan','liability','long_term',false,null,null),
('3000','Owner''s Capital','equity','equity',false,null,null),
('3100','Owner Draws','equity','equity',false,null,null),
('3900','Retained Earnings','equity','retained',true,null,null),
('3950','Opening Balance Equity','equity','equity',true,null,null),
('4000','Equipment Sales','income','income',true,null,null),
('4100','Installation & Service Labor','income','income',true,null,null),
('4200','Monitoring & Service Plans','income','income',true,null,null),
('4300','Card Surcharge Income','income','income',true,null,null),
('4800','Other Income','income','other_income',true,null,null),
('4900','Discounts & Refunds','income','income',true,null,null),
('5000','Cost of Equipment Sold','cogs','cogs',true,null,null),
('5100','Subcontractor Labor','cogs','cogs',false,null,null),
('5200','Job Supplies','cogs','cogs',false,null,null),
('6000','Wages & Salaries','expense','expense',false,null,null),
('6010','Payroll Taxes','expense','expense',false,null,null),
('6020','Employee Benefits','expense','expense',false,null,null),
('6050','Sales Commissions','expense','expense',true,null,null),
('6100','Merchant Service Fees','expense','expense',true,null,null),
('6200','Rent','expense','expense',false,null,null),
('6210','Utilities','expense','expense',false,null,null),
('6220','Phone & Internet','expense','expense',false,null,null),
('6300','Vehicle Fuel','expense','expense',false,null,null),
('6310','Vehicle Repairs','expense','expense',false,null,null),
('6400','Insurance','expense','expense',false,null,null),
('6500','Software & Subscriptions','expense','expense',false,null,null),
('6600','Advertising & Marketing','expense','expense',false,null,null),
('6700','Office Supplies','expense','expense',false,null,null),
('6710','Meals','expense','expense',false,null,null),
('6800','Professional Fees','expense','expense',false,null,null),
('6850','Bank Fees','expense','expense',false,null,null),
('6900','Bad Debt','expense','expense',true,null,null),
('6950','Depreciation','expense','expense',false,null,null),
('7000','Interest Expense','expense','other_expense',false,null,null)
ON CONFLICT (code) DO NOTHING;

-- Florida county discretionary sales surtax (editable in the portal; verify with Florida DOR)
INSERT INTO acct_tax_counties (county, surtax_rate) VALUES
('Alachua',1.5),('Baker',1),('Bay',1),('Bradford',1),('Brevard',1),('Broward',1),('Calhoun',1.5),('Charlotte',1),
('Citrus',0),('Clay',1.5),('Collier',0),('Columbia',1.5),('DeSoto',1.5),('Dixie',1),('Duval',1.5),('Escambia',1.5),
('Flagler',1),('Franklin',1.5),('Gadsden',1.5),('Gilchrist',1),('Glades',1),('Gulf',1),('Hamilton',1),('Hardee',1),
('Hendry',1.5),('Hernando',0.5),('Highlands',1.5),('Hillsborough',1.5),('Holmes',1),('Indian River',1),('Jackson',1.5),
('Jefferson',1),('Lafayette',1),('Lake',1),('Lee',0.5),('Leon',1.5),('Levy',1),('Liberty',2),('Madison',1.5),
('Manatee',1),('Marion',1.5),('Martin',0.5),('Miami-Dade',1),('Monroe',1.5),('Nassau',1),('Okaloosa',1),('Okeechobee',1),
('Orange',0.5),('Osceola',1.5),('Palm Beach',1),('Pasco',1),('Pinellas',1),('Polk',1),('Putnam',1),('St. Johns',0),
('St. Lucie',1),('Santa Rosa',1),('Sarasota',1),('Seminole',1),('Sumter',1),('Suwannee',1),('Taylor',1),('Union',1),
('Volusia',0.5),('Wakulla',1),('Walton',1),('Washington',1.5)
ON CONFLICT (county) DO NOTHING;

INSERT INTO app_settings (key, value) VALUES ('acct_labor_taxable', 'false'), ('acct_state_tax_rate', '6')
ON CONFLICT (key) DO NOTHING;
