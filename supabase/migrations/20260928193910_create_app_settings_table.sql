/*
# Create app_settings key-value table

1. New Tables
   - `app_settings`
     - `key` (text, primary key) — setting name, e.g. 'google_maps_api_key'
     - `value` (text, not null) — the setting value
     - `updated_at` (timestamptz) — last modified timestamp

2. Security
   - Enable RLS on `app_settings`.
   - Allow anon + authenticated full CRUD (single-tenant app, no auth).
   - Data is intentionally shared/public — this stores app-wide configuration.
*/

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_settings" ON app_settings;
CREATE POLICY "anon_select_app_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_settings" ON app_settings;
CREATE POLICY "anon_insert_app_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_settings" ON app_settings;
CREATE POLICY "anon_update_app_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_settings" ON app_settings;
CREATE POLICY "anon_delete_app_settings" ON app_settings FOR DELETE
  TO anon, authenticated USING (true);
