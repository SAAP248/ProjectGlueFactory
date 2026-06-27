-- 2GIG Product Catalog (~22 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- Panels
(gen_random_uuid(), '2GIG-EDGE', '2GIG EDGE Security Panel', '7-inch HD touchscreen panel with built-in 5MP camera and glass break', 'Panels', '2GIG', '2GIG-EDG-NA-AA', 340.00, 570.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), '2GIG-EDGEVZ', '2GIG EDGE Panel (Verizon LTE)', 'EDGE panel with integrated Verizon LTE-M communicator', 'Panels', '2GIG', '2GIG-EDG-NA-VA', 370.00, 620.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), '2GIG-EDGEATT', '2GIG EDGE Panel (AT&T LTE)', 'EDGE panel with integrated AT&T LTE communicator', 'Panels', '2GIG', '2GIG-EDG-NA-AT', 370.00, 620.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), '2GIG-GC3E', '2GIG GC3e Security Panel', 'Legacy 7-inch encrypted panel with eSeries sensor support', 'Panels', '2GIG', '2GIG-GC3E-345', 285.00, 475.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), '2GIG-GC2E', '2GIG GC2e Security Panel', 'Compact encrypted security panel for budget-conscious installs', 'Panels', '2GIG', '2GIG-GC2E-345', 195.00, 325.00, 'Equipment Revenue', true, true),

-- eSeries Sensors (encrypted)
(gen_random_uuid(), '2GIG-EDW', '2GIG eSeries Thin Door/Window Contact', 'Encrypted 345 MHz slim-profile door/window contact sensor', 'Sensors', '2GIG', '2GIG-DW10E', 26.00, 44.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-ERDW', '2GIG eSeries Recessed Door Contact', 'Encrypted 345 MHz recessed contact for concealed installation', 'Sensors', '2GIG', '2GIG-DW20RE', 32.00, 54.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-EPIR', '2GIG eSeries Motion Detector', 'Encrypted 345 MHz PIR motion detector with pet immunity up to 55lbs', 'Sensors', '2GIG', '2GIG-PIR1E', 38.00, 64.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-EGB', '2GIG eSeries Glass Break Detector', 'Encrypted 345 MHz acoustic glass break with 25ft range', 'Sensors', '2GIG', '2GIG-GB1E', 42.00, 70.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-ESMOKE', '2GIG eSeries Smoke/Heat Detector', 'Encrypted 345 MHz photoelectric smoke and rate-of-rise heat detector', 'Sensors', '2GIG', '2GIG-SMKT8E', 55.00, 92.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-ECO', '2GIG eSeries CO Detector', 'Encrypted 345 MHz electrochemical carbon monoxide detector', 'Sensors', '2GIG', '2GIG-CO8E', 52.00, 87.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-EFLOOD', '2GIG eSeries Flood Sensor', 'Encrypted 345 MHz water/flood sensor with external probe', 'Sensors', '2GIG', '2GIG-FLD1E', 30.00, 50.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-ETILT', '2GIG eSeries Tilt Sensor', 'Encrypted 345 MHz garage door tilt sensor', 'Sensors', '2GIG', '2GIG-TILT1E', 28.00, 47.00, 'Equipment Revenue', true, false),

-- Legacy Sensors (345 MHz)
(gen_random_uuid(), '2GIG-DW10', '2GIG Thin Door/Window Contact', 'Standard 345 MHz thin door/window contact sensor', 'Sensors', '2GIG', '2GIG-DW10-345', 18.00, 30.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-PIR1', '2GIG Passive Motion Detector', 'Standard 345 MHz PIR motion detector', 'Sensors', '2GIG', '2GIG-PIR1-345', 28.00, 47.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-GB1', '2GIG Glass Break Detector', 'Standard 345 MHz acoustic glass break detector', 'Sensors', '2GIG', '2GIG-GB1-345', 32.00, 54.00, 'Equipment Revenue', true, false),

-- Accessories
(gen_random_uuid(), '2GIG-KEY2', '2GIG 4-Button Keyfob', '4-button wireless keyfob for arm/disarm/panic', 'Accessories', '2GIG', '2GIG-KEY2-345', 22.00, 37.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-PAD1', '2GIG Wireless Keypad', 'Wireless touchpad for secondary entry points', 'Accessories', '2GIG', '2GIG-PAD1-345', 72.00, 120.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-PANIC', '2GIG Panic Button', 'Wireless panic button with wall-mount or portable use', 'Accessories', '2GIG', '2GIG-PANIC1-345', 22.00, 37.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-SP1', '2GIG EDGE Secondary Panel', '7-inch wireless secondary touchscreen for EDGE system', 'Accessories', '2GIG', '2GIG-SP1-GC3E', 175.00, 292.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), '2GIG-TAKE', '2GIG Takeover Module', '8-zone wired-to-wireless takeover module for hardwired conversions', 'Accessories', '2GIG', '2GIG-TAKE-345', 45.00, 75.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), '2GIG-RPTR', '2GIG Wireless Repeater', '345 MHz signal repeater for extended sensor range', 'Accessories', '2GIG', '2GIG-RPTR1-345', 55.00, 92.00, 'Equipment Revenue', true, false);
