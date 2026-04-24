/*
  # Tech Portal pause reason tracking

  1. New Tables
    - `pause_reasons` — Lookup of reasons a technician can select when pausing a job
      - `id` (uuid, pk)
      - `label` (text, unique)
      - `sort_order` (int)
      - `is_active` (bool)

  2. New Columns
    - `work_order_technicians.current_pause_reason` (text, nullable)
    - `work_order_technicians.current_pause_notes` (text, nullable)
    - `work_order_time_entries.pause_reason` (text, nullable)
    - `work_order_time_entries.pause_notes` (text, nullable)
    - `work_order_time_entries.duration_minutes` (integer, nullable)

  3. Seed Data
    - Populates pause_reasons with default reasons (Lunch, Parts run, Customer call, etc.)

  4. Security
    - RLS enabled on new table
    - Select-only policies for anon/authenticated (reasons are reference data)
*/

-- pause_reasons lookup table
CREATE TABLE IF NOT EXISTS pause_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text UNIQUE NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pause_reasons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pause_reasons' AND policyname = 'Anon can read active pause reasons') THEN
    CREATE POLICY "Anon can read active pause reasons"
      ON pause_reasons FOR SELECT TO anon
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pause_reasons' AND policyname = 'Auth can read active pause reasons') THEN
    CREATE POLICY "Auth can read active pause reasons"
      ON pause_reasons FOR SELECT TO authenticated
      USING (is_active = true);
  END IF;
END $$;

INSERT INTO pause_reasons (label, sort_order) VALUES
  ('Lunch', 10),
  ('Parts run', 20),
  ('Customer call', 30),
  ('Waiting on customer', 40),
  ('Waiting on info', 50),
  ('Phone with office', 60),
  ('Restroom', 70),
  ('Other', 100)
ON CONFLICT (label) DO NOTHING;

-- Pause context columns on work_order_technicians
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'current_pause_reason'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN current_pause_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'current_pause_notes'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN current_pause_notes text;
  END IF;
END $$;

-- Pause metadata columns on time entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_time_entries' AND column_name = 'pause_reason'
  ) THEN
    ALTER TABLE work_order_time_entries ADD COLUMN pause_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_time_entries' AND column_name = 'pause_notes'
  ) THEN
    ALTER TABLE work_order_time_entries ADD COLUMN pause_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_time_entries' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE work_order_time_entries ADD COLUMN duration_minutes integer;
  END IF;
END $$;
