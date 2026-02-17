-- ============================================
-- Migration: Teacher-Student Platform
-- Adds roles, groups, assignments, XP system
-- Run AFTER the base schema.sql
-- ============================================

-- ============================================
-- 1. ADD ROLE TO PROFILES
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student' 
    CHECK (role IN ('student', 'teacher', 'admin'));

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- 2. GROUPS (Classrooms)
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    join_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
    color TEXT DEFAULT '#6366F1',
    max_members INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_join_code ON groups(join_code);

-- ============================================
-- 3. GROUP MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- ============================================
-- 4. ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ,
    xp_reward INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_group ON assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_deadline ON assignments(deadline);

-- ============================================
-- 5. ASSIGNMENT DECKS (which decks are part of an assignment)
-- Copy model: teacher attaches deck IDs, cards are copied to student
-- ============================================
CREATE TABLE IF NOT EXISTS assignment_decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    source_deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
    deck_name TEXT NOT NULL,
    card_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_decks_assignment ON assignment_decks(assignment_id);

-- ============================================
-- 6. STUDENT ASSIGNMENT PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    cards_total INTEGER DEFAULT 0,
    cards_studied INTEGER DEFAULT 0,
    cards_mastered INTEGER DEFAULT 0,
    accuracy NUMERIC(5,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_studied_at TIMESTAMPTZ,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_assignment ON student_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_status ON student_progress(status);

-- ============================================
-- 7. XP EVENTS (Gamification Ledger)
-- ============================================
CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'review', 'assignment_complete', 'streak_bonus', 
        'perfect_score', 'daily_goal', 'first_review'
    )),
    xp_amount INTEGER NOT NULL,
    source_id UUID,  -- assignment_id or deck_id
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id, created_at DESC);

-- Add total_xp and streak to profiles for fast lookups
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- ============================================
-- 8. NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'assignment_new', 'assignment_deadline', 'assignment_graded',
        'group_invite', 'xp_earned', 'streak_milestone', 'system'
    )),
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- 9. DECK SHARING (Public/Private Links)
-- ============================================
ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_decks_share_code ON decks(share_code) WHERE share_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decks_public ON decks(is_public) WHERE is_public = TRUE;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Group owners can update" ON groups
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Group owners can delete" ON groups
    FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Members can view their groups" ON groups
    FOR SELECT USING (
        auth.uid() = owner_id 
        OR EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = groups.id 
            AND group_members.user_id = auth.uid()
        )
    );

-- Allow anyone to look up a group by join code (for joining)
CREATE POLICY "Anyone can look up by join code" ON groups
    FOR SELECT USING (join_code IS NOT NULL);

-- Group Members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group owners manage members" ON group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_members.group_id 
            AND groups.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their memberships" ON group_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can join groups" ON group_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON group_members
    FOR DELETE USING (auth.uid() = user_id);

-- Assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own assignments" ON assignments
    FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Group members can view assignments" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = assignments.group_id 
            AND group_members.user_id = auth.uid()
        )
    );

-- Assignment Decks
ALTER TABLE assignment_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage assignment decks" ON assignment_decks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_decks.assignment_id 
            AND assignments.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Members can view assignment decks" ON assignment_decks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a 
            JOIN group_members gm ON gm.group_id = a.group_id 
            WHERE a.id = assignment_decks.assignment_id 
            AND gm.user_id = auth.uid()
        )
    );

-- Student Progress
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own progress" ON student_progress
    FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Teachers view student progress" ON student_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a 
            WHERE a.id = student_progress.assignment_id 
            AND a.teacher_id = auth.uid()
        )
    );

-- XP Events
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own XP" ON xp_events
    FOR ALL USING (auth.uid() = user_id);

-- Teachers can view XP of students in their groups
CREATE POLICY "Teachers view group student XP" ON xp_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm 
            JOIN groups g ON g.id = gm.group_id 
            WHERE gm.user_id = xp_events.user_id 
            AND g.owner_id = auth.uid()
        )
    );

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications" ON notifications
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- UPDATE DECKS RLS for public/shared decks
-- ============================================

-- Drop existing policy and replace with expanded one
DROP POLICY IF EXISTS "Users manage own decks" ON decks;

CREATE POLICY "Users manage own decks" ON decks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public decks are viewable" ON decks
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Shared decks viewable by code" ON decks
    FOR SELECT USING (share_code IS NOT NULL);

-- ============================================
-- UPDATE CARDS RLS for public deck cards
-- ============================================
CREATE POLICY "Public deck cards viewable" ON cards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards.deck_id 
            AND (decks.is_public = TRUE OR decks.share_code IS NOT NULL)
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for new tables
DROP TRIGGER IF EXISTS update_groups_modtime ON groups;
CREATE TRIGGER update_groups_modtime 
    BEFORE UPDATE ON groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_modtime ON assignments;
CREATE TRIGGER update_assignments_modtime 
    BEFORE UPDATE ON assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_progress_modtime ON student_progress;
CREATE TRIGGER update_student_progress_modtime 
    BEFORE UPDATE ON student_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- UPDATE handle_new_user to include role
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
    );
    INSERT INTO public.user_data (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Award XP and update profile total
-- ============================================
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_event_type TEXT,
    p_xp_amount INTEGER,
    p_source_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
    -- Insert XP event
    INSERT INTO xp_events (user_id, event_type, xp_amount, source_id, metadata)
    VALUES (p_user_id, p_event_type, p_xp_amount, p_source_id, p_metadata);
    
    -- Update profile total
    UPDATE profiles 
    SET total_xp = total_xp + p_xp_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update streak on activity
-- ============================================
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_last_date DATE;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT last_activity_date INTO v_last_date
    FROM profiles WHERE id = p_user_id;
    
    IF v_last_date IS NULL OR v_last_date < v_today - INTERVAL '1 day' THEN
        -- Streak broken or first activity
        UPDATE profiles 
        SET current_streak = 1, 
            last_activity_date = v_today,
            longest_streak = GREATEST(longest_streak, 1),
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
        -- Consecutive day
        UPDATE profiles 
        SET current_streak = current_streak + 1,
            last_activity_date = v_today,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;
    -- If last_activity_date = today, do nothing (already counted today)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
