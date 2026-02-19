-- Migration: Add username column to profiles and create connections table
-- Date: 2025-02-19

-- 1. Add username column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT DEFAULT '';

-- 2. Create unique index on username (partial - only non-empty values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username 
  ON profiles(username) WHERE username IS NOT NULL AND username != '';

-- 3. Create connections table for friend/follow system
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_connection UNIQUE (requester_id, target_id)
);

-- 4. Create indexes for connections
CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- 5. Enable RLS on connections
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for connections
CREATE POLICY "Users can view own connections" ON connections 
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "Users can insert connections" ON connections 
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update connections they received" ON connections 
  FOR UPDATE USING (auth.uid() = target_id);
CREATE POLICY "Users can delete own connections" ON connections 
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = target_id);
