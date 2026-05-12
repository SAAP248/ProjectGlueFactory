/*
  # Team Chat Tables

  Creates internal team chat system (Slack/Teams-style) with channels and messages.

  ## New Tables
  1. `team_channels` - Chat channels (general, dispatch, sales, etc.)
     - `id` (uuid, pk)
     - `name` (text) - channel name
     - `description` (text) - optional channel description
     - `is_private` (boolean) - whether channel is private
     - `created_by` (uuid) - optional employee reference
     - `created_at` (timestamptz)
  2. `team_chat_messages` - Internal chat messages
     - `id` (uuid, pk)
     - `channel_id` (uuid, fk team_channels)
     - `sender_id` (uuid) - optional employee reference
     - `sender_name` (text) - display name
     - `body` (text) - message content
     - `created_at` (timestamptz)

  ## Security
  - Enables RLS on both tables.
  - Allows anon read/write for this single-tenant demo app (consistent with
    existing pattern in `allow_anon_select_all_tables.sql`).

  ## Seed
  - Creates default channels: general, dispatch, sales, tech-team, random.
*/

CREATE TABLE IF NOT EXISTS team_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  is_private boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES team_channels(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_name text NOT NULL DEFAULT 'Team Member',
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_chat_messages_channel_created
  ON team_chat_messages (channel_id, created_at);

ALTER TABLE team_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_channels' AND policyname='Anon can view team channels') THEN
    CREATE POLICY "Anon can view team channels" ON team_channels FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_channels' AND policyname='Anon can insert team channels') THEN
    CREATE POLICY "Anon can insert team channels" ON team_channels FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_channels' AND policyname='Anon can update team channels') THEN
    CREATE POLICY "Anon can update team channels" ON team_channels FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_channels' AND policyname='Anon can delete team channels') THEN
    CREATE POLICY "Anon can delete team channels" ON team_channels FOR DELETE TO anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_chat_messages' AND policyname='Anon can view team chat messages') THEN
    CREATE POLICY "Anon can view team chat messages" ON team_chat_messages FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_chat_messages' AND policyname='Anon can insert team chat messages') THEN
    CREATE POLICY "Anon can insert team chat messages" ON team_chat_messages FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_chat_messages' AND policyname='Anon can update team chat messages') THEN
    CREATE POLICY "Anon can update team chat messages" ON team_chat_messages FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_chat_messages' AND policyname='Anon can delete team chat messages') THEN
    CREATE POLICY "Anon can delete team chat messages" ON team_chat_messages FOR DELETE TO anon USING (true);
  END IF;
END $$;

INSERT INTO team_channels (name, description) VALUES
  ('general', 'Company-wide announcements and discussion'),
  ('dispatch', 'Dispatch coordination and scheduling'),
  ('sales', 'Sales team updates and deals'),
  ('tech-team', 'Technician coordination and field support'),
  ('random', 'Non-work chatter and fun stuff')
ON CONFLICT (name) DO NOTHING;

INSERT INTO team_chat_messages (channel_id, sender_name, body)
SELECT c.id, s.sender, s.body
FROM team_channels c
JOIN (VALUES
  ('general', 'Sarah Chen', 'Welcome to Team Chat everyone! Let us keep field and office in sync here.'),
  ('general', 'Mike Rodriguez', 'Sounds good, much easier than email threads.'),
  ('dispatch', 'Dispatch', 'Heads up: 3 emergency calls on the board for tomorrow AM.'),
  ('dispatch', 'Alex Park', 'I can pick up the downtown one, I am already near there.'),
  ('sales', 'Jordan Lee', 'Closed the Summit Industrial deal — $42K install kicking off next week.'),
  ('tech-team', 'Chris Walker', 'Anyone have the override code for DMP panels at Brookside? Customer is locked out.'),
  ('tech-team', 'Sarah Chen', 'Just messaged it to you.'),
  ('random', 'Mike Rodriguez', 'Coffee run at 3pm — who is in?')
) AS s(channel, sender, body) ON s.channel = c.name
WHERE NOT EXISTS (
  SELECT 1 FROM team_chat_messages m WHERE m.channel_id = c.id
);
