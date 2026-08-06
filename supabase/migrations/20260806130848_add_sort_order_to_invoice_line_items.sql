/*
  # Add sort_order to invoice_line_items

  ## Summary
  Adds a `sort_order` integer column to `invoice_line_items` so line items
  can be reordered via drag-and-drop in the UI. Existing rows default to 0.

  ## Modified Tables
  - `invoice_line_items`
    - `sort_order` (integer, default 0) - display ordering position

  ## Security
  - No policy changes needed; existing anon CRUD policies cover this column.

  ## Notes
  1. Idempotent — uses DO block with column existence check.
  2. Backfills existing rows with sequential sort_order based on created_at.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_line_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE invoice_line_items ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill existing rows with sequential order based on created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY created_at) - 1 AS rn
  FROM invoice_line_items
)
UPDATE invoice_line_items
SET sort_order = numbered.rn
FROM numbered
WHERE invoice_line_items.id = numbered.id
  AND invoice_line_items.sort_order = 0;
