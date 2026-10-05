/*
# Service Plans demo data + reset

1. New Functions
- `sp_seed_demo()` creates the 4 catalog plans (Plumbing Home Care, HVAC Comfort with v1 + v2, AV Connected Home,
  Alarm Care), add-ons, monitoring references, 12 agreements on existing customers covering every status
  (active, past due in grace, past due after grace, paused, pending renewal, canceled, expired, draft,
  pending signature), billing schedules, plan invoices (numbered SPI-xxxx), benefit ledger entries, plan visit
  work orders (numbered SPV-xxxx) and activity history. Demo date: 2026-10-05.
- `sp_reset_demo()` removes only Service Plans data (sp_ tables, plan invoices that have no portal payment,
  and seeded SPV- work orders), then re-runs `sp_seed_demo()`.

2. Data
- Runs `sp_seed_demo()` once if no plans exist yet.

3. Security
- Functions are SECURITY INVOKER, so they operate under the same RLS policies as the app.
*/

CREATE OR REPLACE FUNCTION sp_seed_demo() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $fn$
DECLARE
  demo date := '2026-10-05';
  co uuid[];
  p_plumb uuid; p_hvac uuid; p_av uuid; p_alarm uuid;
  v_plumb uuid; v_hvac1 uuid; v_hvac2 uuid; v_av uuid; v_alarm uuid;
  ad_flush uuid; ad_thermo uuid; ad_room uuid;
  sc record; ag record; occ record; b record;
  a_id uuid; v_id uuid; p_id uuid; amt integer; months integer; n integer; i integer;
  ps date; pe date; st text; inv_id uuid; inv_seq integer := 1000; wo_seq integer := 1000;
  addon_cents integer; site uuid; plan_name text; wo uuid;
BEGIN
  UPDATE sp_settings SET demo_mode = true, demo_date = demo, grace_days = 7, renewal_notice_days = 30, invoice_due_days = 15, updated_at = now() WHERE id = 1;
  INSERT INTO sp_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

  SELECT array_agg(id ORDER BY created_at, id) INTO co FROM (
    SELECT c.id, c.created_at FROM companies c
    WHERE c.parent_company_id IS NULL AND EXISTS (SELECT 1 FROM sites s WHERE s.company_id = c.id)
    ORDER BY c.created_at, c.id LIMIT 12) x;
  IF co IS NULL OR array_length(co, 1) < 12 THEN
    RAISE NOTICE 'Not enough customers with sites to seed service plans';
    RETURN;
  END IF;

  -- Plans
  INSERT INTO sp_plans (code, name, category, description, color) VALUES
    ('PLUMB-HOME', 'Plumbing Home Care', 'plumbing', 'Yearly plumbing inspection, water heater flush, priority scheduling and member labor pricing.', 'sky')
    RETURNING id INTO p_plumb;
  INSERT INTO sp_plans (code, name, category, description, color) VALUES
    ('HVAC-COMFORT', 'HVAC Comfort', 'hvac', 'Spring and fall tune-ups, filter changes, no trip fees and member discounts on repairs.', 'orange')
    RETURNING id INTO p_hvac;
  INSERT INTO sp_plans (code, name, category, description, color) VALUES
    ('AV-CONNECTED', 'AV Connected Home', 'av', 'Twice-yearly system health checks, remote support sessions and network tune-ups.', 'teal')
    RETURNING id INTO p_av;
  INSERT INTO sp_plans (code, name, category, description, color) VALUES
    ('ALARM-CARE', 'Alarm Care', 'alarm', 'Annual alarm inspection, battery replacement and priority service. Monitoring is billed separately.', 'emerald')
    RETURNING id INTO p_alarm;

  INSERT INTO sp_plan_versions (plan_id, version_number, labor_discount_bps, parts_discount_bps, priority_service, waive_trip_fee, rollover_policy, rollover_cap, cancellation_policy, terms_text, change_note, published_at)
    VALUES (p_plumb, 1, 1000, 0, true, true, 'none', 0, 'no_refund', '12-month plan. Unused visits do not carry over. Fees are non-refundable once a billing period starts.', 'Initial release', '2025-09-01')
    RETURNING id INTO v_plumb;
  INSERT INTO sp_plan_versions (plan_id, version_number, labor_discount_bps, parts_discount_bps, priority_service, waive_trip_fee, rollover_policy, rollover_cap, cancellation_policy, terms_text, change_note, published_at)
    VALUES (p_hvac, 1, 1500, 1000, true, true, 'one_period', 1, 'prorated', '12-month plan. Up to 1 unused tune-up carries into the next term. Cancellation refunds unused days of the current period.', 'Initial release', '2025-09-01')
    RETURNING id INTO v_hvac1;
  INSERT INTO sp_plan_versions (plan_id, version_number, labor_discount_bps, parts_discount_bps, priority_service, waive_trip_fee, rollover_policy, rollover_cap, cancellation_policy, terms_text, change_note, published_at)
    VALUES (p_hvac, 2, 1500, 1500, true, true, 'one_period', 1, 'prorated', '12-month plan. Up to 1 unused tune-up carries into the next term. Cancellation refunds unused days of the current period.', 'Parts discount raised to 15%', '2026-07-01')
    RETURNING id INTO v_hvac2;
  INSERT INTO sp_plan_versions (plan_id, version_number, labor_discount_bps, parts_discount_bps, priority_service, waive_trip_fee, rollover_policy, rollover_cap, cancellation_policy, terms_text, change_note, published_at)
    VALUES (p_av, 1, 1000, 500, true, false, 'one_period', 2, 'prorated', '12-month plan. Up to 2 unused remote sessions carry over.', 'Initial release', '2025-09-01')
    RETURNING id INTO v_av;
  INSERT INTO sp_plan_versions (plan_id, version_number, labor_discount_bps, parts_discount_bps, priority_service, waive_trip_fee, rollover_policy, rollover_cap, cancellation_policy, terms_text, change_note, published_at)
    VALUES (p_alarm, 1, 1000, 1000, true, true, 'one_period', 1, 'no_refund', '12-month plan. Monitoring is a separate subscription and is never included in plan billing.', 'Initial release', '2025-09-01')
    RETURNING id INTO v_alarm;

  UPDATE sp_plans SET current_version_id = v_plumb WHERE id = p_plumb;
  UPDATE sp_plans SET current_version_id = v_hvac2 WHERE id = p_hvac;
  UPDATE sp_plans SET current_version_id = v_av WHERE id = p_av;
  UPDATE sp_plans SET current_version_id = v_alarm WHERE id = p_alarm;

  INSERT INTO sp_price_options (plan_version_id, cadence, amount_cents, is_default) VALUES
    (v_plumb, 'monthly', 2000, false), (v_plumb, 'quarterly', 5500, false), (v_plumb, 'semiannual', 11000, false), (v_plumb, 'annual', 22000, true),
    (v_hvac1, 'monthly', 3500, false), (v_hvac1, 'quarterly', 9500, false), (v_hvac1, 'semiannual', 19000, false), (v_hvac1, 'annual', 38000, true),
    (v_hvac2, 'monthly', 3500, false), (v_hvac2, 'quarterly', 9500, false), (v_hvac2, 'semiannual', 19000, false), (v_hvac2, 'annual', 38000, true),
    (v_av, 'monthly', 4900, false), (v_av, 'quarterly', 13500, false), (v_av, 'semiannual', 27000, false), (v_av, 'annual', 54000, true),
    (v_alarm, 'monthly', 3000, false), (v_alarm, 'quarterly', 8250, false), (v_alarm, 'semiannual', 16500, false), (v_alarm, 'annual', 33000, true);

  INSERT INTO sp_benefits (plan_version_id, name, description, benefit_type, quantity_per_term, duration_minutes, overage_price_cents, sort_order) VALUES
    (v_plumb, 'Annual plumbing inspection', 'Whole-home inspection of fixtures, supply lines and drains.', 'visit', 1, 60, 12900, 1),
    (v_plumb, 'Water heater flush', 'Sediment flush and anode check.', 'visit', 1, 45, 9900, 2),
    (v_hvac1, 'Seasonal tune-up', 'Spring cooling and fall heating tune-up.', 'visit', 2, 90, 14900, 1),
    (v_hvac1, 'Filter replacement', 'Standard filter supplied and installed.', 'perk', 2, 15, 2500, 2),
    (v_hvac2, 'Seasonal tune-up', 'Spring cooling and fall heating tune-up.', 'visit', 2, 90, 14900, 1),
    (v_hvac2, 'Filter replacement', 'Standard filter supplied and installed.', 'perk', 2, 15, 2500, 2),
    (v_av, 'System health check', 'On-site check of network, control and AV equipment.', 'visit', 2, 60, 15000, 1),
    (v_av, 'Remote support session', 'Remote troubleshooting session with a technician.', 'remote', 6, 30, 4900, 2),
    (v_alarm, 'Annual alarm inspection', 'Sensor, siren and communicator test.', 'visit', 1, 60, 12500, 1),
    (v_alarm, 'Battery replacement', 'Panel or sensor batteries replaced at no charge.', 'perk', 1, 20, 3500, 2);

  INSERT INTO sp_addons (name, description, category, annual_amount_cents) VALUES
    ('Second water heater', 'Adds a flush for an additional water heater.', 'plumbing', 6000) RETURNING id INTO ad_flush;
  INSERT INTO sp_addons (name, description, category, annual_amount_cents) VALUES
    ('Additional HVAC system', 'Covers one more furnace or condenser.', 'hvac', 18000) RETURNING id INTO ad_thermo;
  INSERT INTO sp_addons (name, description, category, annual_amount_cents) VALUES
    ('Extra AV room', 'Adds another room or zone to health checks.', 'av', 12000) RETURNING id INTO ad_room;
  INSERT INTO sp_addons (name, description, category, annual_amount_cents) VALUES
    ('Surge protection check', 'Annual surge device inspection.', 'general', 4800);

  INSERT INTO sp_monitoring_accounts (company_id, site_id, provider, monthly_cents)
  SELECT co[k], (SELECT s.id FROM sites s WHERE s.company_id = co[k] ORDER BY s.name LIMIT 1), 'Central Station', cents
  FROM (VALUES (1, 4500), (2, 3995), (5, 3500), (8, 5500), (12, 4500)) m(k, cents);

  -- Scenario definitions
  FOR sc IN SELECT * FROM (VALUES
    (1,  'alarm', 1, 'monthly',    'active',            '2026-01-31'::date, 'card_on_file',  NULL::date, NULL::date, NULL::date, NULL::text, 'Month-end anchor: bills on the 31st or last day of month. $45 monitoring + $30 plan = $75/mo.'),
    (2,  'alarm', 1, 'annual',     'active',            '2026-01-15', 'card_on_file',  NULL, NULL, NULL, NULL, 'Annual $330 plan counts as $27.50 RMR.'),
    (3,  'hvac',  1, 'quarterly',  'active',            '2026-04-01', 'card_on_file',  NULL, NULL, NULL, NULL, 'Covers every site on the account. Still on HVAC version 1.'),
    (4,  'plumb', 1, 'semiannual', 'active',            '2026-03-15', 'card_on_file',  NULL, NULL, NULL, NULL, 'One inspection used, water heater flush scheduled.'),
    (5,  'av',    1, 'monthly',    'past_due',          '2026-05-02', 'card_declined', '2026-10-09', NULL, NULL, NULL, 'Card declined on Oct 2. Inside 7-day grace period.'),
    (6,  'hvac',  1, 'monthly',    'past_due',          '2026-02-20', 'card_declined', '2026-09-27', NULL, NULL, NULL, 'Grace period ended Sep 27. Benefits on hold.'),
    (7,  'plumb', 1, 'monthly',    'paused',            '2026-03-10', 'card_on_file',  NULL, '2026-09-01', '2026-11-01', NULL, 'Paused for the season. Billing skipped while paused.'),
    (8,  'alarm', 1, 'annual',     'pending_renewal',   '2025-10-21', 'card_on_file',  NULL, NULL, NULL, NULL, 'Term ends Oct 20. One unused inspection will roll over.'),
    (9,  'av',    1, 'annual',     'canceled',          '2026-02-01', 'card_on_file',  NULL, NULL, NULL, 'Moved out of the area', 'Canceled Aug 15. No-refund policy honored.'),
    (10, 'hvac',  1, 'annual',     'expired',           '2025-10-01', 'card_on_file',  NULL, NULL, NULL, NULL, 'Auto-renew was off. Expired Sep 30.'),
    (11, 'plumb', 1, 'annual',     'draft',             '2026-11-01', 'card_on_file',  NULL, NULL, NULL, NULL, 'Draft started by the office. Not yet sent.'),
    (12, 'hvac',  2, 'monthly',    'pending_signature', '2026-10-31', 'card_on_file',  NULL, NULL, NULL, NULL, 'Sent for signature on HVAC version 2. Starts Oct 31.')
  ) s(k, plan, ver, cadence, status, start_date, pay, grace, paused, resume, cancel_reason, notes)
  LOOP
    p_id := CASE sc.plan WHEN 'alarm' THEN p_alarm WHEN 'hvac' THEN p_hvac WHEN 'av' THEN p_av ELSE p_plumb END;
    v_id := CASE sc.plan WHEN 'alarm' THEN v_alarm WHEN 'av' THEN v_av WHEN 'plumb' THEN v_plumb ELSE CASE WHEN sc.ver = 2 THEN v_hvac2 ELSE v_hvac1 END END;
    SELECT amount_cents INTO amt FROM sp_price_options WHERE plan_version_id = v_id AND cadence = sc.cadence;
    SELECT name INTO plan_name FROM sp_plans WHERE id = p_id;
    SELECT s.id INTO site FROM sites s WHERE s.company_id = co[sc.k] ORDER BY s.name LIMIT 1;

    INSERT INTO sp_agreements (agreement_number, company_id, primary_site_id, plan_id, plan_version_id, cadence, status,
      start_date, end_date, anchor_day, period_amount_cents, auto_renew, payment_method, grace_until, paused_at, resume_on,
      canceled_at, cancel_reason, signed_by_name, signed_at, notes, created_at)
    VALUES ('SP-' || (1000 + sc.k), co[sc.k], site, p_id, v_id, sc.cadence, sc.status,
      sc.start_date, (sc.start_date + interval '12 months' - interval '1 day')::date, extract(day FROM sc.start_date)::int,
      amt, sc.k <> 10, sc.pay, sc.grace, sc.paused, sc.resume,
      CASE WHEN sc.status = 'canceled' THEN '2026-08-15'::date END, sc.cancel_reason,
      CASE WHEN sc.status IN ('draft','pending_signature') THEN NULL ELSE (SELECT name FROM companies WHERE id = co[sc.k]) END,
      CASE WHEN sc.status IN ('draft','pending_signature') THEN NULL ELSE (sc.start_date - 3)::timestamptz END,
      sc.notes, LEAST(sc.start_date - 5, demo)::timestamptz)
    RETURNING id INTO a_id;

    IF sc.k = 3 THEN
      INSERT INTO sp_agreement_sites (agreement_id, site_id) SELECT a_id, s.id FROM sites s WHERE s.company_id = co[sc.k];
    ELSE
      INSERT INTO sp_agreement_sites (agreement_id, site_id, system_id)
      VALUES (a_id, site, (SELECT cs.id FROM customer_systems cs WHERE cs.site_id = site ORDER BY cs.name LIMIT 1));
    END IF;

    IF sc.k = 3 THEN INSERT INTO sp_agreement_addons (agreement_id, addon_id, name, annual_amount_cents) VALUES (a_id, ad_thermo, 'Additional HVAC system', 18000); END IF;
    IF sc.k = 4 THEN INSERT INTO sp_agreement_addons (agreement_id, addon_id, name, annual_amount_cents) VALUES (a_id, ad_flush, 'Second water heater', 6000); END IF;
    IF sc.k = 5 THEN INSERT INTO sp_agreement_addons (agreement_id, addon_id, name, annual_amount_cents) VALUES (a_id, ad_room, 'Extra AV room', 12000); END IF;

    INSERT INTO sp_events (agreement_id, event_type, description, event_date)
      VALUES (a_id, 'created', 'Agreement created for ' || plan_name, LEAST(sc.start_date - 5, demo));
    IF sc.status IN ('draft') THEN CONTINUE; END IF;
    IF sc.status = 'pending_signature' THEN
      INSERT INTO sp_events (agreement_id, event_type, description, event_date) VALUES (a_id, 'sent', 'Sent to customer for signature', '2026-10-02');
      CONTINUE;
    END IF;
    INSERT INTO sp_events (agreement_id, event_type, description, event_date)
      VALUES (a_id, 'signed', 'Signed by customer', sc.start_date - 3), (a_id, 'activated', 'Agreement activated', sc.start_date);

    -- Billing schedule
    months := CASE sc.cadence WHEN 'monthly' THEN 1 WHEN 'quarterly' THEN 3 WHEN 'semiannual' THEN 6 ELSE 12 END;
    n := 12 / months;
    SELECT COALESCE(SUM(annual_amount_cents * quantity), 0) INTO addon_cents FROM sp_agreement_addons WHERE agreement_id = a_id;
    FOR i IN 0 .. n - 1 LOOP
      ps := (sc.start_date + make_interval(months => i * months))::date;
      pe := (sc.start_date + make_interval(months => (i + 1) * months) - interval '1 day')::date;
      st := CASE
        WHEN sc.status = 'canceled' AND ps > '2026-08-15' THEN 'void'
        WHEN sc.status = 'paused' AND ps >= sc.paused AND ps < sc.resume THEN 'skipped'
        WHEN ps > demo THEN 'scheduled'
        WHEN sc.k = 5 AND ps = '2026-10-02' THEN 'failed'
        WHEN sc.k = 6 AND ps >= '2026-09-20' THEN 'failed'
        ELSE 'paid' END;
      inv_id := NULL;
      IF st IN ('paid','failed') THEN
        inv_seq := inv_seq + 1;
        INSERT INTO invoices (invoice_number, company_id, site_id, status, invoice_date, due_date, subtotal, tax, total,
          amount_paid, balance_due, notes, terms, payment_token, sp_agreement_id)
        VALUES ('SPI-' || inv_seq, co[sc.k], site, CASE WHEN st = 'paid' THEN 'paid' WHEN ps < demo - 7 THEN 'overdue' ELSE 'sent' END,
          ps, ps + 15, (amt + addon_cents / n) / 100.0, 0, (amt + addon_cents / n) / 100.0,
          CASE WHEN st = 'paid' THEN (amt + addon_cents / n) / 100.0 ELSE 0 END,
          CASE WHEN st = 'paid' THEN 0 ELSE (amt + addon_cents / n) / 100.0 END,
          'Service plan ' || 'SP-' || (1000 + sc.k), 'Due on receipt', replace(gen_random_uuid()::text, '-', ''), a_id)
        RETURNING id INTO inv_id;
        INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order)
        VALUES (inv_id, plan_name || ' (' || sc.cadence || ') ' || to_char(ps, 'Mon DD, YYYY') || ' - ' || to_char(pe, 'Mon DD, YYYY'), 1, amt / 100.0, amt / 100.0, 0);
        IF addon_cents > 0 THEN
          INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order)
          SELECT inv_id, 'Add-on: ' || aa.name, aa.quantity, (aa.annual_amount_cents / n) / 100.0, (aa.annual_amount_cents * aa.quantity / n) / 100.0, 1
          FROM sp_agreement_addons aa WHERE aa.agreement_id = a_id;
        END IF;
      END IF;
      INSERT INTO sp_billing_occurrences (agreement_id, occurrence_key, sequence, period_start, period_end, bill_date, amount_cents, status, attempts, last_attempt_on, failure_reason, invoice_id)
      VALUES (a_id, 'bill:' || a_id || ':' || ps, i + 1, ps, pe, ps, amt + addon_cents / n, st,
        CASE WHEN st = 'failed' AND sc.k = 6 THEN 3 WHEN st IN ('paid','failed') THEN 1 ELSE 0 END,
        CASE WHEN st IN ('paid','failed') THEN ps END,
        CASE WHEN st = 'failed' THEN 'Card declined' END, inv_id);
    END LOOP;

    IF sc.k = 5 THEN INSERT INTO sp_events (agreement_id, event_type, description, event_date) VALUES (a_id, 'payment_failed', 'Card declined. Grace period until Oct 9.', '2026-10-02'); END IF;
    IF sc.k = 6 THEN INSERT INTO sp_events (agreement_id, event_type, description, event_date) VALUES
      (a_id, 'payment_failed', 'Card declined. Grace period until Sep 27.', '2026-09-20'),
      (a_id, 'grace_expired', 'Grace period ended. Plan benefits on hold until paid.', '2026-09-28'); END IF;
    IF sc.k = 7 THEN INSERT INTO sp_events (agreement_id, event_type, description, event_date) VALUES (a_id, 'paused', 'Paused by customer request. Resumes Nov 1.', '2026-09-01'); END IF;
    IF sc.k = 8 THEN INSERT INTO sp_events (agreement_id, event_type, description, event_date) VALUES (a_id, 'renewal_notice', 'Renewal notice sent. Term ends Oct 20.', '2026-09-20'); END IF;
    IF sc.k = 9 THEN INSERT INTO sp_events (agreement_id, event_type, description, event_date) VALUES (a_id, 'canceled', 'Canceled: Moved out of the area. No refund per plan terms.', '2026-08-15'); END IF;
    IF sc.k = 10 THEN INSERT INTO sp_events (agreement_id, event_type, description, event_date) VALUES (a_id, 'expired', 'Term ended without renewal.', '2026-09-30'); END IF;

    -- Benefit grants for the term
    FOR b IN SELECT * FROM sp_benefits WHERE plan_version_id = v_id LOOP
      INSERT INTO sp_entitlement_ledger (agreement_id, benefit_id, entry_type, quantity, period_start, period_end, occurrence_key, note)
      VALUES (a_id, b.id, 'grant', b.quantity_per_term, sc.start_date, (sc.start_date + interval '12 months' - interval '1 day')::date,
        'grant:' || a_id || ':' || b.id || ':' || sc.start_date, 'Term allowance');
    END LOOP;
  END LOOP;

  -- Visit usage: (scenario, benefit sort, completed?, date)
  FOR ag IN SELECT * FROM (VALUES
    (1, 1, true,  '2026-04-14'::date),
    (3, 1, true,  '2026-05-06'),
    (4, 1, true,  '2026-05-12'),
    (4, 2, false, '2026-10-14'),
    (5, 1, true,  '2026-06-18'),
    (10, 1, true, '2026-03-11'),
    (2, 2, true,  '2026-07-08')
  ) u(k, sort_no, done, wo_date)
  LOOP
    SELECT a.id, a.company_id, a.primary_site_id, a.start_date, a.end_date, a.agreement_number, p.name pname, bn.id bid, bn.name bname, bn.duration_minutes dur
      INTO occ
      FROM sp_agreements a JOIN sp_plans p ON p.id = a.plan_id
      JOIN sp_benefits bn ON bn.plan_version_id = a.plan_version_id AND bn.sort_order = ag.sort_no
      WHERE a.agreement_number = 'SP-' || (1000 + ag.k);
    wo_seq := wo_seq + 1;
    INSERT INTO work_orders (wo_number, company_id, site_id, title, description, work_order_type, status, priority, scheduled_date,
      estimated_duration, billing_type, completed_at, sp_agreement_id, source)
    VALUES ('SPV-' || wo_seq, occ.company_id, occ.primary_site_id, occ.pname || ': ' || occ.bname,
      'Included plan visit under ' || occ.agreement_number, 'maintenance', CASE WHEN ag.done THEN 'completed' ELSE 'scheduled' END,
      'normal', ag.wo_date, occ.dur, 'not_billable', CASE WHEN ag.done THEN ag.wo_date::timestamptz + interval '15 hours' END, occ.id, 'office')
    RETURNING id INTO wo;
    INSERT INTO sp_entitlement_ledger (agreement_id, benefit_id, entry_type, quantity, period_start, period_end, work_order_id, occurrence_key, note)
    VALUES (occ.id, occ.bid, 'reserve', 1, occ.start_date, occ.end_date, wo, 'reserve:' || wo, 'Reserved for SPV-' || wo_seq);
    IF ag.done THEN
      INSERT INTO sp_entitlement_ledger (agreement_id, benefit_id, entry_type, quantity, period_start, period_end, work_order_id, occurrence_key, note)
      VALUES (occ.id, occ.bid, 'consume', 1, occ.start_date, occ.end_date, wo, 'consume:' || wo, 'Visit completed');
    END IF;
    INSERT INTO sp_events (agreement_id, event_type, description, event_date)
    VALUES (occ.id, CASE WHEN ag.done THEN 'benefit_used' ELSE 'benefit_reserved' END,
      occ.bname || CASE WHEN ag.done THEN ' completed on ' ELSE ' scheduled for ' END || to_char(ag.wo_date, 'Mon DD') || ' (SPV-' || wo_seq || ')', LEAST(ag.wo_date, demo));
  END LOOP;

  -- Expired agreement: unused tune-up expired at term end
  INSERT INTO sp_entitlement_ledger (agreement_id, benefit_id, entry_type, quantity, period_start, period_end, occurrence_key, note)
  SELECT a.id, bn.id, 'expire', 1, a.start_date, a.end_date, 'expire:' || a.id || ':' || bn.id || ':' || a.end_date, 'Unused at term end'
  FROM sp_agreements a JOIN sp_benefits bn ON bn.plan_version_id = a.plan_version_id AND bn.sort_order = 1
  WHERE a.agreement_number = 'SP-1010';
END;
$fn$;

CREATE OR REPLACE FUNCTION sp_reset_demo() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $fn$
BEGIN
  DELETE FROM invoices i WHERE i.sp_agreement_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM portal_payments pp WHERE pp.invoice_id = i.id);
  DELETE FROM work_orders WHERE wo_number LIKE 'SPV-%';
  DELETE FROM sp_entitlement_ledger;
  DELETE FROM sp_billing_occurrences;
  DELETE FROM sp_events;
  DELETE FROM sp_agreement_addons;
  DELETE FROM sp_agreement_sites;
  DELETE FROM sp_agreements;
  DELETE FROM sp_monitoring_accounts;
  DELETE FROM sp_addons;
  UPDATE sp_plans SET current_version_id = NULL;
  DELETE FROM sp_plans;
  PERFORM sp_seed_demo();
END;
$fn$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM sp_plans) THEN
    PERFORM sp_seed_demo();
  END IF;
END $$;
