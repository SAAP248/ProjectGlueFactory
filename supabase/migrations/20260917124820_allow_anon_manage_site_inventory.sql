/*
# Allow anon CRUD on site_inventory

The site_inventory table currently only has a SELECT policy for the anon role,
which means the app (no login) cannot insert, update, or delete equipment.
This migration adds INSERT, UPDATE, and DELETE policies for anon + authenticated
to match the pattern used by site_rooms and other tables.

1. Security Changes
   - Add INSERT policy for anon, authenticated on site_inventory
   - Add UPDATE policy for anon, authenticated on site_inventory
   - Add DELETE policy for anon, authenticated on site_inventory
*/

DROP POLICY IF EXISTS "anon_insert_site_inventory" ON site_inventory;
CREATE POLICY "anon_insert_site_inventory" ON site_inventory FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_site_inventory" ON site_inventory;
CREATE POLICY "anon_update_site_inventory" ON site_inventory FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_site_inventory" ON site_inventory;
CREATE POLICY "anon_delete_site_inventory" ON site_inventory FOR DELETE
  TO anon, authenticated USING (true);
