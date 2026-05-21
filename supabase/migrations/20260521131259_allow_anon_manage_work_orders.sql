/*
  # Allow anon role to manage work_orders

  1. Security Changes
    - Add INSERT policy for anon role on `work_orders`
    - Add UPDATE policy for anon role on `work_orders`
    - Add DELETE policy for anon role on `work_orders`

  2. Notes
    - The application operates without authenticated sessions (uses anon key)
    - These policies allow dispatchers to create, update, and manage work orders
    - The AssignmentModal updates work_orders.assigned_to and scheduling fields after assigning technicians
*/

CREATE POLICY "Anon can insert work orders"
  ON work_orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update work orders"
  ON work_orders
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete work orders"
  ON work_orders
  FOR DELETE
  TO anon
  USING (true);
