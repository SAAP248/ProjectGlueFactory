/*
  # Seed DMP Products

  ## Summary
  Seeds 40+ DMP (Digital Monitoring Products) security products into the products table.
  Covers: control panels, keypads, motion detectors, door/window contacts, glass break
  detectors, sirens/sounders, communicators, power supplies, enclosures, and accessories.

  All prices are made up for demo purposes. DMP is the manufacturer for all products.
  Image URLs reference DMP's product image CDN.

  ## Important Notes
  - Uses ON CONFLICT DO NOTHING to avoid duplicate SKUs on re-run
  - All products are active by default
  - Cost is approximately 40-50% of retail price (typical dealer margin)
*/

INSERT INTO products (sku, name, description, model_number, category, manufacturer, cost, price, image_url, is_active, track_serial)
VALUES
  -- Control Panels
  ('DMP-XR150', 'XR150 Security Control Panel', 'Advanced commercial security control panel with 16 zones, full event logging, remote programming, and network support. Supports up to 32 zones with expansion.', 'XR150', 'Control Panels', 'DMP', 285.00, 549.00, 'https://www.dmp.com/images/products/xr150.jpg', true, true),
  ('DMP-XR550', 'XR550 Commercial Security Panel', 'High-capacity commercial panel supporting 256 zones, multiple partitions, advanced access control integration, and cellular/IP dual-path communication.', 'XR550', 'Control Panels', 'DMP', 685.00, 1299.00, 'https://www.dmp.com/images/products/xr550.jpg', true, true),
  ('DMP-XT75', 'XT75 Wireless Security Panel', 'Residential-grade wireless security panel with 75-zone capacity, built-in WiFi, cellular communicator ready, and DMP app integration.', 'XT75', 'Control Panels', 'DMP', 195.00, 379.00, 'https://www.dmp.com/images/products/xt75.jpg', true, true),
  ('DMP-XT30', 'XT30 Entry-Level Security Panel', 'Compact residential security panel with 30-zone wireless capacity, easy installation, and full remote programming support.', 'XT30', 'Control Panels', 'DMP', 145.00, 279.00, 'https://www.dmp.com/images/products/xt30.jpg', true, true),
  ('DMP-XR100', 'XR100 Commercial Panel', 'Mid-range commercial security panel with 100-zone capacity, IP/cellular communication, and advanced user management.', 'XR100', 'Control Panels', 'DMP', 385.00, 749.00, 'https://www.dmp.com/images/products/xr100.jpg', true, true),

  -- Keypads
  ('DMP-7060', '7060 Graphic Touchscreen Keypad', 'Full-color 7-inch touchscreen keypad with customizable graphics, icons, and status displays. Supports multiple languages and ADA compliance.', '7060', 'Keypads', 'DMP', 195.00, 375.00, 'https://www.dmp.com/images/products/7060.jpg', true, false),
  ('DMP-7073', '7073 Keypad with Prox Reader', 'LED keypad with integrated proximity card reader for dual-authentication access control and alarm arming/disarming.', '7073', 'Keypads', 'DMP', 125.00, 239.00, 'https://www.dmp.com/images/products/7073.jpg', true, false),
  ('DMP-7050', '7050 Standard LED Keypad', 'Reliable 16-zone LED keypad with status indicators for each zone, easy user programming, and backlit keys.', '7050', 'Keypads', 'DMP', 75.00, 145.00, 'https://www.dmp.com/images/products/7050.jpg', true, false),
  ('DMP-7064', '7064 Fire Keypad', 'Dedicated fire alarm keypad with audible indicators, fire-specific commands, and compliant display for NFPA 72 fire systems.', '7064', 'Keypads', 'DMP', 110.00, 215.00, 'https://www.dmp.com/images/products/7064.jpg', true, false),
  ('DMP-7068', '7068 Wireless Keypad', 'Battery-powered wireless keypad for flexible placement without wiring. Full-feature control with 2-way RF communication.', '7068', 'Keypads', 'DMP', 145.00, 279.00, 'https://www.dmp.com/images/products/7068.jpg', true, false),

  -- Motion Detectors
  ('DMP-514', '514 PIR Motion Detector', 'Passive infrared motion detector with 40x40 ft coverage pattern, digital signal processing, and pet immunity up to 50 lbs.', '514', 'Motion Detectors', 'DMP', 28.00, 54.00, 'https://www.dmp.com/images/products/514.jpg', true, false),
  ('DMP-516', '516 Dual-Tech Motion Detector', 'Dual-technology (PIR + microwave) motion detector for reduced false alarms in challenging environments. 35x35 ft coverage.', '516', 'Motion Detectors', 'DMP', 45.00, 87.00, 'https://www.dmp.com/images/products/516.jpg', true, false),
  ('DMP-518', '518 Wireless PIR Motion', 'Wireless passive infrared motion detector with 5-year battery life, 40x40 ft coverage, and pet immunity up to 85 lbs.', '518', 'Motion Detectors', 'DMP', 52.00, 99.00, 'https://www.dmp.com/images/products/518.jpg', true, false),
  ('DMP-520', '520 Outdoor Motion Detector', 'IP65-rated outdoor PIR motion detector with temperature compensation, anti-masking, and 60x10 ft curtain coverage.', '520', 'Motion Detectors', 'DMP', 65.00, 125.00, 'https://www.dmp.com/images/products/520.jpg', true, false),
  ('DMP-516W', '516W Wireless Dual-Tech Motion', 'Wireless dual-technology motion detector combining PIR and microwave for superior false alarm immunity. 5-year battery.', '516W', 'Motion Detectors', 'DMP', 72.00, 139.00, 'https://www.dmp.com/images/products/516W.jpg', true, false),

  -- Door/Window Contacts
  ('DMP-1100T', '1100T Recessed Door Contact', 'Miniature recessed door/window contact for concealed installation. Includes magnet. Ideal for wood and aluminum frames.', '1100T', 'Door/Window Contacts', 'DMP', 8.50, 16.00, 'https://www.dmp.com/images/products/1100T.jpg', true, false),
  ('DMP-1101', '1101 Surface Mount Contact', 'Standard surface-mount door/window contact with 3/4-inch gap tolerance. Includes mounting hardware and magnet.', '1101', 'Door/Window Contacts', 'DMP', 6.50, 12.50, 'https://www.dmp.com/images/products/1101.jpg', true, false),
  ('DMP-2100T', '2100T Wide Gap Contact', 'Wide-gap door contact for oversized or warped doors, up to 2-inch gap tolerance. Heavy-duty construction.', '2100T', 'Door/Window Contacts', 'DMP', 12.00, 23.00, 'https://www.dmp.com/images/products/2100T.jpg', true, false),
  ('DMP-1900T', '1900T Wireless Door Contact', 'Wireless surface-mount door/window contact with 3-year battery life, tamper switch, and supervised RF transmission.', '1900T', 'Door/Window Contacts', 'DMP', 28.00, 54.00, 'https://www.dmp.com/images/products/1900T.jpg', true, false),
  ('DMP-1101RR', '1101RR Roller Ball Contact', 'Roller ball contact for use on overhead garage doors and roll-up doors. Aluminum housing with stainless steel ball.', '1101RR', 'Door/Window Contacts', 'DMP', 14.00, 27.00, 'https://www.dmp.com/images/products/1101RR.jpg', true, false),

  -- Glass Break Detectors
  ('DMP-300', '300 Acoustic Glass Break Detector', 'Acoustic glass break detector with 15-ft radius coverage. Detects all types of glass including plate, tempered, wired, and laminated.', '300', 'Glass Break Detectors', 'DMP', 32.00, 62.00, 'https://www.dmp.com/images/products/300.jpg', true, false),
  ('DMP-302', '302 Flex Glass Break Detector', 'Flex-mount glass break detector that mounts directly to glass for the most sensitive detection. Includes mounting adhesive.', '302', 'Glass Break Detectors', 'DMP', 18.00, 35.00, 'https://www.dmp.com/images/products/302.jpg', true, false),
  ('DMP-305W', '305W Wireless Glass Break', 'Wireless acoustic glass break detector with 12-ft coverage radius and 3-year battery life. Supervised RF.', '305W', 'Glass Break Detectors', 'DMP', 52.00, 99.00, 'https://www.dmp.com/images/products/305W.jpg', true, false),

  -- Sirens & Sounders
  ('DMP-7300', '7300 Indoor Siren', 'High-output 120dB indoor siren for alarm notification. Compact housing with multiple mounting options.', '7300', 'Sirens', 'DMP', 22.00, 42.00, 'https://www.dmp.com/images/products/7300.jpg', true, false),
  ('DMP-7301', '7301 Outdoor Siren/Strobe', 'Weather-resistant outdoor siren with integrated strobe. 110dB output, tamper-protected housing. IP54 rated.', '7301', 'Sirens', 'DMP', 55.00, 105.00, 'https://www.dmp.com/images/products/7301.jpg', true, false),
  ('DMP-7310', '7310 Wireless Indoor Siren', 'Battery-powered wireless indoor siren for flexible placement. 100dB output, 2-year battery life, supervised RF.', '7310', 'Sirens', 'DMP', 48.00, 92.00, 'https://www.dmp.com/images/products/7310.jpg', true, false),
  ('DMP-7315', '7315 Self-Contained Outdoor Siren', 'Self-contained outdoor siren with built-in battery backup, 115dB output, strobe, and tamper detection.', '7315', 'Sirens', 'DMP', 85.00, 165.00, 'https://www.dmp.com/images/products/7315.jpg', true, false),

  -- Communicators
  ('DMP-734N', '734N Network Communicator', 'Ethernet network communicator for IP alarm transmission. Supports DMP SurGard and multiple receiver protocols.', '734N', 'Communicators', 'DMP', 95.00, 185.00, 'https://www.dmp.com/images/products/734N.jpg', true, true),
  ('DMP-734C', '734C Cellular Communicator', 'LTE cellular communicator for primary or backup alarm transmission. Supports major carrier networks.', '734C', 'Communicators', 'DMP', 145.00, 279.00, 'https://www.dmp.com/images/products/734C.jpg', true, true),
  ('DMP-734NC', '734NC Dual-Path Communicator', 'Dual-path network + cellular communicator for maximum reliability. Automatic failover between IP and LTE.', '734NC', 'Communicators', 'DMP', 215.00, 415.00, 'https://www.dmp.com/images/products/734NC.jpg', true, true),
  ('DMP-734W', '734W WiFi Communicator', 'WiFi communicator for residential and light commercial applications. Easy setup with mobile app configuration.', '734W', 'Communicators', 'DMP', 85.00, 165.00, 'https://www.dmp.com/images/products/734W.jpg', true, true),

  -- Power Supplies
  ('DMP-331', '331 Power Supply 12VDC 2.5A', 'Linear power supply providing regulated 12VDC at 2.5A for alarm control panels. Includes battery charging circuit.', '331', 'Power Supplies', 'DMP', 35.00, 67.00, 'https://www.dmp.com/images/products/331.jpg', true, false),
  ('DMP-333', '333 Power Supply 12VDC 4A', 'Regulated 12VDC 4A power supply with dual supervised outputs and integrated battery charging for larger systems.', '333', 'Power Supplies', 'DMP', 52.00, 99.00, 'https://www.dmp.com/images/products/333.jpg', true, false),
  ('DMP-338', '338 Fire Power Supply 24VDC', 'Listed fire alarm power supply providing 24VDC at 6A for fire panels and notification appliance circuits.', '338', 'Power Supplies', 'DMP', 95.00, 185.00, 'https://www.dmp.com/images/products/338.jpg', true, false),

  -- Enclosures
  ('DMP-620', '620 Small Enclosure', 'Small metal enclosure for control panel and auxiliary equipment. Tamper-protected door with lock.', '620', 'Enclosures', 'DMP', 22.00, 42.00, 'https://www.dmp.com/images/products/620.jpg', true, false),
  ('DMP-625', '625 Large Enclosure', 'Large metal enclosure for complex installations with multiple boards and large battery backup. Lockable door.', '625', 'Enclosures', 'DMP', 45.00, 87.00, 'https://www.dmp.com/images/products/625.jpg', true, false),

  -- Batteries
  ('DMP-BAT12-7', 'Sealed Lead Acid Battery 12V 7Ah', '12V 7Ah sealed lead acid battery for alarm panel backup power. Industry-standard F1 terminal connectors.', 'BAT12-7', 'Batteries', 'DMP', 18.00, 35.00, 'https://www.dmp.com/images/products/battery.jpg', true, false),
  ('DMP-BAT12-18', 'Sealed Lead Acid Battery 12V 18Ah', '12V 18Ah sealed lead acid battery for extended backup power requirements on commercial systems.', 'BAT12-18', 'Batteries', 'DMP', 38.00, 73.00, 'https://www.dmp.com/images/products/battery-large.jpg', true, false),

  -- Accessories
  ('DMP-503', '503 Zone Expander Module', '8-zone hardwired zone expander module for expanding control panel capacity. Supervised zones with EOL resistors.', '503', 'Accessories', 'DMP', 45.00, 87.00, 'https://www.dmp.com/images/products/503.jpg', true, false),
  ('DMP-505', '505 Output Relay Module', '4-output relay module for controlling external devices like lights, locks, and gates from the security panel.', '505', 'Accessories', 'DMP', 38.00, 73.00, 'https://www.dmp.com/images/products/505.jpg', true, false),
  ('DMP-850', '850 Wireless Receiver Module', 'Wireless receiver module for adding wireless zone capacity to hardwired control panels. Supports up to 32 wireless zones.', '850', 'Accessories', 'DMP', 95.00, 185.00, 'https://www.dmp.com/images/products/850.jpg', true, false),
  ('DMP-KEY1', 'Proximity Key Fob', 'Proximity key fob for arming/disarming with compatible keypads. Pack of 2 fobs with 125kHz RFID technology.', 'KEY1', 'Accessories', 'DMP', 12.00, 24.00, 'https://www.dmp.com/images/products/keyfob.jpg', true, false),
  ('DMP-SP1', 'Smoke/CO Combination Detector', 'Combination photoelectric smoke and carbon monoxide detector with interconnect capability and 10-year sealed battery.', 'SP1', 'Smoke Detectors', 'DMP', 42.00, 82.00, 'https://www.dmp.com/images/products/smoke.jpg', true, false),
  ('DMP-HEAT1', 'Fixed Heat Detector 135°F', 'Fixed temperature heat detector rated at 135°F for high-temperature environments like garages and attics.', 'HEAT1', 'Smoke Detectors', 'DMP', 22.00, 42.00, 'https://www.dmp.com/images/products/heat.jpg', true, false)
ON CONFLICT (sku) DO NOTHING;
