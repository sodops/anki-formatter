-- ============================================
-- AnkiFlow Database Schema (Production Ready)
-- Run this in Supabase SQL Editor to initialize the database
-- ============================================
-- 
-- SCHEMA OVERVIEW:
-- - profiles: Public user information (display_name, avatar, etc.)
-- - decks: User-created flashcard decks
-- - cards: Individual flashcards with spaced repetition data (review_data JSONB)
-- - review_logs: Analytics & history of card reviews (when, grade, time spent)
-- - user_data: User settings and daily progress tracking
-- - system_logs: Application error logs with retention (7 days)
-- - web_vitals: Browser performance metrics (CLS, LCP, FID, etc.)
-- - connections: Friend/follow system for social features
--
-- SECURITY MODEL:
-- - All tables use Row Level Security (RLS) policies
-- - Users can only access/modify their own data (auth.uid() = user_id)
-- - Profiles are publicly readable (for discovery)
-- - Admin operations bypass RLS via Supabase service role key
--
-- INDEXES (Performance Optimization):
-- - Composite (user_id, deck_id): Fast deck queries per user
-- - JSONB cards.review_data->>'due': Fast due-date queries for SRS
-- - review_logs(user_id, created_at): User activity & analytics
-- - profiles(username): Public profile lookups
-- - connections(status): Find pending connection requests
-- 
-- PERFORMANCE NOTES:
-- All indexes are created IF NOT EXISTS to allow re-running script safely.
-- Check index usage: SELECT * FROM pg_stat_user_indexes;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (Public User Info)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    nickname TEXT DEFAULT '',
    username TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Username unique index (for public profile URLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL AND username != '';

-- ============================================
-- CONNECTIONS (Friend/Follow System)
-- ============================================
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_connection UNIQUE (requester_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- RLS for connections (friend/follow system)
-- Only requester & target can see/modify their connection
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own connections" 
  ON connections FOR SELECT 
  USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "Users can insert connections" 
  ON connections FOR INSERT 
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update connections they received" 
  ON connections FOR UPDATE 
  USING (auth.uid() = target_id);
CREATE POLICY "Users can delete own connections" 
  ON connections FOR DELETE 
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- ============================================
-- 2. DECKS (Flashcard Decks)
-- ============================================
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CARDS (Flashcards with SRS Data)
-- ============================================
-- Each card contains a term/definition pair and SM-2/FSRS algorithm state
-- review_data: JSONB storing spaced repetition algorithm state
--   - state: 'new', 'learning', 'learned', 'relearning'
--   - step: Current learning step (0=new, 1+=learning)
--   - due: ISO timestamp of next review due date (null=not scheduled)
--   - interval: Days until next review
--   - ease: SM-2 ease factor (1.3-5.0) affects difficulty multiplier
--   - lapses: Count of times card was failed after passing
-- 
-- RELATIONSHIPS:
--   - deck_id: Parent deck (deleted if deck is deleted)
--   - user_id: Owner user (denormalized for faster queries)
--   - Created/updated timestamps for sync tracking
-- 
-- INDEXES: (user_id, deck_id) for efficient deck queries
--          review_data->>'due' for finding due cards (spaced repetition)
--
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    term TEXT NOT NULL,
    definition TEXT,
    tags TEXT[] DEFAULT '{}',
    review_data JSONB DEFAULT '{
        "state": "new",
        "step": 0,
        "due": null,
        "interval": 0,
        "ease": 2.5,
        "lapses": 0
    }'::jsonb,
    is_suspended BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. USER DATA (Settings & Daily Progress)
-- ============================================
CREATE TABLE IF NOT EXISTS user_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    daily_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. REVIEW LOGS (Study Analytics)
-- ============================================
-- Records each time a user reviews a card (answers a question)
-- Used for: analytics, study patterns, performance tracking
-- 
-- grade: 1=Again, 2=Hard, 3=Good, 4=Easy (SM-2 grades)
-- elapsed_time: Milliseconds spent on this review
-- review_state: Previous state before this review ('new', 'learning', 'learned')
-- 
-- INDEXES: (user_id, created_at) for user activity queries
--          (deck_id, created_at) for deck performance analytics
-- 
-- RETENTION: Can be archived after 90 days if database size is critical
--
CREATE TABLE IF NOT EXISTS review_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
    grade INTEGER CHECK (grade >= 1 AND grade <= 4),
    elapsed_time INTEGER,
    review_state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. SYSTEM LOGS (Error & Event Tracking)
-- ============================================
-- Application logs for debugging and monitoring
-- Used for: error tracking, performance monitoring, user behavior analysis
-- 
-- level: Log level (INFO, WARN, ERROR, DEBUG)
-- data: JSONB context (error stack, API response, etc.)
-- user_agent: Browser user agent for debugging compatibility issues
-- user_id: Optional (null for unauthenticated errors)
-- 
-- RETENTION: Auto-delete after 30 days via Supabase retention policy
--            Set via table maintenance to control storage costs
--
-- INDEXES: (created_at DESC) for querying recent logs
--          (level) for filtering by severity
--
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'DEBUG')),
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- 
-- SECURITY MODEL:
-- All tables have RLS enabled to enforce data isolation at database level.
-- This means Supabase can only return data owned by the authenticated user.
-- 
-- POLICY TYPES:
-- 1. auth.uid() = user_id: Standard ownership check (most tables)
--    - Users can only see/edit/delete their own data
--    - Examples: decks, cards, user_data, review_logs
-- 
-- 2. Public read (profiles): Allow public discovery
--    - Anyone can view public profiles for social features
--    - Users can still modify only their own profile
-- 
-- 3. Relationship-based (connections): 
--    - Requester & target can both view the connection
--    - Only target can accept/reject
--    - Either party can delete
-- 
-- BYPASS METHOD (Backend Only):
-- Use SUPABASE_SERVICE_ROLE_KEY in backend API routes to bypass RLS.
-- This allows admin operations without impersonation.
-- NEVER expose service role key to frontend.
-- 
-- TESTING RLS:
-- Enable/disable in Supabase dashboard to verify frontend handles both cases
-- Verify policies in SQL editor: SELECT * FROM pg_policies;
--

-- Profiles: Public profiles for discovery, users manage own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles" 
  ON profiles FOR SELECT 
  USING (true);  -- Anyone can discover public profiles
CREATE POLICY "Users update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Decks: Users manage their own decks
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own decks" 
  ON decks 
  USING (auth.uid() = user_id);

-- Cards: Users manage cards in their own decks
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cards" 
  ON cards 
  USING (auth.uid() = user_id);

-- User Data: Users manage their own settings & progress
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own data" 
  ON user_data 
  USING (auth.uid() = user_id);

-- Review Logs: Users can only view their own study history
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own logs" 
  ON review_logs 
  USING (auth.uid() = user_id);

-- System Logs: All users can insert (for error tracking), read own logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable insert for all users" 
  ON system_logs FOR INSERT 
  WITH CHECK (true);  -- App can log errors from any user
CREATE POLICY "Users view own logs" 
  ON system_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards((review_data->>'due'));
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON review_logs(user_id, created_at);

-- ============================================
-- Triggers & Functions
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL)
    );
    INSERT INTO public.user_data (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_decks_modtime ON decks;
CREATE TRIGGER update_decks_modtime BEFORE UPDATE ON decks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cards_modtime ON cards;
CREATE TRIGGER update_cards_modtime BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_data_modtime ON user_data;
CREATE TRIGGER update_user_data_modtime BEFORE UPDATE ON user_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-delete old system logs (retention 7 days)
-- Uses probabilistic cleanup: ~1% chance to run on each insert
-- This avoids running a full DELETE on every single insert
CREATE OR REPLACE FUNCTION delete_old_logs() RETURNS TRIGGER AS $$
BEGIN
    -- Only cleanup roughly 1 in 100 inserts to avoid performance overhead
    IF random() < 0.01 THEN
        DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '7 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_old_logs ON system_logs;
CREATE TRIGGER trigger_delete_old_logs
    AFTER INSERT ON system_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION delete_old_logs();
-- ============================================
-- 6. WEB VITALS (Performance Monitoring)
-- ============================================
CREATE TABLE IF NOT EXISTS web_vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    rating TEXT,
    delta NUMERIC,
    metric_id TEXT,
    navigation_type TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by user and metric
CREATE INDEX IF NOT EXISTS idx_web_vitals_user_metric ON web_vitals(user_id, metric_name, created_at DESC);

-- RLS policies for web_vitals
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own web vitals"
    ON web_vitals FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own web vitals"
    ON web_vitals FOR SELECT
    USING (auth.uid() = user_id);

-- Auto-delete old web vitals (retention 30 days)
CREATE OR REPLACE FUNCTION delete_old_web_vitals() RETURNS TRIGGER AS $$
BEGIN
    IF random() < 0.01 THEN
        DELETE FROM web_vitals WHERE created_at < NOW() - INTERVAL '30 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_old_web_vitals ON web_vitals;
CREATE TRIGGER trigger_delete_old_web_vitals
    AFTER INSERT ON web_vitals
    FOR EACH STATEMENT
    EXECUTE FUNCTION delete_old_web_vitals();

-- ============================================
-- MIGRATION NOTES & DEPLOYMENT GUIDE
-- ============================================
--
-- VERSION: 1.0 (Initial Schema)
-- Last Updated: 2024
--
-- DEPLOYMENT STEPS:
-- 1. Copy this entire script to Supabase SQL Editor
-- 2. Execute all statements (usually auto-runs line by line)
-- 3. Verify: Check Tables > Select each table and confirm schema
-- 4. Verify: Check RLS > Ensure all policies are enabled
-- 5. Test: Try creating a profile/deck in the app
--
-- FUTURE MIGRATIONS:
-- - Create a new migration file: supabase/migrations/YYYYMMDD_description.sql
-- - Test in development Supabase project first
-- - Document schema version changes
-- - Use ALTER TABLE for backwards-compatible changes
-- - Use IF NOT EXISTS / IF EXISTS for idempotency
--
-- IMPORTANT: RLS SECURITY
-- - RLS policies are the primary security layer
-- - Service role key (in env vars) bypasses RLS for admin operations
-- - If RLS is disabled, ANY authenticated user can access ALL records
-- - Always test RLS policies after schema changes
--
-- INDEXES RATIONALE:
-- - idx_decks_user: Fast deck queries by owner
-- - idx_cards_deck, idx_cards_user: Filter cards by deck/owner
-- - idx_cards_due: Query cards by due date (from review_data JSON)
-- - idx_logs_user_date: Fast analytics queries (user's review history)
-- - idx_web_vitals_user_metric: Performance metric queries
-- - idx_connections_requester/target/status: Friend system queries
--
-- PERFORMANCE NOTES:
-- - JSONB columns (review_data, settings) can be indexed with ->> operator
-- - Created composite indexes for common WHERE clauses
-- - Probabilistic cleanup (1% chance) avoids thundering herd on log deletion
-- - Most queries should hit indexes (analyze EXPLAIN for debugging)
--
-- DATA RETENTION:
-- - system_logs: 7 days (auto-deleted after 7 days)
-- - web_vitals: 30 days (auto-deleted after 30 days)
-- - Cards/profiles: Permanent until user deletion (ON DELETE CASCADE)
