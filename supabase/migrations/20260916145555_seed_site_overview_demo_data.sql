/*
# Seed Site Overview demo data

Seeds vendors, site_vendors, service providers, rooms, and site_inventory
for Acme HQ (commercial) and Smith Home (residential) sites.

## Data seeded:
- 6 global vendors (various trades)
- Vendor links to Acme HQ (4 vendors) and Smith Home (2 vendors)
- Service providers: 3 for Acme HQ, 2 for Smith Home
- Rooms: 5 for Acme HQ, 4 for Smith Home
- Site inventory: equipment in rooms with product references
- Gate codes and Wi-Fi info on both sites
*/

-- ============================================================
-- Update sites with gate codes and Wi-Fi info
-- ============================================================
UPDATE sites SET gate_code = '4521#', wifi_network = 'AcmeCorp-Secure', wifi_password = 'Acm3C0rp!2026'
WHERE id = 'e58f345d-45ae-40b1-8311-02d7f5950170';

UPDATE sites SET gate_code = '1234', wifi_network = 'SmithHome_5G', wifi_password = 'welcome2home'
WHERE id = '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba';

-- ============================================================
-- Global vendors
-- ============================================================
INSERT INTO vendors (id, name, trade_type, contact_name, phone, email, website, notes) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Dallas Premier Plumbing', 'Plumber', 'Mike Torres', '(214) 555-0101', 'mike@dalplumbing.com', 'dalplumbing.com', 'Licensed, bonded. 24/7 emergency service available.'),
  ('a0000001-0000-0000-0000-000000000002', 'Lone Star Electric', 'Electrician', 'Sarah Chen', '(214) 555-0202', 'sarah@lonestarelectric.com', 'lonestarelectric.com', 'Commercial and residential. Master electrician on staff.'),
  ('a0000001-0000-0000-0000-000000000003', 'Arctic Air HVAC', 'HVAC', 'James Whitfield', '(972) 555-0303', 'james@arcticairhvac.com', 'arcticairhvac.com', 'Trane and Carrier certified dealer.'),
  ('a0000001-0000-0000-0000-000000000004', 'DFW Locksmith Pros', 'Locksmith', 'Tony Reeves', '(469) 555-0404', 'tony@dfwlocksmith.com', NULL, 'Fast response. Does commercial access control installs.'),
  ('a0000001-0000-0000-0000-000000000005', 'Greenscape Landscaping', 'Landscaping', 'Maria Gonzalez', '(214) 555-0505', 'maria@greenscapedfw.com', 'greenscapedfw.com', NULL),
  ('a0000001-0000-0000-0000-000000000006', 'Texas Roofing Solutions', 'Roofing', 'Bill Harper', '(972) 555-0606', 'bill@texasroofing.com', 'texasroofing.com', 'Handles large commercial buildings. Good warranty.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Link vendors to Acme HQ
-- ============================================================
INSERT INTO site_vendors (site_id, vendor_id, notes) VALUES
  ('e58f345d-45ae-40b1-8311-02d7f5950170', 'a0000001-0000-0000-0000-000000000001', 'Handles all restroom and breakroom plumbing.'),
  ('e58f345d-45ae-40b1-8311-02d7f5950170', 'a0000001-0000-0000-0000-000000000002', 'On retainer for quarterly electrical inspections.'),
  ('e58f345d-45ae-40b1-8311-02d7f5950170', 'a0000001-0000-0000-0000-000000000003', 'Maintains rooftop units. Service contract through 2027.'),
  ('e58f345d-45ae-40b1-8311-02d7f5950170', 'a0000001-0000-0000-0000-000000000004', 'Re-keyed entire building in March 2026.')
ON CONFLICT DO NOTHING;

-- Link vendors to Smith Home
INSERT INTO site_vendors (site_id, vendor_id, notes) VALUES
  ('1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', 'a0000001-0000-0000-0000-000000000001', NULL),
  ('1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', 'a0000001-0000-0000-0000-000000000003', 'Annual AC tune-up every spring.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Service providers for Acme HQ
-- ============================================================
INSERT INTO site_service_providers (site_id, provider_name, service_type, account_number, phone, email, notes) VALUES
  ('e58f345d-45ae-40b1-8311-02d7f5950170', 'AT&T Business Fiber', 'Internet', 'ATT-8820-4451', '(800) 555-1234', 'business@att.com', '1 Gbps symmetric. Contract ends Dec 2027.'),
  ('e58f345d-45ae-40b1-8311-02d7f5950170', 'Oncor Electric', 'Electric', 'ONC-990122-HQ', '(888) 555-2345', NULL, NULL),
  ('e58f345d-45ae-40b1-8311-02d7f5950170', 'Atmos Energy', 'Gas', 'ATM-441098', '(866) 555-3456', NULL, 'Meter located east side of building.');

-- Service providers for Smith Home
INSERT INTO site_service_providers (site_id, provider_name, service_type, account_number, phone, email, notes) VALUES
  ('1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', 'Spectrum Internet', 'Internet', 'SPEC-223344', '(855) 555-4567', NULL, '500 Mbps plan.'),
  ('1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', 'TXU Energy', 'Electric', 'TXU-881234', '(800) 555-5678', NULL, NULL);

-- ============================================================
-- Rooms for Acme HQ (commercial)
-- ============================================================
INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, notes, sort_order) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'e58f345d-45ae-40b1-8311-02d7f5950170', 'Main Lobby', '1st Floor', 'Living Area', 'Front entrance, reception desk', 1),
  ('b0000001-0000-0000-0000-000000000002', 'e58f345d-45ae-40b1-8311-02d7f5950170', 'Server Room', '1st Floor', 'Server Room', 'Climate controlled. Rack A and Rack B.', 2),
  ('b0000001-0000-0000-0000-000000000003', 'e58f345d-45ae-40b1-8311-02d7f5950170', 'Executive Office', '2nd Floor', 'Office', NULL, 3),
  ('b0000001-0000-0000-0000-000000000004', 'e58f345d-45ae-40b1-8311-02d7f5950170', 'Conference Room A', '2nd Floor', 'Office', 'Large conference room, seats 20', 4),
  ('b0000001-0000-0000-0000-000000000005', 'e58f345d-45ae-40b1-8311-02d7f5950170', 'Utility Closet', '1st Floor', 'Utility', 'Main alarm panel and network demarc', 5);

-- Rooms for Smith Home (residential)
INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, notes, sort_order) VALUES
  ('b0000002-0000-0000-0000-000000000001', '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', 'Living Room', '1st Floor', 'Living Area', NULL, 1),
  ('b0000002-0000-0000-0000-000000000002', '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', 'Master Bedroom', '2nd Floor', 'Bedroom', NULL, 2),
  ('b0000002-0000-0000-0000-000000000003', '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', 'Garage', '1st Floor', 'Garage', 'Detached 2-car', 3),
  ('b0000002-0000-0000-0000-000000000004', '1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', 'Home Office', '2nd Floor', 'Office', NULL, 4);

-- ============================================================
-- Site inventory in rooms (with product references)
-- ============================================================

-- Acme HQ — Server Room equipment
INSERT INTO site_inventory (site_id, company_id, room_id, system_id, product_id, product_name, product_category, serial_number, mac_address, installation_date, last_service_date, status, notes) VALUES
  ('e58f345d-45ae-40b1-8311-02d7f5950170', '3773c9c5-5fb1-4c4c-8cb7-942b3223db26', 'b0000001-0000-0000-0000-000000000002', 'd6dbe1b6-650d-450c-86cc-10090b014de0', NULL, 'Araknis AN-310-SW-F-24', 'Networking', 'ARK-2024-88312', 'A4:B1:C2:D3:E4:01', '2025-06-15', '2026-03-10', 'active', 'Rack A, top of rack switch'),
  ('e58f345d-45ae-40b1-8311-02d7f5950170', '3773c9c5-5fb1-4c4c-8cb7-942b3223db26', 'b0000001-0000-0000-0000-000000000002', 'd6dbe1b6-650d-450c-86cc-10090b014de0', NULL, 'Araknis AN-310-SW-F-24', 'Networking', 'ARK-2024-88313', 'A4:B1:C2:D3:E4:02', '2025-06-15', '2026-03-10', 'active', 'Rack B, top of rack switch'),
  ('e58f345d-45ae-40b1-8311-02d7f5950170', '3773c9c5-5fb1-4c4c-8cb7-942b3223db26', 'b0000001-0000-0000-0000-000000000002', 'd6dbe1b6-650d-450c-86cc-10090b014de0', NULL, 'WattBox WB-800-IPVM-12', 'Power', 'WB-2024-55091', NULL, '2025-06-15', NULL, 'active', 'UPS for Rack A');

-- Acme HQ — Utility Closet (alarm panel)
INSERT INTO site_inventory (site_id, company_id, room_id, system_id, product_id, product_name, product_category, serial_number, installation_date, last_service_date, status, notes) VALUES
  ('e58f345d-45ae-40b1-8311-02d7f5950170', '3773c9c5-5fb1-4c4c-8cb7-942b3223db26', 'b0000001-0000-0000-0000-000000000005', '996af58d-897b-49be-b1c8-6a9bfc336283', '9ac2e664-544f-4156-9bd4-207bd80b214b', 'DMP XR550 Commercial Security Panel', 'Control Panels', 'DMP-XR550-20240089', '2024-11-20', '2026-08-01', 'active', 'Main alarm panel. Master code with owner.'),
  ('e58f345d-45ae-40b1-8311-02d7f5950170', '3773c9c5-5fb1-4c4c-8cb7-942b3223db26', 'b0000001-0000-0000-0000-000000000005', '996af58d-897b-49be-b1c8-6a9bfc336283', 'fa60b022-c68c-4b44-8325-247807d1d697', 'DMP 7060 Graphic Touchscreen Keypad', 'Keypads', 'DMP-7060-20240412', '2024-11-20', NULL, 'active', 'Keypad in utility closet');

-- Acme HQ — Main Lobby (keypad + camera placeholder)
INSERT INTO site_inventory (site_id, company_id, room_id, system_id, product_name, product_category, serial_number, installation_date, status, notes) VALUES
  ('e58f345d-45ae-40b1-8311-02d7f5950170', '3773c9c5-5fb1-4c4c-8cb7-942b3223db26', 'b0000001-0000-0000-0000-000000000001', '996af58d-897b-49be-b1c8-6a9bfc336283', 'DMP 7060 Graphic Touchscreen Keypad', 'Keypads', 'DMP-7060-20240413', '2024-11-20', 'active', 'Lobby keypad near front entrance');

-- Smith Home — Living Room
INSERT INTO site_inventory (site_id, company_id, room_id, system_id, product_id, product_name, product_category, serial_number, installation_date, last_service_date, status) VALUES
  ('1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', '4e03b73c-77a4-4c05-803d-4048b62d8d38', 'b0000002-0000-0000-0000-000000000001', '13b87a26-4e36-4877-a6e3-f993fbb1437e', '2fbe6f42-8d77-491c-9978-e172cc628ee9', 'DMP XR150 Security Control Panel', 'Control Panels', 'DMP-XR150-20250155', '2025-03-10', '2026-06-15', 'active');

-- Smith Home — Master Bedroom
INSERT INTO site_inventory (site_id, company_id, room_id, system_id, product_name, product_category, serial_number, installation_date, status) VALUES
  ('1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', '4e03b73c-77a4-4c05-803d-4048b62d8d38', 'b0000002-0000-0000-0000-000000000002', '13b87a26-4e36-4877-a6e3-f993fbb1437e', 'DMP 7060 Graphic Touchscreen Keypad', 'Keypads', 'DMP-7060-20250331', '2025-03-10', 'active');

-- Smith Home — Home Office
INSERT INTO site_inventory (site_id, company_id, room_id, system_id, product_name, product_category, serial_number, mac_address, installation_date, status, notes) VALUES
  ('1c889f82-eae9-4ad2-8a46-cd3d4372f2ba', '4e03b73c-77a4-4c05-803d-4048b62d8d38', 'b0000002-0000-0000-0000-000000000004', '13b87a26-4e36-4877-a6e3-f993fbb1437e', 'Araknis AN-110-AP-I-AC', 'Networking', 'ARK-AP-20250610', 'B2:C3:D4:E5:F6:01', '2025-06-10', 'active', 'Ceiling-mounted WAP');
