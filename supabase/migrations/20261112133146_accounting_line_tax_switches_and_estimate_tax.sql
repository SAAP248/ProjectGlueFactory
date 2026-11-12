/*
# Per-line Tax / No tax switches and Florida tax for estimates

1. New functions
- `acct_default_line_taxable(product_id)`: the starting Tax / No tax setting for a new line.
  Product lines follow the product's own taxable flag (taxable if unset). Labor / free-text
  lines follow the `acct_labor_taxable` app setting.
- `acct_tax_quote(company_id, site_id, date, lines)`: returns the Florida tax breakdown
  (state 6% or configured rate, county surtax on the first $5,000 per item, city tax) for a
  set of lines `[{quantity, unit_price, taxable}]`, honoring a customer's tax exemption when the
  certificate has not expired on that date. Used for live previews on forms.
- `acct_recalc_estimate(estimate_id)`: recalculates an estimate's subtotal, tax and total from
  its lines using the same rules, and saves them.

2. Triggers
- `trg_invoice_lines_taxable_default` / `trg_estimate_lines_taxable_default`: when a line is
  inserted without an explicit taxable flag, fill it in from `acct_default_line_taxable`.

3. Security
- No table or policy changes. Functions run with the caller's rights (SECURITY INVOKER),
  so existing row level security still applies.

4. Notes
- Existing lines already have an explicit taxable flag; nothing is rewritten.
*/

CREATE OR REPLACE FUNCTION acct_default_line_taxable(p_product_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_product_id IS NOT NULL THEN coalesce((SELECT p.is_taxable FROM products p WHERE p.id = p_product_id), true)
    ELSE coalesce((SELECT value FROM app_settings WHERE key = 'acct_labor_taxable'), 'false') = 'true'
  END;
$$;

CREATE OR REPLACE FUNCTION acct_line_taxable_default()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_taxable IS NULL THEN
    NEW.is_taxable := acct_default_line_taxable(NEW.product_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invoice_lines_taxable_default ON invoice_line_items;
CREATE TRIGGER trg_invoice_lines_taxable_default BEFORE INSERT ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION acct_line_taxable_default();

DROP TRIGGER IF EXISTS trg_estimate_lines_taxable_default ON estimate_line_items;
CREATE TRIGGER trg_estimate_lines_taxable_default BEFORE INSERT ON estimate_line_items
  FOR EACH ROW EXECUTE FUNCTION acct_line_taxable_default();

CREATE OR REPLACE FUNCTION acct_tax_quote(p_company_id uuid, p_site_id uuid, p_date date, p_lines jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_state_rate numeric;
  v_county text; v_city text;
  v_county_rate numeric := 0; v_city_rate numeric := 0;
  v_exempt boolean := false; v_cert text; v_expires date;
  v_subtotal numeric := 0; v_taxable numeric := 0; v_county_base numeric := 0;
  v_state numeric; v_cty numeric; v_city_amt numeric;
BEGIN
  SELECT coalesce(nullif((SELECT value FROM app_settings WHERE key = 'acct_state_tax_rate'), '')::numeric, 6) INTO v_state_rate;

  SELECT s.tax_county, s.city INTO v_county, v_city FROM sites s WHERE s.id = p_site_id;
  IF v_county IS NULL AND p_company_id IS NOT NULL THEN
    SELECT s.tax_county, s.city INTO v_county, v_city FROM sites s
    WHERE s.company_id = p_company_id AND s.tax_county IS NOT NULL ORDER BY s.created_at LIMIT 1;
  END IF;
  SELECT coalesce(surtax_rate, 0) INTO v_county_rate FROM acct_tax_counties WHERE county = v_county;
  v_county_rate := coalesce(v_county_rate, 0);
  SELECT coalesce(rate, 0) INTO v_city_rate FROM acct_tax_cities WHERE county = v_county AND lower(city) = lower(coalesce(v_city, ''));
  v_city_rate := coalesce(v_city_rate, 0);

  SELECT coalesce(c.tax_exempt, false) AND (c.tax_exempt_expires IS NULL OR c.tax_exempt_expires >= coalesce(p_date, current_date)),
         c.tax_exempt_cert, c.tax_exempt_expires
  INTO v_exempt, v_cert, v_expires FROM companies c WHERE c.id = p_company_id;
  v_exempt := coalesce(v_exempt, false);

  SELECT coalesce(sum(q * pr), 0),
         coalesce(sum(q * pr) FILTER (WHERE tx), 0),
         coalesce(sum(least(pr, 5000) * q) FILTER (WHERE tx), 0)
  INTO v_subtotal, v_taxable, v_county_base
  FROM (
    SELECT coalesce((l->>'quantity')::numeric, 0) q,
           coalesce((l->>'unit_price')::numeric, 0) pr,
           coalesce((l->>'taxable')::boolean, false) tx
    FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) l
  ) x;

  IF v_exempt THEN v_taxable := 0; v_county_base := 0; END IF;
  v_taxable := round(v_taxable, 2);
  v_county_base := least(round(v_county_base, 2), v_taxable);
  v_state := round(v_taxable * v_state_rate / 100, 2);
  v_cty := round(v_county_base * v_county_rate / 100, 2);
  v_city_amt := round(v_taxable * v_city_rate / 100, 2);

  RETURN jsonb_build_object(
    'subtotal', round(v_subtotal, 2),
    'taxable', v_taxable,
    'exempt_amount', greatest(round(v_subtotal, 2) - v_taxable, 0),
    'state', v_state, 'county', v_cty, 'city', v_city_amt,
    'tax', v_state + v_cty + v_city_amt,
    'state_rate', v_state_rate, 'county_rate', v_county_rate, 'city_rate', v_city_rate,
    'county_name', v_county, 'city_name', CASE WHEN v_city_rate > 0 THEN v_city END,
    'customer_exempt', v_exempt, 'certificate', v_cert, 'certificate_expires', v_expires
  );
END $$;

CREATE OR REPLACE FUNCTION acct_recalc_estimate(p_estimate_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_est estimates%ROWTYPE;
  v_q jsonb;
BEGIN
  SELECT * INTO v_est FROM estimates WHERE id = p_estimate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Estimate not found'; END IF;

  v_q := acct_tax_quote(v_est.company_id, v_est.site_id, v_est.estimate_date,
    (SELECT coalesce(jsonb_agg(jsonb_build_object('quantity', li.quantity, 'unit_price', li.unit_price, 'taxable', li.is_taxable)), '[]'::jsonb)
     FROM estimate_line_items li WHERE li.estimate_id = p_estimate_id));

  UPDATE estimates SET
    subtotal = (v_q->>'subtotal')::numeric,
    tax = (v_q->>'tax')::numeric,
    total = (v_q->>'subtotal')::numeric + (v_q->>'tax')::numeric,
    updated_at = now()
  WHERE id = p_estimate_id;

  RETURN v_q;
END $$;
