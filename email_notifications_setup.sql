-- Email Notifications Setup SQL
-- This file contains SQL commands to ensure the database supports email notifications

-- 1. Ensure users table has preferences column with proper structure
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- 2. Update existing users with default preferences if they don't have them
UPDATE users 
SET preferences = jsonb_build_object(
  'notifications', jsonb_build_object(
    'enabled', true,
    'email', true,
    'sound', true
  ),
  'workReminders', jsonb_build_object(
    'checkInReminder', true,
    'checkOutReminder', true,
    'workTimeAlarm', true
  )
)
WHERE preferences IS NULL OR preferences = '{}';

-- 3. Create email_logs table to track sent emails (optional but recommended)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add RLS policies for email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see all email logs
CREATE POLICY "Admins can view all email logs"
ON email_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Users can see their own email logs
CREATE POLICY "Users can view their own email logs"
ON email_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- 6. Ensure users table has proper email column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create unique index on email (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

COMMENT ON TABLE email_logs IS 'Tracks email notifications sent to users';
COMMENT ON COLUMN email_logs.status IS 'Status of email: pending, sent, failed';
COMMENT ON COLUMN users.preferences IS 'User preferences including notification settings'; 