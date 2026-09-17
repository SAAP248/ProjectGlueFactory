/*
# Seed rooms and inventory for all sites

1. Purpose
   - Populate site_rooms for every site that currently has zero rooms (164 of 167 sites).
   - Populate site_inventory with realistic equipment placed into those rooms.
   - Rooms and equipment vary by site_type: residential, office, warehouse, branch, commercial.

2. Rooms created per site type
   - residential: 3-5 rooms (Living Room, Master Bedroom, Kitchen, Garage, Home Office)
   - office: 3-5 rooms (Front Lobby, IT Closet, Conference Room, Break Room, Manager Office)
   - warehouse: 2-4 rooms (Main Floor, Loading Dock, Foreman Office, Break Room)
   - branch: 2-3 rooms (Sales Floor, Back Office, Storage Room)
   - commercial: 3-4 rooms (Main Entry, Manager Office, Server Closet, Storage)

3. Inventory created per site
   - 2-6 equipment items per site drawn from the products table.
   - Each item is linked to a room, has a serial number, installation date, and active status.
   - Items are linked to the site's first customer_system where one exists.
   - company_id is derived from the site's own company_id.

4. Security
   - No schema changes; data-only seed.
   - Existing RLS policies on site_rooms and site_inventory already permit anon access.

5. Important notes
   - Sites that already have rooms are skipped (WHERE NOT EXISTS).
   - Uses gen_random_uuid() for all new IDs.
   - Uses a deterministic but varied approach: site row_number modulo to pick room/product combos.
*/

DO $$
DECLARE
  v_site RECORD;
  v_room_id uuid;
  v_room_ids uuid[];
  v_system_id uuid;
  v_product RECORD;
  v_serial_prefix text;
  v_site_num int := 0;
  v_install_date date;
BEGIN

  FOR v_site IN
    SELECT s.id, s.company_id, s.site_type, s.name
    FROM sites s
    WHERE NOT EXISTS (SELECT 1 FROM site_rooms sr WHERE sr.site_id = s.id)
    ORDER BY s.name, s.id
  LOOP
    v_site_num := v_site_num + 1;
    v_room_ids := ARRAY[]::uuid[];
    v_install_date := '2024-01-15'::date + (v_site_num % 365)::int;

    SELECT cs.id INTO v_system_id
    FROM customer_systems cs WHERE cs.site_id = v_site.id
    ORDER BY cs.created_at LIMIT 1;

    -- =========================================================
    -- CREATE ROOMS
    -- =========================================================

    IF v_site.site_type = 'residential' THEN
      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Living Room', '1st Floor', 'Living Area', 1);
      v_room_ids := v_room_ids || v_room_id;

      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Master Bedroom', '2nd Floor', 'Bedroom', 2);
      v_room_ids := v_room_ids || v_room_id;

      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Kitchen', '1st Floor', 'Kitchen', 3);
      v_room_ids := v_room_ids || v_room_id;

      IF v_site_num % 2 = 0 THEN
        v_room_id := gen_random_uuid();
        INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
        VALUES (v_room_id, v_site.id, 'Garage', '1st Floor', 'Garage', 4);
        v_room_ids := v_room_ids || v_room_id;
      END IF;

      IF v_site_num % 3 = 0 THEN
        v_room_id := gen_random_uuid();
        INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
        VALUES (v_room_id, v_site.id, 'Home Office', '2nd Floor', 'Office', 5);
        v_room_ids := v_room_ids || v_room_id;
      END IF;

    ELSIF v_site.site_type = 'office' THEN
      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Front Lobby', '1st Floor', 'Living Area', 1);
      v_room_ids := v_room_ids || v_room_id;

      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'IT Closet', '1st Floor', 'Server Room', 2);
      v_room_ids := v_room_ids || v_room_id;

      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Conference Room', '1st Floor', 'Office', 3);
      v_room_ids := v_room_ids || v_room_id;

      IF v_site_num % 2 = 0 THEN
        v_room_id := gen_random_uuid();
        INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
        VALUES (v_room_id, v_site.id, 'Break Room', '1st Floor', 'Kitchen', 4);
        v_room_ids := v_room_ids || v_room_id;
      END IF;

      IF v_site_num % 3 = 0 THEN
        v_room_id := gen_random_uuid();
        INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
        VALUES (v_room_id, v_site.id, 'Manager Office', '2nd Floor', 'Office', 5);
        v_room_ids := v_room_ids || v_room_id;
      END IF;

    ELSIF v_site.site_type = 'warehouse' THEN
      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Main Floor', '1st Floor', 'Other', 1);
      v_room_ids := v_room_ids || v_room_id;

      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Loading Dock', '1st Floor', 'Other', 2);
      v_room_ids := v_room_ids || v_room_id;

      IF v_site_num % 2 = 0 THEN
        v_room_id := gen_random_uuid();
        INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
        VALUES (v_room_id, v_site.id, 'Foreman Office', '1st Floor', 'Office', 3);
        v_room_ids := v_room_ids || v_room_id;
      END IF;

      IF v_site_num % 3 = 0 THEN
        v_room_id := gen_random_uuid();
        INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
        VALUES (v_room_id, v_site.id, 'Break Room', '1st Floor', 'Kitchen', 4);
        v_room_ids := v_room_ids || v_room_id;
      END IF;

    ELSIF v_site.site_type = 'branch' THEN
      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Sales Floor', '1st Floor', 'Living Area', 1);
      v_room_ids := v_room_ids || v_room_id;

      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Back Office', '1st Floor', 'Office', 2);
      v_room_ids := v_room_ids || v_room_id;

      IF v_site_num % 2 = 0 THEN
        v_room_id := gen_random_uuid();
        INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
        VALUES (v_room_id, v_site.id, 'Storage Room', '1st Floor', 'Closet', 3);
        v_room_ids := v_room_ids || v_room_id;
      END IF;

    ELSE
      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Main Entry', '1st Floor', 'Living Area', 1);
      v_room_ids := v_room_ids || v_room_id;

      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Manager Office', '1st Floor', 'Office', 2);
      v_room_ids := v_room_ids || v_room_id;

      v_room_id := gen_random_uuid();
      INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
      VALUES (v_room_id, v_site.id, 'Server Closet', '1st Floor', 'Server Room', 3);
      v_room_ids := v_room_ids || v_room_id;

      IF v_site_num % 2 = 0 THEN
        v_room_id := gen_random_uuid();
        INSERT INTO site_rooms (id, site_id, name, floor_level, room_type, sort_order)
        VALUES (v_room_id, v_site.id, 'Storage', '1st Floor', 'Closet', 4);
        v_room_ids := v_room_ids || v_room_id;
      END IF;
    END IF;

    -- =========================================================
    -- CREATE INVENTORY ITEMS
    -- =========================================================

    -- Item 1: Control panel or keypad in room 1
    FOR v_product IN
      SELECT id, name, category FROM products
      WHERE category IN ('Control Panels', 'Panels', 'Keypads')
      ORDER BY name
      LIMIT 1 OFFSET (v_site_num % 10)
    LOOP
      INSERT INTO site_inventory (
        id, site_id, company_id, system_id, product_id,
        product_name, product_category, room_id,
        serial_number, installation_date, status
      ) VALUES (
        gen_random_uuid(), v_site.id, v_site.company_id, v_system_id, v_product.id,
        v_product.name, v_product.category, v_room_ids[1],
        'SN-' || substring(md5(v_site.id::text || '1') from 1 for 8),
        v_install_date, 'active'
      );
    END LOOP;

    -- Item 2: Camera in room 1
    IF array_length(v_room_ids, 1) >= 1 THEN
      FOR v_product IN
        SELECT id, name, category FROM products
        WHERE category = 'Cameras'
        ORDER BY name
        LIMIT 1 OFFSET (v_site_num % 6)
      LOOP
        INSERT INTO site_inventory (
          id, site_id, company_id, system_id, product_id,
          product_name, product_category, room_id,
          serial_number, installation_date, status
        ) VALUES (
          gen_random_uuid(), v_site.id, v_site.company_id, v_system_id, v_product.id,
          v_product.name, v_product.category, v_room_ids[1],
          'CAM-' || substring(md5(v_site.id::text || '2') from 1 for 8),
          v_install_date + 7, 'active'
        );
      END LOOP;
    END IF;

    -- Item 3: Motion detector in room 2
    IF array_length(v_room_ids, 1) >= 2 THEN
      FOR v_product IN
        SELECT id, name, category FROM products
        WHERE category IN ('Motion Detectors', 'Sensors')
        ORDER BY name
        LIMIT 1 OFFSET (v_site_num % 8)
      LOOP
        INSERT INTO site_inventory (
          id, site_id, company_id, system_id, product_id,
          product_name, product_category, room_id,
          serial_number, installation_date, status
        ) VALUES (
          gen_random_uuid(), v_site.id, v_site.company_id, v_system_id, v_product.id,
          v_product.name, v_product.category, v_room_ids[2],
          'MOT-' || substring(md5(v_site.id::text || '3') from 1 for 8),
          v_install_date + 14, 'active'
        );
      END LOOP;
    END IF;

    -- Item 4: Networking gear in room 2 (every other site)
    IF array_length(v_room_ids, 1) >= 2 AND v_site_num % 2 = 0 THEN
      FOR v_product IN
        SELECT id, name, category FROM products
        WHERE category = 'Networking'
        ORDER BY name
        LIMIT 1 OFFSET (v_site_num % 12)
      LOOP
        INSERT INTO site_inventory (
          id, site_id, company_id, system_id, product_id,
          product_name, product_category, room_id,
          serial_number, installation_date, status
        ) VALUES (
          gen_random_uuid(), v_site.id, v_site.company_id, v_system_id, v_product.id,
          v_product.name, v_product.category, v_room_ids[2],
          'NET-' || substring(md5(v_site.id::text || '4') from 1 for 8),
          v_install_date + 3, 'active'
        );
      END LOOP;
    END IF;

    -- Item 5: Door/window contact in room 3 (every 3rd site)
    IF array_length(v_room_ids, 1) >= 3 AND v_site_num % 3 = 0 THEN
      FOR v_product IN
        SELECT id, name, category FROM products
        WHERE category IN ('Door/Window Contacts', 'Glass Break Detectors')
        ORDER BY name
        LIMIT 1 OFFSET (v_site_num % 7)
      LOOP
        INSERT INTO site_inventory (
          id, site_id, company_id, system_id, product_id,
          product_name, product_category, room_id,
          serial_number, installation_date, status
        ) VALUES (
          gen_random_uuid(), v_site.id, v_site.company_id, v_system_id, v_product.id,
          v_product.name, v_product.category, v_room_ids[3],
          'DWC-' || substring(md5(v_site.id::text || '5') from 1 for 8),
          v_install_date + 21, 'active'
        );
      END LOOP;
    END IF;

    -- Item 6: Power device in last room (every 4th site)
    IF array_length(v_room_ids, 1) >= 2 AND v_site_num % 4 = 0 THEN
      FOR v_product IN
        SELECT id, name, category FROM products
        WHERE category IN ('Power', 'Power Supplies')
        ORDER BY name
        LIMIT 1 OFFSET (v_site_num % 10)
      LOOP
        INSERT INTO site_inventory (
          id, site_id, company_id, system_id, product_id,
          product_name, product_category, room_id,
          serial_number, installation_date, status
        ) VALUES (
          gen_random_uuid(), v_site.id, v_site.company_id, v_system_id, v_product.id,
          v_product.name, v_product.category, v_room_ids[array_length(v_room_ids, 1)],
          'PWR-' || substring(md5(v_site.id::text || '6') from 1 for 8),
          v_install_date + 10, 'active'
        );
      END LOOP;
    END IF;

  END LOOP;
END $$;
