/*
  # Enhance Deals Pipeline

  ## Summary
  Adds supporting tables and columns to power a full sales pipeline with drag-and-drop,
  revenue forecasting, activity logging, deal tasks, and quota tracking.

  ## New Tables
  - `deal_activities` - Timestamped log of every stage change, note, call, or email on a deal
  - `deal_tasks` - Follow-up tasks and reminders tied to a deal
  - `sales_quotas` - Monthly/quarterly revenue quotas per salesperson

  ## New Columns on `deals`
  - `forecast_category` - commit | best_case | pipeline | omitted
  - `stage_entered_at` - Timestamp when deal entered its current sales_stage (for aging)

  ## Security
  - RLS enabled on all new tables
  - Authenticated users can read/write all deal data (internal tool)
*/

-- ─── New columns on deals ───────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'forecast_category'
  ) THEN
    ALTER TABLE deals ADD COLUMN forecast_category text DEFAULT 'pipeline';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'stage_entered_at'
  ) THEN
    ALTER TABLE deals ADD COLUMN stage_entered_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ─── deal_activities ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  description text NOT NULL,
  old_value text,
  new_value text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created_at ON deal_activities(created_at);

ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deal activities"
  ON deal_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert deal activities"
  ON deal_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ─── deal_tasks ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  is_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_tasks_deal_id ON deal_tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_tasks_due_date ON deal_tasks(due_date);

ALTER TABLE deal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deal tasks"
  ON deal_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert deal tasks"
  ON deal_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deal tasks"
  ON deal_tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── sales_quotas ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_type text NOT NULL DEFAULT 'monthly',
  period_year integer NOT NULL,
  period_month integer,
  period_quarter integer,
  quota_amount decimal(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, period_type, period_year, period_month, period_quarter)
);

ALTER TABLE sales_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quotas"
  ON sales_quotas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert quotas"
  ON sales_quotas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotas"
  ON sales_quotas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Allow anon access for dev (mirrors existing policy pattern) ─────────────

CREATE POLICY "Anon can view deal activities"
  ON deal_activities FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert deal activities"
  ON deal_activities FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can view deal tasks"
  ON deal_tasks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert deal tasks"
  ON deal_tasks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update deal tasks"
  ON deal_tasks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can view sales quotas"
  ON sales_quotas FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert sales quotas"
  ON sales_quotas FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update sales quotas"
  ON sales_quotas FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
