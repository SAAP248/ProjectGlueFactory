/*
# Create Product Central tables

Adds supporting tables for the Product Central portal — a shared product library
where users can browse products, view photos/documents/white papers, and leave
community notes with profanity-flag moderation.

1. Modified Tables
   - `products` — adds `long_description`, `product_url`, `msrp` columns

2. New Tables
   - `product_central_photos`
     - `id` (uuid, primary key)
     - `product_id` (uuid, FK to products)
     - `url` (text, image URL)
     - `title` (text, optional caption)
     - `sort_order` (int, display ordering)
     - `created_at` (timestamp)
   - `product_central_documents`
     - `id` (uuid, primary key)
     - `product_id` (uuid, FK to products)
     - `title` (text, document name)
     - `url` (text, download URL)
     - `doc_type` (text — spec_sheet, white_paper, install_guide, manual, other)
     - `file_size_bytes` (bigint, optional)
     - `created_at` (timestamp)
   - `product_central_notes`
     - `id` (uuid, primary key)
     - `product_id` (uuid, FK to products)
     - `author_name` (text, who posted)
     - `content` (text, note body)
     - `is_flagged` (boolean, auto-set by profanity filter)
     - `is_approved` (boolean, admin can approve flagged notes)
     - `created_at` (timestamp)

3. Security
   - RLS enabled on all new tables.
   - All tables open to anon + authenticated for full CRUD (no sign-in in this app).

4. Important Notes
   - The profanity check happens client-side before insert; the `is_flagged` column
     records the result. Flagged notes show as "Under Review" to other users until
     an admin approves them.
*/

-- Enrich existing products table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'long_description'
  ) THEN
    ALTER TABLE products ADD COLUMN long_description text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'product_url'
  ) THEN
    ALTER TABLE products ADD COLUMN product_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'msrp'
  ) THEN
    ALTER TABLE products ADD COLUMN msrp decimal(10,2);
  END IF;
END $$;

-- Product Central Photos
CREATE TABLE IF NOT EXISTS product_central_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_central_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_photos_select" ON product_central_photos;
CREATE POLICY "pc_photos_select" ON product_central_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pc_photos_insert" ON product_central_photos;
CREATE POLICY "pc_photos_insert" ON product_central_photos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pc_photos_update" ON product_central_photos;
CREATE POLICY "pc_photos_update" ON product_central_photos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pc_photos_delete" ON product_central_photos;
CREATE POLICY "pc_photos_delete" ON product_central_photos FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pc_photos_product ON product_central_photos(product_id);

-- Product Central Documents
CREATE TABLE IF NOT EXISTS product_central_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  doc_type text NOT NULL DEFAULT 'other',
  file_size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_central_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_docs_select" ON product_central_documents;
CREATE POLICY "pc_docs_select" ON product_central_documents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pc_docs_insert" ON product_central_documents;
CREATE POLICY "pc_docs_insert" ON product_central_documents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pc_docs_update" ON product_central_documents;
CREATE POLICY "pc_docs_update" ON product_central_documents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pc_docs_delete" ON product_central_documents;
CREATE POLICY "pc_docs_delete" ON product_central_documents FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pc_docs_product ON product_central_documents(product_id);

-- Product Central Community Notes
CREATE TABLE IF NOT EXISTS product_central_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content text NOT NULL,
  is_flagged boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_central_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_notes_select" ON product_central_notes;
CREATE POLICY "pc_notes_select" ON product_central_notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pc_notes_insert" ON product_central_notes;
CREATE POLICY "pc_notes_insert" ON product_central_notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pc_notes_update" ON product_central_notes;
CREATE POLICY "pc_notes_update" ON product_central_notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pc_notes_delete" ON product_central_notes;
CREATE POLICY "pc_notes_delete" ON product_central_notes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pc_notes_product ON product_central_notes(product_id);
CREATE INDEX IF NOT EXISTS idx_pc_notes_flagged ON product_central_notes(is_flagged) WHERE is_flagged = true;
