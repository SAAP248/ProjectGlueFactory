/*
# Deal status automation + Install/Office start empty until sold

## Plain-English summary
Deals have three separate statuses: Sales, Install and Office. A brand-new deal is just a lead,
so it should only have a Sales status. Install and Office now stay empty until Sales reaches "Sold",
at which point Install becomes "Not Scheduled" and Office becomes "Sold". If Sales is moved back
before any install/office work started, Install and Office are cleared again.

Statuses also move forward automatically when real things happen (estimate sent / opened / signed,
agreement sent, install work order scheduled / started / completed, all invoices paid). Automatic
moves never go backward, never replace an off-path outcome (Lost, On hold, etc.) and are logged
in the deal history marked as automatic.

## Modified tables
1. `deals`
   - `install_status` default changed from 'Not Scheduled' to NULL
   - new `install_status_entered_at` (timestamptz) - when the Install status last changed
   - new `office_status_entered_at` (timestamptz) - when the Office status last changed
   - existing deals that are not sold get Install and Office cleared (data cleanup)
2. `deal_activities`
   - new `status_field` (text) - which status a change belongs to: sales_stage / install_status / office_status
   - new `is_automatic` (boolean, default false) - true when the system made the change
3. `estimates`
   - new `view_count` (integer, default 0) - how many times the customer opened the estimate

## Functions / triggers
1. `deal_auto_advance(deal, field, target, why)` - internal helper, forward-only move + history row.
   Not callable by app users (EXECUTE revoked).
2. `deals_status_guard` BEFORE INSERT/UPDATE on deals - stamps entered-at times, initializes or
   clears Install/Office, and moves Sales forward when proposal / agreement sent dates are set.
3. `estimates_advance_deal` AFTER INSERT/UPDATE on estimates.
4. `work_orders_advance_deal` AFTER INSERT/UPDATE on work_orders.
5. `invoices_advance_deal` AFTER INSERT/UPDATE on invoices.
6. `mark_estimate_viewed` now also increments `view_count`.

## Security
No policy changes. Trigger functions run as SECURITY DEFINER with a fixed search_path so that
customer actions on the public estimate page can advance the deal.
*/

ALTER TABLE deals ALTER COLUMN install_status SET DEFAULT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='install_status_entered_at') THEN
    ALTER TABLE deals ADD COLUMN install_status_entered_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='office_status_entered_at') THEN
    ALTER TABLE deals ADD COLUMN office_status_entered_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deal_activities' AND column_name='status_field') THEN
    ALTER TABLE deal_activities ADD COLUMN status_field text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deal_activities' AND column_name='is_automatic') THEN
    ALTER TABLE deal_activities ADD COLUMN is_automatic boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='estimates' AND column_name='view_count') THEN
    ALTER TABLE estimates ADD COLUMN view_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

UPDATE estimates SET view_count = 1 WHERE viewed_at IS NOT NULL AND view_count = 0;

CREATE OR REPLACE FUNCTION deal_status_path(p_field text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_field
    WHEN 'sales_stage' THEN ARRAY['Lead','Proposal Sent','Proposal Viewed','Proposal Accepted','Agreement Sent','Sold']
    WHEN 'install_status' THEN ARRAY['Not Scheduled','Waiting on Customer','Scheduled','In Progress','Completed','Sent to Office Review']
    WHEN 'office_status' THEN ARRAY['Sold','Contract Signed','Invoices Paid','Subscription Created','Office Reviewed']
  END;
$$;

CREATE OR REPLACE FUNCTION deal_status_label(p_field text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_field WHEN 'sales_stage' THEN 'Sales' WHEN 'install_status' THEN 'Install' WHEN 'office_status' THEN 'Office' END;
$$;

CREATE OR REPLACE FUNCTION deal_auto_advance(p_deal uuid, p_field text, p_target text, p_why text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_path text[] := deal_status_path(p_field);
  v_cur text;
  v_cur_idx int;
  v_tgt_idx int;
BEGIN
  IF p_deal IS NULL OR v_path IS NULL THEN RETURN; END IF;
  EXECUTE format('SELECT %I FROM deals WHERE id = $1 FOR UPDATE', p_field) INTO v_cur USING p_deal;
  IF v_cur IS NULL THEN RETURN; END IF;
  v_cur_idx := array_position(v_path, v_cur);
  v_tgt_idx := array_position(v_path, p_target);
  IF v_cur_idx IS NULL OR v_tgt_idx IS NULL OR v_tgt_idx <= v_cur_idx THEN RETURN; END IF;

  INSERT INTO deal_activities (deal_id, activity_type, description, old_value, new_value, status_field, is_automatic)
  VALUES (p_deal, 'stage_change',
    deal_status_label(p_field) || ' status changed from "' || v_cur || '" to "' || p_target || '" (automatic: ' || p_why || ')',
    v_cur, p_target, p_field, true);

  EXECUTE format('UPDATE deals SET %I = $1 WHERE id = $2', p_field) USING p_target, p_deal;
END $$;

REVOKE EXECUTE ON FUNCTION deal_auto_advance(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION deals_status_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sales text[] := deal_status_path('sales_stage');
  v_idx int;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_idx := array_position(v_sales, NEW.sales_stage);
    IF NEW.agreement_sent_date IS NOT NULL AND OLD.agreement_sent_date IS NULL
       AND NEW.sales_stage = OLD.sales_stage AND v_idx IS NOT NULL AND v_idx < 5 THEN
      INSERT INTO deal_activities (deal_id, activity_type, description, old_value, new_value, status_field, is_automatic)
      VALUES (NEW.id, 'stage_change', 'Sales status changed from "' || NEW.sales_stage || '" to "Agreement Sent" (automatic: agreement sent)',
        NEW.sales_stage, 'Agreement Sent', 'sales_stage', true);
      NEW.sales_stage := 'Agreement Sent';
    ELSIF NEW.proposal_sent_date IS NOT NULL AND OLD.proposal_sent_date IS NULL
       AND NEW.sales_stage = OLD.sales_stage AND v_idx IS NOT NULL AND v_idx < 2 THEN
      INSERT INTO deal_activities (deal_id, activity_type, description, old_value, new_value, status_field, is_automatic)
      VALUES (NEW.id, 'stage_change', 'Sales status changed from "' || NEW.sales_stage || '" to "Proposal Sent" (automatic: proposal sent)',
        NEW.sales_stage, 'Proposal Sent', 'sales_stage', true);
      NEW.sales_stage := 'Proposal Sent';
    END IF;

    IF NEW.sales_stage IS DISTINCT FROM OLD.sales_stage THEN
      NEW.stage_entered_at := now();
      IF NEW.sales_stage = 'Sold' THEN
        IF NEW.install_status IS NULL THEN NEW.install_status := 'Not Scheduled'; END IF;
        IF NEW.office_status IS NULL THEN NEW.office_status := 'Sold'; END IF;
        IF NEW.close_date IS NULL THEN NEW.close_date := current_date; END IF;
      ELSIF NEW.sales_stage <> 'Sold & Failed'
        AND COALESCE(NEW.install_status, 'Not Scheduled') = 'Not Scheduled'
        AND COALESCE(NEW.office_status, 'Sold') = 'Sold' THEN
        NEW.install_status := NULL;
        NEW.office_status := NULL;
      END IF;
    END IF;

    IF NEW.install_status IS DISTINCT FROM OLD.install_status THEN NEW.install_status_entered_at := now(); END IF;
    IF NEW.office_status IS DISTINCT FROM OLD.office_status THEN NEW.office_status_entered_at := now(); END IF;
  ELSE
    IF NEW.sales_stage = 'Sold' THEN
      NEW.install_status := COALESCE(NEW.install_status, 'Not Scheduled');
      NEW.office_status := COALESCE(NEW.office_status, 'Sold');
    END IF;
    IF NEW.install_status IS NOT NULL THEN NEW.install_status_entered_at := COALESCE(NEW.install_status_entered_at, now()); END IF;
    IF NEW.office_status IS NOT NULL THEN NEW.office_status_entered_at := COALESCE(NEW.office_status_entered_at, now()); END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_deals_status_guard ON deals;
CREATE TRIGGER trg_deals_status_guard BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION deals_status_guard();

CREATE OR REPLACE FUNCTION estimates_advance_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text := 'estimate ' || COALESCE(NEW.estimate_number, '');
BEGIN
  IF NEW.deal_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.sent_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.sent_at IS NULL) THEN
    PERFORM deal_auto_advance(NEW.deal_id, 'sales_stage', 'Proposal Sent', trim(v_name) || ' sent');
    UPDATE deals SET proposal_sent_date = COALESCE(proposal_sent_date, NEW.sent_at::date) WHERE id = NEW.deal_id;
  END IF;
  IF NEW.viewed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.viewed_at IS NULL) THEN
    PERFORM deal_auto_advance(NEW.deal_id, 'sales_stage', 'Proposal Viewed', 'customer opened ' || trim(v_name));
    UPDATE deals SET proposal_viewed_date = COALESCE(proposal_viewed_date, NEW.viewed_at::date) WHERE id = NEW.deal_id;
  END IF;
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM deal_auto_advance(NEW.deal_id, 'sales_stage', 'Proposal Accepted', 'customer signed ' || trim(v_name));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_estimates_advance_deal ON estimates;
CREATE TRIGGER trg_estimates_advance_deal AFTER INSERT OR UPDATE OF sent_at, viewed_at, status ON estimates
  FOR EACH ROW EXECUTE FUNCTION estimates_advance_deal();

CREATE OR REPLACE FUNCTION work_orders_advance_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal uuid;
  v_target text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  v_deal := NEW.deal_id;
  IF v_deal IS NULL AND NEW.source_estimate_id IS NOT NULL THEN
    SELECT deal_id INTO v_deal FROM estimates WHERE id = NEW.source_estimate_id;
  END IF;
  IF v_deal IS NULL THEN RETURN NEW; END IF;
  v_target := CASE NEW.status WHEN 'scheduled' THEN 'Scheduled' WHEN 'in_progress' THEN 'In Progress' WHEN 'completed' THEN 'Completed' END;
  IF v_target IS NOT NULL THEN
    PERFORM deal_auto_advance(v_deal, 'install_status', v_target,
      'work order ' || COALESCE(NEW.wo_number, '') || ' ' || replace(NEW.status, '_', ' '));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_work_orders_advance_deal ON work_orders;
CREATE TRIGGER trg_work_orders_advance_deal AFTER INSERT OR UPDATE OF status ON work_orders
  FOR EACH ROW EXECUTE FUNCTION work_orders_advance_deal();

CREATE OR REPLACE FUNCTION invoices_advance_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal uuid;
  v_unpaid int;
BEGIN
  IF NEW.status IS DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.work_order_id IS NOT NULL THEN
    SELECT COALESCE(w.deal_id, e.deal_id) INTO v_deal
    FROM work_orders w LEFT JOIN estimates e ON e.id = w.source_estimate_id
    WHERE w.id = NEW.work_order_id;
  END IF;
  IF v_deal IS NULL AND NEW.estimate_id IS NOT NULL THEN
    SELECT deal_id INTO v_deal FROM estimates WHERE id = NEW.estimate_id;
  END IF;
  IF v_deal IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_unpaid FROM invoices i
  WHERE i.status IS DISTINCT FROM 'paid'
    AND (i.estimate_id IN (SELECT id FROM estimates WHERE deal_id = v_deal)
      OR i.work_order_id IN (SELECT w.id FROM work_orders w LEFT JOIN estimates e ON e.id = w.source_estimate_id
                             WHERE w.deal_id = v_deal OR e.deal_id = v_deal));
  IF v_unpaid = 0 THEN
    PERFORM deal_auto_advance(v_deal, 'office_status', 'Invoices Paid', 'all invoices paid');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invoices_advance_deal ON invoices;
CREATE TRIGGER trg_invoices_advance_deal AFTER INSERT OR UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_advance_deal();

CREATE OR REPLACE FUNCTION public.mark_estimate_viewed(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
UPDATE estimates SET viewed_at = COALESCE(viewed_at, now()), last_viewed_at = now(),
view_count = COALESCE(view_count, 0) + 1,
status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END
WHERE public_token = p_token AND length(p_token) >= 16;
END $function$;

UPDATE deals SET install_status = NULL, office_status = NULL
WHERE sales_stage NOT IN ('Sold', 'Sold & Failed')
  AND (install_status IS NOT NULL OR office_status IS NOT NULL);

UPDATE deals SET install_status_entered_at = COALESCE(install_status_entered_at, stage_entered_at, created_at)
WHERE install_status IS NOT NULL AND install_status_entered_at IS NULL;
UPDATE deals SET office_status_entered_at = COALESCE(office_status_entered_at, stage_entered_at, created_at)
WHERE office_status IS NOT NULL AND office_status_entered_at IS NULL;
