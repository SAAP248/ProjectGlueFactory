-- Allow anon role to INSERT/UPDATE/DELETE on tables needed by the Deal Wizard
-- deals: create + update deals
CREATE POLICY "anon_insert_deals" ON deals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_deals" ON deals FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_deals" ON deals FOR DELETE TO anon USING (true);

-- companies: create new customers
CREATE POLICY "anon_insert_companies" ON companies FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_companies" ON companies FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- sites: create installation sites
CREATE POLICY "anon_insert_sites" ON sites FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_sites" ON sites FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- estimates: create and update estimates/proposals
CREATE POLICY "anon_insert_estimates" ON estimates FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_estimates" ON estimates FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- estimate_line_items: add/update/delete line items
CREATE POLICY "anon_insert_estimate_line_items" ON estimate_line_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_estimate_line_items" ON estimate_line_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_estimate_line_items" ON estimate_line_items FOR DELETE TO anon USING (true);
