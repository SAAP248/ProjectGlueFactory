/*
  # Add QuickBooks ID, multiple phones/emails, and extended address fields to companies

  ## Summary
  This migration adds support for:
  - A QuickBooks customer ID field (quickbooks_id) for external accounting integration
  - Multiple phone numbers stored as a JSONB array, each with a label and number
  - Multiple email addresses stored as a JSONB array, each with a label and address
  - A second billing address line (billing_address_2)
  - A billing country field (billing_country), defaulting to "USA"

  ## New Columns on `companies`
  - `quickbooks_id` (text, nullable) — The customer's ID in QuickBooks
  - `phones` (jsonb) — Array of { label: string, number: string } objects
  - `company_emails` (jsonb) — Array of { label: string, address: string } objects
  - `billing_address_2` (text, nullable) — Second line of billing address
  - `billing_country` (text, default 'USA') — Billing country

  ## Notes
  - Existing `phone` and `email` columns are preserved for backwards compatibility
  - The new `phones` and `company_emails` JSONB arrays replace them going forward
  - No data is removed or altered in this migration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'quickbooks_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN quickbooks_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'phones'
  ) THEN
    ALTER TABLE companies ADD COLUMN phones jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'company_emails'
  ) THEN
    ALTER TABLE companies ADD COLUMN company_emails jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'billing_address_2'
  ) THEN
    ALTER TABLE companies ADD COLUMN billing_address_2 text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'billing_country'
  ) THEN
    ALTER TABLE companies ADD COLUMN billing_country text DEFAULT 'USA';
  END IF;
END $$;
