/*
  # Allow anon role to manage work_order_technicians

  1. Security Changes
    - Add INSERT policy for anon role on `work_order_technicians`
    - Add UPDATE policy for anon role on `work_order_technicians`
    - Add DELETE policy for anon role on `work_order_technicians`

  2. Notes
    - The application currently operates without authenticated sessions
    - These policies allow dispatchers to assign/unassign technicians to work orders
    - Matches the existing pattern used on `work_orders` table
*/

CREATE POLICY "Anon can insert work order technicians"
  ON work_order_technicians
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update work order technicians"
  ON work_order_technicians
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete work order technicians"
  ON work_order_technicians
  FOR DELETE
  TO anon
  USING (true);
