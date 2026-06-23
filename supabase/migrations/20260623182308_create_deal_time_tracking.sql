/*
  # Deal Time Tracking Tables

  1. deal_time_entries - Tracks sales call lifecycle events (en route, on site, complete)
     Similar to work_order_time_entries but for deals/sales calls.

  2. deal_activity_log - Passive audit trail logging who spent time on what deal
     and what actions they performed (tab views, edits, saves, etc.)
*/

-- Sales call lifecycle tracking (en route, arrived, working, complete)
CREATE TABLE IF NOT EXISTS deal_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('enroute', 'arrived', 'work_start', 'pause', 'resume', 'complete', 'cancelled')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  outcome text,
  latitude decimal(10,7),
  longitude decimal(10,7),
  created_at timestamptz DEFAULT now()
);

-- Adds lifecycle status columns to deals
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'sales_call_status') THEN
    ALTER TABLE deals ADD COLUMN sales_call_status text DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'sales_call_employee_id') THEN
    ALTER TABLE deals ADD COLUMN sales_call_employee_id uuid REFERENCES employees(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'enroute_at') THEN
    ALTER TABLE deals ADD COLUMN enroute_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'onsite_at') THEN
    ALTER TABLE deals ADD COLUMN onsite_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'completed_at') THEN
    ALTER TABLE deals ADD COLUMN completed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'sales_call_notes') THEN
    ALTER TABLE deals ADD COLUMN sales_call_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'sales_call_outcome') THEN
    ALTER TABLE deals ADD COLUMN sales_call_outcome text;
  END IF;
END $$;

-- Passive activity/audit log for time-on-deal tracking
CREATE TABLE IF NOT EXISTS deal_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  action text NOT NULL,
  details text,
  tab text,
  duration_seconds integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE deal_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for deal_time_entries (allow anon for prototype)
CREATE POLICY "anon_select_deal_time_entries" ON deal_time_entries FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_deal_time_entries" ON deal_time_entries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_deal_time_entries" ON deal_time_entries FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_deal_time_entries" ON deal_time_entries FOR DELETE TO anon USING (true);

-- Policies for deal_activity_log (allow anon for prototype)
CREATE POLICY "anon_select_deal_activity_log" ON deal_activity_log FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_deal_activity_log" ON deal_activity_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_deal_activity_log" ON deal_activity_log FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_deal_activity_log" ON deal_activity_log FOR DELETE TO anon USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_deal_time_entries_deal_id ON deal_time_entries(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_time_entries_employee_id ON deal_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_deal_activity_log_deal_id ON deal_activity_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activity_log_session_id ON deal_activity_log(session_id);