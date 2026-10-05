/*
# Service Plans module (schema)

Adds a self-contained Service Plans module. Every table is prefixed `sp_` so the module can be moved out later.
Money is stored as integer cents, durations as integer minutes, discounts as integer basis points (1000 = 10%).

1. New Tables
- `sp_settings` single row (id = 1): demo_mode, demo_date (simulated company date), grace_days, renewal_notice_days, invoice_due_days, default_cadence.
- `sp_plans` plan catalog entry: code, name, category, description, color, status, current_version_id.
- `sp_plan_versions` immutable published versions of a plan: version_number, term_months, auto_renew,
  renewal_notice_days, labor/parts discount bps, priority_service, waive_trip_fee, rollover_policy, rollover_cap,
  cancellation_policy, terms_text, published_at.
- `sp_price_options` per-version price for a cadence (monthly / quarterly / semiannual / annual), amount_cents.
- `sp_benefits` per-version benefits: name, benefit_type (visit / discount / perk), quantity_per_term,
  duration_minutes, overage_price_cents.
- `sp_addons` add-on catalog (annual_amount_cents).
- `sp_monitoring_accounts` read-only reference to the customer's monitoring (Subscriptions) RMR; plans never bill it.
- `sp_agreements` customer agreement: number, company, primary site, plan + version, cadence, status,
  dates, period amount, payment method, grace/pause/cancel fields, signature.
- `sp_agreement_sites` covered sites and optional equipment per agreement.
- `sp_agreement_addons` add-ons attached to an agreement.
- `sp_entitlement_ledger` benefit grants / reservations / releases / consumption / rollover / expiry,
  unique occurrence_key for idempotency.
- `sp_billing_occurrences` billing schedule rows, unique occurrence_key, status, attempts, linked invoice.
- `sp_events` audit trail, notices and amendments per agreement.

2. Modified Tables
- `invoices.sp_agreement_id` links a plan invoice to its agreement.
- `work_orders.sp_agreement_id` links a plan visit work order to its agreement.

3. Security
- RLS enabled on every new table. Single-tenant app with no sign-in: anon + authenticated CRUD (4 policies each).
*/

CREATE TABLE IF NOT EXISTS sp_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  demo_mode boolean NOT NULL DEFAULT true,
  demo_date date NOT NULL DEFAULT '2026-10-05',
  grace_days integer NOT NULL DEFAULT 7,
  renewal_notice_days integer NOT NULL DEFAULT 30,
  invoice_due_days integer NOT NULL DEFAULT 15,
  default_cadence text NOT NULL DEFAULT 'annual',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sp_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'blue',
  status text NOT NULL DEFAULT 'active',
  current_version_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sp_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES sp_plans(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  term_months integer NOT NULL DEFAULT 12,
  auto_renew boolean NOT NULL DEFAULT true,
  renewal_notice_days integer NOT NULL DEFAULT 30,
  labor_discount_bps integer NOT NULL DEFAULT 0,
  parts_discount_bps integer NOT NULL DEFAULT 0,
  priority_service boolean NOT NULL DEFAULT false,
  waive_trip_fee boolean NOT NULL DEFAULT false,
  rollover_policy text NOT NULL DEFAULT 'none',
  rollover_cap integer NOT NULL DEFAULT 0,
  cancellation_policy text NOT NULL DEFAULT 'no_refund',
  terms_text text NOT NULL DEFAULT '',
  change_note text NOT NULL DEFAULT '',
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (plan_id, version_number)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_plans_current_version_fkey') THEN
    ALTER TABLE sp_plans ADD CONSTRAINT sp_plans_current_version_fkey
      FOREIGN KEY (current_version_id) REFERENCES sp_plan_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sp_price_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id uuid NOT NULL REFERENCES sp_plan_versions(id) ON DELETE CASCADE,
  cadence text NOT NULL CHECK (cadence IN ('monthly','quarterly','semiannual','annual')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  is_default boolean NOT NULL DEFAULT false,
  UNIQUE (plan_version_id, cadence)
);

CREATE TABLE IF NOT EXISTS sp_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id uuid NOT NULL REFERENCES sp_plan_versions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  benefit_type text NOT NULL DEFAULT 'visit',
  quantity_per_term integer NOT NULL DEFAULT 1,
  duration_minutes integer NOT NULL DEFAULT 60,
  overage_price_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sp_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  annual_amount_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sp_monitoring_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'Central Station',
  monthly_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sp_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_number text UNIQUE NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  primary_site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  plan_id uuid NOT NULL REFERENCES sp_plans(id),
  plan_version_id uuid NOT NULL REFERENCES sp_plan_versions(id),
  cadence text NOT NULL CHECK (cadence IN ('monthly','quarterly','semiannual','annual')),
  status text NOT NULL DEFAULT 'draft',
  start_date date NOT NULL,
  end_date date NOT NULL,
  anchor_day integer NOT NULL DEFAULT 1,
  period_amount_cents integer NOT NULL DEFAULT 0,
  auto_renew boolean NOT NULL DEFAULT true,
  payment_method text NOT NULL DEFAULT 'card_on_file',
  grace_until date,
  paused_at date,
  resume_on date,
  canceled_at date,
  cancel_reason text,
  signed_by_name text,
  signed_at timestamptz,
  renewed_from_id uuid REFERENCES sp_agreements(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sp_agreement_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES sp_agreements(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  system_id uuid REFERENCES customer_systems(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sp_agreement_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES sp_agreements(id) ON DELETE CASCADE,
  addon_id uuid REFERENCES sp_addons(id) ON DELETE SET NULL,
  name text NOT NULL,
  annual_amount_cents integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sp_entitlement_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES sp_agreements(id) ON DELETE CASCADE,
  benefit_id uuid NOT NULL REFERENCES sp_benefits(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('grant','rollover','reserve','release','consume','expire','adjust')),
  quantity integer NOT NULL DEFAULT 1,
  period_start date NOT NULL,
  period_end date NOT NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  occurrence_key text UNIQUE NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sp_billing_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES sp_agreements(id) ON DELETE CASCADE,
  occurrence_key text UNIQUE NOT NULL,
  sequence integer NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  bill_date date NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','processing','paid','failed','skipped','void')),
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_on date,
  failure_reason text,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES sp_agreements(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  event_date date NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='sp_agreement_id') THEN
    ALTER TABLE invoices ADD COLUMN sp_agreement_id uuid REFERENCES sp_agreements(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='sp_agreement_id') THEN
    ALTER TABLE work_orders ADD COLUMN sp_agreement_id uuid REFERENCES sp_agreements(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sp_versions_plan ON sp_plan_versions(plan_id);
CREATE INDEX IF NOT EXISTS idx_sp_prices_version ON sp_price_options(plan_version_id);
CREATE INDEX IF NOT EXISTS idx_sp_benefits_version ON sp_benefits(plan_version_id);
CREATE INDEX IF NOT EXISTS idx_sp_agreements_company ON sp_agreements(company_id);
CREATE INDEX IF NOT EXISTS idx_sp_agreements_status ON sp_agreements(status);
CREATE INDEX IF NOT EXISTS idx_sp_agreement_sites_agreement ON sp_agreement_sites(agreement_id);
CREATE INDEX IF NOT EXISTS idx_sp_agreement_sites_site ON sp_agreement_sites(site_id);
CREATE INDEX IF NOT EXISTS idx_sp_agreement_addons_agreement ON sp_agreement_addons(agreement_id);
CREATE INDEX IF NOT EXISTS idx_sp_ledger_agreement ON sp_entitlement_ledger(agreement_id);
CREATE INDEX IF NOT EXISTS idx_sp_ledger_wo ON sp_entitlement_ledger(work_order_id);
CREATE INDEX IF NOT EXISTS idx_sp_billing_agreement ON sp_billing_occurrences(agreement_id);
CREATE INDEX IF NOT EXISTS idx_sp_billing_bill_date ON sp_billing_occurrences(bill_date);
CREATE INDEX IF NOT EXISTS idx_sp_events_agreement ON sp_events(agreement_id);
CREATE INDEX IF NOT EXISTS idx_sp_monitoring_company ON sp_monitoring_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sp_agreement ON invoices(sp_agreement_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_sp_agreement ON work_orders(sp_agreement_id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sp_settings','sp_plans','sp_plan_versions','sp_price_options','sp_benefits','sp_addons',
    'sp_monitoring_accounts','sp_agreements','sp_agreement_sites','sp_agreement_addons','sp_entitlement_ledger',
    'sp_billing_occurrences','sp_events']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true)', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true)', t || '_delete', t);
  END LOOP;
END $$;

INSERT INTO sp_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
