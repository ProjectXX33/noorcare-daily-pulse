
-- First, check if tables exist and drop them if needed to start fresh
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS file_attachments;
DROP TABLE IF EXISTS work_reports;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS check_ins;
DROP TABLE IF EXISTS users;

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

-- Create work_reports table
CREATE TABLE IF NOT EXISTS work_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    tasks_done TEXT NOT NULL,
    issues_faced TEXT,
    plans_for_tomorrow TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create file_attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_report_id UUID NOT NULL REFERENCES work_reports(id),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    related_to TEXT,
    related_id UUID
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY users_select ON users FOR SELECT USING (true);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (true);

-- RLS Policies for tasks table
CREATE POLICY tasks_select ON tasks FOR SELECT USING (true);
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY tasks_delete ON tasks FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for notifications table
CREATE POLICY notifications_select ON notifications FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
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

CREATE POLICY file_attachments_select ON file_attachments FOR SELECT USING (true);
CREATE POLICY file_attachments_insert ON file_attachments FOR INSERT WITH CHECK (true);

-- Create an admin user if not exists
INSERT INTO users (id, username, name, email, role, department, position)
VALUES 
    ('9bfe07eb-e36d-4582-82d9-ecbe215bfc8c', 'admin', 'Admin User', 'Mohamed.salem1107@gmail.com', 'admin', 'Manager', 'Web Developer')
ON CONFLICT (id) DO NOTHING;

-- Enable realtime for tables
-- First ensure that realtime is enabled for the project
BEGIN;
  -- Enable the realtime publication if it doesn't exist
  -- This is only needed once per project
  CREATE PUBLICATION IF NOT EXISTS supabase_realtime;
  
  -- Add tables to the realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
  ALTER PUBLICATION supabase_realtime ADD TABLE users;
  ALTER PUBLICATION supabase_realtime ADD TABLE work_reports;
COMMIT;

-- Enable better error messages on any foreign key conflicts
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey,
  ADD CONSTRAINT tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES users(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey,
  ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES users(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
