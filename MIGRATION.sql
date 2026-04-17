-- Run these in Supabase SQL Editor (https://app.supabase.com/project/_/sql)
-- Required for new Pestogram features

-- 1. Add dietary and cuisine to recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS dietary text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cuisine text DEFAULT '';

-- 2. Add message privacy to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS message_privacy text DEFAULT 'everyone';

-- 3. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Unique index: one conversation per pair (regardless of order)
CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_idx
  ON conversations (
    LEAST(user1_id::text, user2_id::text),
    GREATEST(user1_id::text, user2_id::text)
  );

-- 4. Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- 5. RLS for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_select" ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conv_update" ON conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 6. RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_select" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "msg_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- 7. Refresh recipes_feed view to include dietary and cuisine
-- (Only run if your view doesn't already include them)
-- Check current view definition first: SELECT definition FROM pg_views WHERE viewname = 'recipes_feed';
-- If needed, recreate:
/*
CREATE OR REPLACE VIEW recipes_feed AS
SELECT
  r.*,
  p.username as author_username,
  p.display_name as author_name,
  p.avatar_url as author_avatar,
  COUNT(DISTINCT l.user_id)::int as likes_count,
  COUNT(DISTINCT c.id)::int as comments_count,
  (SELECT url FROM recipe_photos WHERE recipe_id = r.id AND is_main = true LIMIT 1) as main_photo_url
FROM recipes r
LEFT JOIN profiles p ON p.id = r.user_id
LEFT JOIN likes l ON l.recipe_id = r.id
LEFT JOIN comments c ON c.recipe_id = r.id
GROUP BY r.id, p.username, p.display_name, p.avatar_url;
*/
