/*
  # Seed Project Management Demo Data

  Creates realistic demonstration data for the enhanced project management module:
  - 5 projects at various stages (linked to existing companies)
  - Project phases for each project
  - Budget lines per phase
  - Change orders (various statuses)
  - Progress invoices
  - RMR records

  All IDs are dynamically resolved from existing seed data.
*/

DO $$
DECLARE
  v_company1 uuid;
  v_company2 uuid;
  v_company3 uuid;
  v_company4 uuid;
  v_company5 uuid;
  v_emp1 uuid;
  v_emp2 uuid;
  v_site1 uuid;
  v_site2 uuid;
  v_site3 uuid;
  v_proj1 uuid;
  v_proj2 uuid;
  v_proj3 uuid;
  v_proj4 uuid;
  v_proj5 uuid;
  v_phase_id uuid;
  v_phase1_p1 uuid;
  v_phase2_p1 uuid;
  v_phase3_p1 uuid;
  v_phase4_p1 uuid;
  v_phase5_p1 uuid;
  v_phase6_p1 uuid;
  v_phase1_p2 uuid;
  v_phase2_p2 uuid;
  v_phase3_p2 uuid;
  v_phase1_p3 uuid;
  v_phase2_p3 uuid;
  v_co1 uuid;
  v_co2 uuid;
BEGIN
  -- Get existing companies
  SELECT id INTO v_company1 FROM companies ORDER BY created_at LIMIT 1;
  SELECT id INTO v_company2 FROM companies ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_company3 FROM companies ORDER BY created_at OFFSET 2 LIMIT 1;
  SELECT id INTO v_company4 FROM companies ORDER BY created_at OFFSET 3 LIMIT 1;
  SELECT id INTO v_company5 FROM companies ORDER BY created_at OFFSET 4 LIMIT 1;

  -- Get existing employees
  SELECT id INTO v_emp1 FROM employees ORDER BY created_at LIMIT 1;
  SELECT id INTO v_emp2 FROM employees ORDER BY created_at OFFSET 1 LIMIT 1;

  -- Get existing sites
  SELECT id INTO v_site1 FROM sites ORDER BY created_at LIMIT 1;
  SELECT id INTO v_site2 FROM sites ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_site3 FROM sites ORDER BY created_at OFFSET 2 LIMIT 1;

  -- Only proceed if we have companies
  IF v_company1 IS NULL THEN
    RETURN;
  END IF;

  -- =====================================================
  -- PROJECT 1: Large Commercial Install - In Progress
  -- =====================================================
  INSERT INTO projects (
    id, company_id, site_id, project_manager_id, lead_technician_id,
    name, project_number, project_type, status,
    contract_value, approved_co_value, budget, actual_cost, total_billed,
    billing_type, retainage_percent, completion_percent,
    start_date, end_date,
    permit_number, permit_status, ahj_name,
    description
  ) VALUES (
    uuid_generate_v4(), v_company1, v_site1, v_emp1, v_emp2,
    'Riverside Office Complex - Full Security Upgrade', 'PRJ-2026-001',
    'installation', 'active',
    185000, 12500, 165000, 94200, 74000,
    'milestone', 10, 58,
    '2026-02-01', '2026-05-15',
    'BLD-2026-4421', 'approved', 'City of Riverside Building Dept',
    'Complete security overhaul including 64-camera CCTV system, access control for 12 doors, intrusion detection, and fire alarm integration across 3 buildings.'
  ) RETURNING id INTO v_proj1;

  -- Phases for Project 1
  INSERT INTO project_phases (id, project_id, name, phase_order, status, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, labor_budget, materials_budget, other_budget, labor_actual, materials_actual, other_actual, gate_requirement, gate_met)
  VALUES (uuid_generate_v4(), v_proj1, 'Pre-Installation / Design', 0, 'completed', '2026-02-01', '2026-02-14', '2026-02-01', '2026-02-12', 3200, 0, 1500, 3200, 0, 1200, 'Approved drawings & permit', true)
  RETURNING id INTO v_phase1_p1;

  INSERT INTO project_phases (id, project_id, name, phase_order, status, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, labor_budget, materials_budget, other_budget, labor_actual, materials_actual, other_actual, gate_requirement, gate_met)
  VALUES (uuid_generate_v4(), v_proj1, 'Procurement', 1, 'completed', '2026-02-10', '2026-02-20', '2026-02-10', '2026-02-18', 800, 62000, 0, 800, 61400, 0, 'All submittals approved', true)
  RETURNING id INTO v_phase2_p1;

  INSERT INTO project_phases (id, project_id, name, phase_order, status, scheduled_start_date, scheduled_end_date, actual_start_date, labor_budget, materials_budget, other_budget, labor_actual, materials_actual, gate_requirement, gate_met)
  VALUES (uuid_generate_v4(), v_proj1, 'Rough-In (Cable Pulls & Conduit)', 2, 'completed', '2026-02-21', '2026-03-14', '2026-02-21', 18000, 8500, 0, 17800, 8200, 'Rough-in inspection pass', true)
  RETURNING id INTO v_phase3_p1;

  INSERT INTO project_phases (id, project_id, name, phase_order, status, scheduled_start_date, scheduled_end_date, actual_start_date, labor_budget, materials_budget, other_budget, labor_actual, materials_actual, gate_requirement, gate_met)
  VALUES (uuid_generate_v4(), v_proj1, 'Device Installation & Trim', 3, 'in_progress', '2026-03-15', '2026-04-11', '2026-03-15', 22000, 12000, 0, 1600, 800, 'Phase 2 complete', true)
  RETURNING id INTO v_phase4_p1;

  INSERT INTO project_phases (id, project_id, name, phase_order, status, scheduled_start_date, scheduled_end_date, labor_budget, materials_budget, other_budget, gate_requirement, gate_met)
  VALUES (uuid_generate_v4(), v_proj1, 'Programming & Commissioning', 4, 'not_started', '2026-04-12', '2026-04-30', 14000, 2000, 0, 'Device install 100% complete', false)
  RETURNING id INTO v_phase5_p1;

  INSERT INTO project_phases (id, project_id, name, phase_order, status, scheduled_start_date, scheduled_end_date, labor_budget, materials_budget, other_budget, gate_requirement, gate_met)
  VALUES (uuid_generate_v4(), v_proj1, 'Final Inspection & Customer Handoff', 5, 'not_started', '2026-05-01', '2026-05-15', 4000, 0, 800, 'AHJ final inspection pass', false)
  RETURNING id INTO v_phase6_p1;

  -- Budget lines for Project 1
  INSERT INTO project_budget_lines (project_id, phase_id, cost_type, description, budgeted_amount, actual_amount) VALUES
    (v_proj1, v_phase1_p1, 'labor', 'Site survey & design engineering', 3200, 3200),
    (v_proj1, v_phase1_p1, 'other', 'Permit fees & AHJ submissions', 1500, 1200),
    (v_proj1, v_phase2_p1, 'materials', 'Camera systems (64x Axis P3245-V)', 28000, 27800),
    (v_proj1, v_phase2_p1, 'materials', 'Access control panels & readers (HID)', 18000, 17900),
    (v_proj1, v_phase2_p1, 'materials', 'Intrusion panel, sensors & keypads', 9500, 9200),
    (v_proj1, v_phase2_p1, 'materials', 'Cable, conduit & mounting hardware', 6500, 6500),
    (v_proj1, v_phase3_p1, 'labor', 'Cable pull crew - 3 techs x 15 days', 18000, 17800),
    (v_proj1, v_phase3_p1, 'materials', 'Additional conduit & j-boxes', 8500, 8200),
    (v_proj1, v_phase4_p1, 'labor', 'Device installation - 2 techs x 20 days', 22000, 1600),
    (v_proj1, v_phase4_p1, 'materials', 'Mounting brackets & finish hardware', 12000, 800),
    (v_proj1, v_phase5_p1, 'labor', 'Programming & commissioning - lead tech', 14000, 0),
    (v_proj1, v_phase5_p1, 'materials', 'Programming licenses & software', 2000, 0),
    (v_proj1, v_phase6_p1, 'labor', 'Final inspection, training & closeout', 4000, 0),
    (v_proj1, v_phase6_p1, 'other', 'UL certificate & documentation', 800, 0);

  -- Change Orders for Project 1
  INSERT INTO change_orders (id, project_id, co_number, title, description, status, reason, submitted_date, approved_date, approved_by, subtotal, tax, total, impact_schedule_days, created_by)
  VALUES (uuid_generate_v4(), v_proj1, 'CO-001', 'Add 8 Additional Cameras - Parking Structure', 
    'Customer requested coverage of parking structure (not in original scope). Includes 8 additional IP cameras, cable runs, and NVR storage expansion.',
    'approved', 'Customer requested scope addition', '2026-03-05', '2026-03-09', 'James Whitfield (GM)',
    11364, 1136, 12500, 7, v_emp1)
  RETURNING id INTO v_co1;

  INSERT INTO change_order_line_items (change_order_id, description, cost_type, quantity, unit_price, unit_cost, total) VALUES
    (v_co1, 'Axis P3245-V IP Camera', 'materials', 8, 485, 285, 3880),
    (v_co1, 'Cat6 cable runs - parking structure', 'materials', 1, 1800, 1200, 1800),
    (v_co1, 'NVR storage expansion (4TB)', 'materials', 2, 420, 280, 840),
    (v_co1, 'Installation labor - 2 techs x 3 days', 'labor', 1, 4800, 4800, 4800),
    (v_co1, 'Conduit & mounting hardware', 'materials', 1, 444, 300, 444);

  INSERT INTO change_orders (id, project_id, co_number, title, description, status, reason, submitted_date, created_by)
  VALUES (uuid_generate_v4(), v_proj1, 'CO-002', 'Intercom System at Main Entrance',
    'Customer wants a video intercom system at the lobby entrance connected to the access control system. Two-way audio/video, door release integration.',
    'submitted', 'Customer requested upgrade', '2026-04-02',
    v_emp1)
  RETURNING id INTO v_co2;

  INSERT INTO change_order_line_items (change_order_id, description, cost_type, quantity, unit_price, unit_cost, total) VALUES
    (v_co2, '2N IP Verso intercom station', 'materials', 1, 1250, 820, 1250),
    (v_co2, '2N Indoor answering unit', 'materials', 2, 380, 245, 760),
    (v_co2, 'Installation & programming', 'labor', 1, 1400, 1400, 1400),
    (v_co2, 'Integration with existing AC system', 'labor', 1, 600, 600, 600);

  UPDATE change_orders SET subtotal = 4010, tax = 401, total = 4411 WHERE id = v_co2;

  -- Progress Invoices for Project 1
  INSERT INTO progress_invoices (project_id, pi_number, title, billing_type, milestone_name, phase_id, percent_complete, scheduled_value, work_completed, total_earned, less_previous_billed, current_payment_due, retainage_amount, status, invoice_date, due_date, sent_date, paid_date)
  VALUES
    (v_proj1, 'PI-2026-001-01', 'Milestone 1 - Contract Execution & Mobilization', 'milestone', 'Contract Signing', v_phase1_p1, 20, 37000, 37000, 37000, 0, 33300, 3700, 'paid', '2026-02-01', '2026-03-03', '2026-02-01', '2026-02-28'),
    (v_proj1, 'PI-2026-001-02', 'Milestone 2 - Rough-In Complete', 'milestone', 'Rough-In Complete', v_phase3_p1, 40, 37000, 37000, 74000, 37000, 33300, 3700, 'paid', '2026-03-18', '2026-04-17', '2026-03-18', '2026-04-10'),
    (v_proj1, 'PI-2026-001-03', 'Milestone 3 - Device Installation 50% Complete', 'milestone', 'Device Install 50%', v_phase4_p1, 60, 37000, 18500, 92500, 74000, 7500, 925, 'sent', '2026-04-05', '2026-05-05', '2026-04-05', NULL),
    (v_proj1, 'PI-2026-001-04', 'Milestone 4 - System Programming Complete', 'milestone', 'Programming Complete', v_phase5_p1, 80, 37000, 0, 0, 92500, 0, 0, 'draft', NULL, NULL, NULL, NULL),
    (v_proj1, 'PI-2026-001-05', 'Milestone 5 - Final Acceptance & Retainage', 'milestone', 'Final Acceptance', v_phase6_p1, 100, 37000, 0, 0, 129500, 0, 0, 'draft', NULL, NULL, NULL, NULL);

  -- RMR for Project 1
  INSERT INTO project_rmr (project_id, company_id, site_id, monitoring_type, monthly_rate, contract_term_months, start_date, status, service_includes)
  VALUES (v_proj1, v_company1, v_site1, 'central_station', 285, 36, '2026-05-16', 'pending',
    ARRAY['24/7 Central Station Monitoring', 'Video Verification', 'Access Control Managed Services', 'Quarterly Inspection']);

  -- =====================================================
  -- PROJECT 2: Medium Residential/Small Commercial - Nearly Complete
  -- =====================================================
  INSERT INTO projects (
    id, company_id, site_id, project_manager_id, lead_technician_id,
    name, project_number, project_type, status,
    contract_value, approved_co_value, budget, actual_cost, total_billed,
    billing_type, completion_percent,
    start_date, end_date,
    description
  ) VALUES (
    uuid_generate_v4(), v_company2, v_site2, v_emp1, v_emp2,
    'Greenfield Dental Group - Alarm & Camera Install', 'PRJ-2026-002',
    'installation', 'active',
    28500, 0, 24800, 23100, 21375,
    'milestone', 85,
    '2026-03-10', '2026-04-18',
    'Complete security package for dental practice: 8 cameras, intrusion system, panic buttons, and after-hours access control.'
  ) RETURNING id INTO v_proj2;

  INSERT INTO project_phases (id, project_id, name, phase_order, status, actual_start_date, actual_end_date, labor_budget, materials_budget, labor_actual, materials_actual, gate_requirement, gate_met)
  VALUES (uuid_generate_v4(), v_proj2, 'Pre-Installation & Design', 0, 'completed', '2026-03-10', '2026-03-13', 800, 0, 800, 0, 'Site walkthrough complete', true)
  RETURNING id INTO v_phase1_p2;

  INSERT INTO project_phases (id, project_id, name, phase_order, status, actual_start_date, actual_end_date, labor_budget, materials_budget, labor_actual, materials_actual, gate_requirement, gate_met)
  VALUES (uuid_generate_v4(), v_proj2, 'Installation', 1, 'completed', '2026-03-18', '2026-04-05', 9600, 12000, 9400, 11800, 'All equipment installed', true)
  RETURNING id INTO v_phase2_p2;

  INSERT INTO project_phases (id, project_id, name, phase_order, status, actual_start_date, scheduled_end_date, labor_budget, materials_budget, labor_actual, gate_requirement, gate_met)
  VALUES (uuid_generate_v4(), v_proj2, 'Programming, Testing & Handoff', 2, 'in_progress', '2026-04-08', '2026-04-18', 2400, 0, 1100, 'Customer sign-off', false)
  RETURNING id INTO v_phase3_p2;

  INSERT INTO progress_invoices (project_id, pi_number, title, billing_type, milestone_name, percent_complete, scheduled_value, work_completed, total_earned, less_previous_billed, current_payment_due, status, invoice_date, due_date, paid_date)
  VALUES
    (v_proj2, 'PI-2026-002-01', 'Deposit - Contract Execution', 'milestone', 'Deposit', 25, 7125, 7125, 7125, 0, 7125, 'paid', '2026-03-10', '2026-03-17', '2026-03-14'),
    (v_proj2, 'PI-2026-002-02', 'Installation Complete', 'milestone', 'Installation Complete', 75, 14250, 14250, 21375, 7125, 14250, 'paid', '2026-04-06', '2026-05-06', '2026-04-20'),
    (v_proj2, 'PI-2026-002-03', 'Final - System Acceptance', 'milestone', 'Final Acceptance', 100, 7125, 0, 0, 21375, 0, 'draft', NULL, NULL, NULL);

  INSERT INTO project_rmr (project_id, company_id, site_id, monitoring_type, monthly_rate, contract_term_months, start_date, status, service_includes)
  VALUES (v_proj2, v_company2, v_site2, 'central_station', 65, 36, '2026-04-19', 'pending',
    ARRAY['24/7 Central Station Monitoring', 'Annual Inspection', 'Panic Button Response']);

  -- =====================================================
  -- PROJECT 3: Planning Stage - New Project
  -- =====================================================
  INSERT INTO projects (
    id, company_id, site_id, project_manager_id,
    name, project_number, project_type, status,
    contract_value, approved_co_value, budget, actual_cost, total_billed,
    billing_type, completion_percent,
    start_date, end_date,
    permit_status,
    description
  ) VALUES (
    uuid_generate_v4(), v_company3, v_site3, v_emp1,
    'Summit Industrial Park - Building C Fire & Intrusion', 'PRJ-2026-003',
    'installation', 'planning',
    52000, 0, 46500, 0, 0,
    'milestone', 0,
    '2026-05-01', '2026-07-30',
    'pending',
    'Full fire alarm system (NFPA 72 compliant), intrusion detection, and 24 cameras for 80,000 sq ft warehouse facility.'
  ) RETURNING id INTO v_proj3;

  INSERT INTO project_phases (project_id, name, phase_order, status, scheduled_start_date, scheduled_end_date, labor_budget, materials_budget, other_budget, gate_requirement)
  VALUES
    (v_proj3, 'Pre-Installation / Design', 0, 'not_started', '2026-05-01', '2026-05-14', 3500, 0, 2200, 'Approved drawings & permit'),
    (v_proj3, 'Procurement', 1, 'not_started', '2026-05-12', '2026-05-23', 600, 22000, 0, 'Submittals approved'),
    (v_proj3, 'Rough-In', 2, 'not_started', '2026-05-26', '2026-06-20', 14000, 4500, 0, 'Rough-in inspection'),
    (v_proj3, 'Device Installation', 3, 'not_started', '2026-06-23', '2026-07-18', 12000, 5500, 0, 'Devices installed'),
    (v_proj3, 'Programming & Testing', 4, 'not_started', '2026-07-21', '2026-07-25', 5000, 0, 0, 'System test pass'),
    (v_proj3, 'Final Inspection & Closeout', 5, 'not_started', '2026-07-28', '2026-07-30', 2500, 0, 700, 'AHJ sign-off');

  -- =====================================================
  -- PROJECT 4: On Hold
  -- =====================================================
  IF v_company4 IS NOT NULL THEN
    INSERT INTO projects (
      id, company_id, project_manager_id,
      name, project_number, project_type, status,
      contract_value, approved_co_value, budget, actual_cost, total_billed,
      billing_type, completion_percent,
      start_date, end_date,
      description
    ) VALUES (
      uuid_generate_v4(), v_company4, v_emp2,
      'Metro Bank - Branch Security Standardization', 'PRJ-2026-004',
      'installation', 'on_hold',
      94000, 0, 82000, 18400, 18800,
      'milestone', 20,
      '2026-03-01', '2026-06-30',
      'Standardize security across 3 branch locations. Camera upgrades, new access control, ATM monitoring integration. On hold pending corporate approval of scope changes.'
    ) RETURNING id INTO v_proj4;

    INSERT INTO project_phases (project_id, name, phase_order, status, actual_start_date, actual_end_date, labor_budget, materials_budget, labor_actual, materials_actual)
    VALUES
      (v_proj4, 'Design & Engineering', 0, 'completed', '2026-03-01', '2026-03-10', 4000, 0, 4000, 0),
      (v_proj4, 'Branch 1 - Installation', 1, 'in_progress', '2026-03-11', NULL, 18000, 32000, 10200, 8200),
      (v_proj4, 'Branch 2 - Installation', 2, 'not_started', NULL, NULL, 18000, 0, 0, 0),
      (v_proj4, 'Branch 3 - Installation', 3, 'not_started', NULL, NULL, 18000, 0, 0, 0),
      (v_proj4, 'Final Testing & Training', 4, 'not_started', NULL, NULL, 6000, 0, 0, 0);
  END IF;

  -- =====================================================
  -- PROJECT 5: Completed
  -- =====================================================
  IF v_company5 IS NOT NULL THEN
    INSERT INTO projects (
      id, company_id, project_manager_id, lead_technician_id,
      name, project_number, project_type, status,
      contract_value, approved_co_value, budget, actual_cost, total_billed,
      billing_type, completion_percent,
      start_date, end_date,
      description
    ) VALUES (
      uuid_generate_v4(), v_company5, v_emp1, v_emp2,
      'Harborview Restaurant Group - POS & Camera System', 'PRJ-2026-005',
      'installation', 'completed',
      18500, 2200, 16200, 15800, 18500,
      'fixed', 100,
      '2026-01-15', '2026-02-28',
      'IP camera system for 3 restaurant locations, integrated with POS for loss prevention. Project completed on time.'
    ) RETURNING id INTO v_proj5;

    INSERT INTO project_rmr (project_id, company_id, monitoring_type, monthly_rate, contract_term_months, start_date, end_date, status, service_includes)
    VALUES (v_proj5, v_company5, 'self_monitored', 45, 24, '2026-03-01', '2028-02-28', 'active',
      ARRAY['Remote Video Monitoring', 'Quarterly Camera Cleaning', 'Annual Inspection']);
  END IF;

END $$;
