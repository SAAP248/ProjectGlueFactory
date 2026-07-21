/*
  # Allow anon role to manage work_order_line_items

  1. Security Changes
    - Add INSERT policy for anon role on `work_order_line_items`
    - Add UPDATE policy for anon role on `work_order_line_items`
    - Add DELETE policy for anon role on `work_order_line_items`

  2. Notes
    - The application operates without authenticated sessions (uses anon key)
    - These policies allow the app to save parts/materials when creating or editing work orders
    - The SELECT policy for anon already exists from the original table creation
    - Without these policies, parts silently fail to save when creating a work order
*/

DROP POLICY IF EXISTS "Anon can insert work order line items" ON work_order_line_items;
CREATE POLICY "Anon can insert work order line items"
  ON work_order_line_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update work order line items" ON work_order_line_items;
CREATE POLICY "Anon can update work order line items"
  ON work_order_line_items
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete work order line items" ON work_order_line_items;
CREATE POLICY "Anon can delete work order line items"
  ON work_order_line_items
  FOR DELETE
  TO anon
  USING (true);
