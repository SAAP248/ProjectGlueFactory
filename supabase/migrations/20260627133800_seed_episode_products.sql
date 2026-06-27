-- Episode Product Catalog (~12 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- In-Ceiling Speakers
(gen_random_uuid(), 'EP-IC6', 'Episode 550 Series 6.5" In-Ceiling Speaker', 'Dual-tweeter stereo 6.5-inch in-ceiling speaker with pivoting tweeter', 'Speakers', 'Episode', 'ES-550T-IC-6', 85.00, 142.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'EP-IC8', 'Episode 550 Series 8" In-Ceiling Speaker', '8-inch in-ceiling speaker with extended bass response', 'Speakers', 'Episode', 'ES-550T-IC-8', 110.00, 185.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'EP-IC6SIG', 'Episode Signature 1700 6.5" In-Ceiling', 'Audiophile-grade 6.5-inch in-ceiling with Kevlar woofer and ribbon tweeter', 'Speakers', 'Episode', 'ES-1700T-IC-6', 195.00, 325.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'EP-IC8SIG', 'Episode Signature 1700 8" In-Ceiling', 'Audiophile-grade 8-inch in-ceiling with reference-quality sound', 'Speakers', 'Episode', 'ES-1700T-IC-8', 250.00, 418.00, 'Equipment Revenue', true, false),

-- In-Wall Speakers
(gen_random_uuid(), 'EP-IW6', 'Episode 550 Series 6.5" In-Wall Speaker', '6.5-inch in-wall LCR speaker for home theater surround', 'Speakers', 'Episode', 'ES-550-ICLCR-6', 95.00, 158.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'EP-IW6SIG', 'Episode Signature 1700 In-Wall LCR', 'Reference in-wall LCR speaker for critical listening and home theater', 'Speakers', 'Episode', 'ES-1700-ICLCR-6', 275.00, 460.00, 'Equipment Revenue', true, false),

-- Outdoor Speakers
(gen_random_uuid(), 'EP-OUT6', 'Episode 550 Series 6" Outdoor Speaker', 'Weather-resistant 6-inch outdoor speaker pair with 70V/8-ohm switch', 'Speakers', 'Episode', 'ES-550-OD-6-BLK', 125.00, 210.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'EP-OUT8', 'Episode 550 Series 8" Outdoor Speaker', 'Weather-resistant 8-inch outdoor speaker pair with deep bass', 'Speakers', 'Episode', 'ES-550-OD-8-BLK', 165.00, 275.00, 'Equipment Revenue', true, false),
(gen_random_uuid(), 'EP-LAND', 'Episode Landscape 8" Burial Subwoofer', '8-inch in-ground burial subwoofer for outdoor audio systems', 'Speakers', 'Episode', 'ES-LAND-SUB-8', 245.00, 410.00, 'Equipment Revenue', true, false),

-- Amplifiers
(gen_random_uuid(), 'EP-AMP2100', 'Episode Digital Amplifier 2x100W', 'Compact 2-channel class-D amplifier 100W per channel', 'Audio', 'Episode', 'EA-AMP-2X100D', 225.00, 375.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'EP-AMP2200', 'Episode Digital Amplifier 2x200W', 'High-power 2-channel class-D amplifier 200W per channel', 'Audio', 'Episode', 'EA-AMP-2X200D', 325.00, 542.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'EP-AMP4100', 'Episode Digital Amplifier 4x100W', '4-channel class-D amplifier for multi-zone installations', 'Audio', 'Episode', 'EA-AMP-4X100D', 395.00, 660.00, 'Equipment Revenue', true, true);
