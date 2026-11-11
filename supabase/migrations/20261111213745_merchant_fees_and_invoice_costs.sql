/*
# Merchant service fees, invoice line costs, and card surcharge

Plain English: every card or ACH payment now carries the processing fee it cost the business.
Invoice lines carry the product cost so a profit & loss can be shown per invoice. Invoices can
optionally add a card-fee surcharge that is kept separate from profit.

1. Modified Tables
- `transactions` and `portal_payments` gain:
  - `merchant_fee` (numeric) - processing fee for this payment
  - `fee_source` (text) - 'estimated' (calculated from rates), 'actual' (from processor sync) or 'manual'
  - `fee_rate_pct` / `fee_rate_flat` (numeric) - rates used when the fee was estimated, so later
    rate changes never rewrite history
  - `processor` (text, default 'csg_forte')
  - `fee_synced_at` (timestamptz) - when the actual fee was pulled from the processor
- `invoice_line_items` gains `unit_cost` (numeric, nullable). NULL means the cost is unknown.
- `invoices` gains `surcharge_enabled` (bool), `surcharge_pct` (numeric), `surcharge_amount` (numeric).

2. Settings (app_settings, inserted only if missing)
- merchant_fee_card_pct = 2.89, merchant_fee_card_flat = 0.25
- merchant_fee_ach_pct = 0, merchant_fee_ach_flat = 0.65
- merchant_surcharge_pct = 3

3. Functions / Triggers
- `merchant_fee_estimate(method, amount)` returns pct, flat and fee from current settings
  (card: credit_card/card/credit/debit; ACH: ach/echeck/bank). Other methods have no fee.
- BEFORE INSERT/UPDATE trigger on transactions and portal_payments fills an estimated fee when none
  was given, and re-estimates when amount/method change on an estimated fee. Refunds carry no fee.
- BEFORE INSERT trigger on invoice_line_items copies product cost (or matching work-order line cost)
  when unit_cost is not supplied.

4. Backfill
- Existing payments get estimated fees; existing lines get cost from linked or same-named products.

5. Security
- No policy changes; existing table policies apply to the new columns. Helper functions are
  SECURITY INVOKER with a fixed search_path.
*/

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_fee numeric(12,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee_source text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee_rate_pct numeric(6,3);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee_rate_flat numeric(8,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processor text DEFAULT 'csg_forte';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee_synced_at timestamptz;

ALTER TABLE portal_payments ADD COLUMN IF NOT EXISTS merchant_fee numeric(12,2);
ALTER TABLE portal_payments ADD COLUMN IF NOT EXISTS fee_source text;
ALTER TABLE portal_payments ADD COLUMN IF NOT EXISTS fee_rate_pct numeric(6,3);
ALTER TABLE portal_payments ADD COLUMN IF NOT EXISTS fee_rate_flat numeric(8,2);
ALTER TABLE portal_payments ADD COLUMN IF NOT EXISTS processor text DEFAULT 'csg_forte';
ALTER TABLE portal_payments ADD COLUMN IF NOT EXISTS fee_synced_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_fee_source_check') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_fee_source_check
      CHECK (fee_source IS NULL OR fee_source IN ('estimated','actual','manual'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portal_payments_fee_source_check') THEN
    ALTER TABLE portal_payments ADD CONSTRAINT portal_payments_fee_source_check
      CHECK (fee_source IS NULL OR fee_source IN ('estimated','actual','manual'));
  END IF;
END $$;

ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS surcharge_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS surcharge_pct numeric(6,3) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS surcharge_amount numeric(12,2) NOT NULL DEFAULT 0;

INSERT INTO app_settings (key, value, updated_at) VALUES
  ('merchant_fee_card_pct', '2.89', now()),
  ('merchant_fee_card_flat', '0.25', now()),
  ('merchant_fee_ach_pct', '0', now()),
  ('merchant_fee_ach_flat', '0.65', now()),
  ('merchant_surcharge_pct', '3', now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION merchant_fee_estimate(p_method text, p_amount numeric,
  OUT pct numeric, OUT flat numeric, OUT fee numeric)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  m text := lower(coalesce(p_method, ''));
  kind text;
BEGIN
  IF m IN ('credit_card','card','credit','debit','debit_card','cc') THEN kind := 'card';
  ELSIF m IN ('ach','echeck','e-check','bank','bank_transfer') THEN kind := 'ach';
  ELSE
    pct := 0; flat := 0; fee := 0; RETURN;
  END IF;

  SELECT coalesce(nullif(value,'')::numeric, 0) INTO pct FROM app_settings WHERE key = 'merchant_fee_' || kind || '_pct';
  SELECT coalesce(nullif(value,'')::numeric, 0) INTO flat FROM app_settings WHERE key = 'merchant_fee_' || kind || '_flat';
  pct := coalesce(pct, 0);
  flat := coalesce(flat, 0);
  IF coalesce(p_amount, 0) <= 0 THEN
    fee := 0;
  ELSE
    fee := round(p_amount * pct / 100 + flat, 2);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION apply_merchant_fee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  est record;
  is_refund boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'transactions' THEN
    is_refund := coalesce(NEW.transaction_type, 'payment') <> 'payment';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.merchant_fee IS NOT NULL THEN
      NEW.fee_source := coalesce(NEW.fee_source, 'manual');
      RETURN NEW;
    END IF;
  ELSE
    IF coalesce(OLD.fee_source, 'estimated') <> 'estimated'
       OR NEW.merchant_fee IS DISTINCT FROM OLD.merchant_fee
       OR (NEW.amount IS NOT DISTINCT FROM OLD.amount AND NEW.payment_method IS NOT DISTINCT FROM OLD.payment_method) THEN
      RETURN NEW;
    END IF;
  END IF;

  IF is_refund THEN
    NEW.merchant_fee := 0; NEW.fee_rate_pct := 0; NEW.fee_rate_flat := 0;
  ELSE
    SELECT * INTO est FROM merchant_fee_estimate(NEW.payment_method, NEW.amount);
    NEW.merchant_fee := est.fee; NEW.fee_rate_pct := est.pct; NEW.fee_rate_flat := est.flat;
  END IF;
  NEW.fee_source := 'estimated';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_transactions_merchant_fee ON transactions;
CREATE TRIGGER trg_transactions_merchant_fee
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION apply_merchant_fee();

DROP TRIGGER IF EXISTS trg_portal_payments_merchant_fee ON portal_payments;
CREATE TRIGGER trg_portal_payments_merchant_fee
  BEFORE INSERT OR UPDATE ON portal_payments
  FOR EACH ROW EXECUTE FUNCTION apply_merchant_fee();

CREATE OR REPLACE FUNCTION fill_invoice_line_cost()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c numeric;
BEGIN
  IF NEW.unit_cost IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.product_id IS NOT NULL THEN
    SELECT p.cost INTO c FROM products p WHERE p.id = NEW.product_id;
  END IF;

  IF c IS NULL THEN
    SELECT w.cost_price INTO c
    FROM invoices i
    JOIN work_order_line_items w ON w.work_order_id = i.work_order_id
    WHERE i.id = NEW.invoice_id
      AND w.cost_price IS NOT NULL AND w.cost_price > 0
      AND ((NEW.product_id IS NOT NULL AND w.product_id = NEW.product_id)
           OR lower(coalesce(w.description,'')) = lower(coalesce(NEW.description,'-')))
    LIMIT 1;
  END IF;

  IF c IS NULL AND NEW.description IS NOT NULL THEN
    SELECT p.cost INTO c FROM products p WHERE lower(p.name) = lower(NEW.description) LIMIT 1;
  END IF;

  NEW.unit_cost := c;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invoice_line_items_cost ON invoice_line_items;
CREATE TRIGGER trg_invoice_line_items_cost
  BEFORE INSERT ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION fill_invoice_line_cost();

-- Backfill estimated fees on existing payments
UPDATE transactions t SET
  (merchant_fee, fee_rate_pct, fee_rate_flat) = (
    SELECT CASE WHEN coalesce(t.transaction_type,'payment') <> 'payment' THEN 0 ELSE e.fee END, e.pct, e.flat
    FROM merchant_fee_estimate(t.payment_method, t.amount) e),
  fee_source = 'estimated',
  processor = coalesce(t.processor, 'csg_forte')
WHERE t.merchant_fee IS NULL;

UPDATE portal_payments pp SET
  (merchant_fee, fee_rate_pct, fee_rate_flat) = (
    SELECT e.fee, e.pct, e.flat FROM merchant_fee_estimate(pp.payment_method, pp.amount) e),
  fee_source = 'estimated',
  processor = coalesce(pp.processor, 'csg_forte')
WHERE pp.merchant_fee IS NULL;

-- Backfill line costs
UPDATE invoice_line_items li SET unit_cost = p.cost
FROM products p
WHERE li.unit_cost IS NULL AND li.product_id = p.id AND p.cost IS NOT NULL;

UPDATE invoice_line_items li SET unit_cost = w.cost_price
FROM invoices i, work_order_line_items w
WHERE li.unit_cost IS NULL AND i.id = li.invoice_id AND w.work_order_id = i.work_order_id
  AND w.cost_price > 0
  AND ((li.product_id IS NOT NULL AND w.product_id = li.product_id)
       OR lower(coalesce(w.description,'')) = lower(coalesce(li.description,'-')));

UPDATE invoice_line_items li SET unit_cost = p.cost
FROM products p
WHERE li.unit_cost IS NULL AND li.description IS NOT NULL
  AND lower(p.name) = lower(li.description) AND p.cost IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_portal_payments_invoice_id ON portal_payments(invoice_id);
