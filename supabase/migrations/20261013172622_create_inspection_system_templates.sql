/*
# Inspection system templates

Saves each system's reusable inspection details: panel, power, device list and
notification appliance list. The next inspection on that system can then start
already filled in.

1. Modified Tables
- `inspections`
  - `system_id` (uuid, nullable): the customer system that was inspected. References `customer_systems`.

2. New Tables
- `inspection_system_templates`: one row per customer system, always holding the latest saved details.
  - `id` (uuid, primary key)
  - `system_id` (uuid, unique, not null): references `customer_systems`
  - `company_id` (uuid): the customer
  - `site_id` (uuid): the site
  - `facp_manufacturer`, `facp_model`, `software_revision` (text): fire alarm control panel details
  - `slc_loops`, `num_zones` (integer): SLC loop count and zone count
  - `battery_type`, `battery_size_ah` (text): battery details
  - `devices` (jsonb array): initiating devices (location, type, address, manufacturer, model)
  - `notification_appliances` (jsonb array): NAC appliances (type, manufacturer, model, serial, location, candela)
  - `source_inspection_id` (uuid): the inspection that last updated this template
  - `updated_by` (text): the technician on that inspection
  - `created_at`, `updated_at` (timestamptz)

3. Security
- RLS enabled on `inspection_system_templates`.
- The app runs without sign-in, so it gets separate select, insert, update and delete policies for anon and authenticated users, matching the other inspection tables.

4. Backfill
- Existing inspections are linked to a system when their site has exactly one system.
- A template is built for each linked system from its most recent inspection.
- Visit-only data (pass/fail results, sensitivity readings, notes, photos) is never copied into templates.
*/

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS system_id uuid REFERENCES customer_systems(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inspections_system_id ON inspections(system_id);

CREATE TABLE IF NOT EXISTS inspection_system_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL UNIQUE REFERENCES customer_systems(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  facp_manufacturer text NOT NULL DEFAULT '',
  facp_model text NOT NULL DEFAULT '',
  software_revision text NOT NULL DEFAULT '',
  slc_loops integer,
  num_zones integer,
  battery_type text NOT NULL DEFAULT '',
  battery_size_ah text NOT NULL DEFAULT '',
  devices jsonb NOT NULL DEFAULT '[]'::jsonb,
  notification_appliances jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_inspection_id uuid REFERENCES inspections(id) ON DELETE SET NULL,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ist_company ON inspection_system_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_ist_site ON inspection_system_templates(site_id);

ALTER TABLE inspection_system_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inspection_system_templates" ON inspection_system_templates;
CREATE POLICY "anon_select_inspection_system_templates" ON inspection_system_templates FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inspection_system_templates" ON inspection_system_templates;
CREATE POLICY "anon_insert_inspection_system_templates" ON inspection_system_templates FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inspection_system_templates" ON inspection_system_templates;
CREATE POLICY "anon_update_inspection_system_templates" ON inspection_system_templates FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inspection_system_templates" ON inspection_system_templates;
CREATE POLICY "anon_delete_inspection_system_templates" ON inspection_system_templates FOR DELETE
  TO anon, authenticated USING (true);

UPDATE inspections i
SET system_id = s.id
FROM (
  SELECT site_id, min(id::text)::uuid AS id
  FROM customer_systems
  GROUP BY site_id
  HAVING count(*) = 1
) s
WHERE i.system_id IS NULL AND i.site_id = s.site_id;

INSERT INTO inspection_system_templates (
  system_id, company_id, site_id, facp_manufacturer, facp_model, software_revision,
  slc_loops, num_zones, battery_type, battery_size_ah, devices, notification_appliances,
  source_inspection_id, updated_by, updated_at
)
SELECT DISTINCT ON (i.system_id)
  i.system_id, i.company_id, i.site_id,
  coalesce((SELECT v.value #>> '{}' FROM inspection_field_values v WHERE v.inspection_id = i.id AND v.field_id = 'sys_manufacturer'), ''),
  coalesce((SELECT v.value #>> '{}' FROM inspection_field_values v WHERE v.inspection_id = i.id AND v.field_id = 'sys_model'), ''),
  coalesce((SELECT v.value #>> '{}' FROM inspection_field_values v WHERE v.inspection_id = i.id AND v.field_id = 'sys_software_rev'), ''),
  (SELECT CASE WHEN (v.value #>> '{}') ~ '^\d+$' THEN (v.value #>> '{}')::int END FROM inspection_field_values v WHERE v.inspection_id = i.id AND v.field_id = 'sys_num_loops'),
  (SELECT CASE WHEN (v.value #>> '{}') ~ '^\d+$' THEN (v.value #>> '{}')::int END FROM inspection_field_values v WHERE v.inspection_id = i.id AND v.field_id = 'sys_num_zones'),
  coalesce((SELECT v.value #>> '{}' FROM inspection_field_values v WHERE v.inspection_id = i.id AND v.field_id = 'sys_battery_type'), ''),
  coalesce((SELECT v.value #>> '{}' FROM inspection_field_values v WHERE v.inspection_id = i.id AND v.field_id = 'sys_battery_size'), ''),
  coalesce((
    SELECT jsonb_agg(e - 'device_result' - 'device_sensitivity' - 'device_notes')
    FROM inspection_field_values v, jsonb_array_elements(v.value) e
    WHERE v.inspection_id = i.id AND v.field_id = 'ft_device_table' AND jsonb_typeof(v.value) = 'array'
  ), '[]'::jsonb),
  coalesce((
    SELECT jsonb_agg(e - 'nac_result' - 'nac_photo' - 'nac_notes')
    FROM inspection_field_values v, jsonb_array_elements(v.value) e
    WHERE v.inspection_id = i.id AND v.field_id = 'ft_nac_device_table' AND jsonb_typeof(v.value) = 'array'
  ), '[]'::jsonb),
  i.id, i.completed_by, i.updated_at
FROM inspections i
WHERE i.system_id IS NOT NULL
ORDER BY i.system_id, i.updated_at DESC
ON CONFLICT (system_id) DO NOTHING;
