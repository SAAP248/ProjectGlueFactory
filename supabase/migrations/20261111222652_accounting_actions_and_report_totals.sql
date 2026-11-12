/*
# Accounting portal - actions (entries, locking, bills, banking, tax filing, report totals)

Plain English: the server-side actions the accounting portal buttons call. Each one keeps the books
balanced and respects locked months.

1. Functions
- acct_post (replaced, adds an "actor" argument): accounts may be given by code or by id.
- acct_save_entry: create or edit a manual journal entry (must balance).
- acct_set_period_status / acct_close_year: lock and unlock months (reason required to unlock), year-end.
- acct_save_bill / acct_void_bill / acct_pay_bills / acct_apply_vendor_credit: payables.
- acct_sync_purchase_orders: received WorkHorse purchase orders become bills automatically.
- acct_undeposited_payments / acct_bank_deposit / acct_bank_add / acct_bank_match / acct_bank_undo: banking.
- acct_write_off_invoice: bad debt write-off for an unpaid invoice.
- acct_file_sales_tax: records a Florida sales tax return and payment, including the timely-filing allowance.
- acct_run_recurring: posts repeating entries that are due.
- acct_account_totals / acct_monthly_totals / acct_customer_profit: totals used by reports.

2. Security
- Functions run with the caller's rights (no SECURITY DEFINER). EXECUTE granted to anon + authenticated
  because the app has no sign-in and the user asked that anyone can use the accounting portal.

3. Notes
- The old 10-argument acct_post is dropped (function only, no data) so calls are not ambiguous.
*/

DROP FUNCTION IF EXISTS acct_post(text, text, uuid, text, date, text, uuid, jsonb, boolean, uuid);

CREATE OR REPLACE FUNCTION acct_post(
  p_type text, p_key text, p_source_id uuid, p_ref text, p_date date, p_memo text,
  p_company uuid, p_lines jsonb, p_demo boolean DEFAULT false, p_vendor uuid DEFAULT NULL, p_actor text DEFAULT 'WorkHorse'
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
      v_moved, CASE WHEN v_moved THEN p_date END, p_demo, coalesce(p_actor, 'WorkHorse'), v_fp)
    RETURNING id INTO v_id;
    v_result := CASE WHEN v_moved THEN 'moved' ELSE 'created' END;
  END IF;

  INSERT INTO acct_entry_lines(entry_id, account_id, debit, credit, description, company_id, vendor_id, sort_order)
  SELECT v_id, a.id, (l->>'d')::numeric, (l->>'c')::numeric, l->>'m', nullif(l->>'co', '')::uuid, p_vendor, ord::int
  FROM jsonb_array_elements(v_lines) WITH ORDINALITY AS t(l, ord)
  JOIN acct_accounts a ON (a.code = l->>'a' OR a.id::text = l->>'a');

  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION acct_save_entry(p_entry_id uuid, p_date date, p_memo text, p_lines jsonb, p_actor text DEFAULT 'Staff')
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_id uuid; v_d numeric; v_c numeric; v_type text;
BEGIN
  SELECT coalesce(sum(round(coalesce((l->>'debit')::numeric,0),2)),0), coalesce(sum(round(coalesce((l->>'credit')::numeric,0),2)),0)
  INTO v_d, v_c FROM jsonb_array_elements(p_lines) l;
  IF v_d = 0 THEN RAISE EXCEPTION 'Add at least one amount.'; END IF;
  IF v_d <> v_c THEN RAISE EXCEPTION 'Debits (%) and credits (%) must be equal.', v_d, v_c; END IF;

  IF p_entry_id IS NULL THEN
    INSERT INTO acct_entries(entry_date, memo, source_type, created_by) VALUES (p_date, p_memo, 'manual', coalesce(p_actor,'Staff'))
    RETURNING id INTO v_id;
  ELSE
    SELECT source_type INTO v_type FROM acct_entries WHERE id = p_entry_id;
    IF v_type IS NULL THEN RAISE EXCEPTION 'Entry not found.'; END IF;
    IF v_type NOT IN ('manual','recurring') THEN RAISE EXCEPTION 'Automatic entries change when their WorkHorse record changes. Edit the record instead.'; END IF;
    v_id := p_entry_id;
    UPDATE acct_entries SET entry_date = p_date, memo = p_memo WHERE id = v_id;
    DELETE FROM acct_entry_lines WHERE entry_id = v_id;
  END IF;

  INSERT INTO acct_entry_lines(entry_id, account_id, debit, credit, description, company_id, vendor_id, sort_order)
  SELECT v_id, (l->>'account_id')::uuid, round(coalesce((l->>'debit')::numeric,0),2), round(coalesce((l->>'credit')::numeric,0),2),
         coalesce(l->>'description',''), nullif(l->>'company_id','')::uuid, nullif(l->>'vendor_id','')::uuid, ord::int
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(l, ord)
  WHERE coalesce((l->>'debit')::numeric,0) <> 0 OR coalesce((l->>'credit')::numeric,0) <> 0;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION acct_set_period_status(p_period date, p_status text, p_reason text, p_actor text DEFAULT 'Staff')
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF p_status NOT IN ('open','locked') THEN RAISE EXCEPTION 'Unknown status'; END IF;
  IF p_status = 'open' AND coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Please give a reason for unlocking this month.'; END IF;
  PERFORM acct_ensure_periods();
  INSERT INTO acct_periods(period_start) VALUES (date_trunc('month', p_period)::date) ON CONFLICT DO NOTHING;
  UPDATE acct_periods SET status = p_status,
    locked_at = CASE WHEN p_status = 'locked' THEN now() ELSE NULL END,
    locked_by = CASE WHEN p_status = 'locked' THEN coalesce(p_actor,'Staff') ELSE NULL END
  WHERE period_start = date_trunc('month', p_period)::date;
  INSERT INTO acct_period_events(period_start, action, reason, actor)
  VALUES (date_trunc('month', p_period)::date, CASE WHEN p_status = 'locked' THEN 'locked' ELSE 'unlocked' END, coalesce(p_reason,''), coalesce(p_actor,'Staff'));
  INSERT INTO acct_audit_log(action, object_type, summary, actor)
  VALUES (CASE WHEN p_status = 'locked' THEN 'locked' ELSE 'unlocked' END, 'period',
    to_char(p_period, 'FMMonth YYYY') || CASE WHEN coalesce(p_reason,'') <> '' THEN ' - ' || p_reason ELSE '' END, coalesce(p_actor,'Staff'));
END $$;

CREATE OR REPLACE FUNCTION acct_close_year(p_year int, p_actor text DEFAULT 'Staff')
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM acct_ensure_periods();
  UPDATE acct_periods SET status = 'locked', locked_at = coalesce(locked_at, now()), locked_by = coalesce(locked_by, p_actor)
  WHERE extract(year FROM period_start) = p_year;
  INSERT INTO acct_period_events(period_start, action, reason, actor)
  VALUES (make_date(p_year, 12, 1), 'year_closed', 'Year-end close: profit moved to Retained Earnings', coalesce(p_actor,'Staff'));
  INSERT INTO acct_audit_log(action, object_type, summary, actor)
  VALUES ('year_closed', 'period', 'Closed fiscal year ' || p_year, coalesce(p_actor,'Staff'));
END $$;

CREATE OR REPLACE FUNCTION acct_post_bill(p_bill_id uuid) RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE b record; v_lines jsonb; v_sign int;
BEGIN
  SELECT bl.*, v.name AS vendor_name INTO b FROM acct_bills bl JOIN acct_vendors v ON v.id = bl.vendor_id WHERE bl.id = p_bill_id;
  IF b.status = 'void' THEN
    PERFORM acct_post('bill'::text, p_bill_id::text, p_bill_id, b.bill_number, b.bill_date, ''::text, NULL::uuid, '[]'::jsonb, b.is_demo, b.vendor_id, 'Staff'::text);
    RETURN;
  END IF;
  v_sign := CASE WHEN b.kind = 'credit' THEN -1 ELSE 1 END;
  SELECT coalesce(jsonb_agg(jsonb_build_object('a', account_id::text, 'd', amount * v_sign, 'm', description, 'co', company_id) ORDER BY sort_order), '[]'::jsonb)
  INTO v_lines FROM acct_bill_lines WHERE bill_id = p_bill_id;
  v_lines := v_lines || jsonb_build_array(jsonb_build_object('a', '2000', 'c', b.total * v_sign, 'm', b.vendor_name));
  PERFORM acct_post('bill'::text, p_bill_id::text, p_bill_id, b.bill_number, b.bill_date,
    (CASE WHEN b.kind = 'credit' THEN 'Vendor credit - ' ELSE 'Bill - ' END || b.vendor_name || coalesce(' #' || b.bill_number, ''))::text,
    NULL::uuid, v_lines, b.is_demo, b.vendor_id, 'Staff'::text);
END $$;

CREATE OR REPLACE FUNCTION acct_save_bill(p jsonb) RETURNS uuid
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_id uuid; v_total numeric; v_paid numeric;
BEGIN
  SELECT coalesce(sum(round((l->>'amount')::numeric, 2)), 0) INTO v_total FROM jsonb_array_elements(p->'lines') l;
  IF v_total <= 0 THEN RAISE EXCEPTION 'A bill needs at least one line with an amount.'; END IF;
  v_id := nullif(p->>'id','')::uuid;
  IF v_id IS NULL THEN
    INSERT INTO acct_bills(vendor_id, kind, bill_number, bill_date, due_date, memo, total, purchase_order_id, is_demo)
    VALUES ((p->>'vendor_id')::uuid, coalesce(p->>'kind','bill'), p->>'bill_number', (p->>'bill_date')::date,
      coalesce(nullif(p->>'due_date','')::date, (p->>'bill_date')::date + 30), coalesce(p->>'memo',''), v_total,
      nullif(p->>'purchase_order_id','')::uuid, coalesce((p->>'is_demo')::boolean, false))
    RETURNING id INTO v_id;
  ELSE
    SELECT amount_paid INTO v_paid FROM acct_bills WHERE id = v_id;
    IF v_total < coalesce(v_paid, 0) THEN RAISE EXCEPTION 'The new total is less than what has already been paid.'; END IF;
    UPDATE acct_bills SET vendor_id = (p->>'vendor_id')::uuid, bill_number = p->>'bill_number', bill_date = (p->>'bill_date')::date,
      due_date = coalesce(nullif(p->>'due_date','')::date, (p->>'bill_date')::date + 30), memo = coalesce(p->>'memo',''), total = v_total,
      status = CASE WHEN amount_paid >= v_total THEN 'paid' WHEN amount_paid > 0 THEN 'partial' ELSE 'open' END
    WHERE id = v_id;
    DELETE FROM acct_bill_lines WHERE bill_id = v_id;
  END IF;
  INSERT INTO acct_bill_lines(bill_id, account_id, description, amount, company_id, sort_order)
  SELECT v_id, (l->>'account_id')::uuid, coalesce(l->>'description',''), round((l->>'amount')::numeric, 2), nullif(l->>'company_id','')::uuid, ord::int
  FROM jsonb_array_elements(p->'lines') WITH ORDINALITY AS t(l, ord) WHERE coalesce((l->>'amount')::numeric, 0) <> 0;
  PERFORM acct_post_bill(v_id);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION acct_void_bill(p_bill_id uuid) RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM acct_bill_payments WHERE bill_id = p_bill_id OR credit_bill_id = p_bill_id) THEN
    RAISE EXCEPTION 'This bill has payments. Remove the payments before voiding it.';
  END IF;
  UPDATE acct_bills SET status = 'void' WHERE id = p_bill_id;
  PERFORM acct_post_bill(p_bill_id);
END $$;

CREATE OR REPLACE FUNCTION acct_refresh_bill_status(p_bill_id uuid) RETURNS void
LANGUAGE sql SET search_path = public AS $$
  UPDATE acct_bills b SET amount_paid = x.paid,
    status = CASE WHEN b.status = 'void' THEN 'void' WHEN x.paid >= b.total THEN 'paid' WHEN x.paid > 0 THEN 'partial' ELSE 'open' END
  FROM (SELECT coalesce(sum(amount), 0) AS paid FROM acct_bill_payments WHERE bill_id = p_bill_id OR credit_bill_id = p_bill_id) x
  WHERE b.id = p_bill_id;
$$;

CREATE OR REPLACE FUNCTION acct_pay_bills(p jsonb) RETURNS int
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE it jsonb; b record; v_pay uuid; v_amt numeric; v_check bigint; v_n int := 0; v_bank uuid; v_method text; v_demo boolean;
BEGIN
  v_method := coalesce(p->>'method','check');
  v_bank := (p->>'bank_account_id')::uuid;
  v_check := nullif(p->>'start_check','')::bigint;
  v_demo := coalesce((p->>'is_demo')::boolean, false);
  FOR it IN SELECT * FROM jsonb_array_elements(p->'items') LOOP
    SELECT bl.*, v.name AS vendor_name INTO b FROM acct_bills bl JOIN acct_vendors v ON v.id = bl.vendor_id WHERE bl.id = (it->>'bill_id')::uuid;
    IF NOT FOUND OR b.kind <> 'bill' OR b.status IN ('paid','void') THEN CONTINUE; END IF;
    v_amt := least(round((it->>'amount')::numeric, 2), b.total - b.amount_paid);
    IF v_amt <= 0 THEN CONTINUE; END IF;
    INSERT INTO acct_bill_payments(bill_id, vendor_id, pay_date, amount, method, check_number, bank_account_id, is_demo)
    VALUES (b.id, b.vendor_id, (p->>'pay_date')::date, v_amt, v_method,
      CASE WHEN v_method = 'check' AND v_check IS NOT NULL THEN (v_check + v_n)::text END, v_bank, v_demo)
    RETURNING id INTO v_pay;
    PERFORM acct_post('bill_payment'::text, v_pay::text, v_pay, coalesce(b.bill_number, ''), (p->>'pay_date')::date,
      ('Bill payment - ' || b.vendor_name || CASE WHEN v_method = 'check' AND v_check IS NOT NULL THEN ' (check ' || (v_check + v_n) || ')' ELSE ' (' || upper(v_method) || ')' END)::text,
      NULL::uuid, jsonb_build_array(jsonb_build_object('a', '2000', 'd', v_amt, 'm', b.vendor_name), jsonb_build_object('a', v_bank::text, 'c', v_amt, 'm', 'Paid')),
      v_demo, b.vendor_id, 'Staff'::text);
    PERFORM acct_refresh_bill_status(b.id);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION acct_apply_vendor_credit(p_credit_id uuid, p_bill_id uuid, p_amount numeric) RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c record; b record; v_amt numeric;
BEGIN
  SELECT * INTO c FROM acct_bills WHERE id = p_credit_id AND kind = 'credit';
  SELECT * INTO b FROM acct_bills WHERE id = p_bill_id AND kind = 'bill';
  IF c.id IS NULL OR b.id IS NULL OR c.vendor_id <> b.vendor_id THEN RAISE EXCEPTION 'Pick a credit and a bill from the same vendor.'; END IF;
  v_amt := least(round(p_amount, 2), c.total - c.amount_paid, b.total - b.amount_paid);
  IF v_amt <= 0 THEN RAISE EXCEPTION 'Nothing left to apply.'; END IF;
  INSERT INTO acct_bill_payments(bill_id, vendor_id, pay_date, amount, method, credit_bill_id)
  VALUES (b.id, b.vendor_id, current_date, v_amt, 'credit', c.id);
  PERFORM acct_refresh_bill_status(b.id);
  PERFORM acct_refresh_bill_status(c.id);
END $$;

CREATE OR REPLACE FUNCTION acct_sync_purchase_orders() RETURNS int
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r record; v_vendor uuid; v_n int := 0; v_inv uuid; v_amt numeric;
BEGIN
  SELECT id INTO v_inv FROM acct_accounts WHERE code = '1200';
  INSERT INTO acct_vendors(name, vendor_type, distributor_id, contact_name, email, phone, address, city, state, zip, payment_terms, default_account_id, entity_type)
  SELECT d.name, 'distributor', d.id, d.contact_name, d.email, d.phone, d.address, d.city, d.state, d.zip, coalesce(d.payment_terms, 'Net 30'), v_inv, 'corporation'
  FROM distributors d WHERE NOT EXISTS (SELECT 1 FROM acct_vendors v WHERE v.distributor_id = d.id);

  FOR r IN SELECT po.* FROM purchase_orders po
    WHERE po.status IN ('received','partial','partially_received') AND po.distributor_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM acct_bills b WHERE b.purchase_order_id = po.id)
  LOOP
    SELECT id INTO v_vendor FROM acct_vendors WHERE distributor_id = r.distributor_id;
    v_amt := coalesce(nullif(r.total_amount, 0), (SELECT sum(quantity * unit_cost) FROM purchase_order_items WHERE purchase_order_id = r.id), 0);
    IF v_amt <= 0 THEN CONTINUE; END IF;
    PERFORM acct_save_bill(jsonb_build_object(
      'vendor_id', v_vendor, 'bill_number', r.po_number, 'bill_date', coalesce(r.received_date::date, r.order_date::date, current_date),
      'memo', 'From purchase order ' || r.po_number, 'purchase_order_id', r.id,
      'lines', jsonb_build_array(jsonb_build_object('account_id', v_inv, 'description', 'Inventory received on ' || r.po_number, 'amount', v_amt))));
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION acct_undeposited_payments()
RETURNS TABLE(entry_id uuid, entry_date date, memo text, source_ref text, company_name text, amount numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT e.id, e.entry_date, e.memo, e.source_ref, c.name, sum(l.debit - l.credit)
  FROM acct_entries e
  JOIN acct_entry_lines l ON l.entry_id = e.id
  JOIN acct_accounts a ON a.id = l.account_id AND a.code = '1050'
  LEFT JOIN companies c ON c.id = e.company_id
  WHERE e.source_type IN ('payment','portal_payment')
    AND NOT EXISTS (SELECT 1 FROM acct_deposit_items d WHERE d.payment_entry_id = e.id)
  GROUP BY e.id, e.entry_date, e.memo, e.source_ref, c.name
  HAVING sum(l.debit - l.credit) > 0
  ORDER BY e.entry_date;
$$;

CREATE OR REPLACE FUNCTION acct_bank_deposit(p_txn_id uuid, p_payment_entry_ids uuid[]) RETURNS uuid
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t acct_bank_txns%ROWTYPE; v_sum numeric; v_entry uuid;
BEGIN
  SELECT * INTO t FROM acct_bank_txns WHERE id = p_txn_id;
  IF NOT FOUND OR t.status <> 'pending' THEN RAISE EXCEPTION 'This bank item is already handled.'; END IF;
  SELECT coalesce(sum(u.amount), 0) INTO v_sum FROM acct_undeposited_payments() u WHERE u.entry_id = ANY(p_payment_entry_ids);
  IF round(v_sum, 2) <> round(t.amount, 2) THEN
    RAISE EXCEPTION 'Selected payments total % but the deposit is %.', v_sum, t.amount;
  END IF;
  PERFORM acct_post('deposit'::text, p_txn_id::text, p_txn_id, NULL::text, t.txn_date, ('Bank deposit - ' || t.description)::text, NULL::uuid,
    jsonb_build_array(jsonb_build_object('a', t.account_id::text, 'd', v_sum, 'm', t.description), jsonb_build_object('a', '1050', 'c', v_sum, 'm', 'Moved from undeposited funds')),
    t.is_demo, NULL::uuid, 'Staff'::text);
  SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'deposit' AND source_key = p_txn_id::text;
  INSERT INTO acct_deposit_items(deposit_entry_id, payment_entry_id, amount)
  SELECT v_entry, u.entry_id, u.amount FROM acct_undeposited_payments() u WHERE u.entry_id = ANY(p_payment_entry_ids);
  UPDATE acct_bank_txns SET status = 'added', matched_entry_id = v_entry WHERE id = p_txn_id;
  RETURN v_entry;
END $$;

CREATE OR REPLACE FUNCTION acct_bank_add(p_txn_id uuid, p_account_id uuid, p_memo text, p_vendor_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t acct_bank_txns%ROWTYPE; v_entry uuid;
BEGIN
  SELECT * INTO t FROM acct_bank_txns WHERE id = p_txn_id;
  IF NOT FOUND OR t.status <> 'pending' THEN RAISE EXCEPTION 'This bank item is already handled.'; END IF;
  PERFORM acct_post('bank'::text, p_txn_id::text, p_txn_id, NULL::text, t.txn_date, coalesce(nullif(p_memo, ''), t.description), NULL::uuid,
    jsonb_build_array(jsonb_build_object('a', t.account_id::text, 'd', t.amount, 'm', t.description), jsonb_build_object('a', p_account_id::text, 'c', t.amount, 'm', coalesce(nullif(p_memo, ''), t.description))),
    t.is_demo, p_vendor_id, 'Staff'::text);
  SELECT id INTO v_entry FROM acct_entries WHERE source_type = 'bank' AND source_key = p_txn_id::text;
  UPDATE acct_bank_txns SET status = 'added', matched_entry_id = v_entry WHERE id = p_txn_id;
  RETURN v_entry;
END $$;

CREATE OR REPLACE FUNCTION acct_bank_match(p_txn_id uuid, p_entry_id uuid) RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM acct_bank_txns WHERE matched_entry_id = p_entry_id AND id <> p_txn_id) THEN
    RAISE EXCEPTION 'That entry is already matched to another bank item.';
  END IF;
  UPDATE acct_bank_txns SET status = 'matched', matched_entry_id = p_entry_id WHERE id = p_txn_id AND status = 'pending';
END $$;

CREATE OR REPLACE FUNCTION acct_bank_undo(p_txn_id uuid) RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t acct_bank_txns%ROWTYPE;
BEGIN
  SELECT * INTO t FROM acct_bank_txns WHERE id = p_txn_id;
  UPDATE acct_bank_txns SET status = 'pending', matched_entry_id = NULL WHERE id = p_txn_id;
  IF t.status = 'added' AND t.matched_entry_id IS NOT NULL THEN
    DELETE FROM acct_deposit_items WHERE deposit_entry_id = t.matched_entry_id;
    DELETE FROM acct_entries WHERE id = t.matched_entry_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION acct_write_off_invoice(p_invoice_id uuid, p_reason text, p_date date DEFAULT current_date) RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE i record;
BEGIN
  SELECT inv.*, c.name AS company_name INTO i FROM invoices inv LEFT JOIN companies c ON c.id = inv.company_id WHERE inv.id = p_invoice_id;
  IF NOT FOUND OR coalesce(i.balance_due, 0) <= 0 THEN RAISE EXCEPTION 'This invoice has no balance to write off.'; END IF;
  PERFORM acct_post('writeoff'::text, p_invoice_id::text, p_invoice_id, i.invoice_number, p_date,
    ('Bad debt write-off - ' || i.invoice_number || coalesce(' - ' || i.company_name, '') || coalesce(' (' || nullif(p_reason, '') || ')', ''))::text,
    i.company_id, jsonb_build_array(jsonb_build_object('a', '6900', 'd', i.balance_due, 'm', coalesce(p_reason, 'Uncollectible')), jsonb_build_object('a', '1100', 'c', i.balance_due, 'm', 'Written off')),
    false, NULL::uuid, 'Staff'::text);
  UPDATE invoices SET status = 'written_off', balance_due = 0,
    notes = trim(coalesce(notes, '') || E'\nWritten off as bad debt: ' || coalesce(p_reason, '')), updated_at = now()
  WHERE id = p_invoice_id;
END $$;

CREATE OR REPLACE FUNCTION acct_file_sales_tax(p_period date, p_filed_date date, p_bank_account_id uuid, p_confirmation text, p_demo boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_start date := date_trunc('month', p_period)::date; v_end date; s record; v_allow numeric; v_due date;
BEGIN
  v_end := (v_start + interval '1 month - 1 day')::date;
  IF EXISTS (SELECT 1 FROM acct_tax_filings WHERE period_start = v_start) THEN RAISE EXCEPTION 'This month has already been filed.'; END IF;
  SELECT coalesce(sum(subtotal - CASE WHEN discount_type = 'percentage' THEN subtotal * coalesce(discount,0) / 100 ELSE coalesce(discount,0) END), 0) AS gross,
         coalesce(sum(exempt_amount), 0) AS exempt, coalesce(sum(taxable_amount), 0) AS taxable,
         coalesce(sum(tax_state_amount), 0) AS st, coalesce(sum(tax_county_amount), 0) AS co, coalesce(sum(tax_city_amount), 0) AS ci,
         coalesce(sum(tax), 0) AS total
  INTO s FROM invoices WHERE invoice_date BETWEEN v_start AND v_end AND status NOT IN ('draft','void');
  v_due := (v_start + interval '1 month')::date + 19;
  v_allow := CASE WHEN p_filed_date <= v_due THEN least(round(s.total * 0.025, 2), 30) ELSE 0 END;
  INSERT INTO acct_tax_filings(period_start, gross_sales, exempt_sales, taxable_sales, state_tax, county_tax, city_tax, total_tax,
    collection_allowance, amount_paid, filed_date, confirmation, is_demo)
  VALUES (v_start, round(s.gross, 2), round(s.exempt, 2), round(s.taxable, 2), s.st, s.co, s.ci, s.total, v_allow, s.total - v_allow, p_filed_date, p_confirmation, p_demo);
  IF s.total > 0 THEN
    PERFORM acct_post('tax_payment'::text, v_start::text, NULL::uuid, p_confirmation, p_filed_date,
      ('Florida sales tax return - ' || to_char(v_start, 'FMMonth YYYY'))::text, NULL::uuid,
      jsonb_build_array(
        jsonb_build_object('a', '2200', 'd', s.total, 'm', 'Sales tax collected'),
        jsonb_build_object('a', p_bank_account_id::text, 'c', s.total - v_allow, 'm', 'Paid to Florida DOR'),
        jsonb_build_object('a', '4800', 'c', v_allow, 'm', 'Collection allowance for filing on time')),
      p_demo, NULL::uuid, 'Staff'::text);
    UPDATE acct_tax_filings SET entry_id = (SELECT id FROM acct_entries WHERE source_type = 'tax_payment' AND source_key = v_start::text)
    WHERE period_start = v_start;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION acct_run_recurring(p_through date DEFAULT current_date) RETURNS int
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r record; v_n int := 0; v_d date; v_last date;
BEGIN
  FOR r IN SELECT * FROM acct_recurring WHERE is_active AND next_date <= p_through LOOP
    v_d := r.next_date;
    WHILE v_d <= p_through LOOP
      PERFORM acct_post('recurring'::text, r.id::text || ':' || v_d, r.id, NULL::text, v_d, coalesce(nullif(r.memo, ''), r.name), NULL::uuid, r.lines, r.is_demo, NULL::uuid, 'Repeating entry'::text);
      v_n := v_n + 1;
      v_last := v_d;
      v_d := (date_trunc('month', v_d) + interval '1 month')::date + (r.day_of_month - 1);
    END LOOP;
    UPDATE acct_recurring SET next_date = v_d, last_posted = v_last WHERE id = r.id;
  END LOOP;
  RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION acct_account_totals(p_from date, p_to date)
RETURNS TABLE(account_id uuid, debit numeric, credit numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT l.account_id, sum(l.debit), sum(l.credit)
  FROM acct_entry_lines l JOIN acct_entries e ON e.id = l.entry_id
  WHERE e.entry_date >= coalesce(p_from, DATE '1900-01-01') AND e.entry_date <= p_to
  GROUP BY l.account_id;
$$;

CREATE OR REPLACE FUNCTION acct_monthly_totals(p_from date, p_to date)
RETURNS TABLE(account_id uuid, month date, debit numeric, credit numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT l.account_id, date_trunc('month', e.entry_date)::date, sum(l.debit), sum(l.credit)
  FROM acct_entry_lines l JOIN acct_entries e ON e.id = l.entry_id
  WHERE e.entry_date BETWEEN p_from AND p_to
  GROUP BY 1, 2;
$$;

CREATE OR REPLACE FUNCTION acct_customer_profit(p_from date, p_to date)
RETURNS TABLE(company_id uuid, company_name text, income numeric, cogs numeric, fees numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT l.company_id, c.name,
    sum(CASE WHEN a.type = 'income' THEN l.credit - l.debit ELSE 0 END),
    sum(CASE WHEN a.type = 'cogs' THEN l.debit - l.credit ELSE 0 END),
    sum(CASE WHEN a.code = '6100' THEN l.debit - l.credit ELSE 0 END)
  FROM acct_entry_lines l
  JOIN acct_entries e ON e.id = l.entry_id
  JOIN acct_accounts a ON a.id = l.account_id
  JOIN companies c ON c.id = l.company_id
  WHERE e.entry_date BETWEEN p_from AND p_to AND (a.type IN ('income','cogs') OR a.code = '6100')
  GROUP BY 1, 2;
$$;

GRANT EXECUTE ON FUNCTION
  acct_save_entry(uuid, date, text, jsonb, text), acct_set_period_status(date, text, text, text), acct_close_year(int, text),
  acct_save_bill(jsonb), acct_void_bill(uuid), acct_pay_bills(jsonb), acct_apply_vendor_credit(uuid, uuid, numeric),
  acct_sync_purchase_orders(), acct_undeposited_payments(), acct_bank_deposit(uuid, uuid[]), acct_bank_add(uuid, uuid, text, uuid),
  acct_bank_match(uuid, uuid), acct_bank_undo(uuid), acct_write_off_invoice(uuid, text, date),
  acct_file_sales_tax(date, date, uuid, text, boolean), acct_run_recurring(date),
  acct_account_totals(date, date), acct_monthly_totals(date, date), acct_customer_profit(date, date)
TO anon, authenticated;
