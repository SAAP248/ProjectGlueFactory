-- Qolsys Product Catalog (~20 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- Panels
(gen_random_uuid(), 'QOL-IQP4', 'Qolsys IQ Panel 4', '7-inch HD touchscreen security panel with built-in camera and Bluetooth disarming', 'Panels', 'Qolsys', 'QS9014-840', 365.00, 610.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'QOL-IQP4VZ', 'Qolsys IQ Panel 4 (Verizon LTE)', 'IQ Panel 4 with integrated Verizon LTE communicator', 'Panels', 'Qolsys', 'QS9014-840-VZ', 395.00, 660.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'QOL-IQP4ATT', 'Qolsys IQ Panel 4 (AT&T LTE)', 'IQ Panel 4 with integrated AT&T LTE communicator', 'Panels', 'Qolsys', 'QS9014-840-AT', 395.00, 660.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'QOL-IQP2PLUS', 'Qolsys IQ Panel 2 Plus', 'Legacy 7-inch panel with PowerG and S-Line support', 'Panels', 'Qolsys', 'QS9202-208', 310.00, 520.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'QOL-IQHUB', 'Qolsys IQ Hub', 'Compact headless security hub for Alarm.com smart home integration', 'Panels', 'Qolsys', 'QS9300-840', 185.00, 310.00, 'Equipment Revenue', true, true),

-- S-Line Sensors
(gen_random_uuid(), 'QOL-SLDW', 'Qolsys IQ S-Line Door/Window Sensor', '319.5 MHz encrypted door/window contact sensor', 'Sensors', 'Qolsys', 'QS1135-840', 28.00, 48.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-SLMO', 'Qolsys IQ S-Line Motion Sensor', '319.5 MHz encrypted PIR motion detector with pet immunity', 'Sensors', 'Qolsys', 'QS1230-840', 38.00, 64.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-SLGB', 'Qolsys IQ S-Line Glass Break Sensor', '319.5 MHz encrypted glass break detector with 25ft range', 'Sensors', 'Qolsys', 'QS1431-840', 42.00, 70.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-SLSMOKE', 'Qolsys IQ S-Line Smoke Detector', '319.5 MHz encrypted photoelectric smoke detector', 'Sensors', 'Qolsys', 'QS5110-840', 55.00, 92.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-SLFLOOD', 'Qolsys IQ S-Line Flood Sensor', '319.5 MHz encrypted water/flood detector with probe cable', 'Sensors', 'Qolsys', 'QS5536-840', 32.00, 54.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-SLTILT', 'Qolsys IQ S-Line Tilt Sensor', '319.5 MHz encrypted garage door tilt sensor', 'Sensors', 'Qolsys', 'QS1136-840', 30.00, 50.00, 'Equipment Revenue', true, false),

-- PowerG Sensors
(gen_random_uuid(), 'QOL-PGDW', 'Qolsys/DSC PG9945 Door/Window Contact', 'PowerG 915 MHz encrypted door/window sensor with 2km range', 'Sensors', 'Qolsys', 'PG9945', 40.00, 67.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-PGMO', 'Qolsys/DSC PG9914 Motion Detector', 'PowerG 915 MHz encrypted PIR with pet immunity up to 85lbs', 'Sensors', 'Qolsys', 'PG9914', 52.00, 87.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-PGGB', 'Qolsys/DSC PG9922 Glass Break', 'PowerG 915 MHz encrypted acoustic glass break detector', 'Sensors', 'Qolsys', 'PG9922', 58.00, 97.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-PGSMOKE', 'Qolsys/DSC PG9936 Smoke/Heat Detector', 'PowerG 915 MHz encrypted photoelectric smoke and heat detector', 'Sensors', 'Qolsys', 'PG9936', 72.00, 120.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-PGCO', 'Qolsys/DSC PG9933 CO Detector', 'PowerG 915 MHz encrypted carbon monoxide detector', 'Sensors', 'Qolsys', 'PG9933', 68.00, 114.00, 'Equipment Revenue', true, false),

-- Accessories
(gen_random_uuid(), 'QOL-REMOTE', 'Qolsys IQ Remote', '7-inch secondary touchscreen for multi-room panel access', 'Accessories', 'Qolsys', 'QS9312-840', 185.00, 310.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'QOL-KEYFOB', 'Qolsys IQ S-Line Keyfob', '4-button encrypted keyfob for arm/disarm/panic', 'Accessories', 'Qolsys', 'QS1331-840', 25.00, 42.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-REPEATER', 'Qolsys IQ S-Line Wireless Repeater', 'Signal repeater for extended S-Line sensor range', 'Accessories', 'Qolsys', 'QS7131-840', 65.00, 108.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'QOL-PGKEYPAD', 'DSC PowerG HS2LCDRFP Wireless Keypad', 'PowerG wireless LCD keypad for secondary entry control', 'Accessories', 'Qolsys', 'HS2LCDRFP9', 95.00, 158.00, 'Equipment Revenue', true, false);
