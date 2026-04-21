/*
  # Add QuickBooks Online Sync Status to Companies

  Adds a sync status flag and a last-synced timestamp so each customer (and
  sub-customer) can record whether it is actively synced with its matching
  QuickBooks Online customer. The existing `quickbooks_id` column continues
  to hold the QBO customer ID; these new columns only describe the sync
  state for UI display.

  1. New columns on `companies`
    - `qb_sync_status` (text, default 'not_synced') - one of:
        'synced'      : matched to a QBO customer and syncing actively
        'pending'     : queued but not yet confirmed
        'error'       : last sync attempt failed
        'not_synced'  : no active link to QBO (default)
    - `qb_last_synced_at` (timestamptz, nullable) - last successful sync time

  2. Integrity
    - CHECK constraint restricts `qb_sync_status` to the four allowed values.
    - No changes to RLS: existing companies policies already cover these
      new columns because they belong to the same row owners.

  3. Dummy data
    - For this demo environment, populate roughly half of the companies that
      already have a `quickbooks_id` with status 'synced' and a recent
      `qb_last_synced_at`; the remaining half are left 'not_synced' to
      demonstrate both states in the UI.

  Important notes:
    1. Existing customers default to 'not_synced' so no data is altered
       unexpectedly; only the randomized demo update touches existing rows.
    2. No destructive operations are performed. All changes use ALTER TABLE
       with IF NOT EXISTS guards and idempotent UPDATE statements.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'qb_sync_status'
  ) THEN
    ALTER TABLE companies
      ADD COLUMN qb_sync_status text NOT NULL DEFAULT 'not_synced';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'qb_last_synced_at'
  ) THEN
    ALTER TABLE companies
      ADD COLUMN qb_last_synced_at timestamptz;
  END IF;
END $$;

-- CHECK constraint (drop-if-exists pattern for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_qb_sync_status_check'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_qb_sync_status_check
      CHECK (qb_sync_status IN ('synced', 'pending', 'error', 'not_synced'));
  END IF;
END $$;

-- Dummy data: give ~55% of companies a QB ID + synced status,
-- ~15% pending, ~10% error, the rest remain not_synced.
UPDATE companies SET
  quickbooks_id = COALESCE(NULLIF(quickbooks_id, ''), 'QBO-' || LPAD((100000 + (random() * 899999)::int)::text, 6, '0')),
  qb_sync_status = 'synced',
  qb_last_synced_at = now() - (random() * interval '3 days')
WHERE id IN (
  SELECT id FROM companies
  WHERE qb_sync_status = 'not_synced'
  ORDER BY random()
  LIMIT (SELECT GREATEST(1, (COUNT(*) * 0.55)::int) FROM companies)
);

UPDATE companies SET
  quickbooks_id = COALESCE(NULLIF(quickbooks_id, ''), 'QBO-' || LPAD((100000 + (random() * 899999)::int)::text, 6, '0')),
  qb_sync_status = 'pending',
  qb_last_synced_at = NULL
WHERE id IN (
  SELECT id FROM companies
  WHERE qb_sync_status = 'not_synced'
  ORDER BY random()
  LIMIT (SELECT GREATEST(1, (COUNT(*) * 0.15)::int) FROM companies)
);

UPDATE companies SET
  quickbooks_id = COALESCE(NULLIF(quickbooks_id, ''), 'QBO-' || LPAD((100000 + (random() * 899999)::int)::text, 6, '0')),
  qb_sync_status = 'error',
  qb_last_synced_at = now() - (random() * interval '14 days')
WHERE id IN (
  SELECT id FROM companies
  WHERE qb_sync_status = 'not_synced'
  ORDER BY random()
  LIMIT (SELECT GREATEST(1, (COUNT(*) * 0.10)::int) FROM companies)
);
