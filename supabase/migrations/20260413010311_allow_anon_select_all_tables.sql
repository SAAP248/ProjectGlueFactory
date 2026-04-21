/*
  # Allow Anonymous SELECT Access on All Tables

  ## Summary
  This migration adds SELECT policies for the `anon` role on every table in the
  public schema. The app does not currently have authentication, so the anon
  Supabase key is used for all requests. Without these policies, RLS blocks all
  reads and no data appears in the UI.

  ## Changes
  - Adds a "Public anon can view …" SELECT policy for each table, scoped to the
    `anon` role with `USING (true)`.
  - Write operations (INSERT / UPDATE / DELETE) remain restricted to
    `authenticated` users only.

  ## Tables Covered
  alarm_events, appointments, chat_messages, communication_partners, companies,
  contacts, customer_credits, customer_notes, customer_systems, deals,
  distributors, employees, estimate_line_items, estimates, invoice_line_items,
  invoices, package_items, packages, products, project_tasks, projects,
  purchase_order_items, purchase_orders, site_inventory, sites, statements,
  system_devices, system_types, system_zones, tasks, technician_locations,
  time_entries, transactions, transfer_order_items, transfer_orders,
  warehouse_inventory, warehouses, work_orders
*/

CREATE POLICY "Public anon can view alarm events"
  ON alarm_events FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view appointments"
  ON appointments FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view chat messages"
  ON chat_messages FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view communication partners"
  ON communication_partners FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view companies"
  ON companies FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view contacts"
  ON contacts FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view customer credits"
  ON customer_credits FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view customer notes"
  ON customer_notes FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view customer systems"
  ON customer_systems FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view deals"
  ON deals FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view distributors"
  ON distributors FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view employees"
  ON employees FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view estimate line items"
  ON estimate_line_items FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view estimates"
  ON estimates FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view invoice line items"
  ON invoice_line_items FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view invoices"
  ON invoices FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view package items"
  ON package_items FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view packages"
  ON packages FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view products"
  ON products FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view project tasks"
  ON project_tasks FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view projects"
  ON projects FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view purchase order items"
  ON purchase_order_items FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view purchase orders"
  ON purchase_orders FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view site inventory"
  ON site_inventory FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view sites"
  ON sites FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view statements"
  ON statements FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view system devices"
  ON system_devices FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view system types"
  ON system_types FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view system zones"
  ON system_zones FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view tasks"
  ON tasks FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view technician locations"
  ON technician_locations FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view time entries"
  ON time_entries FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view transactions"
  ON transactions FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view transfer order items"
  ON transfer_order_items FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view transfer orders"
  ON transfer_orders FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view warehouse inventory"
  ON warehouse_inventory FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view warehouses"
  ON warehouses FOR SELECT TO anon USING (true);

CREATE POLICY "Public anon can view work orders"
  ON work_orders FOR SELECT TO anon USING (true);
