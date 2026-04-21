/*
  # Seed Built-in Phase Templates

  Inserts 4 system-provided phase templates covering the most common alarm/security
  installation job sizes. These are marked is_builtin=true so they are read-only
  for end users (cannot be deleted, but can be duplicated as custom templates).

  Templates:
  1. Quick Service / Small Residential — 3 phases
  2. Standard Residential Install — 5 phases
  3. Standard Commercial Install — 6 phases (matches legacy default)
  4. Large Commercial / Fire Alarm — 8 phases
*/

DO $$
DECLARE
  t1 uuid;
  t2 uuid;
  t3 uuid;
  t4 uuid;
BEGIN
  -- Template 1: Quick Service / Small Residential (3 phases)
  INSERT INTO phase_templates (name, description, is_builtin)
  VALUES ('Quick Service / Small Residential', 'Ideal for simple residential camera swaps, small alarm upgrades, or single-day service calls.', true)
  RETURNING id INTO t1;

  INSERT INTO phase_template_items (template_id, name, phase_order) VALUES
    (t1, 'Site Survey & Scope', 0),
    (t1, 'Installation', 1),
    (t1, 'Customer Handoff & Sign-Off', 2);

  -- Template 2: Standard Residential Install (5 phases)
  INSERT INTO phase_templates (name, description, is_builtin)
  VALUES ('Standard Residential Install', 'Full residential security system installation with programming and customer training.', true)
  RETURNING id INTO t2;

  INSERT INTO phase_template_items (template_id, name, phase_order) VALUES
    (t2, 'Pre-Installation / Design', 0),
    (t2, 'Rough-In & Cable Run', 1),
    (t2, 'Device Installation & Trim', 2),
    (t2, 'Programming & Testing', 3),
    (t2, 'Customer Training & Handoff', 4);

  -- Template 3: Standard Commercial Install (6 phases) — legacy default
  INSERT INTO phase_templates (name, description, is_builtin)
  VALUES ('Standard Commercial Install', 'Full commercial installation covering procurement through final inspection. The classic 6-phase workflow.', true)
  RETURNING id INTO t3;

  INSERT INTO phase_template_items (template_id, name, phase_order) VALUES
    (t3, 'Pre-Installation / Design', 0),
    (t3, 'Procurement', 1),
    (t3, 'Rough-In', 2),
    (t3, 'Device Installation & Trim', 3),
    (t3, 'Programming & Commissioning', 4),
    (t3, 'Final Inspection & Customer Handoff', 5);

  -- Template 4: Large Commercial / Fire Alarm (8 phases)
  INSERT INTO phase_templates (name, description, is_builtin)
  VALUES ('Large Commercial / Fire Alarm (NFPA)', 'Extended workflow for large commercial or NFPA fire alarm projects requiring AHJ submittal review and witness testing.', true)
  RETURNING id INTO t4;

  INSERT INTO phase_template_items (template_id, name, phase_order, gate_requirement) VALUES
    (t4, 'Pre-Installation / Design & Engineering', 0, NULL),
    (t4, 'AHJ Submittal Review', 1, 'Drawings approved by Authority Having Jurisdiction before proceeding'),
    (t4, 'Procurement & Material Staging', 2, NULL),
    (t4, 'Rough-In & Conduit', 3, NULL),
    (t4, 'Subcontractor Coordination', 4, NULL),
    (t4, 'Device Installation & Trim', 5, NULL),
    (t4, 'Programming & Commissioning', 6, NULL),
    (t4, 'Witness Test / Final AHJ Inspection & Handoff', 7, 'AHJ witness test passed and certificate of occupancy issued');
END $$;
