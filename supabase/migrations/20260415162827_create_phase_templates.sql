/*
  # Phase Templates System

  ## Purpose
  Allows users to create reusable phase template sets that can be selected when creating
  a new project or applied to an existing project's phases.

  ## New Tables

  ### phase_templates
  - Stores named template sets (e.g., "Small Residential", "Large Commercial")
  - `is_builtin` flag marks system-provided templates (readable by all, not deletable)
  - `description` explains the intended use case
  - `phase_count` is a computed helper column (not stored, derived at query time)

  ### phase_template_items
  - Individual phases within a template
  - `phase_order` determines the sequential position
  - `gate_requirement` is optional text for phase gate conditions

  ## Security
  - RLS enabled on both tables
  - Anonymous (anon) role can read all templates (consistent with existing table policies)
  - Anon role can insert/update/delete non-builtin templates (user-created)
  - Builtin templates are protected from deletion via policy
*/

CREATE TABLE IF NOT EXISTS phase_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phase_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES phase_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  phase_order integer NOT NULL DEFAULT 0,
  gate_requirement text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phase_template_items_template ON phase_template_items(template_id, phase_order);

ALTER TABLE phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read all phase templates"
  ON phase_templates FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert custom phase templates"
  ON phase_templates FOR INSERT
  TO anon
  WITH CHECK (is_builtin = false);

CREATE POLICY "Anon can update custom phase templates"
  ON phase_templates FOR UPDATE
  TO anon
  USING (is_builtin = false)
  WITH CHECK (is_builtin = false);

CREATE POLICY "Anon can delete custom phase templates"
  ON phase_templates FOR DELETE
  TO anon
  USING (is_builtin = false);

CREATE POLICY "Anon can read all phase template items"
  ON phase_template_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert phase template items"
  ON phase_template_items FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM phase_templates pt
      WHERE pt.id = template_id AND pt.is_builtin = false
    )
  );

CREATE POLICY "Anon can update phase template items"
  ON phase_template_items FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM phase_templates pt
      WHERE pt.id = template_id AND pt.is_builtin = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM phase_templates pt
      WHERE pt.id = template_id AND pt.is_builtin = false
    )
  );

CREATE POLICY "Anon can delete phase template items"
  ON phase_template_items FOR DELETE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM phase_templates pt
      WHERE pt.id = template_id AND pt.is_builtin = false
    )
  );
