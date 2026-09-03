/*
# Allow anon role to manage documents and document categories

1. Security Changes
   - Add INSERT, UPDATE, DELETE policies for anon on `documents`
   - Add INSERT, UPDATE, DELETE policies for anon on `document_categories`
   - This app has no auth, so anon needs full CRUD access

2. Notes
   - SELECT policies for anon already exist on both tables
   - Existing authenticated policies are left untouched
*/

-- documents: anon INSERT
DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT
  TO anon WITH CHECK (true);

-- documents: anon UPDATE
DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

-- documents: anon DELETE
DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE
  TO anon USING (true);

-- document_categories: anon INSERT
DROP POLICY IF EXISTS "anon_insert_document_categories" ON document_categories;
CREATE POLICY "anon_insert_document_categories" ON document_categories FOR INSERT
  TO anon WITH CHECK (true);

-- document_categories: anon UPDATE
DROP POLICY IF EXISTS "anon_update_document_categories" ON document_categories;
CREATE POLICY "anon_update_document_categories" ON document_categories FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

-- document_categories: anon DELETE
DROP POLICY IF EXISTS "anon_delete_document_categories" ON document_categories;
CREATE POLICY "anon_delete_document_categories" ON document_categories FOR DELETE
  TO anon USING (true);
