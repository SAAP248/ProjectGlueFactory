/*
  # Seed 100 Fake Customers

  Creates 100 fake companies (mix of commercial and residential) with 1-3 sites each,
  treating each site as its own service location. No sub-customers; sites act as
  secondary locations under the parent customer.

  ## Changes
  1. Inserts 50 commercial and 50 residential companies with realistic names,
     addresses, contact info, payment terms, tags, and VIP status.
  2. Inserts 1-3 sites per commercial company and 1 site per residential company.
  3. All records use deterministic seeding with NOT EXISTS guards so re-running
     the migration is safe.

  ## Safety
  - Uses ON CONFLICT DO NOTHING on account_number to avoid duplicates.
  - No destructive operations.
*/

DO $$
DECLARE
  commercial_names text[] := ARRAY[
    'Summit Industrial Supply','Bluewater Logistics','Northstar Manufacturing','Apex Medical Center',
    'Pinnacle Financial Group','Cedar Grove Plaza','Harborview Hotels','Maple Leaf Bakery',
    'Ironclad Security Corp','Evergreen Property Mgmt','Lakeside Business Park','Redwood Legal Services',
    'Silverstone Dental Group','Fairfield Warehousing','Coastal Commercial Realty','Vertex Technology Partners',
    'Goldleaf Catering Co','Brookside Veterinary Clinic','Riverside Community Bank','Liberty Auto Group',
    'Titan Construction Co','Cobblestone Law Firm','Prairie Valley Foods','Meridian Accounting',
    'Crosspoint Engineering','Sterling Fitness Club','Willowbrook Apartments','Heritage Wine Merchants',
    'Beacon Tower Offices','Ashford Medical Plaza','Crestline Hardware','Monarch Print Services',
    'Oceanview Restaurant Group','Valley Forge Insurance','Thornton Retail Partners','Capital City Cleaners',
    'Ridgemont Auto Repair','Franklin Public Library','Seaside Grocery Mart','Deltaline Shipping',
    'Parkway Pediatrics','Westfield Dental Clinic','Greystone Condominium HOA','Skyline Architects',
    'Copperfield Ranch','Blackstone Jewelers','Clearwater Pools & Spa','Oakridge Country Club',
    'Hartwell Electronics','Brighton Auto Body'
  ];
  residential_first text[] := ARRAY[
    'James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','William','Elizabeth',
    'David','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Christopher','Karen',
    'Charles','Nancy','Daniel','Lisa','Matthew','Margaret','Anthony','Betty','Mark','Sandra',
    'Donald','Ashley','Steven','Kimberly','Paul','Emily','Andrew','Donna','Joshua','Michelle',
    'Kenneth','Carol','Kevin','Amanda','Brian','Melissa','George','Deborah','Edward','Stephanie'
  ];
  residential_last text[] := ARRAY[
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
    'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
    'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
    'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
    'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts'
  ];
  street_types text[] := ARRAY['Ave','St','Blvd','Dr','Ln','Rd','Way','Ct','Pl','Trl'];
  streets text[] := ARRAY['Maple','Oak','Pine','Cedar','Elm','Willow','Birch','Ashford','Lakeview','Sunset',
                          'Hillcrest','Parkside','River','Meadow','Orchard','Ridge','Forest','Valley','Mountain','Harbor'];
  cities text[] := ARRAY['Austin','Denver','Seattle','Portland','Chicago','Phoenix','Nashville','Boston','Raleigh','Tampa',
                         'Charlotte','Dallas','Atlanta','Minneapolis','Columbus','Indianapolis','Kansas City','Salt Lake City','Las Vegas','Sacramento'];
  states text[] := ARRAY['TX','CO','WA','OR','IL','AZ','TN','MA','NC','FL','NC','TX','GA','MN','OH','IN','MO','UT','NV','CA'];
  tag_pool text[] := ARRAY['Priority','Large Account','VIP','Past Due','Seasonal','Recurring'];

  i int;
  company_id uuid;
  site_count int;
  j int;
  city_idx int;
  street text;
  street_num int;
  company_name text;
  first_name text;
  last_name text;
  acct_num text;
  phone text;
  email_addr text;
  is_vip_val boolean;
  is_trouble boolean;
  total_rev numeric;
  outstanding numeric;
  past_due numeric;
  tag_list text[];
  customer_type_val text;
  state_val text;
  city_val text;
  zip_val text;
BEGIN
  -- 50 commercial
  FOR i IN 1..50 LOOP
    company_name := commercial_names[i];
    acct_num := 'WH-C' || LPAD(i::text, 5, '0');

    -- skip if exists
    IF EXISTS (SELECT 1 FROM companies WHERE account_number = acct_num) THEN
      CONTINUE;
    END IF;

    city_idx := ((i - 1) % 20) + 1;
    city_val := cities[city_idx];
    state_val := states[city_idx];
    zip_val := LPAD(((10000 + i * 137) % 99999)::text, 5, '0');
    street_num := 100 + (i * 17) % 9800;
    street := streets[((i - 1) % 20) + 1] || ' ' || street_types[((i - 1) % 10) + 1];

    phone := '(' || LPAD(((200 + i) % 999)::text, 3, '0') || ') ' ||
             LPAD(((100 + i * 7) % 999)::text, 3, '0') || '-' ||
             LPAD(((1000 + i * 13) % 9999)::text, 4, '0');
    email_addr := 'info@' || lower(regexp_replace(split_part(company_name,' ',1), '[^a-zA-Z]', '', 'g')) || i::text || '.com';

    is_vip_val := (i % 7 = 0);
    is_trouble := (i % 23 = 0);
    total_rev := 5000 + (i * 937) % 95000;
    outstanding := CASE WHEN i % 4 = 0 THEN (i * 53) % 5000 ELSE 0 END;
    past_due := CASE WHEN i % 9 = 0 THEN (i * 41) % 2500 ELSE 0 END;
    tag_list := ARRAY[]::text[];
    IF is_vip_val THEN tag_list := array_append(tag_list, 'VIP'); END IF;
    IF past_due > 0 THEN tag_list := array_append(tag_list, 'Past Due'); END IF;
    IF total_rev > 60000 THEN tag_list := array_append(tag_list, 'Large Account'); END IF;
    IF i % 11 = 0 THEN tag_list := array_append(tag_list, 'Priority'); END IF;

    INSERT INTO companies (
      name, status, customer_type, account_number, phone, email, website,
      billing_address, billing_city, billing_state, billing_zip,
      is_vip, total_revenue, outstanding_balance, past_due_amount,
      payment_terms, tags, is_trouble_customer, phones, company_emails
    ) VALUES (
      company_name, 'active', 'commercial', acct_num, phone, email_addr,
      'https://www.' || lower(regexp_replace(split_part(company_name,' ',1), '[^a-zA-Z]', '', 'g')) || i::text || '.com',
      street_num::text || ' ' || street, city_val, state_val, zip_val,
      is_vip_val, total_rev, outstanding, past_due,
      CASE WHEN i % 3 = 0 THEN 'Net 15' WHEN i % 5 = 0 THEN 'Net 60' ELSE 'Net 30' END,
      tag_list, is_trouble,
      jsonb_build_array(jsonb_build_object('label','Main','number',phone)),
      jsonb_build_array(jsonb_build_object('label','Primary','address',email_addr))
    ) RETURNING id INTO company_id;

    -- 1-3 sites per commercial
    site_count := 1 + (i % 3);
    FOR j IN 1..site_count LOOP
      INSERT INTO sites (company_id, name, address, city, state, zip, site_type)
      VALUES (
        company_id,
        CASE WHEN j = 1 THEN 'Main Office' WHEN j = 2 THEN 'Warehouse' ELSE 'Branch #' || j END,
        (street_num + j * 10)::text || ' ' || streets[((i + j) % 20) + 1] || ' ' || street_types[((i + j) % 10) + 1],
        cities[((i + j - 1) % 20) + 1],
        states[((i + j - 1) % 20) + 1],
        LPAD(((20000 + i * 91 + j * 7) % 99999)::text, 5, '0'),
        CASE WHEN j = 1 THEN 'office' WHEN j = 2 THEN 'warehouse' ELSE 'branch' END
      );
    END LOOP;
  END LOOP;

  -- 50 residential
  FOR i IN 1..50 LOOP
    first_name := residential_first[i];
    last_name := residential_last[i];
    company_name := first_name || ' ' || last_name;
    acct_num := 'WH-R' || LPAD(i::text, 5, '0');

    IF EXISTS (SELECT 1 FROM companies WHERE account_number = acct_num) THEN
      CONTINUE;
    END IF;

    city_idx := ((i - 1) % 20) + 1;
    city_val := cities[city_idx];
    state_val := states[city_idx];
    zip_val := LPAD(((30000 + i * 181) % 99999)::text, 5, '0');
    street_num := 100 + (i * 23) % 9800;
    street := streets[((i - 1) % 20) + 1] || ' ' || street_types[((i - 1) % 10) + 1];

    phone := '(' || LPAD(((300 + i) % 999)::text, 3, '0') || ') ' ||
             LPAD(((200 + i * 11) % 999)::text, 3, '0') || '-' ||
             LPAD(((2000 + i * 19) % 9999)::text, 4, '0');
    email_addr := lower(first_name) || '.' || lower(last_name) || i::text || '@email.com';

    is_vip_val := (i % 11 = 0);
    is_trouble := (i % 31 = 0);
    total_rev := 500 + (i * 137) % 9500;
    outstanding := CASE WHEN i % 6 = 0 THEN (i * 29) % 1500 ELSE 0 END;
    past_due := CASE WHEN i % 13 = 0 THEN (i * 17) % 800 ELSE 0 END;
    tag_list := ARRAY[]::text[];
    IF is_vip_val THEN tag_list := array_append(tag_list, 'VIP'); END IF;
    IF past_due > 0 THEN tag_list := array_append(tag_list, 'Past Due'); END IF;
    IF i % 17 = 0 THEN tag_list := array_append(tag_list, 'Priority'); END IF;

    INSERT INTO companies (
      name, status, customer_type, account_number, phone, email,
      billing_address, billing_city, billing_state, billing_zip,
      is_vip, total_revenue, outstanding_balance, past_due_amount,
      payment_terms, tags, is_trouble_customer, phones, company_emails
    ) VALUES (
      company_name, 'active', 'residential', acct_num, phone, email_addr,
      street_num::text || ' ' || street, city_val, state_val, zip_val,
      is_vip_val, total_rev, outstanding, past_due,
      'Net 30', tag_list, is_trouble,
      jsonb_build_array(jsonb_build_object('label','Mobile','number',phone)),
      jsonb_build_array(jsonb_build_object('label','Primary','address',email_addr))
    ) RETURNING id INTO company_id;

    -- 1 site for residential (the home); occasionally 2 (rental/vacation)
    INSERT INTO sites (company_id, name, address, city, state, zip, site_type)
    VALUES (
      company_id, 'Primary Residence',
      street_num::text || ' ' || street, city_val, state_val, zip_val,
      'residential'
    );
    IF i % 8 = 0 THEN
      INSERT INTO sites (company_id, name, address, city, state, zip, site_type)
      VALUES (
        company_id, 'Vacation Home',
        (street_num + 500)::text || ' ' || streets[((i + 3) % 20) + 1] || ' ' || street_types[((i + 3) % 10) + 1],
        cities[((i + 5) % 20) + 1], states[((i + 5) % 20) + 1],
        LPAD(((40000 + i * 71) % 99999)::text, 5, '0'),
        'residential'
      );
    END IF;
  END LOOP;
END $$;
