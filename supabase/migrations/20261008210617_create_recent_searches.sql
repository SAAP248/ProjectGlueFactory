/*
# Recent searches for the global search bar

1. New Tables
- `recent_searches`
  - `id` (uuid, primary key)
  - `user_key` (text) - who did the search; a fixed demo user until sign-in exists
  - `query` (text) - what was typed
  - `record_type` (text) - customer | work_order | invoice | agreement
  - `record_id` (uuid) - the record that was opened
  - `label` (text) - display name of the record
  - `sublabel` (text) - secondary line (e.g. customer name)
  - `searched_at` (timestamptz)
  - unique (user_key, record_type, record_id) so re-opening moves it to the top
2. Security
- RLS enabled; app has no sign-in so anon + authenticated can manage rows.
3. Seed
- 5 sample recent searches for the demo user pointing at real records.
*/

CREATE TABLE IF NOT EXISTS recent_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key text NOT NULL DEFAULT 'demo-user',
  query text NOT NULL DEFAULT '',
  record_type text NOT NULL CHECK (record_type IN ('customer','work_order','invoice','agreement')),
  record_id uuid NOT NULL,
  label text NOT NULL,
  sublabel text NOT NULL DEFAULT '',
  searched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_key, record_type, record_id)
);

CREATE INDEX IF NOT EXISTS recent_searches_user_time_idx ON recent_searches (user_key, searched_at DESC);

ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_recent_searches" ON recent_searches;
CREATE POLICY "anon_select_recent_searches" ON recent_searches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_recent_searches" ON recent_searches;
CREATE POLICY "anon_insert_recent_searches" ON recent_searches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_recent_searches" ON recent_searches;
CREATE POLICY "anon_update_recent_searches" ON recent_searches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_recent_searches" ON recent_searches;
CREATE POLICY "anon_delete_recent_searches" ON recent_searches FOR DELETE TO anon, authenticated USING (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM recent_searches WHERE user_key = 'demo-user') THEN
    INSERT INTO recent_searches (user_key, query, record_type, record_id, label, sublabel, searched_at)
    SELECT 'demo-user', lower(split_part(c.name, ' ', 1)), 'customer', c.id, c.name, coalesce(c.account_number, ''), now() - interval '20 minutes'
    FROM (SELECT * FROM companies ORDER BY name LIMIT 1) c;

    INSERT INTO recent_searches (user_key, query, record_type, record_id, label, sublabel, searched_at)
    SELECT 'demo-user', w.wo_number, 'work_order', w.id, w.wo_number, coalesce(w.title, ''), now() - interval '2 hours'
    FROM (SELECT * FROM work_orders WHERE wo_number IS NOT NULL ORDER BY created_at DESC LIMIT 1) w;

    INSERT INTO recent_searches (user_key, query, record_type, record_id, label, sublabel, searched_at)
    SELECT 'demo-user', i.invoice_number, 'invoice', i.id, i.invoice_number, coalesce(co.name, ''), now() - interval '1 day'
    FROM (SELECT * FROM invoices WHERE invoice_number IS NOT NULL ORDER BY created_at DESC LIMIT 1) i
    LEFT JOIN companies co ON co.id = i.company_id;

    INSERT INTO recent_searches (user_key, query, record_type, record_id, label, sublabel, searched_at)
    SELECT 'demo-user', a.agreement_number, 'agreement', a.id, a.agreement_number, coalesce(co.name, ''), now() - interval '2 days'
    FROM (SELECT * FROM sp_agreements ORDER BY agreement_number LIMIT 1) a
    LEFT JOIN companies co ON co.id = a.company_id;

    INSERT INTO recent_searches (user_key, query, record_type, record_id, label, sublabel, searched_at)
    SELECT 'demo-user', lower(split_part(c.name, ' ', 1)), 'customer', c.id, c.name, coalesce(c.account_number, ''), now() - interval '3 days'
    FROM (SELECT * FROM companies ORDER BY name OFFSET 5 LIMIT 1) c;
  END IF;
END $$;