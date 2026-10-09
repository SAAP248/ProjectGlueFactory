/*
# Add verbal passcode to customers

1. Modified Tables
- `companies`
  - `verbal_passcode` (text, nullable) - word the customer gives to verify identity on calls (e.g. "Oranges")
2. Security
- No policy changes; existing companies policies apply.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'verbal_passcode'
  ) THEN
    ALTER TABLE companies ADD COLUMN verbal_passcode text;
  END IF;
END $$;