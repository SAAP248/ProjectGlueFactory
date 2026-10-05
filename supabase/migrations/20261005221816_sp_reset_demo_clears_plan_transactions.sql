/*
# Service Plans demo reset also clears plan payment transactions

1. Changes
- `sp_reset_demo()` now removes the payment transactions that were recorded against
  service-plan invoices (the SPI- invoices) before removing those invoices, so a reset
  does not leave orphaned payments in the accounting ledger.
- Invoices that have customer portal payments are still kept, together with their transactions.

2. Security
- No policy changes. Function stays SECURITY INVOKER with a fixed search_path.
*/

CREATE OR REPLACE FUNCTION public.sp_reset_demo()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
DELETE FROM transactions t
USING invoices i
WHERE t.invoice_id = i.id
AND i.sp_agreement_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM portal_payments pp WHERE pp.invoice_id = i.id);
DELETE FROM invoices i WHERE i.sp_agreement_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM portal_payments pp WHERE pp.invoice_id = i.id);
DELETE FROM work_orders WHERE wo_number LIKE 'SPV-%';
DELETE FROM sp_entitlement_ledger;
DELETE FROM sp_billing_occurrences;
DELETE FROM sp_events;
DELETE FROM sp_agreement_addons;
DELETE FROM sp_agreement_sites;
DELETE FROM sp_agreements;
DELETE FROM sp_monitoring_accounts;
DELETE FROM sp_addons;
UPDATE sp_plans SET current_version_id = NULL;
DELETE FROM sp_plans;
PERFORM sp_seed_demo();
END;
$function$;
