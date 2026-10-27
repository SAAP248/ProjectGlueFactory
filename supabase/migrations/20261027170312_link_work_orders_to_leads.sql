/*
# Link work orders to leads (Sales Calls)

1. Modified Tables
- `work_orders`
  - `lead_id` (uuid, nullable) - the lead this work order belongs to. Used for sales calls,
    which are work orders (work_order_type = 'sales_call') assigned to a salesperson before
    the lead becomes a customer. Set to null if the lead is ever removed.

2. Indexes
- `idx_work_orders_lead_id` for fast lookup of a lead's sales calls.

3. Security
- No policy changes. `work_orders` already has RLS enabled with existing policies.

4. Notes
1. When a lead is converted, its sales calls are re-linked to the new customer, site and deal
   by the app; `lead_id` is kept so the history remains visible from the lead.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_orders_lead_id ON work_orders(lead_id);