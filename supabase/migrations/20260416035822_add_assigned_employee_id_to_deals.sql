/*
  # Add assigned_employee_id to deals table

  ## Summary
  Adds a proper FK column `assigned_employee_id` to the `deals` table linking
  to the `employees` table, so each deal can track which salesperson owns it.

  ## Changes
  - `deals.assigned_employee_id` (uuid, nullable, FK → employees.id)

  ## Notes
  - The existing `assigned_sales_person` (text) column is kept untouched to avoid data loss
  - New column is nullable so existing rows are unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'assigned_employee_id'
  ) THEN
    ALTER TABLE deals ADD COLUMN assigned_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;
