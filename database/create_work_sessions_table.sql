-- Create work_sessions table for better session tracking across devices
CREATE TABLE IF NOT EXISTS work_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_out_time TIMESTAMPTZ,
    work_date DATE NOT NULL,
    session_status VARCHAR(20) DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'abandoned')),
    device_info JSONB, -- Store device/browser info
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT work_sessions_user_date_active UNIQUE (user_id, work_date, session_status) DEFERRABLE,
    CONSTRAINT work_sessions_check_times CHECK (check_out_time IS NULL OR check_out_time > check_in_time)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_work_date ON work_sessions(work_date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_date_status ON work_sessions(user_id, work_date, session_status);

-- RLS Policies
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own sessions
CREATE POLICY "Users can view their own work sessions"
    ON work_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Policy for users to insert their own sessions
CREATE POLICY "Users can insert their own work sessions"
    ON work_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own sessions
CREATE POLICY "Users can update their own work sessions"
    ON work_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy for admins to see all sessions
CREATE POLICY "Admins can view all work sessions"
    ON work_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_work_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_work_sessions_updated_at
    BEFORE UPDATE ON work_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_work_sessions_updated_at();

-- Function to get active session for a user
CREATE OR REPLACE FUNCTION get_active_work_session(p_user_id UUID, p_work_date DATE DEFAULT CURRENT_DATE)
RETURNS work_sessions AS $$
DECLARE
    session_record work_sessions;
BEGIN
    SELECT * INTO session_record
    FROM work_sessions
    WHERE user_id = p_user_id
      AND work_date = p_work_date
      AND session_status = 'active'
      AND check_out_time IS NULL
    ORDER BY check_in_time DESC
    LIMIT 1;
    
    RETURN session_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start a work session
CREATE OR REPLACE FUNCTION start_work_session(
    p_user_id UUID,
    p_device_info JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS work_sessions AS $$
DECLARE
    session_record work_sessions;
    current_date DATE := CURRENT_DATE;
BEGIN
    -- Check if there's already an active session today
    SELECT * INTO session_record
    FROM work_sessions
    WHERE user_id = p_user_id
      AND work_date = current_date
      AND session_status = 'active'
      AND check_out_time IS NULL;
    
    IF FOUND THEN
        RAISE EXCEPTION 'User already has an active work session today';
    END IF;
    
    -- Create new session
    INSERT INTO work_sessions (
        user_id,
        check_in_time,
        work_date,
        device_info,
        ip_address,
        session_status
    ) VALUES (
        p_user_id,
        NOW(),
        current_date,
        p_device_info,
        p_ip_address,
        'active'
    ) RETURNING * INTO session_record;
    
    RETURN session_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end a work session
CREATE OR REPLACE FUNCTION end_work_session(
    p_user_id UUID,
    p_work_date DATE DEFAULT CURRENT_DATE
)
RETURNS work_sessions AS $$
DECLARE
    session_record work_sessions;
BEGIN
    -- Find and update the active session
    UPDATE work_sessions
    SET check_out_time = NOW(),
        session_status = 'completed',
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND work_date = p_work_date
      AND session_status = 'active'
      AND check_out_time IS NULL
    RETURNING * INTO session_record;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active work session found for user today';
    END IF;
    
    RETURN session_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 