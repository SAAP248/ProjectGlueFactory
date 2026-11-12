/*
# Florida sales tax calculation for invoices + one-time conversion

Plain English: invoices now work out their own sales tax. Each line is taxable or not (products default
from the product's taxable setting, labor/service lines default from the "labor taxable" setting).
Tax = taxable lines x (6% state + the site's county surtax + optional city rate). County surtax only
applies to the first $5,000 of each item, as Florida requires. Tax-exempt customers pay no tax.

1. New function
- acct_recalc_invoice(p_invoice_id): recalculates subtotal, discount, tax breakdown, surcharge, total
  and balance due for one invoice, and returns the updated invoice row.

2. One-time data conversion
- Every existing invoice line and estimate line gets an explicit taxable flag.
- Customer sites get a Florida tax county (Florida addresses by city; other sample sites are assigned a
  Florida county so the simulated books have realistic tax activity).
- A few sample commercial customers (schools, churches, government-type names, plus a couple of others)
  are marked tax exempt with a sample certificate number.
- Open invoices (draft/sent/partial/overdue) with lines are recalculated. Paid invoices keep the tax they
  were charged; their state/county split is filled in for reporting.

3. Security
- Function runs with the caller's rights (no SECURITY DEFINER); anon already manages invoices.
*/

CREATE OR REPLACE FUNCTION acct_recalc_invoice(p_invoice_id uuid) RETURNS SETOF invoices
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_inv invoices%ROWTYPE;
  v_labor_taxable boolean;
  v_state_rate numeric;
  v_county text;
  v_city text;
  v_county_rate numeric := 0;
  v_city_rate numeric := 0;
  v_exempt boolean := false;
  v_subtotal numeric := 0;
  v_taxable numeric := 0;
  v_county_base numeric := 0;
  v_discount numeric := 0;
  v_factor numeric := 1;
  v_state_amt numeric; v_county_amt numeric; v_city_amt numeric; v_tax numeric;
  v_before numeric; v_surcharge numeric; v_total numeric;
BEGIN
  SELECT * INTO v_inv FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  SELECT coalesce((SELECT value FROM app_settings WHERE key = 'acct_labor_taxable'), 'false') = 'true' INTO v_labor_taxable;
  SELECT coalesce(nullif((SELECT value FROM app_settings WHERE key = 'acct_state_tax_rate'), '')::numeric, 6) INTO v_state_rate;

  SELECT s.tax_county, s.city INTO v_county, v_city FROM sites s WHERE s.id = v_inv.site_id;
  IF v_county IS NULL THEN
    SELECT s.tax_county, s.city INTO v_county, v_city FROM sites s
    WHERE s.company_id = v_inv.company_id AND s.tax_county IS NOT NULL ORDER BY s.created_at LIMIT 1;
  END IF;
  SELECT coalesce(surtax_rate, 0) INTO v_county_rate FROM acct_tax_counties WHERE county = v_county;
  v_county_rate := coalesce(v_county_rate, 0);
  SELECT coalesce(rate, 0) INTO v_city_rate FROM acct_tax_cities WHERE county = v_county AND lower(city) = lower(coalesce(v_city, ''));
  v_city_rate := coalesce(v_city_rate, 0);

  SELECT c.tax_exempt AND (c.tax_exempt_expires IS NULL OR c.tax_exempt_expires >= coalesce(v_inv.invoice_date, current_date))
  INTO v_exempt FROM companies c WHERE c.id = v_inv.company_id;
  v_exempt := coalesce(v_exempt, false);

  SELECT coalesce(sum(li.total), 0),
         coalesce(sum(li.total) FILTER (WHERE coalesce(li.is_taxable, CASE WHEN li.product_id IS NOT NULL THEN coalesce(p.is_taxable, true) ELSE v_labor_taxable END)), 0),
         coalesce(sum(least(li.unit_price, 5000) * li.quantity) FILTER (WHERE coalesce(li.is_taxable, CASE WHEN li.product_id IS NOT NULL THEN coalesce(p.is_taxable, true) ELSE v_labor_taxable END)), 0)
  INTO v_subtotal, v_taxable, v_county_base
  FROM invoice_line_items li LEFT JOIN products p ON p.id = li.product_id
  WHERE li.invoice_id = p_invoice_id;

  IF coalesce(v_inv.discount_type, 'flat') = 'percentage' THEN
    v_discount := v_subtotal * coalesce(v_inv.discount, 0) / 100;
  ELSE
    v_discount := coalesce(v_inv.discount, 0);
  END IF;
  IF v_subtotal > 0 THEN v_factor := greatest(v_subtotal - v_discount, 0) / v_subtotal; END IF;

  IF v_exempt THEN v_taxable := 0; v_county_base := 0; END IF;
  v_taxable := round(v_taxable * v_factor, 2);
  v_county_base := least(round(v_county_base * v_factor, 2), v_taxable);

  v_state_amt := round(v_taxable * v_state_rate / 100, 2);
  v_county_amt := round(v_county_base * v_county_rate / 100, 2);
  v_city_amt := round(v_taxable * v_city_rate / 100, 2);
  v_tax := v_state_amt + v_county_amt + v_city_amt;

  v_before := greatest(v_subtotal - v_discount + v_tax, 0);
  v_surcharge := CASE WHEN v_inv.surcharge_enabled THEN round(v_before * coalesce(v_inv.surcharge_pct, 0) / 100, 2) ELSE 0 END;
  v_total := v_before + v_surcharge;

  RETURN QUERY UPDATE invoices SET
    subtotal = v_subtotal,
    tax = v_tax,
    tax_county = v_county,
    tax_state_rate = CASE WHEN v_exempt THEN 0 ELSE v_state_rate END,
    tax_county_rate = CASE WHEN v_exempt THEN 0 ELSE v_county_rate END,
    tax_city_rate = CASE WHEN v_exempt THEN 0 ELSE v_city_rate END,
    tax_state_amount = v_state_amt,
    tax_county_amount = v_county_amt,
    tax_city_amount = v_city_amt,
    taxable_amount = v_taxable,
    exempt_amount = greatest(round(v_subtotal * v_factor, 2) - v_taxable, 0),
    tax_exempt = v_exempt,
    surcharge_amount = v_surcharge,
    total = v_total,
    balance_due = greatest(v_total - coalesce(v_inv.amount_paid, 0), 0),
    updated_at = now()
  WHERE id = p_invoice_id
  RETURNING *;
END $$;

GRANT EXECUTE ON FUNCTION acct_recalc_invoice(uuid) TO anon, authenticated;

-- Explicit taxable flags on existing lines
UPDATE invoice_line_items li SET is_taxable = coalesce(p.is_taxable, true)
FROM products p WHERE li.product_id = p.id AND li.is_taxable IS NULL;
UPDATE invoice_line_items SET is_taxable = false WHERE is_taxable IS NULL;
UPDATE estimate_line_items li SET is_taxable = coalesce(p.is_taxable, true)
FROM products p WHERE li.product_id = p.id AND li.is_taxable IS NULL;
UPDATE estimate_line_items SET is_taxable = false WHERE is_taxable IS NULL;

-- Site tax counties
UPDATE sites SET tax_county = 'Hillsborough' WHERE tax_county IS NULL AND lower(city) IN ('tampa','brandon','riverview','plant city');
UPDATE sites SET tax_county = 'Manatee' WHERE tax_county IS NULL AND lower(city) IN ('palmetto','bradenton');
UPDATE sites SET tax_county = (ARRAY['Hillsborough','Pinellas','Pasco','Manatee','Sarasota','Polk','Orange','Hernando','Hillsborough','Pinellas'])[1 + abs(hashtext(id::text)) % 10]
WHERE tax_county IS NULL;

-- Sample tax-exempt customers
UPDATE companies SET tax_exempt = true, tax_exempt_cert = '85-8012' || lpad((abs(hashtext(id::text)) % 100000)::text, 5, '0') || 'C-' || (abs(hashtext(name)) % 9 + 1), tax_exempt_expires = DATE '2028-06-30'
WHERE NOT tax_exempt AND name ~* '(school|church|academy|university|college|county|city of|ministr|foundation|hospital)';
UPDATE companies SET tax_exempt = true, tax_exempt_cert = '85-8012' || lpad((abs(hashtext(id::text)) % 100000)::text, 5, '0') || 'C-4', tax_exempt_expires = DATE '2027-12-31'
WHERE id IN (
  SELECT id FROM companies WHERE customer_type = 'commercial' AND NOT tax_exempt ORDER BY hashtext(id::text) LIMIT
  greatest(0, 4 - (SELECT count(*) FROM companies WHERE tax_exempt))
);

-- Paid / closed invoices keep their tax; fill in the breakdown for reporting
UPDATE invoices i SET
  tax_county = s.county,
  tax_state_rate = 6,
  tax_county_rate = s.rate,
  tax_state_amount = round(i.tax * 6 / (6 + s.rate), 2),
  tax_county_amount = i.tax - round(i.tax * 6 / (6 + s.rate), 2),
  taxable_amount = CASE WHEN i.tax > 0 THEN least(round(i.tax / ((6 + s.rate) / 100), 2), i.subtotal) ELSE 0 END,
  exempt_amount = greatest(i.subtotal - coalesce(CASE WHEN i.discount_type = 'percentage' THEN i.subtotal * i.discount / 100 ELSE i.discount END, 0)
                  - CASE WHEN i.tax > 0 THEN least(round(i.tax / ((6 + s.rate) / 100), 2), i.subtotal) ELSE 0 END, 0)
FROM (
  SELECT inv.id, coalesce(st.tax_county, 'Hillsborough') AS county, coalesce(tc.surtax_rate, 0) AS rate
  FROM invoices inv
  LEFT JOIN sites st ON st.id = inv.site_id
  LEFT JOIN acct_tax_counties tc ON tc.county = coalesce(st.tax_county, 'Hillsborough')
) s
WHERE s.id = i.id AND i.status NOT IN ('draft','sent','partial','overdue');

-- Open invoices with lines get recalculated with the new rules
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT i.id FROM invoices i WHERE i.status IN ('draft','sent','partial','overdue')
           AND EXISTS (SELECT 1 FROM invoice_line_items li WHERE li.invoice_id = i.id) LOOP
    PERFORM acct_recalc_invoice(r.id);
  END LOOP;
END $$;
