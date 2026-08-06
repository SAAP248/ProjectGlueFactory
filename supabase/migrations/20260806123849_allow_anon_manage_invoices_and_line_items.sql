/*
  # Allow anon role to manage invoices, invoice line items, and transactions

  1. Security Changes
    - Add INSERT, UPDATE, DELETE policies for anon role on `invoices`
    - Add INSERT, UPDATE, DELETE policies for anon role on `invoice_line_items`
    - Add INSERT, UPDATE, DELETE policies for anon role on `transactions`

  2. Schema Changes
    - Add `discount` column (decimal) to `invoices` for flat/percentage discounts
    - Add `discount_type` column (text) to `invoices` ('flat' or 'percent')

  3. Notes
    - The application operates without authenticated sessions (uses anon key)
    - These policies mirror the pattern used for work_orders and work_order_line_items
    - Anon SELECT policies already exist from the earlier migration
*/

-- Invoices: anon INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can insert invoices" ON invoices;
CREATE POLICY "Anon can insert invoices"
  ON invoices FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update invoices" ON invoices;
CREATE POLICY "Anon can update invoices"
  ON invoices FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete invoices" ON invoices;
CREATE POLICY "Anon can delete invoices"
  ON invoices FOR DELETE TO anon USING (true);

-- Invoice line items: anon INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can insert invoice line items" ON invoice_line_items;
CREATE POLICY "Anon can insert invoice line items"
  ON invoice_line_items FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update invoice line items" ON invoice_line_items;
CREATE POLICY "Anon can update invoice line items"
  ON invoice_line_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete invoice line items" ON invoice_line_items;
CREATE POLICY "Anon can delete invoice line items"
  ON invoice_line_items FOR DELETE TO anon USING (true);

-- Transactions: anon INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can insert transactions" ON transactions;
CREATE POLICY "Anon can insert transactions"
  ON transactions FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update transactions" ON transactions;
CREATE POLICY "Anon can update transactions"
  ON transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete transactions" ON transactions;
CREATE POLICY "Anon can delete transactions"
  ON transactions FOR DELETE TO anon USING (true);

-- Add discount columns to invoices
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'discount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN discount decimal(12,2) DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE invoices ADD COLUMN discount_type text DEFAULT 'flat';
  END IF;
END $$;
