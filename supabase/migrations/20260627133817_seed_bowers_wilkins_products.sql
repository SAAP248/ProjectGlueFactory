-- Bowers & Wilkins Product Catalog (~10 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- In-Ceiling
(gen_random_uuid(), 'BW-CCM663', 'Bowers & Wilkins CCM663 6" In-Ceiling', 'Premium 6-inch in-ceiling speaker with dual-layer Kevlar cone', 'Speakers', 'Bowers & Wilkins', 'CCM663', 325.00, 542.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'BW-CCM683', 'Bowers & Wilkins CCM683 8" In-Ceiling', 'Premium 8-inch in-ceiling with extended bass and Nautilus tube tweeter', 'Speakers', 'Bowers & Wilkins', 'CCM683', 425.00, 710.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'BW-CCM7', 'Bowers & Wilkins CCM7.5 S2 In-Ceiling', '5-inch high-performance in-ceiling for critical listening applications', 'Speakers', 'Bowers & Wilkins', 'CCM7.5 S2', 475.00, 792.00, 'Equipment Revenue', true, false),

-- In-Wall
(gen_random_uuid(), 'BW-CWM73', 'Bowers & Wilkins CWM7.3 In-Wall', '3-way in-wall speaker with dual 5-inch bass drivers for home cinema', 'Speakers', 'Bowers & Wilkins', 'CWM7.3', 575.00, 960.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'BW-CWM74', 'Bowers & Wilkins CWM7.4 In-Wall', '3-way reference in-wall with FST midrange for front LCR applications', 'Speakers', 'Bowers & Wilkins', 'CWM7.4', 750.00, 1250.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'BW-CWM664', 'Bowers & Wilkins CWM664 In-Wall', '2-way in-wall speaker with 6-inch woven Kevlar bass/midrange driver', 'Speakers', 'Bowers & Wilkins', 'CWM664', 375.00, 625.00, 'Equipment Revenue', true, false),

-- Subwoofers
(gen_random_uuid(), 'BW-ASW610', 'Bowers & Wilkins ASW610 Subwoofer', '10-inch active subwoofer with 200W amplifier for music and cinema', 'Speakers', 'Bowers & Wilkins', 'ASW610', 575.00, 960.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'BW-ASW612', 'Bowers & Wilkins ASW612 Subwoofer', '12-inch active subwoofer with 500W amplifier for deep extension', 'Speakers', 'Bowers & Wilkins', 'ASW612', 850.00, 1420.00, 'Equipment Revenue', true, true),

-- Custom Installation
(gen_random_uuid(), 'BW-BACKBOX', 'Bowers & Wilkins BB6 Back Box', 'Pre-construction back box for CCM663/683 in-ceiling speakers', 'Accessories', 'Bowers & Wilkins', 'BB6', 35.00, 58.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'BW-FPMKIT', 'Bowers & Wilkins Flush Mount Kit', 'Magnetic flush mount grille and trim kit for CI speakers', 'Accessories', 'Bowers & Wilkins', 'FPM-6', 28.00, 47.00, 'Equipment Revenue', true, false);
