-- WattBox Product Catalog (~12 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- IP Power Conditioners
(gen_random_uuid(), 'WB-300-5', 'WattBox 300 Series 5-Outlet IP Power', 'IP-controllable 5-outlet surge protector with OvrC cloud management', 'Power', 'WattBox', 'WB-300-IP-5', 145.00, 242.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'WB-300-12', 'WattBox 300 Series 12-Outlet IP Power', 'IP-controllable 12-outlet rackmount power conditioner with OvrC', 'Power', 'WattBox', 'WB-300-IP-12', 225.00, 375.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'WB-700-6', 'WattBox 700 Series 6-Outlet IP Power', 'Premium 6-outlet IP power conditioner with coax and Ethernet surge protection', 'Power', 'WattBox', 'WB-700-IP-6', 285.00, 475.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'WB-700-12', 'WattBox 700 Series 12-Outlet IP Power', 'Premium 12-outlet rackmount IP power conditioner with full surge protection', 'Power', 'WattBox', 'WB-700-IP-12', 395.00, 660.00, 'Equipment Revenue', true, true),

-- UPS Battery Backup
(gen_random_uuid(), 'WB-UPS-750', 'WattBox 750VA UPS Battery Backup', '750VA/450W UPS with IP monitoring and auto-reboot via OvrC', 'Power', 'WattBox', 'WB-750-IPV-8', 285.00, 475.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'WB-UPS-1050', 'WattBox 1050VA UPS Battery Backup', '1050VA/630W UPS with 8 outlets and extended runtime', 'Power', 'WattBox', 'WB-1050-IPV-8', 385.00, 642.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'WB-UPS-1500', 'WattBox 1500VA UPS Battery Backup', '1500VA/900W UPS for larger rack deployments', 'Power', 'WattBox', 'WB-1500-IPV-12', 475.00, 792.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'WB-UPS-2000', 'WattBox 2000VA UPS Rackmount', '2000VA/1200W 2U rackmount UPS with extended battery option', 'Power', 'WattBox', 'WB-2000-IPV-12R', 625.00, 1042.00, 'Equipment Revenue', true, true),

-- Non-IP Power
(gen_random_uuid(), 'WB-200-6', 'WattBox 200 Series 6-Outlet Power', 'Basic surge protector with coax protection (non-IP)', 'Power', 'WattBox', 'WB-200-6', 55.00, 92.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'WB-200-12', 'WattBox 200 Series 12-Outlet Power', 'Rackmount surge protector with sequential startup (non-IP)', 'Power', 'WattBox', 'WB-200-12', 85.00, 142.00, 'Equipment Revenue', true, false),

-- Accessories
(gen_random_uuid(), 'WB-BATTMOD', 'WattBox External Battery Module', 'Extended runtime battery pack for WattBox UPS units', 'Power', 'WattBox', 'WB-EBP-48V', 225.00, 375.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'WB-PDU8', 'WattBox Rack PDU 8-Outlet', '8-outlet power distribution unit for cable management in rack', 'Power', 'WattBox', 'WB-PDU-8', 42.00, 70.00, 'Equipment Revenue', true, false);
