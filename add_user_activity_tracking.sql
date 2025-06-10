-- Add user activity tracking columns
-- Run this SQL in your Supabase SQL editor

-- Add last_seen column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance when querying by last_seen
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
CREATE INDEX IF NOT EXISTS idx_users_role_last_seen ON users(role, last_seen);

-- Update existing users to have a last_seen timestamp (optional)
UPDATE users 
SET last_seen = updated_at 
WHERE last_seen IS NULL AND updated_at IS NOT NULL;

-- For users without updated_at, set to created_at
UPDATE users 
SET last_seen = created_at 
WHERE last_seen IS NULL AND created_at IS NOT NULL;

-- For any remaining users, set to current time
UPDATE users 
SET last_seen = NOW() 
WHERE last_seen IS NULL;

-- Create a function to automatically update last_seen on user activity
CREATE OR REPLACE FUNCTION update_user_last_seen(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET last_seen = NOW(), updated_at = NOW() 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_last_seen(UUID) TO authenticated;

-- Create a view for admin dashboard to easily get user activity
CREATE OR REPLACE VIEW user_activity_view AS
SELECT 
  u.id,
  u.name,
  u.username,
  u.email,
  u.department,
  u.position,
  u.role,
  u.last_seen,
  CASE 
    WHEN u.last_seen >= CURRENT_DATE THEN true
    ELSE false
  END as active_today,
  CASE 
    WHEN u.last_seen >= NOW() - INTERVAL '5 minutes' THEN 'Online'
    WHEN u.last_seen >= NOW() - INTERVAL '1 hour' THEN 'Recently Active'
    WHEN u.last_seen >= CURRENT_DATE THEN 'Active Today'
    WHEN u.last_seen >= CURRENT_DATE - INTERVAL '1 day' THEN 'Yesterday'
    WHEN u.last_seen >= CURRENT_DATE - INTERVAL '7 days' THEN 'This Week'
    ELSE 'Inactive'
  END as activity_status
FROM users u
WHERE u.role != 'admin'
ORDER BY u.last_seen DESC;

-- Grant access to the view for admins
GRANT SELECT ON user_activity_view TO authenticated; 