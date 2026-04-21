/*
  # Add status column to work_order_technicians and seed technician employees

  1. Changes
    - Adds `status` column to `work_order_technicians` with default 'assigned'
    - Inserts 3 technician employees: Mike Torres, Sarah Chen, Jake Williams

  2. Notes
    - status tracks per-tech job state: assigned, enroute, onsite, working, on_break, completed
    - Employees get role 'technician' and status 'active'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'status'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN status text NOT NULL DEFAULT 'assigned';
  END IF;
END $$;

INSERT INTO employees (id, first_name, last_name, email, phone, role, status, hourly_rate, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Mike', 'Torres', 'mike.torres@workhorse.com', '555-201-0001', 'technician', 'active', 85.00, now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'Sarah', 'Chen', 'sarah.chen@workhorse.com', '555-201-0002', 'technician', 'active', 90.00, now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'Jake', 'Williams', 'jake.williams@workhorse.com', '555-201-0003', 'technician', 'active', 80.00, now(), now())
ON CONFLICT (id) DO NOTHING;
