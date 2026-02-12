-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'DEBUG')),
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert access for authenticated and anonymous users
CREATE POLICY "Enable insert for all users" ON system_logs FOR INSERT WITH CHECK (true);

-- Allow select only for service role (admin) or maybe own logs?
-- For now, let's say users can see their own logs if needed, but mainly for admin.
CREATE POLICY "Users can view own logs" ON system_logs FOR SELECT USING (auth.uid() = user_id);

-- Create function to auto-delete old logs
CREATE OR REPLACE FUNCTION delete_old_logs() RETURNS TRIGGER AS $$
BEGIN
    -- Delete logs older than 7 days
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '7 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run auto-delete on every insert
-- (Efficiency note: This runs on every log insert. For high volume, a cron job is better, 
-- but for this app, a trigger is simple and self-contained).
CREATE TRIGGER trigger_delete_old_logs
    AFTER INSERT ON system_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION delete_old_logs();
