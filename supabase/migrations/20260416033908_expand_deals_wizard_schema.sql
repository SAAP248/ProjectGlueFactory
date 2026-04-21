/*
  # Expand Deals & Wizard Schema

  ## Summary
  Adds all tables and columns needed to support the 5-step New Proposal Wizard,
  including multi-phone/email support, deal systems, enhanced estimate line items,
  and proposal token generation.

  ## New Tables
  - `company_phones` - Multiple phone numbers per company (label + number)
  - `company_emails` - Multiple email addresses per company (label + address)
  - `deal_systems` - Systems being sold on a given deal (links to system_types)

  ## New Columns on `deals`
  - `site_id` - Installation site for the deal
  - `proposal_token` - Unique public token for the customer-facing proposal URL
  - `proposal_sent_at` - When the proposal was sent via email/SMS
  - `deposit_requested` - Whether a deposit is requested
  - `deposit_amount` - Amount of the deposit requested
  - `deposit_method` - Payment method for the deposit (Check, Credit Card, ACH, Other)
  - `scope_of_work` - Rich text scope of work
  - `internal_notes` - Internal/field notes (not shown to customer)
  - `terms_and_conditions` - Custom terms per deal

  ## New Columns on `estimate_line_items`
  - `unit_cost` - Cost basis per unit (for margin calculations)
  - `sort_order` - Display order within the estimate
  - `system_group_id` - Links a line item to a specific deal_system

  ## New Columns on `products`
  - `image_url` - Product image URL
  - `description` - Detailed product description
  - `model_number` - Manufacturer model number
  - `track_serial` - Whether to track serial numbers for this product
  - `is_active` - Whether the product is active in the catalog

  ## Security
  - RLS enabled on all new tables
  - Anon access policies matching existing pattern (dev environment)
*/

-- ─── company_phones ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Main',
  phone_number text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_phones_company_id ON company_phones(company_id);

ALTER TABLE company_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select company_phones"
  ON company_phones FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert company_phones"
  ON company_phones FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update company_phones"
  ON company_phones FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete company_phones"
  ON company_phones FOR DELETE TO anon USING (true);

-- ─── company_emails ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Primary',
  email_address text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_emails_company_id ON company_emails(company_id);

ALTER TABLE company_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select company_emails"
  ON company_emails FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert company_emails"
  ON company_emails FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update company_emails"
  ON company_emails FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete company_emails"
  ON company_emails FOR DELETE TO anon USING (true);

-- ─── deal_systems ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deal_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  system_type_id uuid REFERENCES system_types(id) ON DELETE SET NULL,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_systems_deal_id ON deal_systems(deal_id);

ALTER TABLE deal_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select deal_systems"
  ON deal_systems FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert deal_systems"
  ON deal_systems FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update deal_systems"
  ON deal_systems FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete deal_systems"
  ON deal_systems FOR DELETE TO anon USING (true);

-- ─── New columns on deals ─────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'site_id') THEN
    ALTER TABLE deals ADD COLUMN site_id uuid REFERENCES sites(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'proposal_token') THEN
    ALTER TABLE deals ADD COLUMN proposal_token text UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'proposal_sent_at') THEN
    ALTER TABLE deals ADD COLUMN proposal_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'deposit_requested') THEN
    ALTER TABLE deals ADD COLUMN deposit_requested boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'deposit_amount') THEN
    ALTER TABLE deals ADD COLUMN deposit_amount decimal(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'deposit_method') THEN
    ALTER TABLE deals ADD COLUMN deposit_method text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'scope_of_work') THEN
    ALTER TABLE deals ADD COLUMN scope_of_work text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'internal_notes') THEN
    ALTER TABLE deals ADD COLUMN internal_notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'terms_and_conditions') THEN
    ALTER TABLE deals ADD COLUMN terms_and_conditions text;
  END IF;
END $$;

-- ─── New columns on estimate_line_items ──────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'unit_cost') THEN
    ALTER TABLE estimate_line_items ADD COLUMN unit_cost decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'sort_order') THEN
    ALTER TABLE estimate_line_items ADD COLUMN sort_order integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'system_group_id') THEN
    ALTER TABLE estimate_line_items ADD COLUMN system_group_id uuid REFERENCES deal_systems(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── New columns on products ─────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url') THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'description') THEN
    ALTER TABLE products ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'model_number') THEN
    ALTER TABLE products ADD COLUMN model_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'track_serial') THEN
    ALTER TABLE products ADD COLUMN track_serial boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_active') THEN
    ALTER TABLE products ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;
