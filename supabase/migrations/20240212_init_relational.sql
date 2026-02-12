-- ============================================
-- Relational Database Migration
-- Moving from JSONB blobs to detailed tables
-- ============================================

-- 1. Decks Table
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT, -- Optional description
    settings JSONB DEFAULT '{}'::jsonb, -- Deck-specific settings
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cards Table
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    term TEXT NOT NULL,
    definition TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- SRS (Spaced Repetition) Data
    -- We can store this as JSON for flexibility, or detailed columns.
    -- For now, keep it structured but easy to migrate.
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

-- 3. Review Logs (History)
-- To track every review event for analytics
CREATE TABLE IF NOT EXISTS review_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
    
    grade INTEGER CHECK (grade >= 1 AND grade <= 4), -- 1=Again, 2=Hard, 3=Good, 4=Easy
    elapsed_time INTEGER, -- milliseconds spent
    scheduled_days INTEGER, -- interval given
    review_state TEXT, -- 'learning', 'review', 'relearning'
    
    created_at TIMESTAMPTZ DEFAULT NOW() -- When the review happened
);

-- ============================================
-- RLS Policies
-- ============================================

-- Decks
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own decks" ON decks
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Cards
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cards" ON cards
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Review Logs
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own logs" ON review_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own logs" ON review_logs
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX idx_decks_user ON decks(user_id);
CREATE INDEX idx_cards_deck ON cards(deck_id);
CREATE INDEX idx_cards_user ON cards(user_id);
CREATE INDEX idx_cards_due ON cards((review_data->>'due')); -- Useful for "Get Due Cards" query
CREATE INDEX idx_logs_user_date ON review_logs(user_id, created_at);

-- ============================================
-- Auto-update updated_at triggers
-- ============================================
CREATE TRIGGER update_decks_modtime BEFORE UPDATE ON decks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_modtime BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
