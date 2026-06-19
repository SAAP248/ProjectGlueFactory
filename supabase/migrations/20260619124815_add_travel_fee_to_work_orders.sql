/*
  # Add travel_fee column to work_orders

  Adds a dedicated travel_fee column so dispatchers can set a per-job travel charge
  independently from hourly/fixed billing rates.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'travel_fee'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN travel_fee decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'time_block'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN time_block text;
  END IF;
END $$;