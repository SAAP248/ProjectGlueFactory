/*
  # Seed Deals Pipeline Data

  ## Summary
  Seeds the deals table with 10 realistic security company deals covering all pipeline stages.
  Also seeds sales_quotas for the 3 existing employees.

  ## Data
  - 10 deals across all sales stages with realistic values
  - Deal activities (stage change logs) for each deal
  - Monthly quotas for each salesperson
*/

-- ─── Insert deals using known company IDs ────────────────────────────────────

INSERT INTO deals (id, company_id, title, value, sales_stage, install_status, office_status, probability, expected_close_date, close_date, lost_reason, proposal_sent_date, proposal_viewed_date, agreement_sent_date, forecast_category, stage_entered_at, description, created_at)
VALUES
  (
    gen_random_uuid(),
    '3773c9c5-5fb1-4c4c-8cb7-942b3223db26',
    'Enterprise Security System',
    75000, 'Proposal Sent', 'Not Scheduled', 'Sold', 60,
    '2026-05-15', NULL, NULL, '2026-04-10', NULL, NULL,
    'best_case', now() - interval '5 days',
    'Full enterprise camera and access control system for main campus.',
    now() - interval '12 days'
  ),
  (
    gen_random_uuid(),
    '4e03b73c-77a4-4c05-803d-4048b62d8d38',
    'Residential Alarm Package',
    8500, 'Lead', 'Not Scheduled', 'Sold', 20,
    '2026-04-25', NULL, NULL, NULL, NULL, NULL,
    'pipeline', now() - interval '2 days',
    'Basic residential alarm monitoring and door sensors.',
    now() - interval '2 days'
  ),
  (
    gen_random_uuid(),
    '7851e39e-4e37-4d65-ac1c-be09fb1a4c4b',
    'Mall Camera Upgrade',
    125000, 'Proposal Accepted', 'Scheduled', 'Contract Signed', 85,
    '2026-05-01', NULL, NULL, '2026-03-15', '2026-03-16', NULL,
    'commit', now() - interval '1 day',
    'Full camera system upgrade covering all entrances and parking structures.',
    now() - interval '30 days'
  ),
  (
    gen_random_uuid(),
    'da674d5a-a5a2-4ee3-bee2-b363512bb134',
    'Office Access Control',
    42000, 'Agreement Sent', 'Waiting on Customer', 'Contract Signed', 75,
    '2026-05-10', NULL, NULL, '2026-03-20', '2026-03-21', '2026-04-01',
    'commit', now() - interval '3 days',
    'Multi-floor access control with badge readers and visitor management.',
    now() - interval '25 days'
  ),
  (
    gen_random_uuid(),
    '4e03b73c-77a4-4c05-803d-4048b62d8d38',
    'Warehouse Security',
    38000, 'Sold', 'In Progress', 'Invoices Paid', 100,
    '2026-04-18', '2026-04-05', NULL, '2026-03-01', '2026-03-02', '2026-03-10',
    'commit', now() - interval '10 days',
    'Perimeter cameras, motion sensors, and 24/7 monitoring for warehouse facility.',
    now() - interval '45 days'
  ),
  (
    gen_random_uuid(),
    '3773c9c5-5fb1-4c4c-8cb7-942b3223db26',
    'Retail Store Security',
    22000, 'Proposal Viewed', 'Not Scheduled', 'Sold', 50,
    '2026-04-30', NULL, NULL, '2026-04-08', '2026-04-09', NULL,
    'pipeline', now() - interval '6 days',
    'Camera system and panic buttons for retail location.',
    now() - interval '7 days'
  ),
  (
    gen_random_uuid(),
    'da674d5a-a5a2-4ee3-bee2-b363512bb134',
    'Bank Branch Security',
    95000, 'Lost', 'Not Scheduled', 'Customer Cancelled', 0,
    '2026-04-20', '2026-04-12', 'Went with competitor at lower price point', '2026-03-05', '2026-03-06', NULL,
    'omitted', now() - interval '3 days',
    'High-security camera and vault monitoring for bank branch.',
    now() - interval '40 days'
  ),
  (
    gen_random_uuid(),
    '3773c9c5-5fb1-4c4c-8cb7-942b3223db26',
    'Medical Office Alarm',
    18500, 'Sold', 'Completed', 'Office Reviewed', 100,
    '2026-04-01', '2026-03-28', NULL, '2026-02-20', '2026-02-21', '2026-03-01',
    'commit', now() - interval '18 days',
    'Alarm system with medical-grade monitoring and silent panic integration.',
    now() - interval '55 days'
  ),
  (
    gen_random_uuid(),
    '4e03b73c-77a4-4c05-803d-4048b62d8d38',
    'Restaurant Security',
    15000, 'Did not sell', 'Not Scheduled', 'Customer Cancelled', 0,
    '2026-04-15', '2026-04-13', 'Budget constraints - postponed indefinitely', NULL, NULL, NULL,
    'omitted', now() - interval '2 days',
    'POS-integrated camera system for restaurant chain location.',
    now() - interval '20 days'
  ),
  (
    gen_random_uuid(),
    '7851e39e-4e37-4d65-ac1c-be09fb1a4c4b',
    'Hotel Security Upgrade',
    145000, 'Proposal Sent', 'Not Scheduled', 'Sold', 55,
    '2026-06-01', NULL, NULL, '2026-04-14', NULL, NULL,
    'best_case', now() - interval '1 day',
    'Complete security overhaul for 200-room hotel including lobby, corridors, and parking.',
    now() - interval '1 day'
  )
ON CONFLICT DO NOTHING;

-- ─── Seed sales_quotas for existing employees ────────────────────────────────

INSERT INTO sales_quotas (employee_id, period_type, period_year, period_month, quota_amount)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'monthly', 2026, 4, 80000),
  ('11111111-1111-1111-1111-111111111111', 'monthly', 2026, 5, 80000),
  ('22222222-2222-2222-2222-222222222222', 'monthly', 2026, 4, 60000),
  ('22222222-2222-2222-2222-222222222222', 'monthly', 2026, 5, 60000),
  ('33333333-3333-3333-3333-333333333333', 'monthly', 2026, 4, 70000),
  ('33333333-3333-3333-3333-333333333333', 'monthly', 2026, 5, 70000)
ON CONFLICT DO NOTHING;

-- ─── Seed deal activities for some deals ─────────────────────────────────────

DO $$
DECLARE
  v_deal_id uuid;
BEGIN
  -- Log initial creation activities for the Mall Camera Upgrade
  SELECT id INTO v_deal_id FROM deals WHERE title = 'Mall Camera Upgrade' LIMIT 1;
  IF v_deal_id IS NOT NULL THEN
    INSERT INTO deal_activities (deal_id, activity_type, description, old_value, new_value, created_at)
    VALUES
      (v_deal_id, 'stage_change', 'Deal moved from Lead to Proposal Sent', 'Lead', 'Proposal Sent', now() - interval '25 days'),
      (v_deal_id, 'stage_change', 'Deal moved from Proposal Sent to Proposal Viewed', 'Proposal Sent', 'Proposal Viewed', now() - interval '24 days'),
      (v_deal_id, 'stage_change', 'Deal moved from Proposal Viewed to Proposal Accepted', 'Proposal Viewed', 'Proposal Accepted', now() - interval '15 days'),
      (v_deal_id, 'note', 'Customer confirmed budget approval. Scheduling install team.', NULL, NULL, now() - interval '14 days');
  END IF;

  -- Log activities for Warehouse Security
  SELECT id INTO v_deal_id FROM deals WHERE title = 'Warehouse Security' LIMIT 1;
  IF v_deal_id IS NOT NULL THEN
    INSERT INTO deal_activities (deal_id, activity_type, description, old_value, new_value, created_at)
    VALUES
      (v_deal_id, 'stage_change', 'Deal moved from Lead to Proposal Sent', 'Lead', 'Proposal Sent', now() - interval '40 days'),
      (v_deal_id, 'stage_change', 'Deal marked as Sold', 'Agreement Sent', 'Sold', now() - interval '10 days'),
      (v_deal_id, 'note', 'Install team on site - Phase 1 complete.', NULL, NULL, now() - interval '5 days');
  END IF;

  -- Log activities for Bank Branch Security (lost deal)
  SELECT id INTO v_deal_id FROM deals WHERE title = 'Bank Branch Security' LIMIT 1;
  IF v_deal_id IS NOT NULL THEN
    INSERT INTO deal_activities (deal_id, activity_type, description, old_value, new_value, created_at)
    VALUES
      (v_deal_id, 'stage_change', 'Deal moved from Proposal Sent to Proposal Accepted', 'Proposal Sent', 'Proposal Accepted', now() - interval '30 days'),
      (v_deal_id, 'stage_change', 'Deal marked as Lost', 'Proposal Accepted', 'Lost', now() - interval '3 days'),
      (v_deal_id, 'note', 'Lost to competitor. Follow up in Q3 for renewal opportunity.', NULL, NULL, now() - interval '3 days');
  END IF;
END $$;
