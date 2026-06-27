/*
  Proposal Rooms, Messages, and Acceptance Fields
  
  1. proposal_rooms - Rooms that products can be grouped into (for AV/multi-room proposals)
  2. proposal_messages - Q&A chat thread between customer and salesperson
  3. Adds room_id and grouping_mode columns to estimates/line items
  4. Adds acceptance fields to estimates
*/

-- Rooms for organizing line items by physical location
CREATE TABLE IF NOT EXISTS proposal_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  estimate_id uuid REFERENCES estimates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Q&A messages on a proposal
CREATE TABLE IF NOT EXISTS proposal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'staff')),
  sender_name text NOT NULL,
  message text NOT NULL,
  reference_type text CHECK (reference_type IN ('product', 'room', 'system')),
  reference_id uuid,
  reference_label text,
  created_at timestamptz DEFAULT now()
);

-- Add grouping_mode to estimates (by_system or by_room)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'grouping_mode') THEN
    ALTER TABLE estimates ADD COLUMN grouping_mode text NOT NULL DEFAULT 'by_system';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'accepted_at') THEN
    ALTER TABLE estimates ADD COLUMN accepted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'declined_at') THEN
    ALTER TABLE estimates ADD COLUMN declined_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'declined_reason') THEN
    ALTER TABLE estimates ADD COLUMN declined_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'customer_name_signed') THEN
    ALTER TABLE estimates ADD COLUMN customer_name_signed text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'customer_email_signed') THEN
    ALTER TABLE estimates ADD COLUMN customer_email_signed text;
  END IF;
END $$;

-- Add room_id to estimate_line_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'room_id') THEN
    ALTER TABLE estimate_line_items ADD COLUMN room_id uuid REFERENCES proposal_rooms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add unread_customer_messages to deals for badge purposes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'unread_customer_messages') THEN
    ALTER TABLE deals ADD COLUMN unread_customer_messages integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE proposal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_messages ENABLE ROW LEVEL SECURITY;

-- Public access policies (demo)
CREATE POLICY "anon_select_proposal_rooms" ON proposal_rooms FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_proposal_rooms" ON proposal_rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_proposal_rooms" ON proposal_rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_proposal_rooms" ON proposal_rooms FOR DELETE TO anon USING (true);

CREATE POLICY "anon_select_proposal_messages" ON proposal_messages FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_proposal_messages" ON proposal_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_proposal_messages" ON proposal_messages FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_proposal_messages" ON proposal_messages FOR DELETE TO anon USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_rooms_deal_id ON proposal_rooms(deal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_rooms_estimate_id ON proposal_rooms(estimate_id);
CREATE INDEX IF NOT EXISTS idx_proposal_messages_estimate_id ON proposal_messages(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_room_id ON estimate_line_items(room_id);