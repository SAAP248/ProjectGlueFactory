/*
  # Seed 120+ Realistic Work Orders Across 90 Days

  Creates 3-4 service call work orders per day for weekdays spanning
  30 days back through 60 days forward from today. Each WO is assigned
  to one of 3 technicians (Mike Torres, Sarah Chen, Jake Williams).

  Past WOs: status=completed with timestamps
  Today/Future WOs: status=scheduled, wot status=assigned
*/

DO $$
DECLARE
  tech_mike uuid := '11111111-1111-1111-1111-111111111111';
  tech_sarah uuid := '22222222-2222-2222-2222-222222222222';
  tech_jake uuid := '33333333-3333-3333-3333-333333333333';

  company_ids uuid[] := ARRAY[
    '3773c9c5-5fb1-4c4c-8cb7-942b3223db26'::uuid,
    '3773c9c5-5fb1-4c4c-8cb7-942b3223db26'::uuid,
    '4e03b73c-77a4-4c05-803d-4048b62d8d38'::uuid,
    '7851e39e-4e37-4d65-ac1c-be09fb1a4c4b'::uuid,
    'da674d5a-a5a2-4ee3-bee2-b363512bb134'::uuid,
    'da674d5a-a5a2-4ee3-bee2-b363512bb134'::uuid,
    '725e05fc-7c80-4ef7-8903-ebc1424b69b2'::uuid,
    '3773c9c5-5fb1-4c4c-8cb7-942b3223db26'::uuid
  ];
  site_ids uuid[] := ARRAY[
    'e58f345d-45ae-40b1-8311-02d7f5950170'::uuid,
    '6183c734-0aee-4409-a446-77ec3054a20f'::uuid,
    '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba'::uuid,
    'ff5fa318-8a91-4c49-a1c0-bbe04b776c47'::uuid,
    '9fc810b5-b470-4505-a5d3-1e1fe26e763c'::uuid,
    'a7dc909f-47f2-4d22-abc4-9d646dc6724d'::uuid,
    '35d9ba28-e341-4f27-a199-cc82da4fe573'::uuid,
    'd9e95e2d-4642-4309-af43-6719e325d1dc'::uuid
  ];

  titles text[] := ARRAY[
    'Burglar Alarm Annual Inspection',
    'Fire Panel Quarterly Test',
    'CCTV Camera Replacement',
    'Keypad Not Responding',
    'Motion Sensor Adjustment',
    'Battery Replacement - Control Panel',
    'Glass Break Sensor Test',
    'Access Control Door Fault',
    'Gate Motor Service Call',
    'Smoke Detector Service',
    'Zone Expansion - Add 3 Zones',
    'Door Contact Repair',
    'Panic Button Test & Verify',
    'Alarm Not Communicating to Central',
    'Annual Fire Alarm Inspection',
    'Camera Angle Adjustment',
    'New Keypad Installation',
    'Siren Horn Replacement',
    'System Reboot & Full Check',
    'Motion Detector False Alarm Investigation'
  ];

  reasons text[] := ARRAY[
    'Customer reported system offline',
    'Annual service contract visit',
    'Unit not responding to commands',
    'False alarm investigation',
    'Scheduled quarterly test',
    'Battery low warning on panel',
    'New equipment installation request',
    'Customer complaint - slow response',
    'UL certification maintenance visit',
    'Post-storm system check required'
  ];

  billing_types text[] := ARRAY['hourly', 'hourly', 'fixed', 'fixed', 'not_billable'];
  wo_types text[] := ARRAY['service_call', 'service_call', 'inspection', 'installation', 'service_call'];
  priorities text[] := ARRAY['normal', 'normal', 'normal', 'high', 'low'];
  times text[] := ARRAY['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  techs uuid[] := ARRAY[
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid
  ];

  day_offset int;
  job_idx int;
  cur_date date;
  wo_id uuid;
  wot_id uuid;
  n int;
  tech_assign uuid;
  tech2_assign uuid;
  wo_status text;
  wot_status text;
  enroute_ts timestamptz;
  onsite_ts timestamptz;
  complete_ts timestamptz;
  billing_type text;
  fixed_amt numeric;
  billing_rate numeric;
  wo_type text;
  priority_val text;
  sched_time text;
  wo_num int := 300;
  jobs_today int;
BEGIN
  FOR day_offset IN -30..60 LOOP
    cur_date := CURRENT_DATE + day_offset;
    IF EXTRACT(DOW FROM cur_date) IN (0, 6) THEN
      CONTINUE;
    END IF;

    -- 3 or 4 jobs per weekday
    jobs_today := 3 + (((day_offset + 30) * 7) % 2);

    FOR job_idx IN 1..jobs_today LOOP
      wo_id := gen_random_uuid();
      wo_num := wo_num + 1;
      n := (day_offset + 30) * 4 + job_idx;

      tech_assign := techs[(n % 3) + 1];
      billing_type := billing_types[(n % 5) + 1];
      wo_type := wo_types[(n % 5) + 1];
      priority_val := priorities[(n % 5) + 1];
      sched_time := times[(n % 8) + 1];

      fixed_amt := CASE billing_type WHEN 'fixed' THEN (150 + (n % 15) * 30)::numeric ELSE NULL END;
      billing_rate := CASE billing_type WHEN 'hourly' THEN (85 + (n % 4) * 15)::numeric ELSE NULL END;

      IF day_offset < 0 THEN
        wo_status := 'completed';
        wot_status := 'completed';
        enroute_ts := (cur_date::timestamp + (sched_time || ':00')::time - interval '10 minutes') AT TIME ZONE 'UTC';
        onsite_ts := enroute_ts + interval '25 minutes' + ((job_idx * 5) || ' minutes')::interval;
        complete_ts := onsite_ts + interval '60 minutes' + ((job_idx * 11 % 60) || ' minutes')::interval;
      ELSE
        wo_status := 'scheduled';
        wot_status := 'assigned';
        enroute_ts := NULL;
        onsite_ts := NULL;
        complete_ts := NULL;
      END IF;

      INSERT INTO work_orders (
        id, wo_number, company_id, site_id, title, description,
        work_order_type, status, priority, scheduled_date, scheduled_time,
        assigned_to, billing_type, billing_rate, fixed_amount,
        reason_for_visit, scope_of_work,
        enroute_at, onsite_at, completed_at,
        created_at, updated_at
      ) VALUES (
        wo_id,
        'WO-' || to_char(cur_date, 'YYYY') || '-' || lpad(wo_num::text, 3, '0'),
        company_ids[(n % 8) + 1],
        site_ids[(n % 8) + 1],
        titles[(n % 20) + 1],
        'Service call: ' || titles[(n % 20) + 1] || '. ' || reasons[(n % 10) + 1],
        wo_type,
        wo_status,
        priority_val,
        cur_date,
        (sched_time || ':00')::time,
        tech_assign,
        billing_type,
        billing_rate,
        fixed_amt,
        reasons[(n % 10) + 1],
        'Inspect and service as needed. Test all zones. Document all findings.',
        enroute_ts,
        onsite_ts,
        complete_ts,
        (cur_date::timestamp - interval '3 days') AT TIME ZONE 'UTC',
        COALESCE(complete_ts, (cur_date::timestamp - interval '1 day') AT TIME ZONE 'UTC')
      );

      wot_id := gen_random_uuid();
      INSERT INTO work_order_technicians (
        id, work_order_id, employee_id, is_lead, status,
        enroute_at, onsite_at, completed_at, created_at
      ) VALUES (
        wot_id, wo_id, tech_assign, true, wot_status,
        enroute_ts, onsite_ts, complete_ts,
        (cur_date::timestamp - interval '3 days') AT TIME ZONE 'UTC'
      );

      -- Add 2nd tech ~20% of jobs
      IF (n % 5) = 0 THEN
        tech2_assign := techs[((n + 1) % 3) + 1];
        IF tech2_assign != tech_assign THEN
          INSERT INTO work_order_technicians (
            id, work_order_id, employee_id, is_lead, status,
            enroute_at, onsite_at, completed_at, created_at
          ) VALUES (
            gen_random_uuid(), wo_id, tech2_assign, false, wot_status,
            enroute_ts, onsite_ts, complete_ts,
            (cur_date::timestamp - interval '3 days') AT TIME ZONE 'UTC'
          );
        END IF;
      END IF;

    END LOOP;
  END LOOP;
END $$;
