/*
# Accounting portal - automatic posting from WorkHorse

Plain English: WorkHorse invoices, payments, merchant fees, product costs and sales commissions are turned
into balanced journal entries automatically. Running the sync again only changes what changed. Anything
whose month is locked is left alone; new items dated in a locked month land on the first day of the
next open month and are flagged.

1. Modified tables
- acct_entries.fingerprint (text): a hash of the entry content so re-syncing can skip unchanged entries.

2. New functions
- acct_ensure_periods(): makes sure a month row exists from Jan 2024 through the current month.
- acct_first_open_date(d): first day of the first unlocked month on/after d.
- acct_income_code(description, product_id, is_plan): which income account an invoice line belongs in.
- acct_post(...): create/update/remove one automatic entry from a list of lines (signed amounts allowed).
- acct_sync_workhorse(): posts invoices, product cost, payments (in-office and online), merchant fees,
  refunds and commissions. Returns counts of what was created/updated/left in locked months.

3. Security
- Functions run with the caller's rights; the caller (anon) already has access to the tables they touch.
*/

ALTER TABLE acct_entries ADD COLUMN IF NOT EXISTS fingerprint text;

CREATE OR REPLACE FUNCTION acct_ensure_periods() RETURNS void
LANGUAGE sql SET search_path = public AS $$
  INSERT INTO acct_periods(period_start)
  SELECT generate_series(DATE '2024-01-01', date_trunc('month', current_date)::date + interval '2 months', interval '1 month')::date
  ON CONFLICT DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION acct_first_open_date(p_date date) RETURNS date
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v date := date_trunc('month', p_date)::date; i int := 0;
BEGIN
  WHILE acct_is_locked(v) AND i < 240 LOOP
    v := (v + interval '1 month')::date; i := i + 1;
  END LOOP;
  IF v = date_trunc('month', p_date)::date THEN RETURN p_date; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION acct_income_code(p_desc text, p_product uuid, p_plan boolean) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_plan THEN '4200'
    WHEN p_product IS NOT NULL THEN '4000'
    WHEN coalesce(p_desc,'') ~* '^labor' THEN '4100'
    WHEN coalesce(p_desc,'') ~* '(monitor|care \(|communicator|subscription|\((monthly|quarterly|annual|semiannual)\)|add-on|service plan)' THEN '4200'
    WHEN coalesce(p_desc,'') ~* '(install|project|system|package|upgrade|integration)' THEN '4000'
    ELSE '4100' END;
$$;

CREATE OR REPLACE FUNCTION acct_post(
  p_type text, p_key text, p_source_id uuid, p_ref text, p_date date, p_memo text,
  p_company uuid, p_lines jsonb, p_demo boolean DEFAULT false, p_vendor uuid DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_lines jsonb; v_fp text; v_ex acct_entries%ROWTYPE; v_found boolean;
  v_date date := p_date; v_moved boolean := false; v_id uuid; v_result text;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'a', l->>'a',
      'd', CASE WHEN amt > 0 THEN amt ELSE 0 END,
      'c', CASE WHEN amt < 0 THEN -amt ELSE 0 END,
      'm', coalesce(l->>'m', ''),
      'co', coalesce(l->>'co', p_company::text)) ORDER BY ord), '[]'::jsonb)
  INTO v_lines
  FROM (
    SELECT l, ord, round(coalesce((l->>'d')::numeric, 0) - coalesce((l->>'c')::numeric, 0), 2) AS amt
    FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(l, ord)
  ) x WHERE amt <> 0;

  v_fp := md5(p_date::text || '|' || coalesce(p_memo, '') || '|' || v_lines::text);

  SELECT * INTO v_ex FROM acct_entries WHERE source_type = p_type AND source_key = p_key;
  v_found := FOUND;

  IF v_found THEN
    IF v_ex.fingerprint = v_fp THEN RETURN 'unchanged'; END IF;
    IF acct_is_locked(v_ex.entry_date) THEN RETURN 'locked'; END IF;
    IF jsonb_array_length(v_lines) = 0 THEN
      DELETE FROM acct_entries WHERE id = v_ex.id;
      RETURN 'removed';
    END IF;
  ELSIF jsonb_array_length(v_lines) = 0 THEN
    RETURN 'skipped';
  END IF;

  IF acct_is_locked(v_date) THEN
    v_date := acct_first_open_date(v_date);
    v_moved := true;
  END IF;

  IF v_found THEN
    v_id := v_ex.id;
    DELETE FROM acct_entry_lines WHERE entry_id = v_id;
    UPDATE acct_entries SET entry_date = v_date, memo = p_memo, source_ref = p_ref, source_id = p_source_id,
      company_id = p_company, vendor_id = p_vendor, fingerprint = v_fp,
      posted_from_locked = v_moved, original_date = CASE WHEN v_moved THEN p_date END
    WHERE id = v_id;
    v_result := 'updated';
  ELSE
    INSERT INTO acct_entries(entry_date, memo, source_type, source_id, source_key, source_ref, company_id, vendor_id,
      posted_from_locked, original_date, is_demo, created_by, fingerprint)
    VALUES (v_date, p_memo, p_type, p_source_id, p_key, p_ref, p_company, p_vendor,
      v_moved, CASE WHEN v_moved THEN p_date END, p_demo, 'WorkHorse', v_fp)
    RETURNING id INTO v_id;
    v_result := CASE WHEN v_moved THEN 'moved' ELSE 'created' END;
  END IF;

  INSERT INTO acct_entry_lines(entry_id, account_id, debit, credit, description, company_id, vendor_id, sort_order)
  SELECT v_id, a.id, (l->>'d')::numeric, (l->>'c')::numeric, l->>'m', nullif(l->>'co', '')::uuid, p_vendor, ord::int
  FROM jsonb_array_elements(v_lines) WITH ORDINALITY AS t(l, ord)
  JOIN acct_accounts a ON a.code = l->>'a';

  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION acct_sync_workhorse() RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  r record; v_lines jsonb; v_res text; v_disc numeric; v_line_sum numeric; v_cost numeric; v_ar numeric;
  v_counts jsonb := '{"created":0,"updated":0,"moved":0,"locked":0,"removed":0}'::jsonb;
BEGIN
  PERFORM set_config('acct.quiet', 'on', true);
  PERFORM acct_ensure_periods();

  -- Invoices + product cost
  FOR r IN
    SELECT i.*, c.name AS company_name FROM invoices i LEFT JOIN companies c ON c.id = i.company_id
  LOOP
    IF r.status IN ('draft','void') OR r.invoice_date IS NULL THEN
      v_res := acct_post('invoice', r.id::text, r.id, r.invoice_number, coalesce(r.invoice_date, current_date), '', r.company_id, '[]'::jsonb);
      IF v_res <> 'skipped' AND v_res <> 'unchanged' THEN v_counts := jsonb_set(v_counts, ARRAY[v_res], to_jsonb((v_counts->>v_res)::int + 1)); END IF;
      v_res := acct_post('cogs', r.id::text, r.id, r.invoice_number, coalesce(r.invoice_date, current_date), '', r.company_id, '[]'::jsonb);
      CONTINUE;
    END IF;

    v_disc := CASE WHEN coalesce(r.discount_type, 'flat') = 'percentage' THEN round(coalesce(r.subtotal,0) * coalesce(r.discount,0) / 100, 2) ELSE coalesce(r.discount, 0) END;

    SELECT coalesce(jsonb_agg(jsonb_build_object('a', code, 'c', amt, 'm', label)), '[]'::jsonb), coalesce(sum(amt), 0)
    INTO v_lines, v_line_sum
    FROM (
      SELECT acct_income_code(li.description, li.product_id, r.sp_agreement_id IS NOT NULL) AS code,
             sum(li.total) AS amt,
             min(a.name) AS label
      FROM invoice_line_items li
      JOIN acct_accounts a ON a.code = acct_income_code(li.description, li.product_id, r.sp_agreement_id IS NOT NULL)
      WHERE li.invoice_id = r.id
      GROUP BY 1
    ) x;

    IF round(coalesce(r.subtotal, 0) - v_line_sum, 2) <> 0 THEN
      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'a', CASE WHEN r.sp_agreement_id IS NOT NULL THEN '4200' ELSE '4100' END,
        'c', round(coalesce(r.subtotal, 0) - v_line_sum, 2), 'm', 'Invoice amount'));
    END IF;

    v_ar := coalesce(r.subtotal, 0) - v_disc + coalesce(r.tax, 0) + coalesce(r.surcharge_amount, 0);
    v_lines := jsonb_build_array(jsonb_build_object('a', '1100', 'd', v_ar, 'm', 'Amount owed by customer'))
      || CASE WHEN v_disc <> 0 THEN jsonb_build_array(jsonb_build_object('a', '4900', 'd', v_disc, 'm', 'Discount')) ELSE '[]'::jsonb END
      || v_lines
      || jsonb_build_array(
           jsonb_build_object('a', '2200', 'c', coalesce(r.tax, 0), 'm', 'Florida sales tax' || coalesce(' - ' || r.tax_county || ' County', '')),
           jsonb_build_object('a', '4300', 'c', coalesce(r.surcharge_amount, 0), 'm', 'Card surcharge'));

    v_res := acct_post('invoice', r.id::text, r.id, r.invoice_number, r.invoice_date,
      'Invoice ' || r.invoice_number || coalesce(' - ' || r.company_name, ''), r.company_id, v_lines);
    IF v_res NOT IN ('skipped','unchanged') THEN v_counts := jsonb_set(v_counts, ARRAY[v_res], to_jsonb((v_counts->>v_res)::int + 1)); END IF;

    SELECT coalesce(sum(li.quantity * coalesce(li.unit_cost, p.cost, 0)), 0) INTO v_cost
    FROM invoice_line_items li LEFT JOIN products p ON p.id = li.product_id WHERE li.invoice_id = r.id;
    v_res := acct_post('cogs', r.id::text, r.id, r.invoice_number, r.invoice_date,
      'Cost of goods - ' || r.invoice_number, r.company_id,
      jsonb_build_array(jsonb_build_object('a', '5000', 'd', v_cost, 'm', 'Equipment used on job'), jsonb_build_object('a', '1200', 'c', v_cost, 'm', 'Out of inventory')));
    IF v_res NOT IN ('skipped','unchanged') THEN v_counts := jsonb_set(v_counts, ARRAY[v_res], to_jsonb((v_counts->>v_res)::int + 1)); END IF;
  END LOOP;

  -- In-office payments and refunds
  FOR r IN
    SELECT t.*, i.invoice_number, c.name AS company_name FROM transactions t
    LEFT JOIN invoices i ON i.id = t.invoice_id LEFT JOIN companies c ON c.id = t.company_id
  LOOP
    IF r.transaction_type = 'refund' THEN
      v_lines := jsonb_build_array(
        jsonb_build_object('a', '4900', 'd', r.amount, 'm', 'Refund to customer'),
        jsonb_build_object('a', '1000', 'c', r.amount, 'm', 'Refund paid'));
    ELSE
      v_lines := jsonb_build_array(
        jsonb_build_object('a', '1050', 'd', r.amount, 'm', 'Payment received, not yet deposited'),
        jsonb_build_object('a', '1100', 'c', r.amount, 'm', 'Applied to ' || coalesce(r.invoice_number, 'account')),
        jsonb_build_object('a', '6100', 'd', coalesce(r.merchant_fee, 0), 'm', 'Processing fee'),
        jsonb_build_object('a', '1050', 'c', coalesce(r.merchant_fee, 0), 'm', 'Fee withheld by processor'));
    END IF;
    v_res := acct_post('payment', r.id::text, r.id, r.transaction_number, r.transaction_date,
      CASE WHEN r.transaction_type = 'refund' THEN 'Refund ' ELSE 'Payment ' END || coalesce(r.transaction_number, '') || coalesce(' - ' || r.company_name, ''),
      r.company_id, v_lines);
    IF v_res NOT IN ('skipped','unchanged') THEN v_counts := jsonb_set(v_counts, ARRAY[v_res], to_jsonb((v_counts->>v_res)::int + 1)); END IF;
  END LOOP;

  -- Online (portal) payments
  FOR r IN
    SELECT p.*, i.invoice_number, c.name AS company_name FROM portal_payments p
    LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN companies c ON c.id = p.company_id
  LOOP
    v_lines := jsonb_build_array(
      jsonb_build_object('a', '1050', 'd', r.amount, 'm', 'Online payment, not yet deposited'),
      jsonb_build_object('a', '1100', 'c', r.amount, 'm', 'Applied to ' || coalesce(r.invoice_number, 'account')),
      jsonb_build_object('a', '6100', 'd', coalesce(r.merchant_fee, 0), 'm', 'Processing fee'),
      jsonb_build_object('a', '1050', 'c', coalesce(r.merchant_fee, 0), 'm', 'Fee withheld by processor'));
    v_res := acct_post('portal_payment', r.id::text, r.id, r.reference_number, (r.paid_at AT TIME ZONE 'America/New_York')::date,
      'Online payment' || coalesce(' - ' || r.company_name, ''), r.company_id, v_lines);
    IF v_res NOT IN ('skipped','unchanged') THEN v_counts := jsonb_set(v_counts, ARRAY[v_res], to_jsonb((v_counts->>v_res)::int + 1)); END IF;
  END LOOP;

  -- Sales commissions (paid through payroll)
  FOR r IN
    SELECT d.id, d.title, d.company_id, d.commission_amount, d.commission_payroll_date FROM deals d
    WHERE coalesce(d.commission_amount, 0) > 0 AND d.commission_payroll_date IS NOT NULL
  LOOP
    v_res := acct_post('commission', r.id::text, r.id, NULL, r.commission_payroll_date,
      'Sales commission - ' || coalesce(r.title, 'deal'), r.company_id,
      jsonb_build_array(jsonb_build_object('a', '6050', 'd', r.commission_amount, 'm', 'Commission'), jsonb_build_object('a', '1010', 'c', r.commission_amount, 'm', 'Paid with payroll')));
    IF v_res NOT IN ('skipped','unchanged') THEN v_counts := jsonb_set(v_counts, ARRAY[v_res], to_jsonb((v_counts->>v_res)::int + 1)); END IF;
  END LOOP;

  -- Remove entries whose WorkHorse record was deleted (only in open months)
  FOR r IN
    SELECT e.source_type, e.source_key, e.entry_date FROM acct_entries e
    WHERE (e.source_type IN ('invoice','cogs') AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = e.source_id))
       OR (e.source_type = 'payment' AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.id = e.source_id))
       OR (e.source_type = 'portal_payment' AND NOT EXISTS (SELECT 1 FROM portal_payments p WHERE p.id = e.source_id))
  LOOP
    v_res := acct_post(r.source_type, r.source_key, NULL, NULL, r.entry_date, '', NULL, '[]'::jsonb);
    IF v_res NOT IN ('skipped','unchanged') THEN v_counts := jsonb_set(v_counts, ARRAY[v_res], to_jsonb((v_counts->>v_res)::int + 1)); END IF;
  END LOOP;

  IF (v_counts->>'created')::int + (v_counts->>'updated')::int + (v_counts->>'moved')::int + (v_counts->>'removed')::int > 0 THEN
    INSERT INTO acct_audit_log(action, object_type, summary, actor)
    VALUES ('synced', 'workhorse', format('Synced from WorkHorse: %s new, %s updated, %s moved out of locked months, %s removed',
      v_counts->>'created', v_counts->>'updated', v_counts->>'moved', v_counts->>'removed'), 'WorkHorse');
  END IF;

  INSERT INTO app_settings(key, value) VALUES ('acct_last_sync', now()::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN v_counts;
END $$;

GRANT EXECUTE ON FUNCTION acct_sync_workhorse() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION acct_ensure_periods() TO anon, authenticated;
