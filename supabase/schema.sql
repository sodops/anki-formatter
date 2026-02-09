-- ============================================
-- AnkiFlow Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- User Data Table
-- Stores all user state as JSONB (decks, cards, settings)
-- ============================================
CREATE TABLE IF NOT EXISTS user_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    state JSONB NOT NULL DEFAULT '{
        "decks": [],
        "activeDeckId": null,
        "searchQuery": "",
        "activeView": "library",
        "showTrash": false,
        "theme": "dark",
        "trash": [],
        "history": []
    }'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    daily_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Profiles Table
-- Public user info (display name, avatar)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS) Policies
-- Each user can ONLY access their own data
-- ============================================

-- Enable RLS on user_data
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- User can read their own data
CREATE POLICY "Users can read own data"
    ON user_data
    FOR SELECT
    USING (auth.uid() = user_id);

-- User can insert their own data
CREATE POLICY "Users can insert own data"
    ON user_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User can update their own data
CREATE POLICY "Users can update own data"
    ON user_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User can delete their own data
CREATE POLICY "Users can delete own data"
    ON user_data
    FOR DELETE
    USING (auth.uid() = user_id);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are publicly readable (for future sharing features)
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles
    FOR SELECT
    USING (true);

-- User can update own profile
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- User can insert own profile
CREATE POLICY "Users can insert own profile"
    ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- Auto-create profile & user_data on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL)
    );

    -- Create empty user_data
    INSERT INTO public.user_data (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_data_updated_at
    BEFORE UPDATE ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
