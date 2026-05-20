/*
  # Seed Customer Systems for All Sites

  1. Purpose
    - Populates the `customer_systems` table for every site that currently has no systems.
    - Ensures the System dropdown in Work Order creation is always populated after selecting a site.

  2. Logic
    - Residential sites: 1 system (Burg) per site
    - Commercial "Main Office" sites: 2-3 systems (Burg & Fire, Access Control, sometimes Networking)
    - Commercial "Warehouse" sites: 2 systems (Burg & Fire, Gates)
    - Commercial "Branch" sites: 1-2 systems (Burg, sometimes Fire)
    - Panel makes are rotated among Honeywell, DSC, Qolsys, DMP, Bosch
    - Installation dates are spread across 2021-2025
    - Monitoring account numbers are generated deterministically

  3. Safety
    - Only inserts for sites that do NOT already have systems (idempotent)
    - No destructive operations
*/

DO $$
DECLARE
  st_burg uuid;
  st_fire uuid;
  st_burg_fire uuid;
  st_access uuid;
  st_networking uuid;
  st_gates uuid;
  panel_makes text[] := ARRAY['Honeywell', 'DSC', 'Qolsys', 'DMP', 'Bosch'];
  panel_models text[][] := ARRAY[
    ARRAY['Vista 20P', 'Vista 128BPT', 'Lyric'],
    ARRAY['PowerSeries Neo', 'Maxsys', 'Impassa'],
    ARRAY['IQ Panel 4', 'IQ Panel 2+', 'IQ Hub'],
    ARRAY['XR550', 'XR150', 'XT50'],
    ARRAY['B9512G', 'B5512', 'B3512']
  ];
  rec record;
  site_idx int := 0;
  make_idx int;
  model_idx int;
  install_date date;
  mon_acct text;
BEGIN
  -- Get system type IDs
  SELECT id INTO st_burg FROM system_types WHERE name = 'Burg';
  SELECT id INTO st_fire FROM system_types WHERE name = 'Fire';
  SELECT id INTO st_burg_fire FROM system_types WHERE name = 'Burg & Fire';
  SELECT id INTO st_access FROM system_types WHERE name = 'Access Control';
  SELECT id INTO st_networking FROM system_types WHERE name = 'Networking';
  SELECT id INTO st_gates FROM system_types WHERE name = 'Gates';

  FOR rec IN
    SELECT s.id as site_id, s.name as site_name, s.company_id, s.site_type, c.customer_type
    FROM sites s
    JOIN companies c ON c.id = s.company_id
    WHERE NOT EXISTS (
      SELECT 1 FROM customer_systems cs WHERE cs.site_id = s.id
    )
    ORDER BY c.name, s.name
  LOOP
    site_idx := site_idx + 1;
    make_idx := ((site_idx - 1) % 5) + 1;
    model_idx := ((site_idx - 1) % 3) + 1;
    install_date := '2021-01-15'::date + ((site_idx * 17) % 1460)::int;
    mon_acct := 'MON-' || LPAD(site_idx::text, 5, '0');

    IF rec.customer_type = 'residential' THEN
      -- Residential: 1 Burg system
      INSERT INTO customer_systems (company_id, site_id, system_type_id, name, panel_make, panel_model, monitoring_account_number, status, installation_date)
      VALUES (
        rec.company_id, rec.site_id, st_burg,
        rec.site_name || ' Burglar',
        panel_makes[make_idx],
        panel_models[make_idx][model_idx],
        mon_acct,
        'active',
        install_date
      );

    ELSIF rec.site_name = 'Main Office' THEN
      -- Commercial Main Office: Burg & Fire + Access Control + sometimes Networking
      INSERT INTO customer_systems (company_id, site_id, system_type_id, name, panel_make, panel_model, monitoring_account_number, status, installation_date)
      VALUES (
        rec.company_id, rec.site_id, st_burg_fire,
        'Main Office Burg & Fire',
        panel_makes[make_idx],
        panel_models[make_idx][model_idx],
        mon_acct,
        'active',
        install_date
      );

      INSERT INTO customer_systems (company_id, site_id, system_type_id, name, panel_make, panel_model, monitoring_account_number, status, installation_date)
      VALUES (
        rec.company_id, rec.site_id, st_access,
        'Main Office Access Control',
        panel_makes[((make_idx) % 5) + 1],
        panel_models[((make_idx) % 5) + 1][((model_idx) % 3) + 1],
        mon_acct || '-AC',
        'active',
        install_date + 30
      );

      -- Every 3rd main office also gets networking
      IF site_idx % 3 = 0 THEN
        INSERT INTO customer_systems (company_id, site_id, system_type_id, name, panel_make, panel_model, monitoring_account_number, status, installation_date)
        VALUES (
          rec.company_id, rec.site_id, st_networking,
          'Main Office Network',
          'Ubiquiti',
          'UniFi Dream Machine Pro',
          mon_acct || '-NET',
          'active',
          install_date + 60
        );
      END IF;

    ELSIF rec.site_name = 'Warehouse' THEN
      -- Commercial Warehouse: Burg & Fire + Gates
      INSERT INTO customer_systems (company_id, site_id, system_type_id, name, panel_make, panel_model, monitoring_account_number, status, installation_date)
      VALUES (
        rec.company_id, rec.site_id, st_burg_fire,
        'Warehouse Burg & Fire',
        panel_makes[make_idx],
        panel_models[make_idx][model_idx],
        mon_acct,
        'active',
        install_date
      );

      INSERT INTO customer_systems (company_id, site_id, system_type_id, name, panel_make, panel_model, monitoring_account_number, status, installation_date)
      VALUES (
        rec.company_id, rec.site_id, st_gates,
        'Warehouse Gate System',
        'LiftMaster',
        'CSL24UL',
        mon_acct || '-GT',
        'active',
        install_date + 14
      );

    ELSE
      -- Branch sites: Burg + sometimes Fire
      INSERT INTO customer_systems (company_id, site_id, system_type_id, name, panel_make, panel_model, monitoring_account_number, status, installation_date)
      VALUES (
        rec.company_id, rec.site_id, st_burg,
        rec.site_name || ' Burglar',
        panel_makes[make_idx],
        panel_models[make_idx][model_idx],
        mon_acct,
        'active',
        install_date
      );

      IF site_idx % 2 = 0 THEN
        INSERT INTO customer_systems (company_id, site_id, system_type_id, name, panel_make, panel_model, monitoring_account_number, status, installation_date)
        VALUES (
          rec.company_id, rec.site_id, st_fire,
          rec.site_name || ' Fire',
          panel_makes[((make_idx) % 5) + 1],
          panel_models[((make_idx) % 5) + 1][((model_idx) % 3) + 1],
          mon_acct || '-FR',
          'active',
          install_date + 21
        );
      END IF;
    END IF;

  END LOOP;
END $$;
