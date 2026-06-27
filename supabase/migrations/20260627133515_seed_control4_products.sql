-- Control4 Product Catalog (~28 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- Controllers
(gen_random_uuid(), 'C4-EA1', 'Control4 EA-1 Controller', 'Single-room entertainment and automation controller with Zigbee and Z-Wave support', 'Controllers', 'Control4', 'C4-EA1', 285.00, 475.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-EA3', 'Control4 EA-3 Controller', 'Mid-level automation controller supporting up to 15 rooms with advanced audio routing', 'Controllers', 'Control4', 'C4-EA3', 675.00, 1125.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-EA5', 'Control4 EA-5 Controller', 'High-performance controller for large residential and light commercial installations', 'Controllers', 'Control4', 'C4-EA5', 1250.00, 2100.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-CORE1', 'Control4 CORE 1 Controller', 'Next-gen single-room controller with enhanced processing and Wi-Fi 6', 'Controllers', 'Control4', 'CORE-1', 320.00, 535.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-CORE3', 'Control4 CORE 3 Controller', 'Next-gen multi-room controller supporting up to 25 rooms', 'Controllers', 'Control4', 'CORE-3', 780.00, 1300.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-CORE5', 'Control4 CORE 5 Controller', 'Next-gen flagship controller for premium whole-home deployments', 'Controllers', 'Control4', 'CORE-5', 1500.00, 2500.00, 'Equipment Revenue', true, true),

-- Remotes
(gen_random_uuid(), 'C4-SR260', 'Control4 SR-260 Remote', 'Handheld system remote with color LCD and hard buttons for everyday control', 'Remotes', 'Control4', 'C4-SR260', 165.00, 275.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'C4-HALO', 'Control4 Halo Remote', 'Premium handheld remote with touchscreen and voice control', 'Remotes', 'Control4', 'C4-HALO', 350.00, 585.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-HALOTOUCH', 'Control4 Halo Touch Remote', 'Top-tier remote with capacitive touchscreen and rechargeable cradle', 'Remotes', 'Control4', 'C4-HALOTOUCH', 475.00, 795.00, 'Equipment Revenue', true, true),

-- Touchscreens
(gen_random_uuid(), 'C4-T4IW8', 'Control4 T4 8" In-Wall Touchscreen', '8-inch in-wall touchscreen with flush mount for dedicated room control', 'Touchscreens', 'Control4', 'T4-IW8', 825.00, 1375.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-T4IW10', 'Control4 T4 10" In-Wall Touchscreen', '10-inch in-wall touchscreen for premium control points', 'Touchscreens', 'Control4', 'T4-IW10', 1150.00, 1925.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-T4TT8', 'Control4 T4 8" Tabletop Touchscreen', '8-inch tabletop touchscreen with charging base for portable room control', 'Touchscreens', 'Control4', 'T4-TT8', 875.00, 1460.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-T4TT10', 'Control4 T4 10" Tabletop Touchscreen', '10-inch tabletop touchscreen with premium build and charging base', 'Touchscreens', 'Control4', 'T4-TT10', 1200.00, 2000.00, 'Equipment Revenue', true, true),

-- Lighting (Lux Series)
(gen_random_uuid(), 'C4-LUXDIM', 'Control4 Lux Adaptive Dimmer', 'Smart dimmer with adjustable LED indicators and multi-way support', 'Lighting', 'Control4', 'C4-LXDIM', 135.00, 225.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'C4-LUXSW', 'Control4 Lux Smart Switch', 'Smart on/off switch with configurable button LED colors', 'Lighting', 'Control4', 'C4-LXSW', 110.00, 185.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'C4-LUXKP2', 'Control4 Lux 2-Button Keypad', 'Configurable 2-button keypad for scene activation and room control', 'Lighting', 'Control4', 'C4-LXKP2', 155.00, 260.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'C4-LUXKP4', 'Control4 Lux 4-Button Keypad', 'Configurable 4-button keypad with backlit engraving', 'Lighting', 'Control4', 'C4-LXKP4', 185.00, 310.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'C4-LUXKP6', 'Control4 Lux 6-Button Keypad', '6-button keypad for advanced scene control and multi-room management', 'Lighting', 'Control4', 'C4-LXKP6', 210.00, 350.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'C4-LUXFP', 'Control4 Lux Fan Speed Controller', 'Smart fan speed controller with 4 speed levels', 'Lighting', 'Control4', 'C4-LXFAN', 145.00, 240.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'C4-PNLX', 'Control4 Lux Panelized Lighting', '8-channel panelized lighting module for centralized lighting control', 'Lighting', 'Control4', 'C4-LXPNL8', 580.00, 970.00, 'Equipment Revenue', true, true),

-- Audio
(gen_random_uuid(), 'C4-AMP108', 'Control4 8-Zone Audio Matrix Amp', '8-zone matrix amplifier with 60W per zone for multi-room audio', 'Audio', 'Control4', 'C4-AMP108', 1450.00, 2420.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-TRIDENTONE', 'Control4 Trident One Streaming Amp', 'Single-zone streaming amplifier with AirPlay 2 and Spotify Connect', 'Audio', 'Control4', 'C4-TRDNT1', 420.00, 700.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-TRIDENTTHREE', 'Control4 Trident Three Streaming Amp', '3-zone streaming amplifier with independent source selection', 'Audio', 'Control4', 'C4-TRDNT3', 850.00, 1420.00, 'Equipment Revenue', true, true),

-- Networking & Misc
(gen_random_uuid(), 'C4-POE8', 'Control4 8-Port PoE Switch', 'Managed 8-port PoE switch designed for Control4 ecosystems', 'Networking', 'Control4', 'C4-POE8', 225.00, 375.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-IO6', 'Control4 6-Channel I/O Extender', '6-channel contact/relay extender for third-party integration', 'Accessories', 'Control4', 'C4-IO6', 195.00, 325.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'C4-DOORSTATION', 'Control4 Intercom Anywhere Door Station', 'Outdoor door station camera with 2-way audio and Control4 integration', 'Intercom', 'Control4', 'DS2-BLK', 575.00, 960.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-CHIMEKIT', 'Control4 Chime Door Station Kit', 'Entry-level video doorbell with intercom functionality', 'Intercom', 'Control4', 'CHIME-DS', 275.00, 460.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'C4-NEEO', 'Control4 Neeo Remote', 'Slim profile remote with integrated touchscreen and haptic feedback', 'Remotes', 'Control4', 'C4-NEEO', 275.00, 460.00, 'Equipment Revenue', true, true);
