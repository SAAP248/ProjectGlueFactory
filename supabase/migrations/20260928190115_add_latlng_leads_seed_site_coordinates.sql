/*
# Add lat/lng to leads + seed coordinates for all sites

1. Modified Tables
   - `leads` — add `latitude` (numeric) and `longitude` (numeric) columns for map display
   - `sites` — UPDATE only: fill in latitude/longitude for all 167 sites based on their city

2. Approach
   - Each city gets a realistic center lat/lng, then individual sites get a small random
     offset (up to ~0.03 degrees / ~2 miles) so pins spread naturally on the map.
   - The 8 sites that already have coordinates are left untouched (WHERE latitude IS NULL).

3. Security
   - No policy changes needed (sites and leads already have anon SELECT policies).
*/

-- Add lat/lng columns to leads (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='latitude') THEN
    ALTER TABLE leads ADD COLUMN latitude numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='longitude') THEN
    ALTER TABLE leads ADD COLUMN longitude numeric;
  END IF;
END $$;

-- Seed coordinates for leads with known cities
UPDATE leads SET latitude = 27.4989 + (random() * 0.04 - 0.02), longitude = -82.5748 + (random() * 0.04 - 0.02)
WHERE city = 'Bradenton' AND latitude IS NULL;
UPDATE leads SET latitude = 32.7555 + (random() * 0.04 - 0.02), longitude = -97.3308 + (random() * 0.04 - 0.02)
WHERE city = 'Fort Worth' AND latitude IS NULL;

-- Seed coordinates for all sites based on their city
-- Using realistic city-center coordinates with small offsets for variety
UPDATE sites SET
  latitude = CASE city
    WHEN 'Dallas' THEN 32.7767 + (random() * 0.06 - 0.03)
    WHEN 'Plano' THEN 33.0198 + (random() * 0.04 - 0.02)
    WHEN 'Irving' THEN 32.8140 + (random() * 0.04 - 0.02)
    WHEN 'Garland' THEN 32.9126 + (random() * 0.04 - 0.02)
    WHEN 'Austin' THEN 30.2672 + (random() * 0.06 - 0.03)
    WHEN 'Phoenix' THEN 33.4484 + (random() * 0.06 - 0.03)
    WHEN 'Sacramento' THEN 38.5816 + (random() * 0.04 - 0.02)
    WHEN 'Denver' THEN 39.7392 + (random() * 0.06 - 0.03)
    WHEN 'Tampa' THEN 27.9506 + (random() * 0.06 - 0.03)
    WHEN 'Atlanta' THEN 33.7490 + (random() * 0.06 - 0.03)
    WHEN 'Chicago' THEN 41.8781 + (random() * 0.06 - 0.03)
    WHEN 'Indianapolis' THEN 39.7684 + (random() * 0.06 - 0.03)
    WHEN 'Boston' THEN 42.3601 + (random() * 0.04 - 0.02)
    WHEN 'Minneapolis' THEN 44.9778 + (random() * 0.04 - 0.02)
    WHEN 'Kansas City' THEN 39.0997 + (random() * 0.06 - 0.03)
    WHEN 'Charlotte' THEN 35.2271 + (random() * 0.06 - 0.03)
    WHEN 'Raleigh' THEN 35.7796 + (random() * 0.04 - 0.02)
    WHEN 'Las Vegas' THEN 36.1699 + (random() * 0.06 - 0.03)
    WHEN 'Columbus' THEN 39.9612 + (random() * 0.06 - 0.03)
    WHEN 'Portland' THEN 45.5152 + (random() * 0.04 - 0.02)
    WHEN 'Nashville' THEN 36.1627 + (random() * 0.06 - 0.03)
    WHEN 'Salt Lake City' THEN 40.7608 + (random() * 0.04 - 0.02)
    WHEN 'Seattle' THEN 47.6062 + (random() * 0.04 - 0.02)
    ELSE 32.7767 + (random() * 0.10 - 0.05)
  END,
  longitude = CASE city
    WHEN 'Dallas' THEN -96.7970 + (random() * 0.06 - 0.03)
    WHEN 'Plano' THEN -96.6989 + (random() * 0.04 - 0.02)
    WHEN 'Irving' THEN -96.9489 + (random() * 0.04 - 0.02)
    WHEN 'Garland' THEN -96.6389 + (random() * 0.04 - 0.02)
    WHEN 'Austin' THEN -97.7431 + (random() * 0.06 - 0.03)
    WHEN 'Phoenix' THEN -112.0740 + (random() * 0.06 - 0.03)
    WHEN 'Sacramento' THEN -121.4944 + (random() * 0.04 - 0.02)
    WHEN 'Denver' THEN -104.9903 + (random() * 0.06 - 0.03)
    WHEN 'Tampa' THEN -82.4572 + (random() * 0.06 - 0.03)
    WHEN 'Atlanta' THEN -84.3880 + (random() * 0.06 - 0.03)
    WHEN 'Chicago' THEN -87.6298 + (random() * 0.06 - 0.03)
    WHEN 'Indianapolis' THEN -86.1581 + (random() * 0.06 - 0.03)
    WHEN 'Boston' THEN -71.0589 + (random() * 0.04 - 0.02)
    WHEN 'Minneapolis' THEN -93.2650 + (random() * 0.04 - 0.02)
    WHEN 'Kansas City' THEN -94.5786 + (random() * 0.06 - 0.03)
    WHEN 'Charlotte' THEN -80.8431 + (random() * 0.06 - 0.03)
    WHEN 'Raleigh' THEN -78.6382 + (random() * 0.04 - 0.02)
    WHEN 'Las Vegas' THEN -115.1398 + (random() * 0.06 - 0.03)
    WHEN 'Columbus' THEN -82.9988 + (random() * 0.06 - 0.03)
    WHEN 'Portland' THEN -122.6784 + (random() * 0.04 - 0.02)
    WHEN 'Nashville' THEN -86.7816 + (random() * 0.06 - 0.03)
    WHEN 'Salt Lake City' THEN -111.8910 + (random() * 0.04 - 0.02)
    WHEN 'Seattle' THEN -122.3321 + (random() * 0.04 - 0.02)
    ELSE -96.7970 + (random() * 0.10 - 0.05)
  END
WHERE latitude IS NULL;
