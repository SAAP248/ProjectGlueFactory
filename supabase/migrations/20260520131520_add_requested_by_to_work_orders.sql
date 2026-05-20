/*
  # Add Requested By fields to work_orders

  1. Modified Tables
    - `work_orders`
      - `requested_by_contact_id` (uuid, nullable, FK to contacts) - links to an existing contact who requested the work
      - `requested_by_name` (text, nullable) - freetext name when caller is not saved as a contact

  2. Notes
    - These fields track who initiated the service request
    - If the caller is an existing contact, requested_by_contact_id is set
    - If the caller is new and not saved as a contact, requested_by_name stores their name
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'requested_by_contact_id'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN requested_by_contact_id uuid REFERENCES contacts(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'requested_by_name'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN requested_by_name text;
  END IF;
END $$;
