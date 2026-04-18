-- Run these in Supabase SQL Editor (https://app.supabase.com/project/_/sql)
-- Required for new Pestogram features

-- 1. Add dietary, cuisine, dish_type, meal_time to recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS dietary text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cuisine text DEFAULT '';

-- Add dish_type and meal_time as text[] (safe: only adds if missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='dish_type') THEN
    ALTER TABLE recipes ADD COLUMN dish_type text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='meal_time') THEN
    ALTER TABLE recipes ADD COLUMN meal_time text[] DEFAULT '{}';
  END IF;
END $$;

-- 2. Add message privacy and feed mode to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS message_privacy text DEFAULT 'everyone';
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS feed_mode text DEFAULT 'chronological';

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

DROP POLICY IF EXISTS "conv_select" ON conversations;
CREATE POLICY "conv_select" ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conv_insert" ON conversations;
CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conv_update" ON conversations;
CREATE POLICY "conv_update" ON conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 6. RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select" ON messages;
CREATE POLICY "msg_select" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "msg_insert" ON messages;
CREATE POLICY "msg_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "msg_update" ON messages;
CREATE POLICY "msg_update" ON messages FOR UPDATE
  USING (auth.uid() = sender_id OR EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ));

-- 7. Threaded comments: add parent_id + soft delete
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_by_role text;

-- Allow users and moderators to soft-delete (update) comments
DROP POLICY IF EXISTS "Users can soft delete comments" ON comments;
CREATE POLICY "Users can soft delete comments" ON comments FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
  );

-- 8. Fix calories_per check constraint to allow per100g and null
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_calories_per_check;
ALTER TABLE recipes ADD CONSTRAINT recipes_calories_per_check
  CHECK (calories_per IN ('serving', 'total', 'per100g') OR calories_per IS NULL);

-- 9. Add birthdate to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthdate date;

-- Set default birthdate for existing users who don't have one
UPDATE profiles SET birthdate = '1977-01-29' WHERE birthdate IS NULL;

-- 10. Blocks table
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select" ON blocks;
CREATE POLICY "blocks_select" ON blocks FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS "blocks_insert" ON blocks;
CREATE POLICY "blocks_insert" ON blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "blocks_delete" ON blocks;
CREATE POLICY "blocks_delete" ON blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- 11. Recreate recipes_feed view to include all new columns
-- (SELECT * in views is static -- must recreate after adding columns)
DROP VIEW IF EXISTS recipes_feed;
CREATE VIEW recipes_feed AS
SELECT
  r.id, r.user_id, r.title, r.description, r.servings, r.prep_time, r.cook_time,
  r.calories, r.calories_per, r.ingredients, r.steps, r.tags, r.tips, r.lang,
  r.dish_type, r.meal_time, r.dietary, r.cuisine,
  r.created_at, r.updated_at,
  p.username as author_username,
  p.display_name as author_name,
  p.avatar_url as author_avatar,
  COALESCE(lc.cnt, 0)::int as likes_count,
  COALESCE(cc.cnt, 0)::int as comments_count,
  (SELECT url FROM recipe_photos WHERE recipe_id = r.id AND is_main = true LIMIT 1) as main_photo_url
FROM recipes r
JOIN profiles p ON p.id = r.user_id
LEFT JOIN (SELECT recipe_id, COUNT(*) as cnt FROM likes GROUP BY recipe_id) lc ON lc.recipe_id = r.id
LEFT JOIN (SELECT recipe_id, COUNT(*) as cnt FROM comments GROUP BY recipe_id) cc ON cc.recipe_id = r.id;
