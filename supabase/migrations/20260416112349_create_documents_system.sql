/*
  # Create Documents System

  ## Overview
  A dedicated document management system for storing and organizing PDFs, contracts,
  warranties, permits, manuals, and other non-photo files. Separate from work_order_attachments
  and ticket_attachments — this is for intentional, organized document filing.

  ## New Tables

  ### documents
  - Core document record storing file metadata and context linking
  - Columns:
    - id: UUID primary key
    - file_name: Original filename displayed to users
    - file_url: Public URL to the stored file
    - file_type: MIME type (e.g., application/pdf, application/msword)
    - file_size_bytes: File size for display
    - description: Optional description/notes about the document
    - category_id: FK to document_categories for classification
    - company_id: Link to company (customer) — nullable
    - site_id: Link to specific site — nullable
    - system_id: Link to specific system — nullable
    - uploaded_by: Free-text name of who uploaded the document
    - show_in_portal: Boolean controlling customer portal visibility
    - created_at: Timestamp

  ### document_categories
  - User-defined category tags (Contract, Warranty, Permit, Manual, Proposal, etc.)
  - Columns:
    - id: UUID primary key
    - name: Category display name
    - color: Hex color for UI badges
    - created_at: Timestamp

  ## Security
  - RLS enabled on both tables
  - Anon and authenticated users can SELECT all records (matches existing pattern)
  - Only authenticated users can INSERT, UPDATE, DELETE

  ## Notes
  - This table is intentionally separate from work_order_attachments and ticket_attachments
  - Designed for organized document filing, not job-site photo documentation
  - show_in_portal flag controls what customers can see in the customer portal
*/

CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view document categories"
  ON document_categories FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view document categories"
  ON document_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert document categories"
  ON document_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update document categories"
  ON document_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete document categories"
  ON document_categories FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size_bytes bigint,
  description text,
  category_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  system_id uuid REFERENCES customer_systems(id) ON DELETE SET NULL,
  uploaded_by text NOT NULL DEFAULT 'Unknown',
  show_in_portal boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view documents"
  ON documents FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_site_id ON documents(site_id);
CREATE INDEX IF NOT EXISTS idx_documents_system_id ON documents(system_id);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_show_in_portal ON documents(show_in_portal);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

INSERT INTO document_categories (name, color) VALUES
  ('Contract', '#ef4444'),
  ('Warranty', '#f97316'),
  ('Permit', '#eab308'),
  ('Proposal', '#3b82f6'),
  ('Manual', '#6b7280'),
  ('Invoice / PO', '#8b5cf6'),
  ('Inspection Report', '#14b8a6'),
  ('Other', '#9ca3af')
ON CONFLICT DO NOTHING;
