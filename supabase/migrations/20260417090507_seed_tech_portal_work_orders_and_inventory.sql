/*
  # Seed tech portal work orders + site inventory
  Inserts site inventory (networking + alarm) and 25+ work orders across techs, dates, statuses, system types.
*/

-- Backfill site_inventory.company_id for existing rows
UPDATE site_inventory si
SET company_id = s.company_id
FROM sites s
WHERE si.site_id = s.id AND si.company_id IS NULL;

-- SITE INVENTORY
INSERT INTO site_inventory (
  company_id, site_id, system_id, product_name, product_category,
  serial_number, mac_address, imei, firmware_version, location_detail,
  zone_location, installation_date, warranty_expiration, install_cost, status, notes
)
SELECT
  v.company_id::uuid, v.site_id::uuid, v.system_id::uuid, v.product_name, v.product_category,
  v.serial_number, v.mac_address, v.imei, v.firmware_version, v.location_detail,
  v.zone_location, v.installation_date::date, v.warranty_expiration::date, v.install_cost::numeric, v.status, v.notes
FROM (VALUES
  ('da674d5a-a5a2-4ee3-bee2-b363512bb134', '9fc810b5-b470-4505-a5d3-1e1fe26e763c', '74bef047-9108-49b9-a050-e44942107d53',
    'Cisco Catalyst 9300 48-Port Switch', 'Networking',
    'FOC2547L1K2', '00:1A:2B:3C:4D:5E', '', '17.09.04a', 'IDF Rack 2, U12', 'Server Room', '2025-08-15', '2028-08-15', 4500.00, 'active', 'Primary core switch'),
  ('da674d5a-a5a2-4ee3-bee2-b363512bb134', '9fc810b5-b470-4505-a5d3-1e1fe26e763c', '74bef047-9108-49b9-a050-e44942107d53',
    'Ubiquiti UniFi Dream Machine Pro', 'Networking',
    'UDM-PRO-78A901', 'F4:E2:C6:1B:2C:3D', '', '3.2.7', 'Main IDF Rack 1', 'Server Room', '2025-06-20', '2027-06-20', 480.00, 'active', 'Primary gateway + controller'),
  ('da674d5a-a5a2-4ee3-bee2-b363512bb134', '9fc810b5-b470-4505-a5d3-1e1fe26e763c', '74bef047-9108-49b9-a050-e44942107d53',
    'UniFi Access Point U6 Pro', 'Networking',
    'U6P-AA112233', '74:AC:B9:12:34:56', '', '6.5.62', 'Ceiling, 2nd Floor Lobby', '2nd Floor', '2025-09-12', '2028-09-12', 189.00, 'active', ''),
  ('da674d5a-a5a2-4ee3-bee2-b363512bb134', '9fc810b5-b470-4505-a5d3-1e1fe26e763c', '74bef047-9108-49b9-a050-e44942107d53',
    'Verizon LTE Failover Modem', 'Networking',
    'LTE-99887766', '00:AE:FA:11:22:33', '353456789012345', '2.1.0', 'Network Closet A', 'Server Room', '2025-07-05', '2026-07-05', 299.00, 'active', 'LTE failover for primary WAN'),
  ('3773c9c5-5fb1-4c4c-8cb7-942b3223db26', 'e58f345d-45ae-40b1-8311-02d7f5950170', 'd6dbe1b6-650d-450c-86cc-10090b014de0',
    'Fortinet FortiGate 60F', 'Networking',
    'FGT60FTK22009876', 'A0:B1:C2:D3:E4:F5', '', '7.2.8', 'IT Room Rack 1', 'IT Room', '2025-05-10', '2028-05-10', 650.00, 'active', 'Perimeter firewall'),
  ('3773c9c5-5fb1-4c4c-8cb7-942b3223db26', 'e58f345d-45ae-40b1-8311-02d7f5950170', 'd6dbe1b6-650d-450c-86cc-10090b014de0',
    'AT&T Cellular Gateway', 'Networking',
    'ATT-GW-552113', '', '359876543210987', '1.8.3', 'Roof Antenna Mount', 'Exterior', '2025-04-22', '2027-04-22', 425.00, 'active', 'Alarm panel cellular comm backup'),
  ('4e03b73c-77a4-4c05-803d-4048b62d8d38', '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', '13b87a26-4e36-4877-a6e3-f993fbb1437e',
    'DMP XR150 Control Panel', 'Alarm',
    'XR150-776612', '', '352099001234567', '203', 'Master Bedroom Closet', 'Master BR', '2025-03-15', '2030-03-15', 1250.00, 'active', 'Primary panel'),
  ('4e03b73c-77a4-4c05-803d-4048b62d8d38', '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', '13b87a26-4e36-4877-a6e3-f993fbb1437e',
    'DMP 7800 Touchscreen Keypad', 'Alarm',
    'KP-7800-998821', '', '', '112', 'Front Entry Wall', 'Entry', '2025-03-15', '2030-03-15', 320.00, 'active', '')
) AS v(company_id, site_id, system_id, product_name, product_category, serial_number, mac_address, imei, firmware_version, location_detail, zone_location, installation_date, warranty_expiration, install_cost, status, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM site_inventory si WHERE si.serial_number = v.serial_number AND si.serial_number <> ''
);

-- WORK ORDERS
DO $$
DECLARE
  tech_jake uuid := '33333333-3333-3333-3333-333333333333';
  tech_mike uuid := '11111111-1111-1111-1111-111111111111';
  tech_sarah uuid := '22222222-2222-2222-2222-222222222222';
  acme uuid := '3773c9c5-5fb1-4c4c-8cb7-942b3223db26';
  smith uuid := '4e03b73c-77a4-4c05-803d-4048b62d8d38';
  mall uuid := '7851e39e-4e37-4d65-ac1c-be09fb1a4c4b';
  techsol uuid := 'da674d5a-a5a2-4ee3-bee2-b363512bb134';
  johnson uuid := '725e05fc-7c80-4ef7-8903-ebc1424b69b2';
  acme_hq uuid := 'e58f345d-45ae-40b1-8311-02d7f5950170';
  acme_wh uuid := '6183c734-0aee-4409-a446-77ec3054a20f';
  acme_annex uuid := 'd9e95e2d-4642-4309-af43-6719e325d1dc';
  smith_site uuid := '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba';
  mall_site uuid := 'ff5fa318-8a91-4c49-a1c0-bbe04b776c47';
  techsol_hq uuid := '9fc810b5-b470-4505-a5d3-1e1fe26e763c';
  techsol_dc uuid := 'a7dc909f-47f2-4d22-abc4-9d646dc6724d';
  johnson_site uuid := '35d9ba28-e341-4f27-a199-cc82da4fe573';
  sys_acme_burg uuid := '996af58d-897b-49be-b1c8-6a9bfc336283';
  sys_acme_fire uuid := '1ba49563-7b57-42b5-a7da-aedff28a1e9a';
  sys_acme_ac uuid := '2dab0c53-3b12-4895-ada5-2eaa95f29c77';
  sys_acme_net uuid := 'd6dbe1b6-650d-450c-86cc-10090b014de0';
  sys_wh_burgfire uuid := '4390f7d9-652d-47c5-8c92-76fc85a95eca';
  sys_wh_gate uuid := '3bdb16a5-e51f-462c-8955-c5c4d8851013';
  sys_annex_burg uuid := '628b6f5f-142b-4eeb-8dbd-b2a1a4ca4082';
  sys_smith_burg uuid := '13b87a26-4e36-4877-a6e3-f993fbb1437e';
  sys_mall_burg uuid := '8ea659d1-d188-49b4-8c9c-34eb4fb77e89';
  sys_mall_fire uuid := '8c44bd1e-f3c9-406f-b545-a4df5111f4ee';
  sys_mall_ac uuid := 'c9d278d8-e1b9-4266-8800-3e6120fc16c7';
  sys_mall_av uuid := '9fa0448f-f9db-435d-851d-707919facaea';
  sys_tech_ac uuid := '171d84f2-921e-4a78-8eb0-5d1f48252625';
  sys_tech_net uuid := '74bef047-9108-49b9-a050-e44942107d53';
  sys_johnson uuid := '668d13d2-2de8-4f3d-b3f3-b585457a1d92';
  today date := CURRENT_DATE;
  rate_std uuid;
  rate_ah uuid;
  new_wo_id uuid;
  r record;
BEGIN
  SELECT id INTO rate_std FROM service_rates WHERE name = 'Standard Service' LIMIT 1;
  SELECT id INTO rate_ah FROM service_rates WHERE name = 'After Hours' LIMIT 1;

  FOR r IN
    SELECT * FROM (VALUES
      ('WO-T-1001', tech_mike, acme, acme_hq, sys_acme_burg, rate_std, 'Service', 'high', 'unbilled', 0, '08:30:00', 'False alarm on Zone 4 motion during open hours', 'Test zone, adjust sensitivity, review event history', 'Acme HQ — Zone 4 False Alarms', 'hourly', 125.00::numeric, NULL::numeric, 0::numeric, 0::numeric, 0::numeric),
      ('WO-T-1002', tech_mike, acme, acme_hq, sys_acme_fire, rate_std, 'Inspection', 'normal', 'unbilled', 0, '10:30:00', 'Annual fire inspection due', 'Full fire panel inspection + smoke detector test', 'Acme HQ — Annual Fire Inspection', 'fixed', NULL, 850.00, 0, 0, 0),
      ('WO-T-1003', tech_mike, techsol, techsol_hq, sys_tech_net, rate_std, 'Service', 'high', 'unbilled', 0, '13:00:00', 'Intermittent VLAN drops on 2nd floor AP', 'Check switch logs, verify PoE, update AP firmware', 'Tech Solutions — 2nd Floor WiFi Drops', 'hourly', 125.00, NULL, 0, 0, 0),
      ('WO-T-1004', tech_sarah, mall, mall_site, sys_mall_ac, rate_std, 'Service', 'normal', 'unbilled', 0, '09:00:00', 'Main entrance card reader unresponsive', 'Swap reader, re-enroll cards', 'Downtown Mall — Entrance Reader Down', 'hourly', 125.00, NULL, 0, 0, 0),
      ('WO-T-1005', tech_sarah, mall, mall_site, sys_mall_fire, rate_std, 'Maintenance', 'normal', 'unbilled', 0, '11:30:00', 'Quarterly fire system maintenance', 'Inspect, test, report per NFPA', 'Mall — Quarterly Fire Maintenance', 'fixed', NULL, 650.00, 0, 0, 0),
      ('WO-T-1006', tech_sarah, johnson, johnson_site, sys_johnson, rate_std, 'Service', 'low', 'unbilled', 0, '14:30:00', 'Low battery on keypad', 'Replace keypad backup battery, test', 'Johnson Residence — Low Battery', 'fixed', NULL, 125.00, 0, 0, 0),
      ('WO-T-1007', tech_jake, acme, acme_wh, sys_wh_burgfire, rate_std, 'Service', 'normal', 'unbilled', 0, '08:00:00', 'Dock door contact sensor trouble', 'Replace contact sensor, verify zone', 'Warehouse — Dock Sensor Repair', 'hourly', 125.00, NULL, 0, 0, 0),
      ('WO-T-1008', tech_jake, acme, acme_wh, sys_wh_gate, rate_std, 'Service', 'high', 'unbilled', 0, '10:30:00', 'Gate not closing fully', 'Adjust limit switch, lubricate track', 'Warehouse — Gate Issue', 'hourly', 125.00, NULL, 0, 0, 0),
      ('WO-T-1009', tech_jake, smith, smith_site, sys_smith_burg, rate_std, 'Service', 'emergency', 'unbilled', 0, '15:00:00', 'Panel offline, customer reports no comm', 'Check cell radio, verify signal, replace if needed', 'Smith Residence — Panel Offline', 'hourly', 175.00, NULL, 0, 0, 0),
      ('WO-T-1010', tech_jake, techsol, techsol_dc, NULL, rate_std, 'Inspection', 'normal', 'unbilled', 0, '16:30:00', 'Data center walk-through', 'Inspect all systems, document anomalies', 'Data Center — Monthly Walk', 'not_billable', NULL, NULL, 0, 0, 0),
      ('WO-T-1011', tech_mike, mall, mall_site, sys_mall_av, rate_std, 'Installation', 'normal', 'unbilled', 1, '09:00:00', 'Install 4 new CCTV cameras at loading dock', 'Mount, run cable, configure NVR', 'Mall — CCTV Install', 'fixed', NULL, 2400.00, 0, 0, 0),
      ('WO-T-1012', tech_sarah, acme, acme_annex, sys_annex_burg, rate_std, 'Service', 'normal', 'unbilled', 1, '10:00:00', 'Add 2 new door contacts to back office', 'Install contacts, program zones', 'Annex — Add Door Contacts', 'hourly', 125.00, NULL, 0, 0, 0),
      ('WO-T-1013', tech_jake, techsol, techsol_hq, sys_tech_ac, rate_std, 'Service', 'high', 'unbilled', 1, '13:00:00', 'Server room door held open alarm', 'Check door contact, magnetic lock, replace as needed', 'Tech Solutions — Server Room Door', 'hourly', 125.00, NULL, 0, 0, 0),
      ('WO-T-1014', tech_mike, johnson, johnson_site, sys_johnson, rate_std, 'Service', 'normal', 'unbilled', 2, '11:00:00', 'Customer wants to add garage motion', 'Install motion, program zone', 'Johnson — Add Garage Motion', 'fixed', NULL, 285.00, 0, 0, 0),
      ('WO-T-1015', tech_sarah, techsol, techsol_dc, sys_acme_net, rate_std, 'Installation', 'normal', 'unbilled', 2, '09:30:00', 'Deploy new access switch + 4 APs', 'Rack switch, run cable, mount APs, adopt', 'Data Center — Switch + AP Deploy', 'hourly', 125.00, NULL, 0, 0, 0),
      ('WO-T-2001', tech_mike, acme, acme_hq, sys_acme_burg, rate_std, 'Service', 'normal', 'completed', -1, '09:00:00', 'Motion sensor replacement', 'Replaced bad sensor in conference room', 'Acme HQ — Motion Replace', 'hourly', 125.00, NULL, 48.00, 187.50, 375.00),
      ('WO-T-2002', tech_sarah, mall, mall_site, sys_mall_burg, rate_std, 'Service', 'normal', 'completed', -1, '13:00:00', 'Glass break false trips', 'Adjusted sensitivity, bypassed faulty unit', 'Mall — Glass Break Tuning', 'hourly', 125.00, NULL, 0, 187.50, 250.00),
      ('WO-T-2003', tech_jake, smith, smith_site, sys_smith_burg, rate_ah, 'Service', 'emergency', 'completed', -2, '19:00:00', 'After-hours panel lockout', 'Reset panel, recode user, tested', 'Smith — After Hours Lockout', 'hourly', 175.00, NULL, 0, 350.00, 600.00),
      ('WO-T-2004', tech_mike, techsol, techsol_hq, sys_tech_net, rate_std, 'Installation', 'normal', 'completed', -3, '10:00:00', 'New branch firewall', 'Racked, configured failover to LTE', 'Tech Solutions — Firewall Install', 'fixed', NULL, 1800.00, 650.00, 375.00, 1800.00),
      ('WO-T-3001', tech_jake, mall, mall_site, sys_mall_fire, rate_std, 'Service', 'high', 'go_back', -1, '14:00:00', 'Panel trouble light, needs part', 'Ordered replacement smoke detector', 'Mall Fire — Awaiting Parts', 'hourly', 125.00, NULL, 0, 125.00, 125.00),
      ('WO-T-3002', tech_sarah, johnson, johnson_site, sys_johnson, rate_std, 'Service', 'normal', 'on_hold', -2, '10:30:00', 'Customer not home', 'Reschedule — no access', 'Johnson — No Access', 'hourly', 125.00, NULL, 0, 62.50, 0),
      ('WO-T-4001', tech_jake, acme, acme_hq, sys_acme_ac, rate_std, 'Maintenance', 'normal', 'unbilled', 3, '08:00:00', 'Quarterly access control maintenance', 'Test all readers, update firmware', 'Acme HQ — Access Maintenance', 'fixed', NULL, 650.00, 0, 0, 0),
      ('WO-T-4002', tech_mike, mall, mall_site, sys_mall_ac, rate_std, 'Maintenance', 'normal', 'unbilled', 4, '09:00:00', 'Contract maintenance visit', 'Per service agreement', 'Mall — Contract Visit', 'not_billable', NULL, NULL, 0, 0, 0),
      ('WO-T-4003', tech_sarah, techsol, techsol_hq, sys_tech_net, rate_std, 'Inspection', 'low', 'unbilled', 5, '14:00:00', 'Quarterly network health check', 'Review logs, test failover, update docs', 'Tech Solutions — Network Health Check', 'fixed', NULL, 450.00, 0, 0, 0),
      ('WO-T-4004', tech_jake, smith, smith_site, sys_smith_burg, rate_std, 'Service', 'normal', 'unbilled', 7, '11:00:00', 'Annual battery replacement', 'Swap panel + keypad backup batteries', 'Smith — Annual Battery', 'fixed', NULL, 185.00, 0, 0, 0)
    ) AS t(wo_number, tech_id, company_id, site_id, system_id, rate_id, work_type, priority, status, sched_offset, sched_time, reason, scope, title, billing_type, billing_rate, fixed_amount, parts_cost, labor_cost, revenue)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM work_orders WHERE wo_number = r.wo_number) THEN
      INSERT INTO work_orders (
        wo_number, company_id, site_id, system_id, service_rate_id,
        title, work_order_type, priority, status,
        scheduled_date, scheduled_time, reason_for_visit, scope_of_work,
        billing_type, billing_rate, fixed_amount, billing_status,
        total_parts_cost, total_labor_cost, total_revenue,
        profit_amount, profit_margin_pct,
        source
      ) VALUES (
        r.wo_number, r.company_id, r.site_id, r.system_id, r.rate_id,
        r.title, r.work_type, r.priority, r.status,
        (today + r.sched_offset), r.sched_time::time, r.reason, r.scope,
        r.billing_type,
        CASE WHEN r.billing_type = 'hourly' THEN r.billing_rate ELSE NULL END,
        CASE WHEN r.billing_type = 'fixed' THEN r.fixed_amount ELSE NULL END,
        'unbilled',
        r.parts_cost, r.labor_cost, r.revenue,
        GREATEST(r.revenue - r.parts_cost - r.labor_cost, 0),
        CASE WHEN r.revenue > 0 THEN ROUND(((r.revenue - r.parts_cost - r.labor_cost) / r.revenue) * 100, 2) ELSE 0 END,
        'dispatch'
      )
      RETURNING id INTO new_wo_id;

      INSERT INTO work_order_technicians (work_order_id, employee_id, is_lead, status)
      VALUES (
        new_wo_id, r.tech_id, true,
        CASE WHEN r.status = 'completed' THEN 'completed' ELSE 'assigned' END
      );
    END IF;
  END LOOP;
END $$;
