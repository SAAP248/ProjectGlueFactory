/*
# Seed HR Data for Employees

1. Updates existing 3 technicians with full HR data (hire dates, pay, OT rates, loaded costs, departments)
2. Inserts 5 new employees across different roles:
   - Admin/Owner
   - Sales Manager
   - Salesperson
   - CSR/Dispatcher
   - Accounting
3. Adds sample certifications for technicians
*/

-- Update existing technicians with HR data
UPDATE employees SET
  date_of_hire = '2019-03-15',
  employment_type = 'full_time',
  pay_type = 'hourly',
  pay_rate = 32.00,
  overtime_rate = 48.00,
  loaded_cost = 52.00,
  department = 'Field Operations',
  title = 'Senior Technician',
  address = '1422 Oak Valley Dr',
  city = 'Austin',
  state = 'TX',
  zip = '78704',
  personal_email = 'mike.t.personal@gmail.com',
  personal_phone = '555-310-8821',
  emergency_contact_name = 'Maria Torres',
  emergency_contact_phone = '555-310-8822',
  color = '#2563eb'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE employees SET
  date_of_hire = '2020-08-01',
  employment_type = 'full_time',
  pay_type = 'hourly',
  pay_rate = 35.00,
  overtime_rate = 52.50,
  loaded_cost = 56.00,
  department = 'Field Operations',
  title = 'Lead Technician',
  address = '789 Elm Street',
  city = 'Round Rock',
  state = 'TX',
  zip = '78681',
  personal_email = 'sarah.c.home@gmail.com',
  personal_phone = '555-442-1199',
  emergency_contact_name = 'David Chen',
  emergency_contact_phone = '555-442-1200',
  color = '#059669'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE employees SET
  date_of_hire = '2022-01-10',
  employment_type = 'full_time',
  pay_type = 'hourly',
  pay_rate = 26.00,
  overtime_rate = 39.00,
  loaded_cost = 42.00,
  department = 'Field Operations',
  title = 'Technician',
  address = '2310 Cedar Park Blvd',
  city = 'Cedar Park',
  state = 'TX',
  zip = '78613',
  personal_email = 'jake.w@outlook.com',
  personal_phone = '555-887-3341',
  emergency_contact_name = 'Lisa Williams',
  emergency_contact_phone = '555-887-3342',
  color = '#d97706'
WHERE id = '33333333-3333-3333-3333-333333333333';

-- Insert new employees across roles
INSERT INTO employees (id, first_name, last_name, email, phone, role, status, hourly_rate,
  date_of_hire, employment_type, pay_type, pay_rate, overtime_rate, loaded_cost,
  department, title, address, city, state, zip,
  personal_email, personal_phone, emergency_contact_name, emergency_contact_phone, color)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'Robert', 'Maxwell', 'robert@workhorse.com', '555-100-0001', 'admin', 'active', 0,
   '2015-06-01', 'full_time', 'salary', 125000.00, 0, 0,
   'Executive', 'Owner / General Manager', '100 Main Street', 'Austin', 'TX', '78701',
   'rob.maxwell@gmail.com', '555-100-9001', 'Jennifer Maxwell', '555-100-9002', '#1e40af'),

  ('55555555-5555-5555-5555-555555555555', 'Amanda', 'Reeves', 'amanda@workhorse.com', '555-100-0002', 'sales_manager', 'active', 0,
   '2018-02-12', 'full_time', 'salary', 95000.00, 0, 0,
   'Sales', 'Sales Manager', '445 Congress Ave', 'Austin', 'TX', '78701',
   'amanda.reeves@yahoo.com', '555-220-5501', 'Tom Reeves', '555-220-5502', '#7c3aed'),

  ('66666666-6666-6666-6666-666666666666', 'Carlos', 'Rivera', 'carlos@workhorse.com', '555-100-0003', 'sales', 'active', 0,
   '2021-05-20', 'full_time', 'salary', 65000.00, 0, 0,
   'Sales', 'Sales Representative', '987 Lamar Blvd', 'Austin', 'TX', '78703',
   'carlos.r.home@gmail.com', '555-330-7701', 'Rosa Rivera', '555-330-7702', '#0891b2'),

  ('77777777-7777-7777-7777-777777777777', 'Brittany', 'Nguyen', 'brittany@workhorse.com', '555-100-0004', 'csr', 'active', 0,
   '2020-11-02', 'full_time', 'hourly', 22.00, 33.00, 36.00,
   'Operations', 'Customer Service / Dispatcher', '1200 South Lamar', 'Austin', 'TX', '78704',
   'britt.nguyen@gmail.com', '555-440-2201', 'Kevin Nguyen', '555-440-2202', '#dc2626'),

  ('88888888-8888-8888-8888-888888888888', 'Patricia', 'Hoffman', 'patricia@workhorse.com', '555-100-0005', 'accounting', 'active', 0,
   '2019-09-15', 'full_time', 'salary', 72000.00, 0, 0,
   'Finance', 'Controller', '350 E 6th Street', 'Austin', 'TX', '78701',
   'pat.hoffman@outlook.com', '555-550-3301', 'Mark Hoffman', '555-550-3302', '#16a34a')
ON CONFLICT (id) DO NOTHING;

-- Seed certifications for technicians
INSERT INTO employee_certifications (employee_id, cert_name, cert_number, issuing_authority, issued_date, expiration_date, notes)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Texas Low Voltage License', 'LV-2019-44821', 'TDLR', '2019-04-01', '2027-03-31', 'Renewed 2025'),
  ('11111111-1111-1111-1111-111111111111', 'NICET Level II - Fire Alarm', 'NICET-88234', 'NICET', '2020-06-15', '2026-06-15', NULL),
  ('11111111-1111-1111-1111-111111111111', 'Control4 Certified Programmer', 'C4-PRG-11209', 'Control4', '2023-01-20', '2026-01-20', NULL),
  ('22222222-2222-2222-2222-222222222222', 'Texas Low Voltage License', 'LV-2020-51003', 'TDLR', '2020-09-01', '2028-08-31', NULL),
  ('22222222-2222-2222-2222-222222222222', 'Crestron Certified Programmer', 'CST-PRG-77421', 'Crestron', '2022-03-10', '2025-03-10', 'Needs renewal'),
  ('22222222-2222-2222-2222-222222222222', 'OSHA 30-Hour Construction', 'OSHA-30-992841', 'OSHA', '2021-05-15', NULL, 'Does not expire'),
  ('33333333-3333-3333-3333-333333333333', 'Texas Low Voltage License', 'LV-2022-60112', 'TDLR', '2022-02-01', '2028-01-31', NULL),
  ('33333333-3333-3333-3333-333333333333', 'Alarm.com Certified Installer', 'ADC-CI-33019', 'Alarm.com', '2022-08-20', '2025-08-20', 'Expiring soon')
ON CONFLICT DO NOTHING;