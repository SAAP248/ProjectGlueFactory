/*
# Add cost_price to work_order_line_items

1. Modified Tables
   - `work_order_line_items`
     - `cost_price` (numeric, nullable) — the purchase/cost price per unit at time of use, for profitability tracking

2. Important Notes
   - Nullable so existing rows are unaffected
   - Allows comparing sell price (unit_price) vs cost price per line item
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_line_items' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE work_order_line_items ADD COLUMN cost_price numeric;
  END IF;
END $$;
