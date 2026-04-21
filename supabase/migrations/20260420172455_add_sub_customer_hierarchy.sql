/*
  # Add QuickBooks-Style Sub-Customer Hierarchy to companies

  Introduces a parent/child relationship between companies so a master account
  can have sub-customers, mirroring QuickBooks' sub-customer feature. Limited
  to a single level of depth (no grandchildren) and defaults to "bill with
  parent" for new sub-customers (QuickBooks default behavior).

  1. New columns on `companies`
    - `parent_company_id` (uuid, nullable) - self-referencing FK to companies.
      When set, this company is a sub-customer of the referenced company.
      ON DELETE RESTRICT prevents deleting a parent that still has children.
    - `bill_with_parent` (boolean, default true) - when true, the sub-customer's
      AR rolls up to the parent account for invoicing and statements.
      Only meaningful when parent_company_id IS NOT NULL.
    - `is_sub_customer` (boolean, generated) - convenience flag computed from
      parent_company_id IS NOT NULL. Kept in sync automatically.

  2. Integrity guards
    - Trigger `trg_companies_hierarchy_guard` enforces:
      a. A company cannot be its own parent (self-reference)
      b. A company's parent must itself be top-level (parent.parent_company_id IS NULL)
      c. A company that already has children cannot be converted into a sub-customer
      These combined rules cap the hierarchy at exactly one level deep.

  3. Reporting view
    - `v_company_rollup` aggregates per parent: child count, combined revenue,
      combined outstanding balance, and combined past-due amount across the
      parent plus its sub-customers. Used by dashboards and customer list.

  4. Indexes
    - Index on `parent_company_id` for fast child lookups.

  5. Security
    - Existing RLS policies on `companies` already cover all rows including the
      new columns. No new policies are required because parent/child access
      flows through the same ownership rules as any other row.

  Important notes:
    1. Existing rows are untouched: parent_company_id defaults to NULL so every
       current company is treated as a top-level master account by default.
    2. bill_with_parent defaults to true so that when a sub-customer IS created,
       billing rolls to the parent unless explicitly turned off - matching
       QuickBooks' "Bill with parent" default.
    3. The depth trigger only runs on INSERT and UPDATE of parent_company_id,
       so it has negligible overhead on other writes.
*/

-- 1. Columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'parent_company_id'
  ) THEN
    ALTER TABLE companies
      ADD COLUMN parent_company_id uuid REFERENCES companies(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'bill_with_parent'
  ) THEN
    ALTER TABLE companies
      ADD COLUMN bill_with_parent boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'is_sub_customer'
  ) THEN
    ALTER TABLE companies
      ADD COLUMN is_sub_customer boolean
      GENERATED ALWAYS AS (parent_company_id IS NOT NULL) STORED;
  END IF;
END $$;

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_companies_parent_company_id
  ON companies(parent_company_id);

-- 3. Depth / cycle guard trigger
CREATE OR REPLACE FUNCTION fn_companies_hierarchy_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_parent uuid;
  child_count int;
BEGIN
  IF NEW.parent_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Self-reference check
  IF NEW.parent_company_id = NEW.id THEN
    RAISE EXCEPTION 'A company cannot be its own parent';
  END IF;

  -- Parent must be top-level (no grandchildren allowed)
  SELECT parent_company_id INTO parent_parent
    FROM companies WHERE id = NEW.parent_company_id;

  IF parent_parent IS NOT NULL THEN
    RAISE EXCEPTION 'Selected parent is itself a sub-customer; only one level of nesting is allowed';
  END IF;

  -- This company cannot already have children (prevents turning a parent into a sub)
  SELECT COUNT(*) INTO child_count
    FROM companies WHERE parent_company_id = NEW.id;

  IF child_count > 0 THEN
    RAISE EXCEPTION 'This company has sub-customers and cannot be converted into a sub-customer itself';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_hierarchy_guard ON companies;
CREATE TRIGGER trg_companies_hierarchy_guard
  BEFORE INSERT OR UPDATE OF parent_company_id ON companies
  FOR EACH ROW
  EXECUTE FUNCTION fn_companies_hierarchy_guard();

-- 4. Rollup view
CREATE OR REPLACE VIEW v_company_rollup AS
SELECT
  p.id AS parent_id,
  p.name AS parent_name,
  COUNT(c.id) AS child_count,
  COALESCE(p.total_revenue, 0) + COALESCE(SUM(c.total_revenue), 0) AS consolidated_revenue,
  COALESCE(p.outstanding_balance, 0) + COALESCE(SUM(c.outstanding_balance), 0) AS consolidated_outstanding,
  COALESCE(p.past_due_amount, 0) + COALESCE(SUM(c.past_due_amount), 0) AS consolidated_past_due
FROM companies p
LEFT JOIN companies c ON c.parent_company_id = p.id
WHERE p.parent_company_id IS NULL
GROUP BY p.id, p.name, p.total_revenue, p.outstanding_balance, p.past_due_amount;
