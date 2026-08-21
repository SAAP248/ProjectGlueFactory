/*
# Add call_section column to alarm_emergency_contacts

1. Modified Tables
   - `alarm_emergency_contacts`
     - Added `call_section` (text, not null, default 'before_dispatch')
       - Values: 'before_dispatch' or 'after_dispatch'
       - Determines whether the contact should be called before or after police/fire dispatch

2. Important Notes
   - Existing contacts default to 'before_dispatch' to preserve current behavior
   - No destructive changes
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alarm_emergency_contacts' AND column_name = 'call_section'
  ) THEN
    ALTER TABLE alarm_emergency_contacts
      ADD COLUMN call_section text NOT NULL DEFAULT 'before_dispatch';
  END IF;
END $$;
