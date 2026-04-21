/*
  # Add Per-Technician Scheduling to Work Orders

  Enables assigning multiple technicians to a single work order, each with
  their own scheduled date, start time, end time, and estimated duration.
  Also supports multi-day jobs by allowing the same technician to have
  multiple assignment rows on different dates.

  1. New Columns on `work_order_technicians`
    - `scheduled_date` (date) — the date this technician is scheduled for this WO
    - `scheduled_start_time` (time) — when the tech is expected to start
    - `scheduled_end_time` (time) — when the tech is expected to finish
    - `estimated_duration_minutes` (integer, default 60) — scheduled time budget
    - `assignment_notes` (text) — dispatcher notes specific to this assignment
    - `visit_sequence` (integer, default 1) — order number of this visit

  2. Backfill
    - Copies the current WO-level `scheduled_date` / `scheduled_time` onto each
      existing `work_order_technicians` row so nothing disappears from the UI
    - Defaults `estimated_duration_minutes` to the WO-level estimated_duration

  3. Security
    - Relies on existing RLS policies on `work_order_technicians`; no new
      policies are added because column-level policies aren't needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN scheduled_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'scheduled_start_time'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN scheduled_start_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'scheduled_end_time'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN scheduled_end_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'estimated_duration_minutes'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN estimated_duration_minutes integer DEFAULT 60 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'assignment_notes'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN assignment_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_technicians' AND column_name = 'visit_sequence'
  ) THEN
    ALTER TABLE work_order_technicians ADD COLUMN visit_sequence integer DEFAULT 1 NOT NULL;
  END IF;
END $$;

UPDATE work_order_technicians wot
SET
  scheduled_date = COALESCE(wot.scheduled_date, wo.scheduled_date),
  scheduled_start_time = COALESCE(wot.scheduled_start_time, wo.scheduled_time),
  estimated_duration_minutes = COALESCE(
    NULLIF(wot.estimated_duration_minutes, 0),
    wo.estimated_duration,
    60
  )
FROM work_orders wo
WHERE wot.work_order_id = wo.id
  AND (wot.scheduled_date IS NULL OR wot.scheduled_start_time IS NULL);

CREATE INDEX IF NOT EXISTS idx_wot_scheduled_date ON work_order_technicians(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_wot_employee_scheduled ON work_order_technicians(employee_id, scheduled_date);
