/*
  # Add Lead Systems, Products, and Photos Tables

  ## Summary
  Extends the leads module so field reps can capture system interests, 
  rough product scoping, and site photos directly on a lead — before 
  converting to a deal. All three tables cascade-delete when the lead 
  is deleted.

  ## New Tables

  ### lead_systems
  Tracks which security system types a prospect is interested in.
  - `id` - primary key
  - `lead_id` - FK to leads
  - `system_type_id` - FK to system_types (optional, for catalog lookup)
  - `system_type_name` - display name (denormalized for stability)
  - `system_type_icon` - icon name from lucide-react
  - `system_type_color` - color hex/class for icon
  - `package_id` - optional package selected (FK to packages)
  - `package_name` - denormalized package name
  - `notes` - free-form notes for this system
  - `sort_order` - ordering

  ### lead_line_items
  Rough product/pricing interest captured on the lead (no proposal sent).
  - `id` - primary key
  - `lead_id` - FK to leads
  - `product_id` - optional FK to products catalog
  - `description` - line item description
  - `quantity` - quantity
  - `unit_cost` - optional cost
  - `unit_price` - selling price
  - `sort_order` - ordering

  ### lead_photos
  Photos taken or uploaded during a site visit for the lead.
  - `id` - primary key
  - `lead_id` - FK to leads
  - `file_url` - URL of the stored image
  - `caption` - optional caption
  - `created_at` - timestamp

  ## Security
  - RLS enabled on all three tables
  - Anon SELECT allowed (matching existing pattern in this project)
  - Anon INSERT/UPDATE/DELETE allowed (matching existing pattern)
*/

-- lead_systems
CREATE TABLE IF NOT EXISTS lead_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  system_type_id uuid REFERENCES system_types(id) ON DELETE SET NULL,
  system_type_name text NOT NULL DEFAULT '',
  system_type_icon text NOT NULL DEFAULT 'Shield',
  system_type_color text NOT NULL DEFAULT 'blue',
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  package_name text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select lead_systems"
  ON lead_systems FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert lead_systems"
  ON lead_systems FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update lead_systems"
  ON lead_systems FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete lead_systems"
  ON lead_systems FOR DELETE
  TO anon
  USING (true);

-- lead_line_items
CREATE TABLE IF NOT EXISTS lead_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select lead_line_items"
  ON lead_line_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert lead_line_items"
  ON lead_line_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update lead_line_items"
  ON lead_line_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete lead_line_items"
  ON lead_line_items FOR DELETE
  TO anon
  USING (true);

-- lead_photos
CREATE TABLE IF NOT EXISTS lead_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select lead_photos"
  ON lead_photos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert lead_photos"
  ON lead_photos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update lead_photos"
  ON lead_photos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete lead_photos"
  ON lead_photos FOR DELETE
  TO anon
  USING (true);
