-- ============================================
-- AnkiFlow Database Schema (Production Ready)
-- Run this in Supabase SQL Editor to initialize the database
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (Public User Info)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- 3. CARDS (Flashcards)
-- ============================================
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
-- 5. REVIEW LOGS (Analytics)
-- ============================================
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
-- 6. SYSTEM LOGS (Error Tracking)
-- ============================================
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

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Decks
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own decks" ON decks USING (auth.uid() = user_id);

-- Cards
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cards" ON cards USING (auth.uid() = user_id);

-- User Data
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own data" ON user_data USING (auth.uid() = user_id);

-- Review Logs
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own logs" ON review_logs USING (auth.uid() = user_id);

-- System Logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable insert for all users" ON system_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own logs" ON system_logs FOR SELECT USING (auth.uid() = user_id);

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
CREATE OR REPLACE FUNCTION delete_old_logs() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '7 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_old_logs ON system_logs;
CREATE TRIGGER trigger_delete_old_logs
    AFTER INSERT ON system_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION delete_old_logs();