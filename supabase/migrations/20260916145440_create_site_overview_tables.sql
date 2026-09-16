/*
# Create Site Overview tables: vendors, site_vendors, site_service_providers, site_rooms
# Add gate_code/wifi columns to sites, add room_id/last_service_date to site_inventory

## 1. New Tables

### vendors (global master list)
- id (uuid, PK)
- name (text, not null) — company name
- trade_type (text) — Plumber, Electrician, HVAC, Locksmith, General Contractor, Roofing, Landscaping, Painting, Other
- contact_name (text)
- phone (text)
- email (text)
- website (text)
- notes (text)
- created_at, updated_at (timestamptz)

### site_vendors (many-to-many linking vendors to sites)
- id (uuid, PK)
- site_id (uuid, FK → sites)
- vendor_id (uuid, FK → vendors)
- notes (text) — site-specific notes about this vendor relationship
- created_at (timestamptz)
- UNIQUE(site_id, vendor_id)

### site_service_providers (per-site utility/service companies)
- id (uuid, PK)
- site_id (uuid, FK → sites)
- provider_name (text, not null)
- service_type (text) — Internet, Electric, Gas, Water, Phone, Cable, Security Monitoring, Other
- account_number (text)
- phone (text)
- email (text)
- notes (text)
- created_at, updated_at (timestamptz)

### site_rooms (rooms within a site for equipment organization)
- id (uuid, PK)
- site_id (uuid, FK → sites)
- name (text, not null)
- floor_level (text) — e.g. "1st Floor", "2nd Floor", "Basement"
- room_type (text) — Bedroom, Bathroom, Living Area, Kitchen, Office, Server Room, Garage, Closet, Utility, Other
- photo_url (text) — optional room photo
- notes (text)
- sort_order (integer, default 0)
- created_at, updated_at (timestamptz)

## 2. Modified Tables

### sites — added columns:
- gate_code (text) — gate/entry code
- wifi_network (text) — Wi-Fi network name
- wifi_password (text) — Wi-Fi password

### site_inventory — added columns:
- room_id (uuid, FK → site_rooms) — which room this equipment is in
- last_service_date (date) — last serviced date

## 3. Security
- RLS enabled on all new tables
- Anon + authenticated CRUD policies (single-tenant, no auth)

## 4. Indexes
- vendors: name, trade_type
- site_vendors: site_id, vendor_id
- site_service_providers: site_id
- site_rooms: site_id
- site_inventory: room_id
*/

-- ============================================================
-- 1. vendors (global master list)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trade_type text DEFAULT 'Other',
  contact_name text,
  phone text,
  email text,
  website text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vendors" ON vendors;
CREATE POLICY "anon_select_vendors" ON vendors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vendors" ON vendors;
CREATE POLICY "anon_insert_vendors" ON vendors FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vendors" ON vendors;
CREATE POLICY "anon_update_vendors" ON vendors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vendors" ON vendors;
CREATE POLICY "anon_delete_vendors" ON vendors FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_trade_type ON vendors(trade_type);

-- ============================================================
-- 2. site_vendors (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(site_id, vendor_id)
);

ALTER TABLE site_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_site_vendors" ON site_vendors;
CREATE POLICY "anon_select_site_vendors" ON site_vendors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_site_vendors" ON site_vendors;
CREATE POLICY "anon_insert_site_vendors" ON site_vendors FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_site_vendors" ON site_vendors;
CREATE POLICY "anon_update_site_vendors" ON site_vendors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_site_vendors" ON site_vendors;
CREATE POLICY "anon_delete_site_vendors" ON site_vendors FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_site_vendors_site_id ON site_vendors(site_id);
CREATE INDEX IF NOT EXISTS idx_site_vendors_vendor_id ON site_vendors(vendor_id);

-- ============================================================
-- 3. site_service_providers
-- ============================================================
CREATE TABLE IF NOT EXISTS site_service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  service_type text DEFAULT 'Other',
  account_number text,
  phone text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_service_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_site_service_providers" ON site_service_providers;
CREATE POLICY "anon_select_site_service_providers" ON site_service_providers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_site_service_providers" ON site_service_providers;
CREATE POLICY "anon_insert_site_service_providers" ON site_service_providers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_site_service_providers" ON site_service_providers;
CREATE POLICY "anon_update_site_service_providers" ON site_service_providers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_site_service_providers" ON site_service_providers;
CREATE POLICY "anon_delete_site_service_providers" ON site_service_providers FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_site_service_providers_site_id ON site_service_providers(site_id);

-- ============================================================
-- 4. site_rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS site_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  floor_level text,
  room_type text DEFAULT 'Other',
  photo_url text,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_site_rooms" ON site_rooms;
CREATE POLICY "anon_select_site_rooms" ON site_rooms FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_site_rooms" ON site_rooms;
CREATE POLICY "anon_insert_site_rooms" ON site_rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_site_rooms" ON site_rooms;
CREATE POLICY "anon_update_site_rooms" ON site_rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_site_rooms" ON site_rooms;
CREATE POLICY "anon_delete_site_rooms" ON site_rooms FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_site_rooms_site_id ON site_rooms(site_id);

-- ============================================================
-- 5. Add columns to sites
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sites' AND column_name='gate_code') THEN
    ALTER TABLE sites ADD COLUMN gate_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sites' AND column_name='wifi_network') THEN
    ALTER TABLE sites ADD COLUMN wifi_network text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sites' AND column_name='wifi_password') THEN
    ALTER TABLE sites ADD COLUMN wifi_password text;
  END IF;
END $$;

-- ============================================================
-- 6. Add columns to site_inventory
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='room_id') THEN
    ALTER TABLE site_inventory ADD COLUMN room_id uuid REFERENCES site_rooms(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_inventory' AND column_name='last_service_date') THEN
    ALTER TABLE site_inventory ADD COLUMN last_service_date date;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_site_inventory_room_id ON site_inventory(room_id);
