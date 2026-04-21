/*
  # Seed 50 support tickets with realistic data

  ## Overview
  Creates 50 varied support tickets across all 5 customers with:
  - Mixed priorities (low, normal, high, urgent)
  - Mixed types (support, billing, installation, maintenance, complaint, inquiry)
  - Mixed sources (phone_call, email, portal, office, chat)
  - Mixed statuses (open, in_progress, pending, resolved, closed)
  - Some assigned to employees, some unassigned
  - Some visible in customer portal, some internal only
  - Linked records (sites, invoices, deals) where appropriate
  - Timeline events and internal notes for each ticket

  ## Companies / Employees used
  - Acme Corporation        (3773c9c5-5fb1-4c4c-8cb7-942b3223db26)
  - Downtown Mall           (7851e39e-4e37-4d65-ac1c-be09fb1a4c4b)
  - Johnson Family          (725e05fc-7c80-4ef7-8903-ebc1424b69b2)
  - Smith Residence         (4e03b73c-77a4-4c05-803d-4048b62d8d38)
  - Tech Solutions Inc      (da674d5a-a5a2-4ee3-bee2-b363512bb134)

  - Mike Torres    (11111111-1111-1111-1111-111111111111)
  - Sarah Chen     (22222222-2222-2222-2222-222222222222)
  - Jake Williams  (33333333-3333-3333-3333-333333333333)
*/

DO $$
DECLARE
  -- Companies
  acme        uuid := '3773c9c5-5fb1-4c4c-8cb7-942b3223db26';
  mall        uuid := '7851e39e-4e37-4d65-ac1c-be09fb1a4c4b';
  johnson     uuid := '725e05fc-7c80-4ef7-8903-ebc1424b69b2';
  smith       uuid := '4e03b73c-77a4-4c05-803d-4048b62d8d38';
  tech        uuid := 'da674d5a-a5a2-4ee3-bee2-b363512bb134';

  -- Employees
  mike        uuid := '11111111-1111-1111-1111-111111111111';
  sarah       uuid := '22222222-2222-2222-2222-222222222222';
  jake        uuid := '33333333-3333-3333-3333-333333333333';

  -- Sites
  acme_hq         uuid := 'e58f345d-45ae-40b1-8311-02d7f5950170';
  acme_annex      uuid := 'd9e95e2d-4642-4309-af43-6719e325d1dc';
  acme_wh         uuid := '6183c734-0aee-4409-a446-77ec3054a20f';
  mall_main       uuid := 'ff5fa318-8a91-4c49-a1c0-bbe04b776c47';
  johnson_res     uuid := '35d9ba28-e341-4f27-a199-cc82da4fe573';
  smith_home      uuid := '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba';
  tech_dc         uuid := 'a7dc909f-47f2-4d22-abc4-9d646dc6724d';
  tech_hq         uuid := '9fc810b5-b470-4505-a5d3-1e1fe26e763c';

  -- Invoices
  inv001  uuid := '9d65b954-6df8-4b0b-8ce0-c2980a7f55cc';
  inv002  uuid := '2f7ca1f0-a695-46e1-b64d-59a7bdd8a421';
  inv003  uuid := '5fb58ec8-cbec-46c2-9939-b289c33322be';
  inv004  uuid := '3a05fbe2-4c96-4cdb-b191-c2cfab979daa';
  inv005  uuid := 'd6259897-6722-484d-a0db-93bb26247cd6';
  inv006  uuid := '2cfa504f-7101-4b42-b18a-1de83aecdb19';
  inv007  uuid := 'a24c5c39-d57b-4cc1-99d8-c646c6c27890';
  inv008  uuid := '5ba3e967-b9da-4f68-b4dc-7e03d1352bbd';
  inv009  uuid := 'cc9c4dd2-dfa5-47a8-abbe-8fdf6cf37823';
  inv010  uuid := 'e025a055-ede3-44cb-94ae-92dbf84754b0';
  inv011  uuid := 'b10839eb-6a58-41dd-9f5f-b94d3726ee6a';

  -- Deals
  deal_enterprise uuid := 'a9f97a90-5a58-4c07-958b-81f36983d9d2';
  deal_mall_cam   uuid := 'bcfa226c-b800-4890-a85a-af7ca5a94cb3';
  deal_hotel      uuid := '1a083c5b-4233-4c20-99f3-e9b2e843ba9b';
  deal_bank       uuid := '98f4a370-4b86-4025-b44e-831ca04a3c66';
  deal_office_ac  uuid := 'dd1bc033-ae15-429b-9bb8-f80a8798cd79';
  deal_alarm      uuid := '1b66e202-4e98-4d6d-9437-0c373e111aab';
  deal_rest       uuid := 'e1c02410-dba8-4135-85a3-3499dff0d9f8';
  deal_retail     uuid := 'ab5da8d6-9551-4341-bb6e-dd27f399c33d';
  deal_wh         uuid := '92b6d871-37a8-4c2d-9c21-c7d37902cc6c';
  deal_medical    uuid := '48f6f609-2492-4a5d-8bc9-71d404bb0ea7';

  -- Ticket IDs (we'll collect them)
  t uuid;

BEGIN

  -- ── ACME CORPORATION (10 tickets) ────────────────────────────────────────

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Motion sensor false alarm - Zone 3', 'Motion sensor in Zone 3 of the main lobby keeps triggering false alarms at night. No one is in the building.', 'high', 'support', 'phone_call', 'open', acme, mike, true, NOW() + INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', acme_hq);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '2 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Customer called in — has happened 3 nights in a row around 11pm. Likely wildlife or HVAC vibration. Scheduled for on-site check.', false, NOW() - INTERVAL '2 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Invoice dispute — INV-2024-001', 'Customer is questioning the labor charge on their last invoice. Wants itemized breakdown.', 'normal', 'billing', 'email', 'in_progress', acme, sarah, true, NOW() + INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'invoice', inv001);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '5 days'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '1 day');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Pulled the invoice. Labor was billed correctly but the description was vague. Sending itemized breakdown.', false, NOW() - INTERVAL '1 day');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Access card not working — employee badge #4412', 'New employee cannot access the server room. Badge was issued last week.', 'high', 'support', 'office', 'resolved', acme, jake, false, NOW() - INTERVAL '10 days', NOW() - INTERVAL '6 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', acme_hq), (t, 'deal', deal_enterprise);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '10 days'), (t, 'resolved', 'Ticket resolved', NOW() - INTERVAL '6 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Card was not programmed to the server room access group. Fixed in the controller. Verified access working.', false, NOW() - INTERVAL '6 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('DVR offline — warehouse cameras not recording', 'Warehouse DVR has been offline for 2 days. All 8 cameras show no signal.', 'urgent', 'support', 'phone_call', 'in_progress', acme, mike, true, NOW() + INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', acme_wh), (t, 'invoice', inv003);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '1 day'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '4 hours');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'DVR appears to have a failed hard drive. Ordered replacement — ETA tomorrow. Customer notified.', false, NOW() - INTERVAL '4 hours');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Annual inspection scheduling request', 'Customer requesting to schedule their annual fire alarm and security inspection.', 'low', 'maintenance', 'email', 'open', acme, NULL, false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
  RETURNING id INTO t;
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '3 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Quote request — expand camera coverage to annex', 'Acme wants to add 4 cameras to the annex parking lot. Need proposal.', 'normal', 'inquiry', 'email', 'open', acme, sarah, false, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', acme_annex), (t, 'deal', deal_enterprise);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '7 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Site visit booked for next Tuesday to assess annex coverage angles before quoting.', false, NOW() - INTERVAL '6 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Alarm panel low battery warning', 'Main panel showing low battery fault code on zone 7 keypad.', 'normal', 'maintenance', 'portal', 'pending', acme, jake, true, NOW() + INTERVAL '7 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', acme_hq);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created via portal', NOW() - INTERVAL '4 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Complaint — tech was late to appointment', 'Customer upset that technician arrived 2 hours late without notification.', 'high', 'complaint', 'phone_call', 'closed', acme, sarah, false, NOW() - INTERVAL '14 days', NOW() - INTERVAL '12 days')
  RETURNING id INTO t;
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '14 days'), (t, 'resolved', 'Ticket closed after follow-up', NOW() - INTERVAL '12 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Spoke with customer. Apologized and offered a service credit. Customer satisfied. Technician counseled on communication.', false, NOW() - INTERVAL '12 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Request to add 2 new access credential users', 'HR needs two new employees added to the access control system — server room and main entrance.', 'low', 'support', 'email', 'resolved', acme, mike, false, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', acme_hq), (t, 'invoice', inv002);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '20 days'), (t, 'resolved', 'Credentials added', NOW() - INTERVAL '18 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Medical office fire alarm service needed', 'Acme medical tenant requesting service visit for fire alarm panel.', 'normal', 'maintenance', 'office', 'open', acme, NULL, false, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'deal', deal_medical);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '1 day');

  -- ── DOWNTOWN MALL (10 tickets) ─────────────────────────────────────────────

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Camera 14 lens fogged — food court', 'Food court camera 14 has condensation on the lens. Image is blurry.', 'normal', 'support', 'email', 'open', mall, jake, true, NOW() + INTERVAL '5 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', mall_main);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '2 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Panic button not triggering central station', 'The panic button at the security desk does not appear to be reaching the monitoring center.', 'urgent', 'support', 'phone_call', 'in_progress', mall, mike, true, NOW() + INTERVAL '1 day', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', mall_main), (t, 'invoice', inv005);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '3 hours'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '1 hour');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Tested communicator — signal path shows open loop. Dispatching Mike on-site ASAP. Security desk notified to use alternate procedure.', false, NOW() - INTERVAL '1 hour');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Mall camera upgrade proposal follow-up', 'Following up on the camera upgrade proposal sent last month — customer has questions.', 'normal', 'inquiry', 'email', 'in_progress', mall, sarah, false, NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'deal', deal_mall_cam), (t, 'site', mall_main);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '8 days'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '2 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Request for additional monitoring zones', 'Mall expansion on east wing needs 6 new monitoring zones added to contract.', 'high', 'inquiry', 'office', 'open', mall, NULL, false, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'deal', deal_hotel);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '6 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Billing question — monitoring fee increase', 'Customer received a renewal notice with a rate increase and wants an explanation.', 'normal', 'billing', 'phone_call', 'resolved', mall, sarah, true, NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'invoice', inv006);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '15 days'), (t, 'resolved', 'Ticket resolved', NOW() - INTERVAL '12 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Explained rate increase is tied to CPI adjustment per contract. Customer understood. No further action needed.', false, NOW() - INTERVAL '12 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Lock malfunction — east wing gate 3', 'Electromagnetic lock on east wing gate 3 is not releasing consistently during fire drill mode.', 'high', 'support', 'phone_call', 'pending', mall, jake, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', mall_main);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '5 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Waiting on replacement relay module from supplier. ETA 3-5 days. Customer informed.', false, NOW() - INTERVAL '5 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Intercom system crackling — main entrance', 'Intercom at main entrance has static on all channels. Hard to understand.', 'normal', 'support', 'portal', 'open', mall, NULL, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', mall_main);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created via portal', NOW() - INTERVAL '1 day');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Scheduled maintenance overdue notice', 'System shows maintenance is 45 days overdue per service agreement.', 'low', 'maintenance', 'office', 'open', mall, sarah, false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
  RETURNING id INTO t;
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '2 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Complaint — false alarm charge', 'Customer disputing false alarm city fine and asking us to provide documentation.', 'high', 'complaint', 'email', 'in_progress', mall, sarah, true, NOW() - INTERVAL '9 days', NOW() - INTERVAL '3 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'invoice', inv005), (t, 'site', mall_main);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '9 days'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '3 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Requested alarm log report from central station. Will forward to customer for their records with the city.', false, NOW() - INTERVAL '3 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Hotel security upgrade site survey scheduled', 'Site survey for the hotel security upgrade project — verify camera mounting positions.', 'normal', 'installation', 'office', 'closed', mall, jake, false, NOW() - INTERVAL '25 days', NOW() - INTERVAL '22 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'deal', deal_hotel);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '25 days'), (t, 'resolved', 'Site survey completed', NOW() - INTERVAL '22 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Survey completed. 22 camera positions confirmed. Shared drawings with install team.', false, NOW() - INTERVAL '22 days');

  -- ── JOHNSON FAMILY (10 tickets) ───────────────────────────────────────────

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Front door sensor keeps beeping', 'The door sensor on the front door beeps 3 times every time the door is opened. Not the normal armed beep.', 'normal', 'support', 'phone_call', 'open', johnson, mike, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', johnson_res);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '1 day');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Forgot alarm code — need reset', 'Customer forgot their master code and needs a remote reset.', 'normal', 'support', 'phone_call', 'resolved', johnson, sarah, false, NULL, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', johnson_res);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '12 days'), (t, 'resolved', 'Code reset completed', NOW() - INTERVAL '12 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Verified customer identity via security questions. Reset master code remotely. Customer confirmed it works.', false, NOW() - INTERVAL '12 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Upgrade keypad to touchscreen model', 'Customer wants to upgrade from old keypad to new touchscreen model seen in showroom.', 'low', 'inquiry', 'office', 'open', johnson, NULL, false, NOW() + INTERVAL '14 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
  RETURNING id INTO t;
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '4 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Smoke detector chirping — basement', 'Basement smoke detector keeps chirping every 30 seconds. Battery replaced already.', 'high', 'support', 'phone_call', 'in_progress', johnson, jake, true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 hours')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', johnson_res), (t, 'invoice', inv009);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '2 days'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '6 hours');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'After battery swap, unit still chirping. Likely end-of-life unit. Dispatch Jake to replace the detector head.', false, NOW() - INTERVAL '6 hours');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Request for vacation mode setup', 'Family going on vacation for 2 weeks. Wants system set to higher sensitivity.', 'low', 'support', 'chat', 'resolved', johnson, mike, false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days')
  RETURNING id INTO t;
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created via chat', NOW() - INTERVAL '30 days'), (t, 'resolved', 'Vacation mode configured', NOW() - INTERVAL '29 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Billing question — extra charge on statement', 'Customer questioning a $75 "extended service" charge on their last statement.', 'normal', 'billing', 'email', 'in_progress', johnson, sarah, true, NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'invoice', inv011);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '6 days'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '2 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Charge is for after-hours dispatch call in November. Customer says they do not recall requesting this. Need to pull dispatch log.', false, NOW() - INTERVAL '2 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('App remote arm/disarm not working', 'Customer unable to arm/disarm from the mobile app. Panel works fine locally.', 'normal', 'support', 'portal', 'open', johnson, NULL, true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', johnson_res);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created via portal', NOW() - INTERVAL '3 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Add spouse to authorized user list', 'Customer wants to add their spouse as an authorized caller for the monitoring center.', 'low', 'support', 'phone_call', 'resolved', johnson, sarah, false, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days')
  RETURNING id INTO t;
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '22 days'), (t, 'resolved', 'Authorized user added', NOW() - INTERVAL '22 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Camera pointing wrong direction after wind', 'Outdoor camera on garage has shifted direction after strong winds last week.', 'normal', 'support', 'phone_call', 'pending', johnson, jake, true, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', johnson_res);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '4 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('System making clicking noise at night', 'Control panel makes a clicking sound around 2am. Not sure if normal.', 'low', 'support', 'email', 'open', johnson, NULL, false, NOW() + INTERVAL '10 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', johnson_res), (t, 'invoice', inv010);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '1 day');

  -- ── SMITH RESIDENCE (10 tickets) ──────────────────────────────────────────

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('New installation follow-up — all zones clear', 'Post-installation check-in. Verify all zones are reading correctly after new install.', 'low', 'installation', 'office', 'closed', smith, mike, false, NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', smith_home), (t, 'deal', deal_alarm), (t, 'invoice', inv004);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '40 days'), (t, 'resolved', 'All zones verified clear', NOW() - INTERVAL '38 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Called customer. All 9 zones reporting normally. No issues. System fully operational.', false, NOW() - INTERVAL '38 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Back door sensor alarm triggered', 'Alarm triggered at 3:42am. Central station dispatched police. Turned out to be sensor malfunction.', 'urgent', 'support', 'phone_call', 'resolved', smith, jake, true, NULL, NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', smith_home);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '8 days'), (t, 'resolved', 'Faulty sensor replaced', NOW() - INTERVAL '7 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Sensor on back door had a broken reed switch. Replaced same-day. Tested 10 cycles. No further false triggers.', false, NOW() - INTERVAL '7 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Contract renewal discussion', 'Smith Residence contract is up in 60 days. Need to reach out about renewal terms.', 'normal', 'inquiry', 'office', 'open', smith, sarah, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'deal', deal_rest);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '5 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Keypad display not lighting up', 'Bedroom keypad display has no backlight. Hard to see at night.', 'normal', 'support', 'chat', 'open', smith, NULL, true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', smith_home);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created via chat', NOW() - INTERVAL '3 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Request to add outdoor PIR sensor', 'Customer wants to add a passive infrared sensor to the back yard.', 'low', 'inquiry', 'email', 'open', smith, NULL, false, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'deal', deal_wh);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '6 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Complaint — monitoring center slow response', 'Customer reports that when alarm triggered last month, response took over 5 minutes.', 'high', 'complaint', 'email', 'in_progress', smith, sarah, true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '4 days')
  RETURNING id INTO t;
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '10 days'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '4 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Pulled monitoring center call log. Initial contact was 4 min 12 sec after signal. Within contractual 5-minute window but barely. Calling customer to discuss.', false, NOW() - INTERVAL '4 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Invoice question — installation charge breakdown', 'Customer wants detailed breakdown of installation labor on INV-2024-004.', 'normal', 'billing', 'phone_call', 'resolved', smith, sarah, true, NOW() - INTERVAL '35 days', NOW() - INTERVAL '33 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'invoice', inv004);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '35 days'), (t, 'resolved', 'Itemized breakdown sent', NOW() - INTERVAL '33 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('System offline after power outage', 'System went offline after a power outage. Panel shows AC power fault.', 'high', 'support', 'phone_call', 'resolved', smith, mike, true, NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', smith_home);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '18 days'), (t, 'resolved', 'Panel reset and power restored', NOW() - INTERVAL '17 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Panel had locked up after power surge. Hard reset restored normal operation. Backup battery holding charge correctly.', false, NOW() - INTERVAL '17 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Add house cleaner to temporary access schedule', 'Customer wants housekeeper added as a temporary user — access Tues/Thurs 9am-3pm.', 'low', 'support', 'chat', 'resolved', smith, mike, false, NOW() - INTERVAL '28 days', NOW() - INTERVAL '27 days')
  RETURNING id INTO t;
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created via chat', NOW() - INTERVAL '28 days'), (t, 'resolved', 'Temporary user schedule configured', NOW() - INTERVAL '27 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Garage door sensor offline', 'Garage door sensor showing as offline in app for the past 3 days.', 'normal', 'support', 'portal', 'pending', smith, jake, true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', smith_home);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created via portal', NOW() - INTERVAL '3 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Likely the Z-Wave module lost pairing. Waiting for customer to be home before attempting remote re-pair.', false, NOW() - INTERVAL '3 days');

  -- ── TECH SOLUTIONS INC (10 tickets) ──────────────────────────────────────

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('Server room access logs — compliance audit', 'Tech Solutions needs exported access logs for the past 90 days for a compliance audit.', 'high', 'support', 'email', 'in_progress', tech, sarah, false, NOW() + INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 hours')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', tech_dc), (t, 'deal', deal_office_ac);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '2 days'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '12 hours');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Pulling access log report from controller. Will export CSV and send secure link. Need to verify date range filter first.', false, NOW() - INTERVAL '12 hours');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, due_date, created_at, updated_at)
  VALUES ('IP camera NVR storage nearly full', 'NVR at HQ showing 94% storage capacity. Need to expand or purge old footage.', 'high', 'support', 'email', 'open', tech, mike, false, NOW() + INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', tech_hq), (t, 'invoice', inv007);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '1 day');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Office access control expansion — 3rd floor', 'Need 12 new Wiegand readers installed on the 3rd floor expansion.', 'normal', 'installation', 'office', 'in_progress', tech, jake, false, NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', tech_hq), (t, 'deal', deal_office_ac), (t, 'invoice', inv008);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '7 days'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '2 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Rough-in conduit complete. Reader installation begins Monday. Controller programming scheduled for Wednesday.', false, NOW() - INTERVAL '2 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Data center intrusion detection — zone fault', 'Zone 4 (server cage B) showing a tamper fault on the intrusion panel.', 'urgent', 'support', 'phone_call', 'in_progress', tech, mike, true, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '2 hours')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', tech_dc);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '5 hours'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '2 hours');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'On-site dispatch in progress. Tamper likely due to recent cable management work in that cage. Do not clear from panel until physically verified.', false, NOW() - INTERVAL '2 hours');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Bank branch security — new branch opening', 'New bank branch at 445 Commerce St requires full alarm and access package.', 'normal', 'installation', 'office', 'open', tech, NULL, false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'deal', deal_bank);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '4 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Employee terminated — revoke all access immediately', 'IT director requesting immediate revocation of access for terminated employee (badge #2217).', 'urgent', 'support', 'phone_call', 'resolved', tech, sarah, false, NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', tech_hq), (t, 'site', tech_dc);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '11 days'), (t, 'resolved', 'Access revoked across all sites', NOW() - INTERVAL '11 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Badge #2217 disabled at HQ and data center controllers within 8 minutes of call. Confirmed no activity after revocation.', false, NOW() - INTERVAL '11 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Contract renewal — enterprise support tier', 'Tech Solutions contract renewal due next month. Discussing upgrade to enterprise support tier.', 'normal', 'inquiry', 'email', 'open', tech, sarah, false, NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'deal', deal_bank), (t, 'invoice', inv008);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '9 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Request for monthly monitoring report', 'Customer requests automated monthly monitoring activity report via email.', 'low', 'inquiry', 'email', 'pending', tech, NULL, false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
  RETURNING id INTO t;
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '3 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Need to check if central station can automate this or if we need to pull manually. Following up with monitoring center.', false, NOW() - INTERVAL '3 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Dispute on INV-2024-007 — overtime labor charge', 'Customer disputing $240 overtime charge on invoice 007. Claims work was done during business hours.', 'normal', 'billing', 'email', 'in_progress', tech, sarah, true, NOW() - INTERVAL '13 days', NOW() - INTERVAL '5 days')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'invoice', inv007);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '13 days'), (t, 'status_change', 'Status changed to in_progress', NOW() - INTERVAL '5 days');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Checking technician time sheet. Work order shows arrival at 4:55pm, completion 6:20pm. Contract defines OT after 5pm. Overtime is technically correct but small window. Discussing credit with manager.', false, NOW() - INTERVAL '5 days');

  INSERT INTO tickets (title, description, priority, ticket_type, source, status, company_id, assigned_to, show_in_customer_portal, created_at, updated_at)
  VALUES ('Visitor management kiosk not connecting to controller', 'Lobby visitor management iPad lost connection to the access controller. Visitors cannot check in.', 'high', 'support', 'phone_call', 'open', tech, jake, true, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours')
  RETURNING id INTO t;
  INSERT INTO ticket_linked_records (ticket_id, record_type, record_id) VALUES (t, 'site', tech_hq);
  INSERT INTO ticket_timeline (ticket_id, event_type, description, created_at) VALUES (t, 'created', 'Ticket created', NOW() - INTERVAL '6 hours');
  INSERT INTO ticket_comments (ticket_id, body, is_public, created_at) VALUES (t, 'Appears to be an IP conflict after their network team reconfigured subnets. Need static IP re-assignment on kiosk app.', false, NOW() - INTERVAL '6 hours');

END $$;
