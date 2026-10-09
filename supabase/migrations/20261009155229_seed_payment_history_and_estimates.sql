/*
# Seed two years of payment history and a year of estimates (demo data)

## Plain-English summary
Adds realistic historical billing data so date-range filtering on the Transactions,
Invoices and Estimates pages has meaningful numbers to show.

## What is added
1. About 400 invoices (numbers INV-60001 and up) spread over the last 24 months,
   weighted toward recent months. Each gets one line item.
   - Most are fully paid; roughly 10% were paid in two installments.
   - About 6% are partially paid (status `partial`) with a remaining balance.
2. One or two payment transactions per invoice (numbers TXN-50001 and up), dated
   after the invoice, with a mix of credit card, ACH, check, cash and wire.
3. A handful of refund transactions (transaction_type `refund`) against paid invoices.
4. 60 estimates (numbers EST-H-0001 to EST-H-0060) over the past 12 months in draft,
   sent, approved, declined and expired states, each with one line item.

## Modified tables
- None structurally. Rows inserted into invoices, invoice_line_items, transactions,
  estimates and estimate_line_items. Date indexes added for faster range filtering.

## Security
- No changes to RLS or policies.

## Important notes
1. The demo batch is identifiable by its number ranges (INV-6xxxx, TXN-5xxxx, EST-H-xxxx).
2. Re-running is safe: the block exits early if INV-60001 already exists.
3. Numeric invoice/transaction numbers keep the app's "next number" logic working.
*/

DO $$
DECLARE
  comp_ids uuid[];
  n_comp int;
  i int;
  inv_id uuid;
  comp uuid;
  site uuid;
  pay_date date;
  inv_date date;
  kind float;
  amt numeric;
  descr text;
  method text;
  r float;
  txn_seq int := 50001;
  partial boolean;
  split boolean;
  paid numeric;
  first_amt numeric;
  est_date date;
  est_status text;
  est_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-60001') THEN
    RETURN;
  END IF;

  PERFORM setseed(0.4242);
  SELECT array_agg(id ORDER BY name) INTO comp_ids FROM companies WHERE parent_company_id IS NULL;
  n_comp := array_length(comp_ids, 1);

  FOR i IN 1..400 LOOP
    comp := comp_ids[1 + floor(random() * n_comp)::int];
    SELECT id INTO site FROM sites WHERE company_id = comp ORDER BY random() LIMIT 1;

    pay_date := current_date - floor(730 * power(random(), 1.5))::int;
    inv_date := pay_date - (3 + floor(random() * 35)::int);

    kind := random();
    IF kind < 0.25 THEN
      amt := round((39 + random() * 110)::numeric, 2);
      descr := (ARRAY['Monthly alarm monitoring','Quarterly monitoring service','Cellular communicator service','Video monitoring plan'])[1 + floor(random()*4)::int];
    ELSIF kind < 0.65 THEN
      amt := round((150 + random() * 1650)::numeric, 2);
      descr := (ARRAY['Service call - troubleshooting','Panel battery replacement','Annual fire alarm inspection','Sensor replacement and testing','Camera repair service','Access control service visit'])[1 + floor(random()*6)::int];
    ELSIF kind < 0.90 THEN
      amt := round((1500 + random() * 7500)::numeric, 2);
      descr := (ARRAY['Intrusion system installation','Camera system upgrade','Access control installation','Smart home automation package','Network and WiFi installation'])[1 + floor(random()*5)::int];
    ELSE
      amt := round((9000 + random() * 29000)::numeric, 2);
      descr := (ARRAY['Commercial fire alarm system install','Enterprise video surveillance project','Multi-door access control project','Whole-building integration project'])[1 + floor(random()*4)::int];
    END IF;

    r := random();
    IF amt > 9000 AND r < 0.45 THEN method := 'wire';
    ELSIF r < 0.40 THEN method := 'credit_card';
    ELSIF r < 0.68 THEN method := 'ACH';
    ELSIF r < 0.90 THEN method := 'check';
    ELSIF r < 0.95 THEN method := 'cash';
    ELSE method := 'wire';
    END IF;

    partial := random() < 0.06;
    split := NOT partial AND random() < 0.10;
    paid := CASE WHEN partial THEN round((amt * (0.3 + random() * 0.4))::numeric, 2) ELSE amt END;

    INSERT INTO invoices (invoice_number, company_id, site_id, status, invoice_date, due_date,
      subtotal, tax, total, amount_paid, balance_due, notes, terms, created_at, updated_at)
    VALUES ('INV-' || (60000 + i), comp, site,
      CASE WHEN partial THEN 'partial' ELSE 'paid' END,
      inv_date, inv_date + 30, amt, 0, amt, paid, amt - paid, descr, 'Net 30',
      inv_date::timestamptz + interval '10 hours', pay_date::timestamptz + interval '10 hours')
    RETURNING id INTO inv_id;

    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order, created_at)
    VALUES (inv_id, descr, 1, amt, amt, 0, inv_date::timestamptz + interval '10 hours');

    IF split THEN
      first_amt := round(amt * 0.5, 2);
      INSERT INTO transactions (transaction_number, company_id, invoice_id, transaction_type, payment_method,
        amount, transaction_date, reference_number, created_at, updated_at)
      VALUES ('TXN-' || txn_seq, comp, inv_id, 'payment', method, first_amt, pay_date - 14,
        CASE method WHEN 'check' THEN 'CHK-' || (1000 + floor(random()*9000)::int)
                    WHEN 'credit_card' THEN '****' || lpad(floor(random()*10000)::text, 4, '0')
                    ELSE upper(left(method, 3)) || '-' || (100000 + floor(random()*900000)::int) END,
        (pay_date - 14)::timestamptz + interval '11 hours', (pay_date - 14)::timestamptz + interval '11 hours');
      txn_seq := txn_seq + 1;
      paid := amt - first_amt;
    END IF;

    INSERT INTO transactions (transaction_number, company_id, invoice_id, transaction_type, payment_method,
      amount, transaction_date, reference_number, created_at, updated_at)
    VALUES ('TXN-' || txn_seq, comp, inv_id, 'payment', method, paid, pay_date,
      CASE method WHEN 'check' THEN 'CHK-' || (1000 + floor(random()*9000)::int)
                  WHEN 'credit_card' THEN '****' || lpad(floor(random()*10000)::text, 4, '0')
                  ELSE upper(left(method, 3)) || '-' || (100000 + floor(random()*900000)::int) END,
      pay_date::timestamptz + interval '11 hours', pay_date::timestamptz + interval '11 hours');
    txn_seq := txn_seq + 1;

    IF NOT partial AND amt < 2000 AND random() < 0.03 THEN
      INSERT INTO transactions (transaction_number, company_id, invoice_id, transaction_type, payment_method,
        amount, transaction_date, reference_number, notes, created_at, updated_at)
      VALUES ('TXN-' || txn_seq, comp, inv_id, 'refund', method, round((amt * (0.1 + random() * 0.4))::numeric, 2),
        least(pay_date + 7, current_date), 'RFD-' || (1000 + i), 'Partial refund - service credit',
        least(pay_date + 7, current_date)::timestamptz + interval '12 hours',
        least(pay_date + 7, current_date)::timestamptz + interval '12 hours');
      txn_seq := txn_seq + 1;
    END IF;
  END LOOP;

  FOR i IN 1..60 LOOP
    comp := comp_ids[1 + floor(random() * n_comp)::int];
    SELECT id INTO site FROM sites WHERE company_id = comp ORDER BY random() LIMIT 1;
    est_date := current_date - floor(365 * random())::int;
    kind := random();
    IF kind < 0.35 THEN
      amt := round((400 + random() * 2600)::numeric, 2);
      descr := (ARRAY['Sensor and keypad upgrade','Doorbell camera add-on','Smoke detector replacement','Thermostat integration'])[1 + floor(random()*4)::int];
    ELSIF kind < 0.85 THEN
      amt := round((3000 + random() * 9000)::numeric, 2);
      descr := (ARRAY['Camera system proposal','Access control proposal','Intrusion system install','Home automation package'])[1 + floor(random()*4)::int];
    ELSE
      amt := round((12000 + random() * 30000)::numeric, 2);
      descr := (ARRAY['Commercial fire alarm proposal','Campus video surveillance proposal','Building-wide access control proposal'])[1 + floor(random()*3)::int];
    END IF;

    r := random();
    IF current_date - est_date < 21 THEN
      est_status := CASE WHEN r < 0.35 THEN 'draft' WHEN r < 0.8 THEN 'sent' ELSE 'approved' END;
    ELSE
      est_status := CASE WHEN r < 0.08 THEN 'draft' WHEN r < 0.22 THEN 'sent' WHEN r < 0.62 THEN 'approved' WHEN r < 0.82 THEN 'declined' ELSE 'expired' END;
    END IF;

    INSERT INTO estimates (estimate_number, company_id, site_id, status, estimate_date, expiration_date,
      subtotal, tax, total, notes, terms, sent_at, accepted_at, declined_at, declined_reason, viewed_at,
      created_at, updated_at)
    VALUES ('EST-H-' || lpad(i::text, 4, '0'), comp, site, est_status, est_date, est_date + 30,
      amt, 0, amt, descr, '50% deposit, balance due on completion',
      CASE WHEN est_status <> 'draft' THEN est_date::timestamptz + interval '14 hours' END,
      CASE WHEN est_status = 'approved' THEN (est_date + 3 + floor(random()*10)::int)::timestamptz + interval '15 hours' END,
      CASE WHEN est_status = 'declined' THEN (est_date + 4 + floor(random()*12)::int)::timestamptz + interval '15 hours' END,
      CASE WHEN est_status = 'declined' THEN (ARRAY['Went with another vendor','Budget constraints','Project postponed'])[1 + floor(random()*3)::int] END,
      CASE WHEN est_status IN ('approved','declined','expired') THEN (est_date + 1)::timestamptz + interval '9 hours' END,
      est_date::timestamptz + interval '9 hours', est_date::timestamptz + interval '9 hours')
    RETURNING id INTO est_id;

    INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, total, sort_order, created_at)
    VALUES (est_id, descr, 1, amt, amt, 0, est_date::timestamptz + interval '9 hours');
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices (invoice_date);
CREATE INDEX IF NOT EXISTS idx_estimates_estimate_date ON estimates (estimate_date);
