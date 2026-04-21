/*
  # Fix anon INSERT policy for internal ticket comments

  ## Problem
  The internal app runs without a Supabase Auth session (anon role).
  When staff create a ticket with an initial internal note, it inserts into
  ticket_comments with is_public = false and no author_portal_user_id.
  The existing anon INSERT policy only allows comments where
  is_public = true AND author_portal_user_id IS NOT NULL — blocking internal notes.

  ## Changes
  1. Add new anon INSERT policy on ticket_comments for internal staff notes:
     - is_public must be FALSE (private/internal note)
     - author_portal_user_id must be NULL (not from a portal user)
*/

CREATE POLICY "Anon can insert internal staff ticket_comments"
  ON ticket_comments
  FOR INSERT
  TO anon
  WITH CHECK (
    is_public = false
    AND author_portal_user_id IS NULL
  );
