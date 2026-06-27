-- Samsung Product Catalog (~8 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- The Frame TVs
(gen_random_uuid(), 'SAM-FRAME55', 'Samsung The Frame 55" 4K QLED', '55-inch art-mode TV with customizable bezel and matte anti-reflection display', 'Displays', 'Samsung', 'QN55LS03B', 775.00, 1295.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SAM-FRAME65', 'Samsung The Frame 65" 4K QLED', '65-inch art-mode TV with 100% color volume and Art Store subscription', 'Displays', 'Samsung', 'QN65LS03B', 1050.00, 1750.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SAM-FRAME75', 'Samsung The Frame 75" 4K QLED', '75-inch art-mode QLED TV with customizable bezel system', 'Displays', 'Samsung', 'QN75LS03B', 1575.00, 2625.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SAM-FRAME85', 'Samsung The Frame 85" 4K QLED', '85-inch art-mode QLED TV - largest Frame size available', 'Displays', 'Samsung', 'QN85LS03B', 2250.00, 3750.00, 'Equipment Revenue', true, true),

-- OLED/QLED
(gen_random_uuid(), 'SAM-S95D65', 'Samsung S95D 65" QD-OLED 4K TV', '65-inch QD-OLED with anti-glare technology and Neural Quantum Processor', 'Displays', 'Samsung', 'QN65S95D', 1550.00, 2585.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SAM-S95D77', 'Samsung S95D 77" QD-OLED 4K TV', '77-inch QD-OLED flagship with IntelliSense AI upscaling', 'Displays', 'Samsung', 'QN77S95D', 2450.00, 4085.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SAM-QN900D75', 'Samsung QN900D 75" 8K Neo QLED', '75-inch 8K Neo QLED with AI Neural Quantum Processor and anti-reflection', 'Displays', 'Samsung', 'QN75QN900D', 2850.00, 4750.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'SAM-QN85D85', 'Samsung QN85D 85" 4K Neo QLED', '85-inch 4K Neo QLED with Dolby Atmos and Object Tracking Sound+', 'Displays', 'Samsung', 'QN85QN85D', 1950.00, 3250.00, 'Equipment Revenue', true, true);
