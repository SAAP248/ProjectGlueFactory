/*
# Work orders from estimates/invoices, multi-day crews, and truck stock tracking

## Plain-English summary
Lets the office create work orders straight from an estimate or invoice (keeping the
estimate's grouping), schedule a crew across several days, and lets technicians tick
off parts they used, pulling stock from a specific truck or warehouse.

## 1. Modified tables
- `warehouses`
  - `warehouse_type` (text, 'warehouse' | 'truck', default 'warehouse')
  - `assigned_employee_id` (uuid -> employees) the technician whose home truck/warehouse this is.
    A technician can have at most one home location (partial unique index).
- `work_orders`
  - `source_estimate_id` (uuid -> estimates) estimate this work order was created from
  - `source_invoice_id` (uuid -> invoices) invoice this work order was created from
- `estimates`
  - `accepted_via_work_order_id` (uuid -> work_orders) set when an estimate was accepted by creating a work order
- `work_order_line_items`
  - `group_key`, `group_label` (text), `group_sort` (int) system/room grouping copied from the estimate
  - `source_line_item_id` (uuid) the estimate/invoice line it came from
- `work_order_technicians`
  - Unique rule changed from (work_order, employee) to (work_order, employee, visit_sequence)
    so one technician can be booked on several days of the same job.
- `work_order_parts`
  - `used_by_employee_id` (uuid -> employees) who used the part
  - `source_warehouse_id` (uuid -> warehouses) whose truck/warehouse it came from
  - `work_order_line_item_id` (uuid -> work_order_line_items) checklist item it fulfils

## 2. Stock automation
- Trigger `trg_work_order_parts_stock` on `work_order_parts` adjusts `warehouse_inventory`
  on insert / update / delete, so ticking, unticking, changing quantity or switching the
  source truck always keeps counts correct. Stock may go negative (soft warning only).

## 3. Security
- Single-tenant app with no sign-in: adds anon + authenticated insert/update/delete
  policies to `warehouses` and `warehouse_inventory` (select already existed for both roles).
- The trigger function is SECURITY DEFINER with a fixed search_path and EXECUTE is revoked
  from public roles; it only runs as a trigger.

## 4. Notes
1. No data is removed. Existing assignments keep their current visit_sequence (all unique already).
*/

ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS warehouse_type text NOT NULL DEFAULT 'warehouse';
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS assigned_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouses_warehouse_type_check') THEN
    ALTER TABLE warehouses ADD CONSTRAINT warehouses_warehouse_type_check CHECK (warehouse_type IN ('warehouse','truck'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS warehouses_assigned_employee_unique ON warehouses(assigned_employee_id) WHERE assigned_employee_id IS NOT NULL;

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS source_estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS source_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS work_orders_source_estimate_idx ON work_orders(source_estimate_id);
CREATE INDEX IF NOT EXISTS work_orders_source_invoice_idx ON work_orders(source_invoice_id);

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS accepted_via_work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL;

ALTER TABLE work_order_line_items ADD COLUMN IF NOT EXISTS group_key text;
ALTER TABLE work_order_line_items ADD COLUMN IF NOT EXISTS group_label text;
ALTER TABLE work_order_line_items ADD COLUMN IF NOT EXISTS group_sort integer NOT NULL DEFAULT 0;
ALTER TABLE work_order_line_items ADD COLUMN IF NOT EXISTS source_line_item_id uuid;

ALTER TABLE work_order_technicians DROP CONSTRAINT IF EXISTS work_order_technicians_work_order_id_employee_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS work_order_technicians_wo_emp_visit_key ON work_order_technicians(work_order_id, employee_id, visit_sequence);
CREATE INDEX IF NOT EXISTS work_order_technicians_sched_date_idx ON work_order_technicians(scheduled_date);

ALTER TABLE work_order_parts ADD COLUMN IF NOT EXISTS used_by_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE work_order_parts ADD COLUMN IF NOT EXISTS source_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE work_order_parts ADD COLUMN IF NOT EXISTS work_order_line_item_id uuid REFERENCES work_order_line_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS work_order_parts_line_item_idx ON work_order_parts(work_order_line_item_id);
CREATE INDEX IF NOT EXISTS work_order_parts_source_wh_idx ON work_order_parts(source_warehouse_id);

CREATE OR REPLACE FUNCTION adjust_truck_stock_for_part()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.source_warehouse_id IS NOT NULL AND OLD.product_id IS NOT NULL THEN
    UPDATE warehouse_inventory
       SET quantity = quantity + OLD.quantity, updated_at = now()
     WHERE warehouse_id = OLD.source_warehouse_id AND product_id = OLD.product_id;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.source_warehouse_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
    INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity)
    VALUES (NEW.source_warehouse_id, NEW.product_id, -NEW.quantity)
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET quantity = warehouse_inventory.quantity - NEW.quantity, updated_at = now();
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION adjust_truck_stock_for_part() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_work_order_parts_stock ON work_order_parts;
CREATE TRIGGER trg_work_order_parts_stock
AFTER INSERT OR UPDATE OF quantity, source_warehouse_id, product_id OR DELETE ON work_order_parts
FOR EACH ROW EXECUTE FUNCTION adjust_truck_stock_for_part();

DROP POLICY IF EXISTS "anon_insert_warehouses" ON warehouses;
CREATE POLICY "anon_insert_warehouses" ON warehouses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_warehouses" ON warehouses;
CREATE POLICY "anon_update_warehouses" ON warehouses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_warehouses" ON warehouses;
CREATE POLICY "anon_delete_warehouses" ON warehouses FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_warehouse_inventory" ON warehouse_inventory;
CREATE POLICY "anon_insert_warehouse_inventory" ON warehouse_inventory FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_warehouse_inventory" ON warehouse_inventory;
CREATE POLICY "anon_update_warehouse_inventory" ON warehouse_inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_warehouse_inventory" ON warehouse_inventory;
CREATE POLICY "anon_delete_warehouse_inventory" ON warehouse_inventory FOR DELETE TO anon, authenticated USING (true);
