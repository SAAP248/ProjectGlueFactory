-- Denon Product Catalog (~10 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- AV Receivers
(gen_random_uuid(), 'DEN-X1800H', 'Denon AVR-X1800H 7.2 Channel Receiver', '7.2ch 8K AV receiver with Dolby Atmos, DTS:X, HEOS multi-room', 'AV Receivers', 'Denon', 'AVR-X1800H', 380.00, 635.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'DEN-X2800H', 'Denon AVR-X2800H 7.2 Channel Receiver', '7.2ch 8K AV receiver with HDMI 2.1 and advanced room correction', 'AV Receivers', 'Denon', 'AVR-X2800H', 575.00, 960.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'DEN-X3800H', 'Denon AVR-X3800H 9.4 Channel Receiver', '9.4ch 8K reference receiver with Dirac Live and 11.4ch processing', 'AV Receivers', 'Denon', 'AVR-X3800H', 950.00, 1585.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'DEN-X4800H', 'Denon AVR-X4800H 9.4 Channel Receiver', 'Premium 9.4ch receiver with Auro-3D and full Dirac Live bass control', 'AV Receivers', 'Denon', 'AVR-X4800H', 1500.00, 2500.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'DEN-X6800H', 'Denon AVR-X6800H 11.4 Channel Receiver', 'Flagship 11.4ch receiver with 140W per channel and audiophile components', 'AV Receivers', 'Denon', 'AVR-X6800H', 2200.00, 3670.00, 'Equipment Revenue', true, true),

-- Amplifiers
(gen_random_uuid(), 'DEN-HEOS1', 'Denon HEOS 1 Wireless Speaker', 'Compact wireless multi-room speaker with Bluetooth and AirPlay 2', 'Audio', 'Denon', 'HEOS-1', 165.00, 275.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'DEN-HEOS5', 'Denon HEOS 5 Wireless Speaker', 'Mid-size wireless multi-room speaker with powerful bass', 'Audio', 'Denon', 'HEOS-5', 275.00, 460.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'DEN-HEOSAMP', 'Denon HEOS Amp Wireless Amplifier', '2-channel wireless streaming amplifier for passive speakers', 'Audio', 'Denon', 'HEOS-AMP', 325.00, 542.00, 'Equipment Revenue', true, true),

-- Soundbars
(gen_random_uuid(), 'DEN-DHT-S517', 'Denon DHT-S517 Soundbar with Subwoofer', '3.1.2ch soundbar with wireless subwoofer and Dolby Atmos', 'Audio', 'Denon', 'DHT-S517', 275.00, 460.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'DEN-DHT-S716', 'Denon DHT-S716H Premium Soundbar', 'Premium soundbar with HEOS multi-room and 4K passthrough', 'Audio', 'Denon', 'DHT-S716H', 475.00, 792.00, 'Equipment Revenue', true, true);
