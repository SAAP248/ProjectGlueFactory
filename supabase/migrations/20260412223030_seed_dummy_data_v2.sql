/*
  # Seed Dummy Data - Companies, Sites, Contacts, Systems, Zones, Devices, Invoices, Estimates, Transactions, Credits, Notes, Work Orders

  ## Overview
  Inserts realistic dummy data using correct column names from the actual schema.
  All data is for demonstration purposes.
*/

DO $$
DECLARE
  acme_id uuid; smith_id uuid; mall_id uuid; tech_id uuid; johnson_id uuid;
  acme_site1 uuid; acme_site2 uuid; acme_site3 uuid;
  smith_site1 uuid;
  mall_site1 uuid;
  tech_site1 uuid; tech_site2 uuid;
  johnson_site1 uuid;
  st_burg uuid; st_fire uuid; st_burg_fire uuid; st_access uuid;
  st_networking uuid; st_av uuid; st_gates uuid;
  sys1 uuid; sys2 uuid; sys3 uuid; sys4 uuid;
  sys5 uuid; sys6 uuid; sys7 uuid; sys8 uuid;
  sys9 uuid; sys10 uuid; sys11 uuid;
  inv_acme1 uuid; inv_acme2 uuid; inv_mall1 uuid; inv_mall2 uuid;
  inv_smith1 uuid; inv_tech1 uuid; inv_johnson1 uuid;
  est_acme1 uuid; est_mall1 uuid; est_tech1 uuid;
BEGIN

  -- Fetch system type IDs
  SELECT id INTO st_burg FROM system_types WHERE name = 'Burg' LIMIT 1;
  SELECT id INTO st_fire FROM system_types WHERE name = 'Fire' LIMIT 1;
  SELECT id INTO st_burg_fire FROM system_types WHERE name = 'Burg & Fire' LIMIT 1;
  SELECT id INTO st_access FROM system_types WHERE name = 'Access Control' LIMIT 1;
  SELECT id INTO st_networking FROM system_types WHERE name = 'Networking' LIMIT 1;
  SELECT id INTO st_av FROM system_types WHERE name = 'Audio Video' LIMIT 1;
  SELECT id INTO st_gates FROM system_types WHERE name = 'Gates' LIMIT 1;

  -- =====================================================
  -- COMPANIES
  -- =====================================================
  INSERT INTO companies (name, status, customer_type, account_number, phone, email, billing_address, billing_city, billing_state, billing_zip, tags, is_vip, total_revenue, outstanding_balance, past_due_amount, payment_terms)
  VALUES
    ('Acme Corporation', 'active', 'commercial', 'ACC-10234', '(555) 123-4567', 'contact@acmecorp.com', '1234 Commerce Blvd', 'Dallas', 'TX', '75201', ARRAY['Large Account','Auto-Pay'], true, 145890.00, 12500.00, 0.00, 'Net 30'),
    ('Smith Residence', 'active', 'residential', 'RES-20198', '(555) 234-5678', 'john.smith@email.com', '789 Oak Street', 'Plano', 'TX', '75024', ARRAY['Monthly Monitoring'], false, 8450.00, 350.00, 0.00, 'Net 15'),
    ('Downtown Mall', 'active', 'commercial', 'ACC-10567', '(555) 345-6789', 'security@downtownmall.com', '500 Main Street', 'Dallas', 'TX', '75202', ARRAY['Large Account','Past Due','Priority'], true, 287600.00, 45000.00, 15000.00, 'Net 30'),
    ('Tech Solutions Inc', 'active', 'commercial', 'ACC-10891', '(555) 456-7890', 'admin@techsolutions.com', '3300 Tech Park Drive', 'Irving', 'TX', '75038', ARRAY['Auto-Pay','Multi-Site'], false, 52300.00, 2100.00, 0.00, 'Net 30'),
    ('Johnson Family', 'active', 'residential', 'RES-20345', '(555) 567-8901', 'mjohnson@email.com', '412 Maple Avenue', 'Garland', 'TX', '75040', ARRAY['Auto-Pay','Long-term'], false, 6200.00, 0.00, 0.00, 'Due on Receipt')
  ON CONFLICT (account_number) DO NOTHING;

  SELECT id INTO acme_id FROM companies WHERE account_number = 'ACC-10234' LIMIT 1;
  SELECT id INTO smith_id FROM companies WHERE account_number = 'RES-20198' LIMIT 1;
  SELECT id INTO mall_id FROM companies WHERE account_number = 'ACC-10567' LIMIT 1;
  SELECT id INTO tech_id FROM companies WHERE account_number = 'ACC-10891' LIMIT 1;
  SELECT id INTO johnson_id FROM companies WHERE account_number = 'RES-20345' LIMIT 1;

  -- =====================================================
  -- SITES
  -- =====================================================
  INSERT INTO sites (company_id, name, address, city, state, zip, site_type, latitude, longitude, alarm_code, access_instructions)
  VALUES
    (acme_id, 'Acme HQ', '1234 Commerce Blvd', 'Dallas', 'TX', '75201', 'commercial', 32.7767, -96.7970, '4521', 'Use rear entrance. Call Mike at ext 201 on arrival.'),
    (acme_id, 'Acme Warehouse', '5678 Industrial Way', 'Dallas', 'TX', '75208', 'commercial', 32.7701, -96.8150, '8834', 'Gate code 1122. Dock door on east side.'),
    (acme_id, 'Acme Annex Office', '910 Park Lane', 'Dallas', 'TX', '75205', 'commercial', 32.8100, -96.7810, '2277', 'Ring doorbell. Manager will escort.'),
    (smith_id, 'Smith Home', '789 Oak Street', 'Plano', 'TX', '75024', 'residential', 33.0198, -96.6989, '7741', 'Hidden key under back porch mat.'),
    (mall_id, 'Downtown Mall - Main', '500 Main Street', 'Dallas', 'TX', '75202', 'commercial', 32.7784, -96.7940, '3309', 'Security office is at food court entrance. Ask for Janice.'),
    (tech_id, 'Tech Solutions HQ', '3300 Tech Park Drive', 'Irving', 'TX', '75038', 'commercial', 32.8579, -96.9527, '5512', 'Badge-access lobby. Visitor sign-in required.'),
    (tech_id, 'Tech Solutions Data Center', '3310 Tech Park Drive', 'Irving', 'TX', '75038', 'commercial', 32.8581, -96.9530, '9921', 'Escort required. Call ahead at (555) 456-7891.'),
    (johnson_id, 'Johnson Residence', '412 Maple Avenue', 'Garland', 'TX', '75040', 'residential', 32.9126, -96.6389, '6603', 'Dogs inside. Please call before entry.')
  ON CONFLICT DO NOTHING;

  SELECT id INTO acme_site1 FROM sites WHERE company_id = acme_id AND name = 'Acme HQ' LIMIT 1;
  SELECT id INTO acme_site2 FROM sites WHERE company_id = acme_id AND name = 'Acme Warehouse' LIMIT 1;
  SELECT id INTO acme_site3 FROM sites WHERE company_id = acme_id AND name = 'Acme Annex Office' LIMIT 1;
  SELECT id INTO smith_site1 FROM sites WHERE company_id = smith_id LIMIT 1;
  SELECT id INTO mall_site1 FROM sites WHERE company_id = mall_id LIMIT 1;
  SELECT id INTO tech_site1 FROM sites WHERE company_id = tech_id AND name = 'Tech Solutions HQ' LIMIT 1;
  SELECT id INTO tech_site2 FROM sites WHERE company_id = tech_id AND name LIKE '%Data Center%' LIMIT 1;
  SELECT id INTO johnson_site1 FROM sites WHERE company_id = johnson_id LIMIT 1;

  -- =====================================================
  -- CONTACTS (no site_id column in contacts)
  -- =====================================================
  INSERT INTO contacts (company_id, first_name, last_name, title, email, phone, mobile, is_primary)
  VALUES
    (acme_id, 'Michael', 'Torres', 'Facilities Manager', 'mtorres@acmecorp.com', '(555) 123-4567', '(555) 123-9000', true),
    (acme_id, 'Sandra', 'Kim', 'IT Director', 'skim@acmecorp.com', '(555) 123-4568', '(555) 123-9001', false),
    (acme_id, 'Derek', 'Hughes', 'Warehouse Supervisor', 'dhughes@acmecorp.com', '(555) 123-4569', '(555) 123-9002', false),
    (acme_id, 'Linda', 'Chen', 'Accounts Payable', 'lchen@acmecorp.com', '(555) 123-4570', NULL, false),
    (acme_id, 'Gary', 'Patel', 'CEO', 'gpatel@acmecorp.com', '(555) 123-4571', '(555) 123-9004', false),
    (smith_id, 'John', 'Smith', 'Homeowner', 'john.smith@email.com', '(555) 234-5678', '(555) 234-5679', true),
    (smith_id, 'Mary', 'Smith', 'Homeowner', 'mary.smith@email.com', NULL, '(555) 234-5680', false),
    (mall_id, 'Janice', 'Rodriguez', 'Security Director', 'jrodriguez@downtownmall.com', '(555) 345-6789', '(555) 345-6790', true),
    (mall_id, 'Tom', 'Wallace', 'General Manager', 'twallace@downtownmall.com', '(555) 345-6791', '(555) 345-6792', false),
    (mall_id, 'Beth', 'Franklin', 'Accounts Payable', 'bfranklin@downtownmall.com', '(555) 345-6793', NULL, false),
    (tech_id, 'Kevin', 'Marsh', 'IT Manager', 'kmarsh@techsolutions.com', '(555) 456-7890', '(555) 456-7891', true),
    (tech_id, 'Alice', 'Nguyen', 'Data Center Lead', 'anguyen@techsolutions.com', '(555) 456-7892', '(555) 456-7893', false),
    (tech_id, 'Brian', 'Scott', 'CFO', 'bscott@techsolutions.com', '(555) 456-7894', NULL, false),
    (johnson_id, 'Mark', 'Johnson', 'Homeowner', 'mjohnson@email.com', '(555) 567-8901', '(555) 567-8902', true),
    (johnson_id, 'Donna', 'Johnson', 'Homeowner', 'djohnson@email.com', NULL, '(555) 567-8903', false)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- CUSTOMER SYSTEMS
  -- =====================================================
  INSERT INTO customer_systems (company_id, site_id, system_type_id, name, panel_make, panel_model, monitoring_account_number, status, installation_date)
  VALUES
    (acme_id, acme_site1, st_burg, 'Acme HQ Burglar', 'DSC', 'PowerSeries Neo HS2064', 'MON-1001', 'active', '2020-04-15'),
    (acme_id, acme_site1, st_fire, 'Acme HQ Fire', 'Notifier', 'NFS2-3030', 'MON-1002', 'active', '2020-04-15'),
    (acme_id, acme_site1, st_access, 'Acme HQ Access Control', 'HID', 'VertX V2000', NULL, 'active', '2021-06-01'),
    (acme_id, acme_site1, st_networking, 'Acme HQ Network', 'Cisco', 'Meraki MX68', NULL, 'active', '2021-06-01'),
    (acme_id, acme_site2, st_burg_fire, 'Warehouse Burg & Fire', 'Bosch', 'B9512G', 'MON-1003', 'active', '2019-08-20'),
    (acme_id, acme_site2, st_gates, 'Warehouse Gate System', 'LiftMaster', 'SL3000U', NULL, 'active', '2019-08-20'),
    (acme_id, acme_site3, st_burg, 'Annex Burglar', 'Honeywell', 'VISTA-20P', 'MON-1004', 'active', '2022-02-10'),
    (smith_id, smith_site1, st_burg, 'Smith Home Burglar', 'Honeywell', 'VISTA-20P', 'MON-2001', 'active', '2018-03-10'),
    (mall_id, mall_site1, st_burg, 'Mall Burglar System', 'DSC', 'PowerSeries Pro MP-32', 'MON-3001', 'active', '2017-11-05'),
    (mall_id, mall_site1, st_fire, 'Mall Fire System', 'Simplex', '4010ES', 'MON-3002', 'active', '2017-11-05'),
    (mall_id, mall_site1, st_access, 'Mall Access Control', 'Lenel', 'OnGuard S2', NULL, 'active', '2018-02-14'),
    (mall_id, mall_site1, st_av, 'Mall AV/CCTV System', 'Axis', 'Enterprise NVR', NULL, 'active', '2019-05-20'),
    (tech_id, tech_site1, st_access, 'HQ Access Control', 'Bosch', 'Access PE', NULL, 'active', '2022-01-15'),
    (tech_id, tech_site1, st_networking, 'HQ Network Infrastructure', 'Cisco', 'Catalyst 9300', NULL, 'active', '2022-01-15'),
    (tech_id, tech_site2, st_burg, 'Data Center Burglar', 'DSC', 'PowerSeries Neo', 'MON-4001', 'active', '2022-03-01'),
    (johnson_id, johnson_site1, st_burg, 'Johnson Home Burglar', 'Honeywell', 'VISTA-15P', 'MON-5001', 'active', '2021-09-12')
  ON CONFLICT DO NOTHING;

  SELECT id INTO sys1 FROM customer_systems WHERE company_id = acme_id AND site_id = acme_site1 AND system_type_id = st_burg LIMIT 1;
  SELECT id INTO sys2 FROM customer_systems WHERE company_id = acme_id AND site_id = acme_site1 AND system_type_id = st_fire LIMIT 1;
  SELECT id INTO sys3 FROM customer_systems WHERE company_id = acme_id AND site_id = acme_site1 AND system_type_id = st_access LIMIT 1;
  SELECT id INTO sys4 FROM customer_systems WHERE company_id = acme_id AND site_id = acme_site1 AND system_type_id = st_networking LIMIT 1;
  SELECT id INTO sys5 FROM customer_systems WHERE company_id = acme_id AND site_id = acme_site2 AND system_type_id = st_burg_fire LIMIT 1;
  SELECT id INTO sys6 FROM customer_systems WHERE company_id = acme_id AND site_id = acme_site2 AND system_type_id = st_gates LIMIT 1;
  SELECT id INTO sys7 FROM customer_systems WHERE company_id = smith_id AND system_type_id = st_burg LIMIT 1;
  SELECT id INTO sys8 FROM customer_systems WHERE company_id = mall_id AND system_type_id = st_burg LIMIT 1;
  SELECT id INTO sys9 FROM customer_systems WHERE company_id = mall_id AND system_type_id = st_fire LIMIT 1;
  SELECT id INTO sys10 FROM customer_systems WHERE company_id = mall_id AND system_type_id = st_access LIMIT 1;
  SELECT id INTO sys11 FROM customer_systems WHERE company_id = mall_id AND system_type_id = st_av LIMIT 1;

  -- =====================================================
  -- SYSTEM ZONES
  -- =====================================================
  IF sys1 IS NOT NULL THEN
    INSERT INTO system_zones (system_id, zone_number, zone_name, zone_type, bypass_status) VALUES
      (sys1, 1, 'Front Door', 'Entry/Exit', false),
      (sys1, 2, 'Rear Door', 'Entry/Exit', false),
      (sys1, 3, 'Lobby Motion', 'Motion', false),
      (sys1, 4, 'Server Room Door', 'Entry/Exit', false),
      (sys1, 5, 'Main Office Motion', 'Motion', false),
      (sys1, 6, 'Break Room Motion', 'Motion', true),
      (sys1, 7, 'Side Entry Door', 'Entry/Exit', false),
      (sys1, 8, 'Rooftop Access', 'Entry/Exit', false)
    ON CONFLICT DO NOTHING;
  END IF;

  IF sys2 IS NOT NULL THEN
    INSERT INTO system_zones (system_id, zone_number, zone_name, zone_type, bypass_status) VALUES
      (sys2, 1, 'Lobby Smoke Detector', 'Smoke', false),
      (sys2, 2, 'Server Room Heat Detector', 'Heat', false),
      (sys2, 3, 'Kitchen Smoke Detector', 'Smoke', false),
      (sys2, 4, 'Stairwell Smoke Detector', 'Smoke', false),
      (sys2, 5, 'Electrical Room Heat', 'Heat', false),
      (sys2, 6, 'Conference Room Pull Station', 'Manual Pull', false)
    ON CONFLICT DO NOTHING;
  END IF;

  IF sys5 IS NOT NULL THEN
    INSERT INTO system_zones (system_id, zone_number, zone_name, zone_type, bypass_status) VALUES
      (sys5, 1, 'Warehouse Front Door', 'Entry/Exit', false),
      (sys5, 2, 'Loading Dock Door A', 'Entry/Exit', false),
      (sys5, 3, 'Loading Dock Door B', 'Entry/Exit', false),
      (sys5, 4, 'Warehouse Interior Motion', 'Motion', false),
      (sys5, 5, 'Office Area Smoke', 'Smoke', false),
      (sys5, 6, 'Sprinkler Flow', 'Water Flow', false)
    ON CONFLICT DO NOTHING;
  END IF;

  IF sys7 IS NOT NULL THEN
    INSERT INTO system_zones (system_id, zone_number, zone_name, zone_type, bypass_status) VALUES
      (sys7, 1, 'Front Door', 'Entry/Exit', false),
      (sys7, 2, 'Back Door', 'Entry/Exit', false),
      (sys7, 3, 'Living Room Motion', 'Motion', false),
      (sys7, 4, 'Garage Door', 'Entry/Exit', false),
      (sys7, 5, 'Master Bedroom Window', 'Perimeter', false),
      (sys7, 6, 'Kitchen Motion', 'Motion', true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF sys8 IS NOT NULL THEN
    INSERT INTO system_zones (system_id, zone_number, zone_name, zone_type, bypass_status) VALUES
      (sys8, 1, 'Main Entrance', 'Entry/Exit', false),
      (sys8, 2, 'Food Court Entrance', 'Entry/Exit', false),
      (sys8, 3, 'Service Corridor', 'Motion', false),
      (sys8, 4, 'Security Office Door', 'Entry/Exit', false),
      (sys8, 5, 'Management Office', 'Entry/Exit', false),
      (sys8, 6, 'Loading Dock Door A', 'Entry/Exit', false),
      (sys8, 7, 'Loading Dock Door B', 'Entry/Exit', false),
      (sys8, 8, 'Rooftop Access', 'Entry/Exit', false)
    ON CONFLICT DO NOTHING;
  END IF;

  IF sys9 IS NOT NULL THEN
    INSERT INTO system_zones (system_id, zone_number, zone_name, zone_type, bypass_status) VALUES
      (sys9, 1, 'Atrium Smoke Detector', 'Smoke', false),
      (sys9, 2, 'Food Court Smoke', 'Smoke', false),
      (sys9, 3, 'Parking Garage CO', 'CO', false),
      (sys9, 4, 'Theater Smoke', 'Smoke', false),
      (sys9, 5, 'Kitchen Hood Suppression', 'Suppression', false),
      (sys9, 6, 'Sprinkler Flow Zone A', 'Water Flow', false),
      (sys9, 7, 'Sprinkler Flow Zone B', 'Water Flow', false),
      (sys9, 8, 'Pull Station - Main', 'Manual Pull', false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =====================================================
  -- SYSTEM DEVICES
  -- =====================================================
  IF sys3 IS NOT NULL THEN
    INSERT INTO system_devices (system_id, device_name, device_type, make, model, serial_number, location, status) VALUES
      (sys3, 'Front Door Reader', 'Card Reader', 'HID', 'Multiclass SE R10', 'HID-001-2021', 'Main Lobby Entry', 'active'),
      (sys3, 'Rear Door Reader', 'Card Reader', 'HID', 'Multiclass SE R10', 'HID-002-2021', 'Rear Employee Entry', 'active'),
      (sys3, 'Server Room Reader', 'Card Reader', 'HID', 'iCLASS SE R40', 'HID-003-2021', 'Server Room Door', 'active'),
      (sys3, 'Access Controller', 'Controller', 'HID', 'VertX V2000', 'HID-CTL-001', 'IT Closet', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  IF sys4 IS NOT NULL THEN
    INSERT INTO system_devices (system_id, device_name, device_type, make, model, serial_number, mac_address, ip_address, location, status) VALUES
      (sys4, 'Core Router', 'Router', 'Cisco', 'Meraki MX68', 'SN-MX68-001', 'AA:BB:CC:DD:EE:01', '192.168.10.1', 'Server Room Rack 1', 'active'),
      (sys4, 'Core Switch', 'Switch', 'Cisco', 'Meraki MS120-8FP', 'SN-MS120-001', 'AA:BB:CC:DD:EE:02', '192.168.10.2', 'Server Room Rack 1', 'active'),
      (sys4, 'AP - Lobby', 'Access Point', 'Cisco', 'Meraki MR36', 'SN-MR36-001', 'AA:BB:CC:DD:EE:03', '192.168.10.20', 'Lobby Ceiling', 'active'),
      (sys4, 'AP - Office', 'Access Point', 'Cisco', 'Meraki MR36', 'SN-MR36-002', 'AA:BB:CC:DD:EE:04', '192.168.10.21', 'Open Office Ceiling', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  IF sys6 IS NOT NULL THEN
    INSERT INTO system_devices (system_id, device_name, device_type, make, model, serial_number, location, status) VALUES
      (sys6, 'Main Entry Gate Operator', 'Gate Operator', 'LiftMaster', 'SL3000U', 'LM-SL3-001', 'Main Entry Drive', 'active'),
      (sys6, 'Exit Gate Operator', 'Gate Operator', 'LiftMaster', 'SL3000U', 'LM-SL3-002', 'Exit Drive', 'active'),
      (sys6, 'Entry Keypad', 'Keypad', 'LiftMaster', 'KAPD', NULL, 'Main Entry Pedestal', 'active'),
      (sys6, 'Entry Loop Detector', 'Loop Detector', 'Guardian', 'GL1S', NULL, 'Inbound Lane', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  IF sys10 IS NOT NULL THEN
    INSERT INTO system_devices (system_id, device_name, device_type, make, model, serial_number, ip_address, location, status) VALUES
      (sys10, 'Security Office Door Reader', 'Card Reader', 'Lenel', 'LNL-4420', 'LNL-001-2018', NULL, 'Security Office Entry', 'active'),
      (sys10, 'Management Office Reader', 'Card Reader', 'Lenel', 'LNL-4420', 'LNL-002-2018', NULL, 'Management Suite Entry', 'active'),
      (sys10, 'Server Room Reader', 'Card Reader', 'Lenel', 'LNL-4475', 'LNL-003-2018', NULL, 'IT Server Room', 'active'),
      (sys10, 'Access Control Server', 'Controller', 'Lenel', 'LNL-3300', 'LNL-CTL-001', '10.10.10.50', 'Security Office Rack', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  IF sys11 IS NOT NULL THEN
    INSERT INTO system_devices (system_id, device_name, device_type, make, model, serial_number, mac_address, ip_address, location, status) VALUES
      (sys11, 'Main Entrance PTZ', 'PTZ Camera', 'Axis', 'P5655-E', 'AXIS-001-2019', 'BB:CC:DD:EE:FF:01', '10.10.20.101', 'Main Entrance Ceiling', 'active'),
      (sys11, 'Food Court Overview', 'Dome Camera', 'Axis', 'P3245-V', 'AXIS-002-2019', 'BB:CC:DD:EE:FF:02', '10.10.20.102', 'Food Court Center Ceiling', 'active'),
      (sys11, 'Parking Lot North', 'Bullet Camera', 'Axis', 'P1448-LE', 'AXIS-003-2019', 'BB:CC:DD:EE:FF:03', '10.10.20.103', 'North Parking Pole Mount', 'active'),
      (sys11, 'Parking Lot South', 'Bullet Camera', 'Axis', 'P1448-LE', 'AXIS-004-2019', 'BB:CC:DD:EE:FF:04', '10.10.20.104', 'South Parking Pole Mount', 'active'),
      (sys11, 'NVR Server', 'NVR', 'Axis', 'S3008 Recorder', 'AXIS-NVR-001', 'BB:CC:DD:EE:FF:10', '10.10.20.200', 'Security Office Equipment Rack', 'active'),
      (sys11, 'Video Management Workstation', 'Workstation', 'Dell', 'OptiPlex 5090', 'DELL-001-2019', NULL, '10.10.20.201', 'Security Office Desk', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  -- =====================================================
  -- INVOICES
  -- =====================================================
  INSERT INTO invoices (invoice_number, company_id, site_id, status, invoice_date, due_date, subtotal, tax, total, amount_paid, balance_due, notes, terms)
  VALUES
    ('INV-2024-001', acme_id, acme_site1, 'paid', '2024-01-05', '2024-02-04', 4500.00, 371.25, 4871.25, 4871.25, 0.00, 'Annual monitoring renewal Q1', 'Net 30'),
    ('INV-2024-002', acme_id, acme_site1, 'paid', '2024-02-05', '2024-03-06', 1200.00, 99.00, 1299.00, 1299.00, 0.00, 'Service call - panel firmware update', 'Net 30'),
    ('INV-2024-003', acme_id, acme_site1, 'sent', '2024-03-05', '2024-04-04', 11574.85, 925.00, 12500.00, 0.00, 12500.00, 'Quarterly monitoring + service visit', 'Net 30'),
    ('INV-2024-004', smith_id, smith_site1, 'partial', '2024-02-15', '2024-03-01', 323.85, 26.71, 350.56, 200.00, 150.56, 'Monthly monitoring Feb + keypad replacement', 'Net 15'),
    ('INV-2024-005', mall_id, mall_site1, 'overdue', '2024-01-01', '2024-01-31', 27500.00, 2268.75, 29768.75, 14768.75, 15000.00, 'Annual monitoring contract Q1 - partial paid', 'Net 30'),
    ('INV-2024-006', mall_id, mall_site1, 'sent', '2024-03-01', '2024-03-31', 27500.00, 2268.75, 29768.75, 0.00, 29768.75, 'Annual monitoring contract Q2', 'Net 30'),
    ('INV-2024-007', tech_id, tech_site1, 'paid', '2024-01-15', '2024-02-14', 1950.00, 160.88, 2110.88, 2110.88, 0.00, 'Network maintenance + monitoring Jan', 'Net 30'),
    ('INV-2024-008', tech_id, tech_site1, 'sent', '2024-03-15', '2024-04-14', 1950.00, 160.88, 2110.88, 0.00, 2110.88, 'Network maintenance + monitoring Mar', 'Net 30'),
    ('INV-2024-009', johnson_id, johnson_site1, 'paid', '2024-01-10', '2024-01-25', 49.95, 4.12, 54.07, 54.07, 0.00, 'Monthly monitoring January', 'Due on Receipt'),
    ('INV-2024-010', johnson_id, johnson_site1, 'paid', '2024-02-10', '2024-02-25', 49.95, 4.12, 54.07, 54.07, 0.00, 'Monthly monitoring February', 'Due on Receipt'),
    ('INV-2024-011', johnson_id, johnson_site1, 'paid', '2024-03-10', '2024-03-25', 49.95, 4.12, 54.07, 54.07, 0.00, 'Monthly monitoring March', 'Due on Receipt')
  ON CONFLICT (invoice_number) DO NOTHING;

  SELECT id INTO inv_acme1 FROM invoices WHERE invoice_number = 'INV-2024-001' LIMIT 1;
  SELECT id INTO inv_acme2 FROM invoices WHERE invoice_number = 'INV-2024-002' LIMIT 1;
  SELECT id INTO inv_mall1 FROM invoices WHERE invoice_number = 'INV-2024-005' LIMIT 1;
  SELECT id INTO inv_mall2 FROM invoices WHERE invoice_number = 'INV-2024-006' LIMIT 1;
  SELECT id INTO inv_smith1 FROM invoices WHERE invoice_number = 'INV-2024-004' LIMIT 1;
  SELECT id INTO inv_tech1 FROM invoices WHERE invoice_number = 'INV-2024-007' LIMIT 1;
  SELECT id INTO inv_johnson1 FROM invoices WHERE invoice_number = 'INV-2024-009' LIMIT 1;

  -- =====================================================
  -- INVOICE LINE ITEMS
  -- =====================================================
  IF inv_acme1 IS NOT NULL THEN
    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total)
    VALUES
      (inv_acme1, 'Annual Monitoring - Burglar System (MON-1001)', 1, 1500.00, 1500.00),
      (inv_acme1, 'Annual Monitoring - Fire System (MON-1002)', 1, 1800.00, 1800.00),
      (inv_acme1, 'Annual Monitoring - Warehouse (MON-1003)', 1, 1200.00, 1200.00)
    ON CONFLICT DO NOTHING;
  END IF;

  IF inv_smith1 IS NOT NULL THEN
    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total)
    VALUES
      (inv_smith1, 'Monthly Monitoring - February', 1, 49.95, 49.95),
      (inv_smith1, 'Honeywell 6160 Alpha Keypad Replacement', 1, 185.00, 185.00),
      (inv_smith1, 'Labor - Keypad Installation (1 hr)', 1, 95.00, 95.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =====================================================
  -- ESTIMATES
  -- =====================================================
  INSERT INTO estimates (estimate_number, company_id, site_id, status, estimate_date, expiration_date, subtotal, tax, total, notes, terms)
  VALUES
    ('EST-2024-001', acme_id, acme_site3, 'approved', '2024-01-20', '2024-04-20', 8400.00, 693.00, 9093.00, 'New burg system for Annex building', 'Net 30'),
    ('EST-2024-002', acme_id, acme_site1, 'sent', '2024-03-10', '2024-06-10', 3200.00, 264.00, 3464.00, 'Upgrade to IP-based access control readers', 'Net 30'),
    ('EST-2024-003', mall_id, mall_site1, 'draft', '2024-03-20', '2024-06-20', 42000.00, 3465.00, 45465.00, 'Full CCTV system expansion - 24 additional cameras', 'Net 30'),
    ('EST-2024-004', tech_id, tech_site2, 'approved', '2024-02-01', '2024-05-01', 5800.00, 478.50, 6278.50, 'Data center burg system expansion - 4 new zones', 'Net 30'),
    ('EST-2024-005', smith_id, smith_site1, 'expired', '2023-09-15', '2023-12-15', 2400.00, 198.00, 2598.00, 'Smart home integration package', 'Net 15')
  ON CONFLICT (estimate_number) DO NOTHING;

  SELECT id INTO est_acme1 FROM estimates WHERE estimate_number = 'EST-2024-001' LIMIT 1;
  SELECT id INTO est_mall1 FROM estimates WHERE estimate_number = 'EST-2024-003' LIMIT 1;
  SELECT id INTO est_tech1 FROM estimates WHERE estimate_number = 'EST-2024-004' LIMIT 1;

  -- Estimate line items
  IF est_acme1 IS NOT NULL THEN
    INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, total)
    VALUES
      (est_acme1, 'DSC PowerSeries Neo HS2032 Panel', 1, 950.00, 950.00),
      (est_acme1, 'DSC PG9945 Motion Detector', 6, 145.00, 870.00),
      (est_acme1, 'DSC PG9303 Door/Window Contact', 12, 55.00, 660.00),
      (est_acme1, 'DSC HS2ICNRF9ENG Keypad', 2, 185.00, 370.00),
      (est_acme1, 'Labor - Installation (24 hrs)', 24, 95.00, 2280.00),
      (est_acme1, 'Cellular Communicator Module', 1, 320.00, 320.00),
      (est_acme1, 'Wire & Miscellaneous Materials', 1, 450.00, 450.00),
      (est_acme1, 'Programming & Commissioning', 1, 500.00, 500.00),
      (est_acme1, 'First Year Monitoring (included)', 1, 0.00, 0.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =====================================================
  -- TRANSACTIONS (payments)
  -- =====================================================
  INSERT INTO transactions (transaction_number, company_id, invoice_id, transaction_type, payment_method, amount, transaction_date, reference_number, notes)
  VALUES
    ('TXN-2024-001', acme_id, inv_acme1, 'payment', 'ACH', 4871.25, '2024-01-28', 'ACH-20240128-001', 'Auto-pay ACH - INV-2024-001'),
    ('TXN-2024-002', acme_id, inv_acme2, 'payment', 'ACH', 1299.00, '2024-02-20', 'ACH-20240220-001', 'Auto-pay ACH - INV-2024-002'),
    ('TXN-2024-003', smith_id, inv_smith1, 'payment', 'check', 200.00, '2024-02-20', 'CHK-4521', 'Partial payment - check #4521'),
    ('TXN-2024-004', mall_id, inv_mall1, 'payment', 'wire', 14768.75, '2024-02-15', 'WIRE-20240215', 'Wire transfer partial - INV-2024-005'),
    ('TXN-2024-005', tech_id, inv_tech1, 'payment', 'ACH', 2110.88, '2024-02-01', 'ACH-20240201-001', 'Auto-pay ACH - INV-2024-007'),
    ('TXN-2024-006', johnson_id, inv_johnson1, 'payment', 'credit_card', 54.07, '2024-01-10', 'CC-20240110-001', 'Auto-pay credit card')
  ON CONFLICT (transaction_number) DO NOTHING;

  -- =====================================================
  -- CUSTOMER CREDITS
  -- =====================================================
  INSERT INTO customer_credits (company_id, amount, reason, issued_date, expiration_date, status)
  VALUES
    (acme_id, 250.00, 'Service visit callback - panel false alarm', '2024-01-15', '2024-12-31', 'unapplied'),
    (mall_id, 1500.00, 'Billing adjustment - overcharge Q3 2023', '2024-02-01', NULL, 'unapplied'),
    (mall_id, 500.00, 'Goodwill credit - extended outage during install', '2023-11-20', '2024-11-20', 'applied'),
    (smith_id, 75.00, 'Referral credit - neighbor signup', '2024-03-01', '2025-03-01', 'unapplied')
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- WORK ORDERS
  -- =====================================================
  INSERT INTO work_orders (wo_number, company_id, site_id, title, description, work_order_type, status, priority, scheduled_date, scheduled_time, labor_cost, parts_cost, notes)
  VALUES
    ('WO-2024-001', acme_id, acme_site1, 'Annual Inspection - HQ Burglar', 'Annual system test and inspection for DSC Neo panel MON-1001', 'inspection', 'completed', 'normal', '2024-01-20', '09:00', 95.00, 0.00, 'All zones tested. System passed.'),
    ('WO-2024-002', acme_id, acme_site1, 'Fire Panel Annual Test', 'Annual fire alarm test per NFPA 72', 'inspection', 'completed', 'high', '2024-01-20', '11:00', 190.00, 0.00, 'Notified fire dept. All detectors passed. Pull stations verified.'),
    ('WO-2024-003', acme_id, acme_site2, 'Gate Motor Service', 'Lubricate and adjust gate operator drive chain', 'service', 'completed', 'normal', '2024-02-08', '14:00', 95.00, 35.00, 'Chain lubricated. Limit switches adjusted. Operating smoothly.'),
    ('WO-2024-004', smith_id, smith_site1, 'Keypad Replacement', 'Replace faulty Honeywell 6150 keypad - customer reports blank screen', 'service', 'completed', 'normal', '2024-02-18', '10:00', 95.00, 185.00, 'Replaced keypad. Programmed and tested. Customer satisfied.'),
    ('WO-2024-005', mall_id, mall_site1, 'CCTV Camera Replacement', 'Replace failed PTZ camera at main entrance - Axis P5655-E', 'service', 'completed', 'high', '2024-02-22', '08:00', 190.00, 1850.00, 'Camera replaced and aimed. Recording verified on NVR.'),
    ('WO-2024-006', mall_id, mall_site1, 'Quarterly Burglar Test', 'Quarterly UL-listed monitoring test', 'inspection', 'scheduled', 'normal', '2024-04-15', '08:00', 0.00, 0.00, NULL),
    ('WO-2024-007', tech_id, tech_site1, 'Access Control Firmware Update', 'Update HID VertX controller firmware to latest version', 'service', 'scheduled', 'normal', '2024-04-10', '09:00', 95.00, 0.00, NULL),
    ('WO-2024-008', tech_id, tech_site2, 'New Zone Expansion', 'Install 4 new zones per approved estimate EST-2024-004', 'installation', 'in_progress', 'normal', '2024-03-25', '08:00', 380.00, 520.00, 'Partial install complete. Return trip needed for final zones.'),
    ('WO-2024-009', johnson_id, johnson_site1, 'Annual Inspection', 'Annual system test and inspection', 'inspection', 'scheduled', 'normal', '2024-04-20', '10:00', 95.00, 0.00, NULL),
    ('WO-2024-010', acme_id, acme_site3, 'New Installation - Annex', 'Install new DSC burg system per EST-2024-001', 'installation', 'scheduled', 'normal', '2024-04-08', '08:00', 2280.00, 3600.00, NULL)
  ON CONFLICT (wo_number) DO NOTHING;

  -- =====================================================
  -- CUSTOMER NOTES
  -- =====================================================
  INSERT INTO customer_notes (company_id, note_type, note, is_important)
  VALUES
    (acme_id, 'general', 'Customer requested all service visits be scheduled at least 48 hours in advance. Contact Michael Torres directly.', false),
    (acme_id, 'billing', 'Annual contract renewal due April 2025. Discuss expanding monitoring to warehouse annex.', false),
    (acme_id, 'service', 'New IT director (Sandra Kim) prefers email communication over phone.', false),
    (mall_id, 'billing', 'Past due balance - accounts payable confirmed payment processing on 3/15. Follow up if not received by 3/22.', true),
    (mall_id, 'service', 'On-site visit required for all service calls. Security office must be notified 24 hours prior.', true),
    (mall_id, 'general', 'Mall expanding food court in Q3 2024. Will likely need additional smoke detection coverage.', false),
    (smith_id, 'general', 'Customer travels frequently. Please verify someone is home before dispatch.', false),
    (smith_id, 'billing', 'Partial payment on invoice - remainder expected by end of month.', false),
    (johnson_id, 'service', 'Dogs on premises at all times. Two large German Shepherds. Tech must call ahead.', true),
    (johnson_id, 'billing', 'Customer enrolled in auto-pay since 2021. Has never missed a payment.', false),
    (tech_id, 'service', 'Data center requires escort at all times. 24-hour advance notice required.', true),
    (tech_id, 'general', 'IT team prefers all work orders submitted via email to kmarsh@techsolutions.com', false)
  ON CONFLICT DO NOTHING;

END $$;
