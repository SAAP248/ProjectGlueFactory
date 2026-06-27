-- Alarm.com Product Catalog (~10 products)
INSERT INTO products (id, sku, name, description, category, manufacturer, model_number, cost, price, chart_of_accounts, is_active, track_serial) VALUES
-- Video Doorbells
(gen_random_uuid(), 'ADC-VDB770', 'Alarm.com Video Doorbell Camera', '1080p WiFi video doorbell with 2-way audio and motion detection', 'Cameras', 'Alarm.com', 'ADC-VDB770', 145.00, 242.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ADC-VDB780', 'Alarm.com Slim Video Doorbell', 'Slim-profile 2K WiFi video doorbell with enhanced HDR', 'Cameras', 'Alarm.com', 'ADC-VDB780', 175.00, 292.00, 'Equipment Revenue', true, true),

-- Cameras
(gen_random_uuid(), 'ADC-V724', 'Alarm.com Indoor Camera', '1080p indoor fixed camera with night vision and 2-way audio', 'Cameras', 'Alarm.com', 'ADC-V724', 115.00, 192.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ADC-V724X', 'Alarm.com Indoor Pan/Tilt Camera', '1080p indoor PT camera with 340-degree rotation and auto-tracking', 'Cameras', 'Alarm.com', 'ADC-V724X', 155.00, 258.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ADC-V523', 'Alarm.com Outdoor Mini Bullet Camera', '2MP outdoor mini bullet with IR night vision and IP66 rating', 'Cameras', 'Alarm.com', 'ADC-V523', 165.00, 275.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ADC-V525', 'Alarm.com Outdoor Mini Turret Camera', '4MP outdoor turret with analytics and 100ft IR range', 'Cameras', 'Alarm.com', 'ADC-V525', 195.00, 325.00, 'Equipment Revenue', true, true),

-- Thermostats
(gen_random_uuid(), 'ADC-T2000', 'Alarm.com Smart Thermostat', 'Color touchscreen WiFi thermostat with geo-services and scheduling', 'Smart Home', 'Alarm.com', 'ADC-T2000', 125.00, 210.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ADC-T3000', 'Alarm.com Smart Thermostat HD', 'Premium HD display thermostat with humidity control and air quality', 'Smart Home', 'Alarm.com', 'ADC-T3000', 165.00, 275.00, 'Equipment Revenue', true, true),

-- Smart Home
(gen_random_uuid(), 'ADC-SEM200', 'Alarm.com Smart Energy Module', 'Z-Wave smart energy monitor for whole-home power consumption tracking', 'Smart Home', 'Alarm.com', 'ADC-SEM200', 85.00, 142.00, 'Equipment Revenue', true, true),
(gen_random_uuid(), 'ADC-GRGCTRL', 'Alarm.com Smart Garage Controller', 'Z-Wave garage door controller with tilt sensor and open/close alerts', 'Smart Home', 'Alarm.com', 'ADC-GRGCTRL-1', 55.00, 92.00, 'Equipment Revenue', true, false);
