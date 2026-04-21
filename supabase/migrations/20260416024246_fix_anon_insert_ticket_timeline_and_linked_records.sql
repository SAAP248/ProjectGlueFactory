/*
  # Fix anon INSERT policies for ticket_timeline and ticket_linked_records

  ## Problem
  The internal app runs as the anon role (no Supabase Auth session).
  When creating a ticket, the code also inserts into ticket_timeline and
  ticket_linked_records, but those tables only had INSERT policies for the
  authenticated role, causing the ticket creation flow to fail.

  ## Changes
  - Add anon INSERT policy on ticket_timeline
  - Add anon INSERT policy on ticket_linked_records
*/

CREATE POLICY "Anon can insert ticket_timeline"
  ON ticket_timeline
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can insert ticket_linked_records"
  ON ticket_linked_records
  FOR INSERT
  TO anon
  WITH CHECK (true);
