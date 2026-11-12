/*
# Accounting portal - sample data builder and reset

Plain English: creates realistic simulated accounting activity from January 2024 to today, layered on top of
the real WorkHorse invoices and payments. Running "Reset sample data" removes only simulated rows and rebuilds them.

1. Functions
- acct_rnd(text): repeatable pseudo-random number 0..1 so the sample data looks the same after each reset.
- acct_demo_txn: adds a simulated bank/card feed line (matched for older items, waiting for review if recent).
- acct_demo_bill: adds a simulated vendor bill and pays it (check or ACH) when it would have been paid by now.
- acct_demo_card: adds a simulated Amex charge.
- acct_seed_demo: builds vendors (incl. ~15 subcontractors), opening balances, summarized prior-system sales for
  months where WorkHorse has little history, payroll, rent, utilities, equipment purchases, subcontractor bills,
  Amex spending, loan and depreciation (as repeating entries), CSG Forte deposits, transfers, owner draws,
  bank fees, sales tax returns, completed reconciliations, bank rules, a 2026 budget, and month locks through August 2026.
- acct_reset_demo: deletes all simulated rows (is_demo) and re-runs acct_seed_demo.

2. Security
- All functions run with the caller's rights. EXECUTE granted to anon + authenticated because the app has no sign-in
  and the user asked for a "Reset sample data" button anyone can press (the reset calls the helpers).

3. Notes
- Real WorkHorse invoices/payments are never deleted; only simulated rows are removed on reset.
*/

CREATE OR REPLACE FUNCTION acct_rnd(p_seed text) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$
  SELECT (('x' || substr(md5(p_seed), 1, 8))::bit(32)::bigint)::numeric / 4294967295;
$$;

CREATE OR REPLACE FUNCTION acct_demo_txn(p_account_code text, p_date date, p_desc text, p_amount numeric, p_entry uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_pending boolean;
BEGIN
  IF p_date > current_date OR round(p_amount, 2) = 0 THEN RETURN; END IF;
  v_pending := p_entry IS NULL OR p_date > current_date - 12;
  INSERT INTO acct_bank_txns(account_id, txn_date, description, amount, status, matched_entry_id, hint_entry_ids, external_id, is_demo)
  VALUES ((SELECT id FROM acct_accounts WHERE code = p_account_code), p_date, p_desc, round(p_amount, 2),
    CASE WHEN v_pending THEN 'pending' ELSE 'matched' END,
    CASE WHEN v_pending THEN NULL ELSE p_entry END,
    CASE WHEN v_pending AND p_entry IS NOT NULL THEN ARRAY[p_entry] ELSE NULL END,
    'demo-' || gen_random_uuid(), true);
END $$;

CREATE OR REPLACE FUNCTION acct_demo_bill(p_vendor uuid, p_date date, p_amount numeric, p_desc text, p_terms int, p_method text, p_company uuid, p_seq int)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v record; v_bill uuid; v_due date; v_pay date; v_check bigint; v_entry uuid; v_r numeric;
BEGIN
  IF p_date > current_date OR p_amount <= 0 THEN RETURN; END IF;
  SELECT * INTO v FROM acct_vendors WHERE id = p_vendor;
  v_due := p_date + p_terms;
  v_bill := acct_save_bill(jsonb_build_object(
    'vendor_id', p_vendor,
    'bill_number', upper(left(regexp_replace(v.name, '[^A-Za-z]', '', 'g'), 3)) || '-' || to_char(p_date, 'YYMMDD') || p_seq,
    'bill_date', p_date, 'due_date', v_due, 'memo', p_desc, 'is_demo', true,
    'lines', jsonb_build_array(jsonb_build_object('account_id', v.default_account_id, 'description', p_desc, 'amount', round(p_amount, 2), 'company_id', p_company))));
  v_r := acct_rnd(p_vendor::text || p_date::text || p_seq);
  IF v_due < current_date - 25 OR (v_due <= current_date AND v_r < 0.55) THEN
    v_pay := greatest(p_date, v_due - 2);
    IF p_method = 'check' THEN
      SELECT coalesce(max(check_number::bigint), 1040) + 1 INTO v_check FROM acct_bill_payments WHERE method = 'check' AND check_number ~ '^\d+$';
    END IF;
    PERFORM acct_pay_bills(jsonb_build_object('pay_date', v_pay, 'method', p_method, 'start_check', v_check, 'is_demo', true,
      'bank_account_id', (SELECT id FROM acct_accounts WHERE code = '1000'),
      'items', jsonb_build_array(jsonb_build_object('bill_id', v_bill, 'amount', round(p_amount, 2)))));
    SELECT e.id INTO v_entry FROM acct_bill_payments bp JOIN acct_entries e ON e.source_type = 'bill_payment' AND e.source_key = bp.id::text
    WHERE bp.bill_id = v_bill LIMIT 1;
    PERFORM acct_demo_txn('1000', v_pay + CASE WHEN p_method = 'check' THEN 3 ELSE 0 END,
      CASE WHEN p_method = 'check' THEN 'CHECK ' || v_check ELSE 'ACH DEBIT ' || upper(v.name) END, -round(p_amount, 2), v_entry);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION acct_demo_card(p_vendor uuid, p_date date, p_amount numeric, p_key text)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v record; v_entry uuid;
BEGIN
  IF p_date > current_date OR p_amount <= 0 THEN RETURN; END IF;
  SELECT * INTO v FROM acct_vendors WHERE id = p_vendor;
  IF p_date > current_date - 9 THEN
    PERFORM acct_demo_txn('2100', p_date, upper(v.name), -round(p_amount, 2), NULL);
    RETURN;
  END IF;
  PERFORM acct_post('card'::text, p_key, NULL::uuid, 'Amex', p_date, (v.name || ' - Amex')::text, NULL::uuid,
    jsonb_build_array(jsonb_build_object('a', v.default_account_id::text, 'd', round(p_amount, 2), 'm', v.name),
                      jsonb_build_object('a', '2100', 'c', round(p_amount, 2), 'm', 'Amex 1009')),
    true, p_vendor, 'Amex feed'::text);
  SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'card' AND source_key = p_key;
  PERFORM acct_demo_txn('2100', p_date, upper(v.name), -round(p_amount, 2), v_entry);
END $$;

CREATE OR REPLACE FUNCTION acct_seed_demo() RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  m date; d date; v_end date; v_scale numeric; v_w numeric; v_tax numeric; v_liab numeric; v_net numeric; v_amt numeric;
  v_entry uuid; v_cos uuid[]; v_subs uuid[]; v_n int; i int; v_r numeric; v_yf numeric; v_inc numeric; v_target numeric;
  v_amex numeric; r record; v_recon uuid; v_beg numeric; v_bal numeric; acc record;
  vid_rent uuid; vid_teco uuid; vid_spec uuid; vid_verz uuid; vid_prog uuid; vid_alarm uuid; vid_adi uuid; vid_wesco uuid;
  vid_hd uuid; vid_shell uuid; vid_race uuid; vid_goog uuid; vid_amzn uuid; vid_ms uuid; vid_cpa uuid; vid_gusto uuid;
  vid_meals uuid; vid_blue uuid; vid_jiffy uuid;
BEGIN
  PERFORM set_config('acct.quiet', 'on', true);
  PERFORM set_config('acct.bypass_lock', 'on', true);
  PERFORM acct_ensure_periods();
  UPDATE acct_periods SET status = 'open', locked_at = NULL, locked_by = NULL, checklist = '{}'::jsonb;

  INSERT INTO acct_vendors(name, vendor_type, payment_terms, default_account_id, tax_id, entity_type, is_1099, contact_name, phone, city, state, is_demo)
  SELECT x.name, x.vtype, x.terms, (SELECT id FROM acct_accounts WHERE code = x.code), x.tin, x.entity, x.is1099, x.contact, x.phone, x.city, 'FL', true
  FROM (VALUES
    ('Gulf Coast Low Voltage LLC','subcontractor','Net 15','5100','59-3384721','llc',true,'Ray Bennett','(813) 555-0141','Tampa'),
    ('Rivera Cabling & Wiring','subcontractor','Net 15','5100',NULL,'individual',true,'Luis Rivera','(813) 555-0187','Brandon'),
    ('Suncoast Camera Installs','subcontractor','Net 15','5100','***-**-4417','individual',true,'Derek Shaw','(727) 555-0122','Clearwater'),
    ('Bay Area Access Control','subcontractor','Net 30','5100','46-2201983','llc',true,'Tina Morales','(813) 555-0164','Tampa'),
    ('Tampa Trenching Co','subcontractor','Net 30','5100','59-1187340','corporation',false,'Gary Poole','(813) 555-0110','Plant City'),
    ('Mike Delgado Electric','subcontractor','Net 15','5100','***-**-9082','individual',true,'Mike Delgado','(941) 555-0175','Bradenton'),
    ('Precision Fire Alarm Services','subcontractor','Net 30','5100','82-4410276','llc',true,'Anita Cole','(727) 555-0133','St. Petersburg'),
    ('Hernandez Conduit Works','subcontractor','Net 15','5100',NULL,'individual',true,'Jose Hernandez','(813) 555-0158','Riverview'),
    ('Keystone Tower & Antenna','subcontractor','Net 30','5100','61-1930458','llc',true,'Paul Keyes','(352) 555-0119','Brooksville'),
    ('Brightline Data Pros','subcontractor','Net 15','5100','85-3317762','partnership',true,'Sam Okafor','(813) 555-0196','Wesley Chapel'),
    ('Coastal Gate & Fence','subcontractor','Net 30','5100','59-2874415','llc',true,'Dana Price','(941) 555-0147','Palmetto'),
    ('J. Whitaker Technician Services','subcontractor','Net 15','5100','***-**-2251','individual',true,'Jim Whitaker','(813) 555-0103','Lutz'),
    ('Palmetto Alarm Techs','subcontractor','Net 15','5100',NULL,'individual',true,'Kevin Tran','(941) 555-0168','Palmetto'),
    ('Skyway Lift Rentals','subcontractor','Net 30','5100','59-0098812','corporation',false,'Front Desk','(727) 555-0100','Pinellas Park'),
    ('Manatee Wire Pullers','subcontractor','Net 15','5100','88-1023349','llc',true,'Chris Lane','(941) 555-0189','Bradenton'),
    ('Bayshore Commercial Properties','landlord','Due on receipt','6200','59-3001772','llc',true,'Helen Ford','(813) 555-0200','Tampa'),
    ('TECO Energy','utility','Net 15','6210',NULL,'corporation',false,NULL,'(813) 223-0800','Tampa'),
    ('Spectrum Business','utility','Net 15','6220',NULL,'corporation',false,NULL,'(855) 299-9353','Tampa'),
    ('Verizon Wireless','utility','Net 15','6220',NULL,'corporation',false,NULL,'(800) 922-0204','Tampa'),
    ('Progressive Commercial','insurance','Net 15','6400',NULL,'corporation',false,NULL,'(888) 806-9598','Tampa'),
    ('Alarm.com','software','Net 30','6500',NULL,'corporation',false,NULL,'(877) 389-4033','Tysons, VA'),
    ('ADI Global Distribution','supplier','Net 30','5000','13-3846789','corporation',false,'Branch Desk','(813) 555-0300','Tampa'),
    ('Wesco Anixter','supplier','Net 30','5000','25-1723342','corporation',false,'Branch Desk','(813) 555-0310','Tampa'),
    ('Home Depot Pro','card','Card','5200',NULL,'corporation',false,NULL,NULL,'Tampa'),
    ('Shell Fleet','card','Card','6300',NULL,'corporation',false,NULL,NULL,'Tampa'),
    ('RaceTrac','card','Card','6300',NULL,'corporation',false,NULL,NULL,'Tampa'),
    ('Google Ads','card','Card','6600',NULL,'corporation',false,NULL,NULL,'Mountain View, CA'),
    ('Amazon Business','card','Card','6700',NULL,'corporation',false,NULL,NULL,'Seattle, WA'),
    ('Microsoft 365','card','Card','6500',NULL,'corporation',false,NULL,NULL,'Redmond, WA'),
    ('Smith & Albright CPAs','professional','Net 15','6800','59-2765510','partnership',true,'Laura Albright','(813) 555-0250','Tampa'),
    ('Gusto Payroll','payroll','Auto','6000',NULL,'corporation',false,NULL,NULL,'San Francisco, CA'),
    ('Local Restaurants','card','Card','6710',NULL,'corporation',false,NULL,NULL,'Tampa'),
    ('Florida Blue','insurance','Net 15','6020',NULL,'corporation',false,NULL,'(800) 352-2583','Jacksonville'),
    ('Jiffy Lube Fleet','vehicle','Net 15','6310',NULL,'corporation',false,NULL,NULL,'Tampa'),
    ('Ford Credit','lender','Auto','2700',NULL,'corporation',false,NULL,'(800) 727-7000','Dearborn, MI')
  ) AS x(name, vtype, terms, code, tin, entity, is1099, contact, phone, city);

  SELECT array_agg(id ORDER BY name) INTO v_subs FROM acct_vendors WHERE is_demo AND vendor_type = 'subcontractor';
  SELECT id INTO vid_rent FROM acct_vendors WHERE is_demo AND name = 'Bayshore Commercial Properties';
  SELECT id INTO vid_teco FROM acct_vendors WHERE is_demo AND name = 'TECO Energy';
  SELECT id INTO vid_spec FROM acct_vendors WHERE is_demo AND name = 'Spectrum Business';
  SELECT id INTO vid_verz FROM acct_vendors WHERE is_demo AND name = 'Verizon Wireless';
  SELECT id INTO vid_prog FROM acct_vendors WHERE is_demo AND name = 'Progressive Commercial';
  SELECT id INTO vid_alarm FROM acct_vendors WHERE is_demo AND name = 'Alarm.com';
  SELECT id INTO vid_adi FROM acct_vendors WHERE is_demo AND name = 'ADI Global Distribution';
  SELECT id INTO vid_wesco FROM acct_vendors WHERE is_demo AND name = 'Wesco Anixter';
  SELECT id INTO vid_hd FROM acct_vendors WHERE is_demo AND name = 'Home Depot Pro';
  SELECT id INTO vid_shell FROM acct_vendors WHERE is_demo AND name = 'Shell Fleet';
  SELECT id INTO vid_race FROM acct_vendors WHERE is_demo AND name = 'RaceTrac';
  SELECT id INTO vid_goog FROM acct_vendors WHERE is_demo AND name = 'Google Ads';
  SELECT id INTO vid_amzn FROM acct_vendors WHERE is_demo AND name = 'Amazon Business';
  SELECT id INTO vid_ms FROM acct_vendors WHERE is_demo AND name = 'Microsoft 365';
  SELECT id INTO vid_cpa FROM acct_vendors WHERE is_demo AND name = 'Smith & Albright CPAs';
  SELECT id INTO vid_gusto FROM acct_vendors WHERE is_demo AND name = 'Gusto Payroll';
  SELECT id INTO vid_meals FROM acct_vendors WHERE is_demo AND name = 'Local Restaurants';
  SELECT id INTO vid_blue FROM acct_vendors WHERE is_demo AND name = 'Florida Blue';
  SELECT id INTO vid_jiffy FROM acct_vendors WHERE is_demo AND name = 'Jiffy Lube Fleet';
  SELECT array_agg(id ORDER BY name) INTO v_cos FROM companies;

  PERFORM acct_post('opening'::text, 'opening-2024', NULL::uuid, 'Opening', DATE '2024-01-01', 'Opening balances carried over from the prior system'::text, NULL::uuid,
    jsonb_build_array(
      jsonb_build_object('a','1000','d',86500), jsonb_build_object('a','1010','d',14000), jsonb_build_object('a','1020','d',60000),
      jsonb_build_object('a','1200','d',18400), jsonb_build_object('a','1500','d',68000), jsonb_build_object('a','1510','d',22600),
      jsonb_build_object('a','1590','c',21000), jsonb_build_object('a','2700','c',52000), jsonb_build_object('a','3000','c',50000),
      jsonb_build_object('a','3950','c',146500)),
    true, NULL::uuid, 'Sample data'::text);

  INSERT INTO acct_recurring(name, memo, day_of_month, next_date, lines, is_active, is_demo) VALUES
    ('Ford Credit van loan', 'Ford Credit van loan payment', 15, DATE '2024-01-15',
      '[{"a":"2700","d":890,"m":"Principal"},{"a":"7000","d":260,"m":"Interest"},{"a":"1000","c":1150,"m":"Ford Credit autopay"}]'::jsonb, true, true),
    ('Monthly depreciation', 'Depreciation - vehicles and tools', 28, DATE '2024-01-28',
      '[{"a":"6950","d":1250,"m":"Monthly depreciation"},{"a":"1590","c":1250,"m":"Accumulated depreciation"}]'::jsonb, true, true);
  PERFORM acct_run_recurring(current_date);
  FOR r IN SELECT e.id, e.entry_date FROM acct_entries e JOIN acct_recurring rc ON rc.id = e.source_id
           WHERE e.source_type = 'recurring' AND rc.name = 'Ford Credit van loan' AND rc.is_demo LOOP
    PERFORM acct_demo_txn('1000', r.entry_date, 'FORD CREDIT AUTOPAY', -1150, r.id);
  END LOOP;

  m := DATE '2024-01-01';
  WHILE m <= date_trunc('month', current_date)::date LOOP
    v_end := (m + interval '1 month - 1 day')::date;
    v_yf := CASE extract(year FROM m) WHEN 2024 THEN 1 WHEN 2025 THEN 1.04 ELSE 1.08 END;

    -- summarized sales from the prior system for months where WorkHorse has little history
    SELECT coalesce(sum(l.credit - l.debit), 0) INTO v_inc
    FROM acct_entry_lines l JOIN acct_entries e ON e.id = l.entry_id JOIN acct_accounts a ON a.id = l.account_id
    WHERE a.type = 'income' AND NOT e.is_demo AND e.entry_date BETWEEN m AND v_end;
    IF v_end < current_date THEN
      v_target := round((CASE extract(year FROM m) WHEN 2024 THEN 46000 WHEN 2025 THEN 54000 ELSE 62000 END) * (0.9 + 0.2 * acct_rnd('tgt' || m)), 2);
      v_amt := v_target - v_inc;
      IF v_amt > 1000 THEN
        PERFORM acct_post('legacy_sales'::text, m::text, NULL::uuid, 'Prior system', v_end, ('Sales summary from prior system - ' || to_char(m, 'Mon YYYY'))::text, NULL::uuid,
          jsonb_build_array(jsonb_build_object('a','1000','d',v_amt,'m','Deposited'),
            jsonb_build_object('a','4000','c',round(v_amt * 0.45, 2),'m','Equipment sales'),
            jsonb_build_object('a','4100','c',round(v_amt * 0.35, 2),'m','Installation and service'),
            jsonb_build_object('a','4200','c',v_amt - round(v_amt * 0.45, 2) - round(v_amt * 0.35, 2),'m','Monitoring plans')),
          true, NULL::uuid, 'Sample data'::text);
        SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'legacy_sales' AND source_key = m::text;
        PERFORM acct_demo_txn('1000', v_end, 'DEPOSIT - PRIOR SYSTEM SALES ' || to_char(m, 'MON YYYY'), v_amt, v_entry);
        v_inc := v_target;
      END IF;
    END IF;
    v_scale := least(1.4, greatest(0.6, v_inc / 60000));

    -- transfer to payroll account, payroll (15th and month end), payroll tax deposit
    IF m + 13 <= current_date THEN
      v_amt := round((5000 + 4000 * v_scale) * v_yf * 2.2, -2);
      PERFORM acct_post('transfer'::text, 'payroll-' || m, NULL::uuid, 'Transfer', m + 13, 'Transfer to payroll checking'::text, NULL::uuid,
        jsonb_build_array(jsonb_build_object('a','1010','d',v_amt), jsonb_build_object('a','1000','c',v_amt)), true, NULL::uuid, 'Sample data'::text);
      SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'transfer' AND source_key = 'payroll-' || m;
      PERFORM acct_demo_txn('1000', m + 13, 'ONLINE TRANSFER TO PAYROLL x7730', -v_amt, v_entry);
      PERFORM acct_demo_txn('1010', m + 13, 'ONLINE TRANSFER FROM OPERATING x4821', v_amt, v_entry);
    END IF;

    FOREACH d IN ARRAY ARRAY[m + 14, v_end] LOOP
      IF d <= current_date THEN
        v_w := round((5000 + 4000 * v_scale) * v_yf * (0.95 + 0.1 * acct_rnd('pay' || d)), 2);
        v_tax := round(v_w * 0.0765, 2);
        v_liab := round(v_w * 0.2865, 2);
        v_net := v_w + v_tax - v_liab;
        PERFORM acct_post('payroll'::text, d::text, NULL::uuid, 'Gusto', d, ('Payroll - period ending ' || to_char(d, 'Mon DD, YYYY'))::text, NULL::uuid,
          jsonb_build_array(jsonb_build_object('a','6000','d',v_w,'m','Gross wages'), jsonb_build_object('a','6010','d',v_tax,'m','Employer taxes'),
            jsonb_build_object('a','1010','c',v_net,'m','Net pay'), jsonb_build_object('a','2300','c',v_liab,'m','Withholding and taxes owed')),
          true, vid_gusto, 'Gusto'::text);
        SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'payroll' AND source_key = d::text;
        PERFORM acct_demo_txn('1010', d, 'GUSTO NET PAY', -v_net, v_entry);
      END IF;
    END LOOP;

    IF m > DATE '2024-01-01' AND m + 4 <= current_date THEN
      SELECT coalesce(sum(l.credit), 0) INTO v_amt FROM acct_entry_lines l JOIN acct_entries e ON e.id = l.entry_id JOIN acct_accounts a ON a.id = l.account_id
      WHERE a.code = '2300' AND e.source_type = 'payroll' AND e.entry_date BETWEEN (m - interval '1 month')::date AND m - 1;
      IF v_amt > 0 THEN
        PERFORM acct_post('payroll_tax'::text, m::text, NULL::uuid, 'EFTPS', m + 4, 'Payroll tax deposit (IRS / FL reemployment)'::text, NULL::uuid,
          jsonb_build_array(jsonb_build_object('a','2300','d',v_amt), jsonb_build_object('a','1010','c',v_amt)), true, NULL::uuid, 'Gusto'::text);
        SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'payroll_tax' AND source_key = m::text;
        PERFORM acct_demo_txn('1010', m + 4, 'IRS USATAXPYMT EFTPS', -v_amt, v_entry);
      END IF;
    END IF;

    -- regular bills
    PERFORM acct_demo_bill(vid_rent, m, CASE extract(year FROM m) WHEN 2024 THEN 4200 WHEN 2025 THEN 4400 ELSE 4600 END, 'Office and warehouse rent - ' || to_char(m, 'Mon YYYY'), 5, 'ach', NULL, 1);
    PERFORM acct_demo_bill(vid_blue, m, round(1850 * v_yf, 2), 'Group health premium - ' || to_char(m, 'Mon YYYY'), 15, 'ach', NULL, 1);
    PERFORM acct_demo_bill(vid_prog, m + 2, round(1150 * v_yf, 2), 'Commercial auto and general liability', 15, 'ach', NULL, 1);
    PERFORM acct_demo_bill(vid_alarm, m + 4, round((700 + 600 * v_scale) * v_yf, 2), 'Monitoring platform fees', 30, 'ach', NULL, 1);
    PERFORM acct_demo_bill(vid_teco, m + 7, round(300 + 260 * acct_rnd('teco' || m) + CASE WHEN extract(month FROM m) BETWEEN 6 AND 9 THEN 180 ELSE 0 END, 2), 'Electric service', 15, 'ach', NULL, 1);
    PERFORM acct_demo_bill(vid_spec, m + 9, 289.99, 'Business internet and phone', 15, 'ach', NULL, 1);
    PERFORM acct_demo_bill(vid_verz, m + 11, round(520 + 140 * acct_rnd('verz' || m), 2), 'Technician mobile lines', 15, 'ach', NULL, 1);
    PERFORM acct_demo_bill(vid_adi, m + 5, round((1800 + 2500 * acct_rnd('adi1' || m)) * v_scale, 2), 'Cameras, panels and sensors', 30, 'ach', NULL, 1);
    PERFORM acct_demo_bill(vid_adi, m + 19, round((1200 + 2000 * acct_rnd('adi2' || m)) * v_scale, 2), 'Access control hardware and cable', 30, 'ach', NULL, 2);
    PERFORM acct_demo_bill(vid_wesco, m + 13, round((800 + 1500 * acct_rnd('wes' || m)) * v_scale, 2), 'Conduit, wire and fittings', 30, 'ach', NULL, 1);
    IF extract(month FROM m) IN (1, 4, 7, 10) THEN
      PERFORM acct_demo_bill(vid_cpa, m + 9, 1450, 'Quarterly bookkeeping review', 15, 'check', NULL, 1);
    END IF;
    IF extract(month FROM m) = 3 THEN
      PERFORM acct_demo_bill(vid_cpa, m + 20, 3500, 'Annual tax return preparation', 15, 'check', NULL, 2);
    END IF;
    IF extract(month FROM m)::int % 2 = 0 THEN
      PERFORM acct_demo_bill(vid_jiffy, m + 16, round(180 + 470 * acct_rnd('jiffy' || m), 2), 'Fleet service and tires', 15, 'ach', NULL, 1);
    END IF;

    -- subcontractors
    v_n := 1 + floor(2 * v_scale + 1.5 * acct_rnd('subn' || m))::int;
    FOR i IN 1..v_n LOOP
      v_r := acct_rnd('sub' || m || i);
      PERFORM acct_demo_bill(v_subs[1 + floor(v_r * array_length(v_subs, 1))::int], m + 2 + floor(acct_rnd('subd' || m || i) * 25)::int,
        round(500 + 2200 * acct_rnd('suba' || m || i), 2),
        (ARRAY['Camera install labor','Cable pull and termination','Access control install','Trenching and conduit','Fire alarm device install','Gate operator install','Tower and antenna work'])[1 + floor(acct_rnd('subt' || m || i) * 7)::int],
        15, 'check', v_cos[1 + floor(acct_rnd('subc' || m || i) * array_length(v_cos, 1))::int], 10 + i);
    END LOOP;

    -- Amex spending
    v_n := 8 + floor(5 * v_scale)::int;
    FOR i IN 1..v_n LOOP
      PERFORM acct_demo_card(CASE WHEN i % 2 = 0 THEN vid_shell ELSE vid_race END, m + floor(acct_rnd('fd' || m || i) * 27)::int, round(45 + 70 * acct_rnd('fa' || m || i), 2), 'fuel-' || m || '-' || i);
    END LOOP;
    FOR i IN 1..3 LOOP
      PERFORM acct_demo_card(vid_meals, m + floor(acct_rnd('md' || m || i) * 27)::int, round(25 + 115 * acct_rnd('ma' || m || i), 2), 'meal-' || m || '-' || i);
    END LOOP;
    FOR i IN 1..2 LOOP
      PERFORM acct_demo_card(vid_amzn, m + floor(acct_rnd('ad' || m || i) * 27)::int, round(40 + 220 * acct_rnd('aa' || m || i), 2), 'amzn-' || m || '-' || i);
    END LOOP;
    FOR i IN 1..3 LOOP
      PERFORM acct_demo_card(vid_hd, m + floor(acct_rnd('hd' || m || i) * 27)::int, round(60 + 380 * acct_rnd('ha' || m || i), 2), 'hd-' || m || '-' || i);
    END LOOP;
    PERFORM acct_demo_card(vid_goog, m + 1, round(400 + 500 * v_scale, 2), 'goog-' || m);
    PERFORM acct_demo_card(vid_ms, m + 2, 264.00, 'ms-' || m);

    -- Amex payment for prior charges
    IF m > DATE '2024-01-01' AND m + 21 <= current_date - 12 THEN
      SELECT coalesce(sum(l.credit - l.debit), 0) INTO v_amex FROM acct_entry_lines l JOIN acct_entries e ON e.id = l.entry_id JOIN acct_accounts a ON a.id = l.account_id
      WHERE a.code = '2100' AND e.entry_date <= m - 1;
      IF v_amex > 0 THEN
        PERFORM acct_post('card_payment'::text, m::text, NULL::uuid, 'Amex', m + 21, 'Amex statement payment'::text, NULL::uuid,
          jsonb_build_array(jsonb_build_object('a','2100','d',v_amex), jsonb_build_object('a','1000','c',v_amex)), true, NULL::uuid, 'Sample data'::text);
        SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'card_payment' AND source_key = m::text;
        PERFORM acct_demo_txn('1000', m + 21, 'AMEX EPAYMENT ACH PMT', -v_amex, v_entry);
        PERFORM acct_demo_txn('2100', m + 21, 'PAYMENT RECEIVED - THANK YOU', v_amex, v_entry);
      END IF;
    END IF;

    -- bank fees, savings interest, owner draws
    IF v_end <= current_date - 12 THEN
      PERFORM acct_post('bank_fee'::text, m::text, NULL::uuid, 'Truist', v_end, 'Truist monthly service fee'::text, NULL::uuid,
        '[{"a":"6850","d":25},{"a":"1000","c":25}]'::jsonb, true, NULL::uuid, 'Sample data'::text);
      SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'bank_fee' AND source_key = m::text;
      PERFORM acct_demo_txn('1000', v_end, 'TRUIST SERVICE FEE', -25, v_entry);
      v_amt := round(40 + 50 * acct_rnd('int' || m), 2);
      PERFORM acct_post('interest'::text, m::text, NULL::uuid, 'Truist', v_end, 'Savings interest'::text, NULL::uuid,
        jsonb_build_array(jsonb_build_object('a','1020','d',v_amt), jsonb_build_object('a','4800','c',v_amt)), true, NULL::uuid, 'Sample data'::text);
      SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'interest' AND source_key = m::text;
      PERFORM acct_demo_txn('1020', v_end, 'INTEREST PAYMENT', v_amt, v_entry);
    ELSIF v_end <= current_date THEN
      PERFORM acct_demo_txn('1000', v_end, 'TRUIST SERVICE FEE', -25, NULL);
    END IF;
    IF extract(month FROM m) IN (3, 6, 9, 12) AND v_end - 2 <= current_date THEN
      PERFORM acct_post('owner_draw'::text, m::text, NULL::uuid, 'Draw', v_end - 2, 'Owner draw'::text, NULL::uuid,
        '[{"a":"3100","d":6000},{"a":"1000","c":6000}]'::jsonb, true, NULL::uuid, 'Sample data'::text);
      SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'owner_draw' AND source_key = m::text;
      PERFORM acct_demo_txn('1000', v_end - 2, 'ONLINE TRANSFER TO OWNER x5512', -6000, v_entry);
    END IF;

    m := (m + interval '1 month')::date;
  END LOOP;

  -- recent items waiting for review (no entry yet)
  PERFORM acct_demo_txn('2100', current_date - 2, 'SUNPASS TOLL REPLENISH', -40.00, NULL);
  PERFORM acct_demo_txn('2100', current_date - 4, 'SHELL OIL 57442', -88.15, NULL);
  PERFORM acct_demo_txn('1000', current_date - 3, 'TECO ENERGY AUTOPAY REFUND', 46.20, NULL);

  -- vendor credits
  IF current_date > DATE '2025-07-01' THEN
    PERFORM acct_save_bill(jsonb_build_object('vendor_id', vid_adi, 'kind', 'credit', 'bill_number', 'ADI-RMA-2207', 'bill_date', DATE '2025-06-18',
      'memo', 'Returned 4 defective dome cameras', 'is_demo', true,
      'lines', jsonb_build_array(jsonb_build_object('account_id', (SELECT id FROM acct_accounts WHERE code = '5000'), 'description', 'Returned 4 dome cameras', 'amount', 860))));
    PERFORM acct_save_bill(jsonb_build_object('vendor_id', vid_wesco, 'kind', 'credit', 'bill_number', 'WES-CR-1093', 'bill_date', current_date - 20,
      'memo', 'Overbilled cable reels', 'is_demo', true,
      'lines', jsonb_build_array(jsonb_build_object('account_id', (SELECT id FROM acct_accounts WHERE code = '5000'), 'description', 'Price correction', 'amount', 312.50))));
  END IF;

  -- CSG Forte deposits: one per payment day, netted of card fees
  FOR r IN SELECT u.entry_date, array_agg(u.entry_id) ids, sum(u.amount) amt FROM acct_undeposited_payments() u GROUP BY u.entry_date ORDER BY u.entry_date LOOP
    d := r.entry_date + CASE WHEN extract(dow FROM r.entry_date) = 5 THEN 3 WHEN extract(dow FROM r.entry_date) = 6 THEN 2 ELSE 1 END;
    IF d > current_date THEN CONTINUE; END IF;
    INSERT INTO acct_bank_txns(account_id, txn_date, description, amount, status, hint_entry_ids, external_id, is_demo)
    VALUES ((SELECT id FROM acct_accounts WHERE code = '1000'), d, 'CSG FORTE DEPOSIT ' || to_char(r.entry_date, 'MMDD'), round(r.amt, 2), 'pending', r.ids, 'demo-' || gen_random_uuid(), true)
    RETURNING id INTO v_entry;
    IF d <= current_date - 12 THEN
      PERFORM acct_bank_deposit(v_entry, r.ids);
    END IF;
  END LOOP;

  -- Florida sales tax returns (filed on the 18th of the following month)
  m := DATE '2024-01-01';
  WHILE (m + interval '1 month')::date + 17 <= current_date AND m < date_trunc('month', current_date - 30)::date LOOP
    PERFORM acct_file_sales_tax(m, (m + interval '1 month')::date + 17, (SELECT id FROM acct_accounts WHERE code = '1000'),
      'DR15-' || to_char(m, 'YYYYMM') || '-' || lpad((floor(acct_rnd('dr' || m) * 899999) + 100000)::text, 6, '0'), true);
    SELECT entry_id INTO v_entry FROM acct_tax_filings WHERE period_start = m;
    IF v_entry IS NOT NULL THEN
      SELECT sum(credit) INTO v_amt FROM acct_entry_lines l JOIN acct_accounts a ON a.id = l.account_id WHERE l.entry_id = v_entry AND a.code = '1000';
      PERFORM acct_demo_txn('1000', (m + interval '1 month')::date + 18, 'FL DEPT REVENUE SALES TAX', -v_amt, v_entry);
    END IF;
    m := (m + interval '1 month')::date;
  END LOOP;

  -- completed reconciliations through August 2026
  FOR acc IN SELECT id, code, type FROM acct_accounts WHERE code IN ('1000','1010','1020','2100') LOOP
    v_beg := 0;
    m := DATE '2024-01-01';
    WHILE m <= DATE '2026-08-01' AND m < date_trunc('month', current_date)::date LOOP
      v_end := (m + interval '1 month - 1 day')::date;
      SELECT coalesce(sum(CASE WHEN acc.type = 'liability' THEN l.credit - l.debit ELSE l.debit - l.credit END), 0) INTO v_bal
      FROM acct_entry_lines l JOIN acct_entries e ON e.id = l.entry_id WHERE l.account_id = acc.id AND e.entry_date <= v_end;
      INSERT INTO acct_reconciliations(account_id, statement_date, beginning_balance, statement_balance, status, completed_at, is_demo)
      VALUES (acc.id, v_end, v_beg, v_bal, 'completed', v_end + 9, true) RETURNING id INTO v_recon;
      INSERT INTO acct_recon_items(reconciliation_id, line_id)
      SELECT v_recon, l.id FROM acct_entry_lines l JOIN acct_entries e ON e.id = l.entry_id
      WHERE l.account_id = acc.id AND e.entry_date <= v_end AND NOT EXISTS (SELECT 1 FROM acct_recon_items ri WHERE ri.line_id = l.id);
      v_beg := v_bal;
      m := (m + interval '1 month')::date;
    END LOOP;
  END LOOP;

  -- bank rules
  INSERT INTO acct_bank_rules(match_text, account_id, vendor_id)
  SELECT x.t, (SELECT id FROM acct_accounts WHERE code = x.c), (SELECT id FROM acct_vendors WHERE is_demo AND name = x.v)
  FROM (VALUES ('SHELL','6300','Shell Fleet'), ('RACETRAC','6300','RaceTrac'), ('SUNPASS','6310',NULL), ('SERVICE FEE','6850',NULL),
               ('HOME DEPOT','5200','Home Depot Pro'), ('GOOGLE','6600','Google Ads'), ('AMAZON','6700','Amazon Business'),
               ('TECO','6210','TECO Energy'), ('INTEREST','4800',NULL)) AS x(t, c, v);

  -- 2026 budget from 2025 actuals plus growth
  INSERT INTO acct_budgets(fiscal_year, account_id, month, amount)
  SELECT 2026, a.id, mo,
    round((0.5 * coalesce(sm.amt, 0) + 0.5 * coalesce(av.amt, 0)) * CASE WHEN a.type = 'income' THEN 1.12 ELSE 1.06 END, -1)
  FROM acct_accounts a CROSS JOIN generate_series(1, 12) mo
  LEFT JOIN LATERAL (SELECT sum(CASE WHEN a.type = 'income' THEN l.credit - l.debit ELSE l.debit - l.credit END) amt
    FROM acct_entry_lines l JOIN acct_entries e ON e.id = l.entry_id
    WHERE l.account_id = a.id AND e.entry_date BETWEEN make_date(2025, mo, 1) AND (make_date(2025, mo, 1) + interval '1 month - 1 day')::date) sm ON true
  LEFT JOIN LATERAL (SELECT sum(CASE WHEN a.type = 'income' THEN l.credit - l.debit ELSE l.debit - l.credit END) / 12 amt
    FROM acct_entry_lines l JOIN acct_entries e ON e.id = l.entry_id
    WHERE l.account_id = a.id AND e.entry_date BETWEEN DATE '2025-01-01' AND DATE '2025-12-31') av ON true
  WHERE a.type IN ('income','cogs','expense')
  ON CONFLICT DO NOTHING;
  DELETE FROM acct_budgets WHERE fiscal_year = 2026 AND amount = 0;

  -- month close history: locked through August 2026
  UPDATE acct_periods SET status = 'locked', locked_by = 'Office Manager',
    locked_at = ((period_start + interval '1 month')::date + 12)::timestamptz,
    checklist = '{"bank_reconciled":true,"card_reconciled":true,"deposits_cleared":true,"bills_entered":true,"payroll_posted":true,"sales_tax_filed":true,"reviewed":true}'::jsonb
  WHERE period_start <= DATE '2026-08-01';
  INSERT INTO acct_period_events(period_start, action, reason, actor, created_at)
  SELECT period_start, 'locked', 'Month closed', 'Office Manager', locked_at FROM acct_periods WHERE status = 'locked';
  INSERT INTO acct_period_events(period_start, action, reason, actor, created_at) VALUES
    (DATE '2026-03-01', 'unlocked', 'Reclass fuel receipt that was posted to meals', 'Office Manager', TIMESTAMPTZ '2026-05-06 10:14'),
    (DATE '2026-03-01', 'locked', 'Month closed again after correction', 'Office Manager', TIMESTAMPTZ '2026-05-06 10:31'),
    (DATE '2024-12-01', 'year_closed', 'Year-end close: profit moved to Retained Earnings', 'Office Manager', TIMESTAMPTZ '2025-02-14 16:00'),
    (DATE '2025-12-01', 'year_closed', 'Year-end close: profit moved to Retained Earnings', 'Office Manager', TIMESTAMPTZ '2026-02-12 15:20');
  UPDATE acct_periods SET checklist = '{"bank_reconciled":true,"payroll_posted":true,"bills_entered":true}'::jsonb WHERE period_start = DATE '2026-09-01';
END $$;

CREATE OR REPLACE FUNCTION acct_reset_demo() RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_counts jsonb;
BEGIN
  PERFORM set_config('acct.quiet', 'on', true);
  PERFORM set_config('acct.bypass_lock', 'on', true);
  DELETE FROM acct_bank_txns WHERE is_demo;
  DELETE FROM acct_reconciliations WHERE is_demo;
  DELETE FROM acct_tax_filings WHERE is_demo;
  DELETE FROM acct_bank_rules;
  DELETE FROM acct_budgets;
  DELETE FROM acct_bill_payments WHERE is_demo OR vendor_id IN (SELECT id FROM acct_vendors WHERE is_demo);
  DELETE FROM acct_bills WHERE is_demo OR vendor_id IN (SELECT id FROM acct_vendors WHERE is_demo);
  DELETE FROM acct_entries WHERE is_demo OR vendor_id IN (SELECT id FROM acct_vendors WHERE is_demo);
  DELETE FROM acct_recurring WHERE is_demo;
  UPDATE acct_entry_lines SET vendor_id = NULL WHERE vendor_id IN (SELECT id FROM acct_vendors WHERE is_demo);
  DELETE FROM acct_vendors WHERE is_demo;
  DELETE FROM acct_period_events;
  PERFORM acct_sync_workhorse();
  PERFORM acct_seed_demo();
  INSERT INTO acct_audit_log(action, object_type, summary, actor) VALUES ('reset', 'sample_data', 'Sample accounting data was reset', 'Staff');
  SELECT jsonb_build_object('entries', (SELECT count(*) FROM acct_entries), 'bills', (SELECT count(*) FROM acct_bills), 'bank_items', (SELECT count(*) FROM acct_bank_txns))
  INTO v_counts;
  RETURN v_counts;
END $$;

GRANT EXECUTE ON FUNCTION acct_rnd(text), acct_seed_demo(), acct_demo_txn(text, date, text, numeric, uuid),
  acct_demo_bill(uuid, date, numeric, text, int, text, uuid, int), acct_demo_card(uuid, date, numeric, text), acct_reset_demo()
TO anon, authenticated;
