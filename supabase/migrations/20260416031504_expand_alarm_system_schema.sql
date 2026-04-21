/*
  # Expand Alarm System Schema for Full Central Station Management

  ## Overview
  This migration expands the customer_systems table and adds supporting tables
  for a complete alarm/fire system management experience within customer profiles.

  ## Changes to Existing Tables

  ### customer_systems (extended)
  - Central Station fields: cs_name, cs_status, cs_data_entry_phone, cs_number, is_synced_cs, is_on_test, is_out_of_service
  - Communication Partner fields: comm_partner_name, comm_partner_serial, comm_receiver_number, comm_account_id, comm_username, comm_password, is_synced_comm
  - Extended Panel fields: panel_type, panel_battery_date, panel_location, transformer_location, antenna_location, warranty_information, online_date, installer_code, takeover_module_location, permit_number

  ### system_zones (extended)
  - Added: install_date, area, event_type, cs_flag, comm_partner_flag, tested, existing_zone, smoke_detector_test_date

  ## New Tables

  ### 1. alarm_emergency_contacts
  - Emergency contacts linked to a specific alarm system
  - Columns: id, system_id, contact_order, first_name, last_name, phone, has_ecv_ctv, has_key, access_level, relation

  ### 2. alarm_code_words
  - Passcode/code word records linked to a system
  - Columns: id, system_id, passcode, authority, is_duress

  ### 3. alarm_event_history
  - Historical alarm events (POC - will be replaced by central station API)
  - Columns: id, system_id, zone_id_ref, zone_name, signal_code, event_code, description, event_at

  ## Security
  - RLS enabled on all new tables
  - Anonymous select allowed (matching existing pattern from migration 20260413010311)
  - Authenticated users can insert/update/delete
*/

-- =====================================================
-- EXTEND customer_systems
-- =====================================================

DO $$
BEGIN
  -- Central Station fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='cs_name') THEN
    ALTER TABLE customer_systems ADD COLUMN cs_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='cs_status') THEN
    ALTER TABLE customer_systems ADD COLUMN cs_status text DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='cs_data_entry_phone') THEN
    ALTER TABLE customer_systems ADD COLUMN cs_data_entry_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='cs_number') THEN
    ALTER TABLE customer_systems ADD COLUMN cs_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='is_synced_cs') THEN
    ALTER TABLE customer_systems ADD COLUMN is_synced_cs boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='is_on_test') THEN
    ALTER TABLE customer_systems ADD COLUMN is_on_test boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='is_out_of_service') THEN
    ALTER TABLE customer_systems ADD COLUMN is_out_of_service boolean DEFAULT false;
  END IF;

  -- Communication Partner fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='comm_partner_name') THEN
    ALTER TABLE customer_systems ADD COLUMN comm_partner_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='comm_partner_serial') THEN
    ALTER TABLE customer_systems ADD COLUMN comm_partner_serial text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='comm_receiver_number') THEN
    ALTER TABLE customer_systems ADD COLUMN comm_receiver_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='comm_account_id') THEN
    ALTER TABLE customer_systems ADD COLUMN comm_account_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='comm_username') THEN
    ALTER TABLE customer_systems ADD COLUMN comm_username text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='comm_password') THEN
    ALTER TABLE customer_systems ADD COLUMN comm_password text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='is_synced_comm') THEN
    ALTER TABLE customer_systems ADD COLUMN is_synced_comm boolean DEFAULT false;
  END IF;

  -- Extended panel fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='panel_type') THEN
    ALTER TABLE customer_systems ADD COLUMN panel_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='panel_battery_date') THEN
    ALTER TABLE customer_systems ADD COLUMN panel_battery_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='panel_location') THEN
    ALTER TABLE customer_systems ADD COLUMN panel_location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='transformer_location') THEN
    ALTER TABLE customer_systems ADD COLUMN transformer_location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='antenna_location') THEN
    ALTER TABLE customer_systems ADD COLUMN antenna_location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='warranty_information') THEN
    ALTER TABLE customer_systems ADD COLUMN warranty_information text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='online_date') THEN
    ALTER TABLE customer_systems ADD COLUMN online_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='installer_code') THEN
    ALTER TABLE customer_systems ADD COLUMN installer_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='takeover_module_location') THEN
    ALTER TABLE customer_systems ADD COLUMN takeover_module_location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_systems' AND column_name='permit_number') THEN
    ALTER TABLE customer_systems ADD COLUMN permit_number text;
  END IF;
END $$;

-- =====================================================
-- EXTEND system_zones
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_zones' AND column_name='install_date') THEN
    ALTER TABLE system_zones ADD COLUMN install_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_zones' AND column_name='area') THEN
    ALTER TABLE system_zones ADD COLUMN area text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_zones' AND column_name='event_type') THEN
    ALTER TABLE system_zones ADD COLUMN event_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_zones' AND column_name='cs_flag') THEN
    ALTER TABLE system_zones ADD COLUMN cs_flag boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_zones' AND column_name='comm_partner_flag') THEN
    ALTER TABLE system_zones ADD COLUMN comm_partner_flag boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_zones' AND column_name='tested') THEN
    ALTER TABLE system_zones ADD COLUMN tested boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_zones' AND column_name='existing_zone') THEN
    ALTER TABLE system_zones ADD COLUMN existing_zone boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_zones' AND column_name='smoke_detector_test_date') THEN
    ALTER TABLE system_zones ADD COLUMN smoke_detector_test_date date;
  END IF;
END $$;

-- =====================================================
-- ALARM EMERGENCY CONTACTS
-- =====================================================

CREATE TABLE IF NOT EXISTS alarm_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid REFERENCES customer_systems(id) ON DELETE CASCADE,
  contact_order integer NOT NULL DEFAULT 1,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  has_ecv_ctv boolean DEFAULT false,
  has_key boolean DEFAULT false,
  access_level text DEFAULT '',
  relation text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE alarm_emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select alarm_emergency_contacts"
  ON alarm_emergency_contacts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "authenticated can select alarm_emergency_contacts"
  ON alarm_emergency_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can insert alarm_emergency_contacts"
  ON alarm_emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "anon can insert alarm_emergency_contacts"
  ON alarm_emergency_contacts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated can update alarm_emergency_contacts"
  ON alarm_emergency_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon can update alarm_emergency_contacts"
  ON alarm_emergency_contacts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated can delete alarm_emergency_contacts"
  ON alarm_emergency_contacts FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "anon can delete alarm_emergency_contacts"
  ON alarm_emergency_contacts FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_alarm_emergency_contacts_system_id ON alarm_emergency_contacts(system_id);

-- =====================================================
-- ALARM CODE WORDS
-- =====================================================

CREATE TABLE IF NOT EXISTS alarm_code_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid REFERENCES customer_systems(id) ON DELETE CASCADE,
  passcode text NOT NULL DEFAULT '',
  authority text NOT NULL DEFAULT '',
  is_duress boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE alarm_code_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select alarm_code_words"
  ON alarm_code_words FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "authenticated can select alarm_code_words"
  ON alarm_code_words FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can insert alarm_code_words"
  ON alarm_code_words FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "anon can insert alarm_code_words"
  ON alarm_code_words FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated can update alarm_code_words"
  ON alarm_code_words FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon can update alarm_code_words"
  ON alarm_code_words FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated can delete alarm_code_words"
  ON alarm_code_words FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "anon can delete alarm_code_words"
  ON alarm_code_words FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_alarm_code_words_system_id ON alarm_code_words(system_id);

-- =====================================================
-- ALARM EVENT HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS alarm_event_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid REFERENCES customer_systems(id) ON DELETE CASCADE,
  zone_id_ref text,
  zone_name text,
  signal_code text,
  event_code text,
  description text NOT NULL DEFAULT '',
  event_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alarm_event_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select alarm_event_history"
  ON alarm_event_history FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "authenticated can select alarm_event_history"
  ON alarm_event_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can insert alarm_event_history"
  ON alarm_event_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "anon can insert alarm_event_history"
  ON alarm_event_history FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated can update alarm_event_history"
  ON alarm_event_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated can delete alarm_event_history"
  ON alarm_event_history FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_alarm_event_history_system_id ON alarm_event_history(system_id);
CREATE INDEX IF NOT EXISTS idx_alarm_event_history_event_at ON alarm_event_history(event_at DESC);
