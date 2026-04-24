/*
  # Allow anon role to manage work_order_attachments

  ## Summary
  The project uses the Supabase anon key across the app. Existing policies on
  work_order_attachments allowed authenticated writes only, so the web app and
  Tech Portal can read attachments but cannot add captions or delete them.
  This migration adds anon INSERT/UPDATE/DELETE policies to keep parity with
  other operational tables.

  ## Security Changes
  - Adds anon INSERT, UPDATE, DELETE policies on `work_order_attachments`.
  - Keeps existing SELECT/authenticated policies unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_order_attachments' AND policyname = 'Anon can insert work order attachments') THEN
    CREATE POLICY "Anon can insert work order attachments"
      ON work_order_attachments FOR INSERT TO anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_order_attachments' AND policyname = 'Anon can update work order attachments') THEN
    CREATE POLICY "Anon can update work order attachments"
      ON work_order_attachments FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_order_attachments' AND policyname = 'Anon can delete work order attachments') THEN
    CREATE POLICY "Anon can delete work order attachments"
      ON work_order_attachments FOR DELETE TO anon USING (true);
  END IF;
END $$;
