/*
# Seed Offices and Assign Employees

1. Seed Data
  - 3 offices: Austin HQ, Dallas Branch, San Antonio Branch
  - Assigns existing employees to offices:
    - Austin HQ: Robert Maxwell (owner), Amanda Reeves (sales mgr), Brittany Nguyen (CSR), Mike Torres (tech), Patricia Hoffman (accounting)
    - Dallas Branch: Carlos Rivera (sales), Sarah Chen (tech)
    - San Antonio Branch: Jake Williams (tech)

2. Notes
  - Uses fixed UUIDs for offices so revenue seeding can reference them
  - Updates existing employees with office_id
*/

-- Insert offices with fixed UUIDs for referencing in seed data
INSERT INTO offices (id, name, city, state, is_active)
VALUES
  ('aaaa0001-0001-0001-0001-000000000001', 'Austin HQ', 'Austin', 'TX', true),
  ('aaaa0001-0001-0001-0001-000000000002', 'Dallas Branch', 'Dallas', 'TX', true),
  ('aaaa0001-0001-0001-0001-000000000003', 'San Antonio Branch', 'San Antonio', 'TX', true)
ON CONFLICT (id) DO NOTHING;

-- Assign employees to offices
UPDATE employees SET office_id = 'aaaa0001-0001-0001-0001-000000000001'
WHERE id IN (
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '77777777-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  '88888888-8888-8888-8888-888888888888'
);

UPDATE employees SET office_id = 'aaaa0001-0001-0001-0001-000000000002'
WHERE id IN (
  '66666666-6666-6666-6666-666666666666',
  '22222222-2222-2222-2222-222222222222'
);

UPDATE employees SET office_id = 'aaaa0001-0001-0001-0001-000000000003'
WHERE id IN (
  '33333333-3333-3333-3333-333333333333'
);
