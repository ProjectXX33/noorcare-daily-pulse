-- Enhanced Database Schema for NoorCare Daily Pulse
-- This includes all tables including events and proper RLS policies

-- First, check if tables exist and drop them if needed to start fresh
-- Drop tables in reverse dependency order to avoid foreign key constraint errors
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS file_attachments CASCADE;
DROP TABLE IF EXISTS monthly_shifts CASCADE;
DROP TABLE IF EXISTS work_reports CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS work_time_config CASCADE;
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS events CASCADE;  -- Add events table
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'employee')) NOT NULL,
    department TEXT CHECK(department IN ('Engineering', 'IT', 'Doctor', 'Manager')) NOT NULL,
    position TEXT CHECK(position IN ('Customer Service', 'Designer', 'Media Buyer', 'Copy Writing', 'Web Developer')) NOT NULL,
    last_checkin TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{"notifications": {"enabled": true, "email": true}, "theme": "light"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create events table (IMPORTANT: This was missing)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create check_ins table
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checkout_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID NOT NULL REFERENCES users(id),
    status TEXT CHECK(status IN ('On Hold', 'In Progress', 'Complete')) DEFAULT 'On Hold',
    progress_percentage INTEGER CHECK(progress_percentage BETWEEN 0 AND 100) DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create work_reports table
CREATE TABLE IF NOT EXISTS work_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    tasks_done TEXT NOT NULL,
    issues_faced TEXT,
    plans_for_tomorrow TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date) -- Only one report per user per day
);

-- Create file_attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_report_id UUID REFERENCES work_reports(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- NULL means notification is for all users
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create work time configuration table
CREATE TABLE IF NOT EXISTS work_time_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    daily_reset_time TIME NOT NULL DEFAULT '09:00:00',
    work_day_start TIME NOT NULL DEFAULT '09:00:00',
    work_day_end TIME NOT NULL DEFAULT '00:00:00', -- 12 AM next day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create shifts table for Customer Service
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    position TEXT CHECK(position = 'Customer Service') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create monthly shift tracking table
CREATE TABLE IF NOT EXISTS monthly_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    shift_id UUID NOT NULL REFERENCES shifts(id),
    work_date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    regular_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, work_date)
);

-- Enable Row Level Security for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;  -- Enable RLS for events
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_time_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_insert ON users;

-- RLS Policies for users table
CREATE POLICY users_select ON users FOR SELECT USING (id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY users_update ON users FOR UPDATE USING (id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (true);

-- RLS Policies for events table (IMPORTANT: This was missing)
CREATE POLICY events_select ON events FOR SELECT USING (true); -- Everyone can view events
CREATE POLICY events_insert ON events FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
); -- Only admins can create events
CREATE POLICY events_update ON events FOR UPDATE USING (
    created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY events_delete ON events FOR DELETE USING (
    created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for tasks table
CREATE POLICY tasks_select ON tasks FOR SELECT USING (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY tasks_delete ON tasks FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for task_attachments table
CREATE POLICY task_attachments_select ON task_attachments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.id = task_id 
        AND (t.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    )
);
CREATE POLICY task_attachments_insert ON task_attachments FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.id = task_id 
        AND (t.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    )
);
CREATE POLICY task_attachments_delete ON task_attachments FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.id = task_id 
        AND (t.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    )
);

-- RLS Policies for notifications table
CREATE POLICY notifications_select ON notifications FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY notifications_delete ON notifications FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for check_ins, work_reports, and file_attachments
CREATE POLICY check_ins_select ON check_ins FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY check_ins_insert ON check_ins FOR INSERT WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY check_ins_update ON check_ins FOR UPDATE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY work_reports_select ON work_reports FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY work_reports_insert ON work_reports FOR INSERT WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY work_reports_update ON work_reports FOR UPDATE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY work_reports_delete ON work_reports FOR DELETE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY file_attachments_select ON file_attachments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM work_reports wr 
    WHERE wr.id = work_report_id 
    AND (wr.user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  )
);
CREATE POLICY file_attachments_insert ON file_attachments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM work_reports wr 
    WHERE wr.id = work_report_id 
    AND (wr.user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  )
);
CREATE POLICY file_attachments_delete ON file_attachments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM work_reports wr 
    WHERE wr.id = work_report_id 
    AND (wr.user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  )
);

-- RLS Policies for work_time_config table (admin only)
CREATE POLICY work_time_config_select ON work_time_config FOR SELECT USING (true); -- Everyone can read config
CREATE POLICY work_time_config_insert ON work_time_config FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY work_time_config_update ON work_time_config FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY work_time_config_delete ON work_time_config FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for shifts table
CREATE POLICY shifts_select ON shifts FOR SELECT USING (
    position = 'Customer Service' AND 
    (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR position = 'Customer Service')))
);
CREATE POLICY shifts_insert ON shifts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY shifts_update ON shifts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY shifts_delete ON shifts FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for monthly_shifts table
CREATE POLICY monthly_shifts_select ON monthly_shifts FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY monthly_shifts_insert ON monthly_shifts FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY monthly_shifts_update ON monthly_shifts FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY monthly_shifts_delete ON monthly_shifts FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Insert default work time configuration
INSERT INTO work_time_config (name, daily_reset_time, work_day_start, work_day_end)
VALUES ('default', '09:00:00', '09:00:00', '00:00:00')
ON CONFLICT (name) DO NOTHING;

-- Insert default shifts for Customer Service
INSERT INTO shifts (name, start_time, end_time, position)
VALUES 
    ('Day Shift', '09:00:00', '16:00:00', 'Customer Service'),
    ('Night Shift', '16:00:00', '00:00:00', 'Customer Service')
ON CONFLICT DO NOTHING;

-- Add storage policies for attachments bucket
BEGIN;
  -- Create the attachments bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('attachments', 'attachments', false)
  ON CONFLICT (id) DO NOTHING;

  -- Drop existing storage policies
  DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

  -- Allow users to upload their own files
  CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments' AND
    (auth.uid()::text = (storage.foldername(name))[1])
  );

  -- Allow users to read files they have access to
  CREATE POLICY "Users can read their own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

  -- Allow users to delete their own files
  CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );
COMMIT; 