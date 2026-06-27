-- Araknis Product Catalog (~14 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- Routers
(gen_random_uuid(), 'ARAK-310', 'Araknis 310 Single-WAN Router', 'Gigabit router with advanced firewall and VLAN support for residential', 'Networking', 'Araknis', 'AN-310-RT-4L2W', 215.00, 360.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ARAK-510', 'Araknis 510 Dual-WAN Router', 'Dual-WAN gigabit router with failover and load balancing', 'Networking', 'Araknis', 'AN-510-RT-4L2W', 375.00, 625.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ARAK-710', 'Araknis 710 Dual-WAN Router', 'High-performance dual-WAN router for large homes and MDU', 'Networking', 'Araknis', 'AN-710-RT-4L2W', 525.00, 875.00, 'Equipment Revenue', true, true),

-- Switches
(gen_random_uuid(), 'ARAK-210-8P', 'Araknis 210 8-Port Unmanaged Switch', '8-port gigabit unmanaged switch with compact form factor', 'Networking', 'Araknis', 'AN-210-SW-F-8', 55.00, 92.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ARAK-310-16P', 'Araknis 310 16-Port Managed Switch', '16-port managed gigabit switch with VLAN and IGMP snooping', 'Networking', 'Araknis', 'AN-310-SW-F-16', 285.00, 475.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ARAK-310-24P', 'Araknis 310 24-Port Managed Switch', '24-port managed gigabit switch with VLAN and QoS', 'Networking', 'Araknis', 'AN-310-SW-F-24', 375.00, 625.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ARAK-310-16POE', 'Araknis 310 16-Port PoE+ Switch', '16-port managed gigabit PoE+ switch (240W budget)', 'Networking', 'Araknis', 'AN-310-SW-F-16-POE', 425.00, 710.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ARAK-310-24POE', 'Araknis 310 24-Port PoE+ Switch', '24-port managed gigabit PoE+ switch (400W budget)', 'Networking', 'Araknis', 'AN-310-SW-F-24-POE', 575.00, 960.00, 'Equipment Revenue', true, true),

-- Wireless Access Points
(gen_random_uuid(), 'ARAK-520-AP', 'Araknis 520 Indoor Wireless AP', 'Wi-Fi 6 dual-band indoor access point with PoE and OvrC management', 'Networking', 'Araknis', 'AN-520-AP-I', 185.00, 310.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ARAK-720-AP', 'Araknis 720 Indoor Wireless AP', 'Wi-Fi 6E tri-band indoor access point for high-density environments', 'Networking', 'Araknis', 'AN-720-AP-I', 295.00, 492.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ARAK-520-APO', 'Araknis 520 Outdoor Wireless AP', 'Wi-Fi 6 outdoor access point with IP67 enclosure and directional antenna', 'Networking', 'Araknis', 'AN-520-AP-O', 235.00, 392.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ARAK-720-APO', 'Araknis 720 Outdoor Wireless AP', 'Wi-Fi 6E outdoor access point with IP67 and extended range', 'Networking', 'Araknis', 'AN-720-AP-O', 345.00, 575.00, 'Equipment Revenue', true, true),

-- Accessories
(gen_random_uuid(), 'ARAK-APBRKT', 'Araknis AP Mounting Bracket', 'Universal ceiling/wall mounting bracket for Araknis access points', 'Networking', 'Araknis', 'AN-ACC-APBRKT', 18.00, 30.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'ARAK-SFP', 'Araknis SFP+ 10G Module', '10G SFP+ transceiver module for switch uplinks', 'Networking', 'Araknis', 'AN-ACC-SFP-10G', 45.00, 75.00, 'Equipment Revenue', true, false);
