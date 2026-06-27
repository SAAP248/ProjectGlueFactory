-- Sony Product Catalog (~10 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- Projectors
(gen_random_uuid(), 'SONY-VW325', 'Sony VPL-VW325ES 4K SXRD Projector', 'Native 4K HDR home cinema projector with 1500 lumens and Reality Creation', 'Projectors', 'Sony', 'VPL-VW325ES', 3250.00, 5420.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SONY-VW725', 'Sony VPL-VW725ES 4K Laser Projector', 'Native 4K HDR laser projector with 1800 lumens and advanced calibration', 'Projectors', 'Sony', 'VPL-VW725ES', 8500.00, 14170.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SONY-XW5000', 'Sony VPL-XW5000ES 4K Laser Projector', 'Compact native 4K laser with 2000 lumens and wide color gamut', 'Projectors', 'Sony', 'VPL-XW5000ES', 3750.00, 6250.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SONY-XW7000', 'Sony VPL-XW7000ES 4K Laser Projector', 'Premium 4K laser projector with motorized lens and 3200 lumens', 'Projectors', 'Sony', 'VPL-XW7000ES', 16500.00, 27500.00, 'Equipment Revenue', true, true),

-- AV Receivers
(gen_random_uuid(), 'SONY-STR-AN1000', 'Sony STR-AN1000 7.2 AV Receiver', '7.2ch 8K receiver with 360 Spatial Sound Mapping and HDMI 2.1', 'AV Receivers', 'Sony', 'STR-AN1000', 475.00, 792.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SONY-STR-AZ5000', 'Sony STR-AZ5000ES 13.2 AV Receiver', 'Flagship 13.2ch receiver with 360 SSM and ES build quality', 'AV Receivers', 'Sony', 'STR-AZ5000ES', 2250.00, 3750.00, 'Equipment Revenue', true, true),

-- Soundbars
(gen_random_uuid(), 'SONY-HTA9', 'Sony HT-A9 Wireless Home Theater', '4-speaker wireless spatial audio system with 360 Spatial Sound Mapping', 'Audio', 'Sony', 'HT-A9', 1100.00, 1835.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SONY-HTA7000', 'Sony HT-A7000 7.1.2 Soundbar', 'Premium 7.1.2ch Dolby Atmos soundbar with built-in dual subwoofers', 'Audio', 'Sony', 'HT-A7000', 825.00, 1375.00, 'Equipment Revenue', true, true),

-- Displays
(gen_random_uuid(), 'SONY-A95L65', 'Sony A95L 65" QD-OLED 4K TV', '65-inch QD-OLED with Cognitive Processor XR and Acoustic Surface Audio+', 'Displays', 'Sony', 'XR-65A95L', 1650.00, 2750.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SONY-A95L77', 'Sony A95L 77" QD-OLED 4K TV', '77-inch QD-OLED flagship with reference-grade picture and sound', 'Displays', 'Sony', 'XR-77A95L', 2850.00, 4750.00, 'Equipment Revenue', true, true);
