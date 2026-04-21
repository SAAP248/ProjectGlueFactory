/*
  # Go-Back, Trouble Customer, Time Entries, and Source Fields

  ## Summary
  This migration adds the full go-back tracking system, trouble customer flagging,
  technician time entry audit trail, and source tracking for work orders.

  ## New Tables
  - `go_back_reasons` — Managed list of go-back reasons (admin-configurable)
  - `work_order_time_entries` — Per-technician audit trail of all status changes

  ## Modified Tables

  ### work_orders
  - `source` — How the WO originated (phone_call, customer_request, office, dispatch)
  - `is_go_back` — Boolean flag marking this as a go-back/repeat visit
  - `go_back_reason_ids` — Array of go_back_reasons IDs selected
  - `go_back_notes` — Free-text notes about why it's a go-back
  - `go_back_work_order_id` — FK to the original work order (self-referencing)

  ### companies
  - `is_trouble_customer` — Boolean flag for office-only trouble flag
  - `trouble_notes` — Free-text notes about why flagged
  - `trouble_flagged_at` — Timestamp when flagged

  ### work_order_technicians
  - `paused_at` — Timestamp when tech took a break
  - `total_paused_minutes` — Accumulated pause time

  ## Security
  - RLS enabled on all new tables
  - Anon select policies for app access (consistent with existing schema)
*/

-- Add source field to work_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'source'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN source text DEFAULT 'office'
      CHECK (source IN ('phone_call', 'customer_request', 'office', 'dispatch'));
  END IF;
END $$;

-- Add go-back fields to work_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'is_go_back'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN is_go_back boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'go_back_reason_ids'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN go_back_reason_ids uuid[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'go_back_notes'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN go_back_notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'go_back_work_order_id'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN go_back_work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add trouble customer fields to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'is_trouble_customer'
  ) THEN
    ALTER TABLE companies ADD COLUMN is_trouble_customer boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'trouble_notes'
  ) THEN
    ALTER TABLE companies ADD COLUMN trouble_notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'trouble_flagged_at'
  ) THEN
    ALTER TABLE companies ADD COLUMN trouble_flagged_at timestamptz;
  END IF;
END $$;

-- Add pause tracking to work_order_technicians
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'paused_at'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN paused_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'total_paused_minutes'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN total_paused_minutes integer DEFAULT 0;
  END IF;
END $$;

-- Create go_back_reasons table
CREATE TABLE IF NOT EXISTS go_back_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE go_back_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on go_back_reasons"
  ON go_back_reasons FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated select on go_back_reasons"
  ON go_back_reasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on go_back_reasons"
  ON go_back_reasons FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on go_back_reasons"
  ON go_back_reasons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on go_back_reasons"
  ON go_back_reasons FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow anon insert on go_back_reasons"
  ON go_back_reasons FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on go_back_reasons"
  ON go_back_reasons FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete on go_back_reasons"
  ON go_back_reasons FOR DELETE TO anon USING (true);

-- Seed default go-back reasons
INSERT INTO go_back_reasons (label, sort_order) VALUES
  ('Wrong Equipment', 1),
  ('Need to Order Parts', 2),
  ('Job Took Too Long', 3),
  ('Access Issue', 4),
  ('Customer Not Home', 5),
  ('Incomplete Diagnosis', 6),
  ('Weather Delay', 7),
  ('Rescheduled by Customer', 8),
  ('Other', 9)
ON CONFLICT DO NOTHING;

-- Create work_order_time_entries table
CREATE TABLE IF NOT EXISTS work_order_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('enroute', 'arrived', 'work_start', 'pause', 'resume', 'complete', 'go_back')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_order_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on work_order_time_entries"
  ON work_order_time_entries FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated select on work_order_time_entries"
  ON work_order_time_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow anon insert on work_order_time_entries"
  ON work_order_time_entries FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated insert on work_order_time_entries"
  ON work_order_time_entries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow anon update on work_order_time_entries"
  ON work_order_time_entries FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated update on work_order_time_entries"
  ON work_order_time_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete on work_order_time_entries"
  ON work_order_time_entries FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated delete on work_order_time_entries"
  ON work_order_time_entries FOR DELETE TO authenticated USING (true);
