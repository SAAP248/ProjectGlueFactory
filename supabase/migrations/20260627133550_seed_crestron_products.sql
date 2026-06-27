-- Crestron Product Catalog (~20 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- Processors
(gen_random_uuid(), 'CREST-CP4N', 'Crestron CP4-N Control Processor', '4-Series control processor with native BACnet and enterprise security', 'Controllers', 'Crestron', 'CP4-N', 1850.00, 3085.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-CP4', 'Crestron CP4 Control Processor', '4-Series mid-level automation processor for residential and commercial', 'Controllers', 'Crestron', 'CP4', 1450.00, 2420.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-MC4R', 'Crestron MC4-R Media Controller', 'Room media controller with PoE, IR, serial, relay, and AV switching', 'Controllers', 'Crestron', 'MC4-R', 1050.00, 1750.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-RMC4', 'Crestron RMC4 Room Media Controller', 'Compact single-room processor for smaller automation deployments', 'Controllers', 'Crestron', 'RMC4', 680.00, 1135.00, 'Equipment Revenue', true, true),

-- Touchscreens
(gen_random_uuid(), 'CREST-TS1070', 'Crestron TS-1070 10.1" Touchscreen', '10.1-inch wall-mount or tabletop capacitive touchscreen', 'Touchscreens', 'Crestron', 'TS-1070', 1650.00, 2750.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-TS770', 'Crestron TS-770 7" Touchscreen', '7-inch wall-mount capacitive touchscreen for room control', 'Touchscreens', 'Crestron', 'TS-770', 1150.00, 1920.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-TSW1070', 'Crestron TSW-1070 10.1" Touchscreen', '10.1-inch commercial-grade scheduling panel with PoE', 'Touchscreens', 'Crestron', 'TSW-1070', 1850.00, 3085.00, 'Equipment Revenue', true, true),

-- Keypads
(gen_random_uuid(), 'CREST-HZ-KPCN', 'Crestron Horizon Keypad', 'Configurable capacitive-touch keypad with LED feedback', 'Lighting', 'Crestron', 'HZ-KPCN', 325.00, 540.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'CREST-CLWI6', 'Crestron CLW-DIMEX-6 Keypad Dimmer', '6-button keypad dimmer with soft-touch buttons and configurable scenes', 'Lighting', 'Crestron', 'CLW-DIMEX-6', 380.00, 635.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'CREST-CLWSW', 'Crestron CLW-SWEX Switch', 'Decora-style smart switch with Crestron infiNET EX wireless', 'Lighting', 'Crestron', 'CLW-SWEX', 210.00, 350.00, 'Equipment Revenue', true, false),

-- AV Distribution
(gen_random_uuid(), 'CREST-DM88', 'Crestron DM-MD8x8 Matrix Switcher', '8x8 DigitalMedia matrix switcher for multi-room AV distribution', 'AV Distribution', 'Crestron', 'DM-MD8X8', 4200.00, 7000.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-DMTX201', 'Crestron DM-TX-201-C Transmitter', 'DigitalMedia 8G+ transmitter for HDMI over CATx', 'AV Distribution', 'Crestron', 'DM-TX-201-C', 680.00, 1135.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-DMRX200', 'Crestron DM-RMC-200-C Receiver', 'DigitalMedia 8G+ receiver card for matrix integration', 'AV Distribution', 'Crestron', 'DM-RMC-200-C', 575.00, 960.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-NVX350', 'Crestron DM NVX-350 AV-over-IP', 'DM NVX 4K60 HDR AV-over-IP encoder/decoder', 'AV Distribution', 'Crestron', 'DM-NVX-350', 1250.00, 2085.00, 'Equipment Revenue', true, true),

-- Audio
(gen_random_uuid(), 'CREST-AMP8150', 'Crestron AMP-8150 8-Ch Amplifier', '8-channel 150W amplifier for multi-room audio applications', 'Audio', 'Crestron', 'AMP-8150', 2100.00, 3500.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-AMP2100', 'Crestron AMP-2100 2-Ch Amplifier', 'Compact 2-channel 100W amplifier for zone audio', 'Audio', 'Crestron', 'AMP-2100', 575.00, 960.00, 'Equipment Revenue', true, true),

-- Shading
(gen_random_uuid(), 'CREST-QMTRL', 'Crestron QMT Roller Shade Motor', 'Quiet motor roller shade with Crestron wireless integration', 'Shading', 'Crestron', 'QMT-RLR', 420.00, 700.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'CREST-SHADEMOD', 'Crestron Shade Controller Module', 'Shade controller module for up to 4 shade motors', 'Shading', 'Crestron', 'CSM-QMTD', 285.00, 475.00, 'Equipment Revenue', true, false),

-- Networking
(gen_random_uuid(), 'CREST-SW-POE16', 'Crestron CEN-SW-POE-16 Switch', '16-port managed PoE switch designed for Crestron systems', 'Networking', 'Crestron', 'CEN-SW-POE-16', 1150.00, 1920.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'CREST-PYNG', 'Crestron Pyng Hub', 'Residential smart hub for smaller Crestron installations', 'Controllers', 'Crestron', 'PYNG-HUB', 450.00, 750.00, 'Equipment Revenue', true, true);
