/*
  # Allow anon role to manage contacts

  1. Changes
    - Adds INSERT policy for anon on contacts table
    - Adds UPDATE policy for anon on contacts table
    - Adds DELETE policy for anon on contacts table

  2. Reason
    - The app uses the anon key for all Supabase operations
    - Previously only SELECT was permitted for anon, blocking add/edit/delete
    - This matches the pattern used by other tables (company_phones, company_emails, etc.)
*/

CREATE POLICY "anon can insert contacts"
  ON contacts
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can update contacts"
  ON contacts
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon can delete contacts"
  ON contacts
  FOR DELETE
  TO anon
  USING (true);
