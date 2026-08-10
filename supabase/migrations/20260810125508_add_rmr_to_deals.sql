/*
# Add RMR (Recurring Monthly Revenue) column to deals

1. Modified Tables
   - `deals`
     - `rmr` (numeric, default 0) — tracks the expected monthly recurring revenue for each deal

2. Important Notes
   - This lets salespeople capture both one-time sales value and monthly recurring revenue at the deal level.
   - Existing deals default to 0 RMR.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deals' AND column_name = 'rmr'
  ) THEN
    ALTER TABLE deals ADD COLUMN rmr numeric NOT NULL DEFAULT 0;
  END IF;
END $$;
