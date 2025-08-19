-- Quick fix for the syntax error in teams and manager roles implementation
-- This fixes the PostgreSQL reserved keyword issue with 'position'

-- Step 1: Add team column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS team TEXT;

-- Step 2: Update role constraints to include new manager roles
DO $$
BEGIN
    -- Drop existing role constraint if it exists
    BEGIN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;

    -- Add new role constraint that includes all roles including manager roles
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN (
        'admin', 
        'employee', 
        'warehouse',
        'content_creative_manager',
        'customer_retention_manager', 
        'digital_solution_manager'
    ));

    RAISE NOTICE 'Users table role constraint updated to include manager roles';
END $$;

-- Step 3: Add team constraint
DO $$
BEGIN
    -- Add team constraint
    ALTER TABLE users ADD CONSTRAINT users_team_check 
    CHECK (team IN (
        'Content & Creative Department',
        'Customer Retention Department', 
        'IT Department'
    ));

    RAISE NOTICE 'Users table team constraint added';
END $$;

-- Step 4: Create teams reference table for better management
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    manager_role TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Insert the team data
INSERT INTO teams (name, description, manager_role) VALUES
('Content & Creative Department', 'Handles creative content, design, and copywriting tasks', 'content_creative_manager'),
('Customer Retention Department', 'Focuses on customer service and retention strategies', 'customer_retention_manager'),
('IT Department', 'Manages technical infrastructure and development', 'digital_solution_manager')
ON CONFLICT (name) DO NOTHING;

-- Step 6: Create manager_roles reference table
CREATE TABLE IF NOT EXISTS manager_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    team_id UUID REFERENCES teams(id),
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 7: Insert manager role data
INSERT INTO manager_roles (role_name, display_name, description, team_id, permissions) 
SELECT 
    'content_creative_manager',
    'Content & Creative Manager',
    'Manages content creation, design, and creative campaigns',
    t.id,
    '["manage_team_tasks", "approve_content", "assign_projects", "view_team_analytics"]'::jsonb
FROM teams t WHERE t.name = 'Content & Creative Department'
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO manager_roles (role_name, display_name, description, team_id, permissions)
SELECT 
    'customer_retention_manager',
    'Customer Retention Manager', 
    'Oversees customer service operations and retention strategies',
    t.id,
    '["manage_customer_service", "view_customer_analytics", "manage_team_schedule", "handle_escalations"]'::jsonb
FROM teams t WHERE t.name = 'Customer Retention Department'
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO manager_roles (role_name, display_name, description, team_id, permissions)
SELECT 
    'digital_solution_manager',
    'Digital Solution Department Manager',
    'Manages IT infrastructure, development projects, and digital solutions',
    t.id,
    '["manage_it_projects", "system_administration", "tech_team_management", "development_oversight"]'::jsonb
FROM teams t WHERE t.name = 'IT Department'
ON CONFLICT (role_name) DO NOTHING;

-- Step 8: Update department constraints to better align with teams
DO $$
BEGIN
    -- Drop existing department constraint if it exists
    BEGIN
        ALTER TABLE users DROP CONSTRAINT users_department_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;

    -- Add new department constraint that aligns better with teams
    ALTER TABLE users ADD CONSTRAINT users_department_check 
    CHECK (department IN (
        'Engineering', 
        'Medical', 
        'General', 
        'Management',
        'Creative',
        'Customer Service',
        'IT & Development'
    ));

    RAISE NOTICE 'Users table department constraint updated';
END $$;

-- Step 9: Add team assignment audit table for tracking changes
CREATE TABLE IF NOT EXISTS team_assignments_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    old_team TEXT,
    new_team TEXT,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- Step 10: Add RLS policies for the new tables
-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments_audit ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Teams are viewable by all authenticated users" ON teams
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teams are manageable by admins and managers" ON teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'content_creative_manager', 'customer_retention_manager', 'digital_solution_manager')
        )
    );

-- Manager roles policies  
CREATE POLICY "Manager roles are viewable by all authenticated users" ON manager_roles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Manager roles are manageable by admins only" ON manager_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Team assignments audit policies
CREATE POLICY "Team assignment audit viewable by admins and managers" ON team_assignments_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'content_creative_manager', 'customer_retention_manager', 'digital_solution_manager')
        )
    );

CREATE POLICY "Team assignment audit manageable by admins and managers" ON team_assignments_audit
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'content_creative_manager', 'customer_retention_manager', 'digital_solution_manager')
        )
    );

-- Step 11: Create function to log team assignment changes
CREATE OR REPLACE FUNCTION log_team_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if team actually changed
    IF OLD.team IS DISTINCT FROM NEW.team THEN
        INSERT INTO team_assignments_audit (user_id, old_team, new_team, assigned_by)
        VALUES (NEW.id, OLD.team, NEW.team, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create trigger for team assignment changes
DROP TRIGGER IF EXISTS team_assignment_change_trigger ON users;
CREATE TRIGGER team_assignment_change_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_team_assignment_change();

-- Step 13: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_team_assignments_audit_user_id ON team_assignments_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_audit_assigned_at ON team_assignments_audit(assigned_at);

-- Step 14: Update existing data - set default teams based on positions (optional)
-- You can customize this based on your current employee positions
UPDATE users SET team = 'Content & Creative Department' 
WHERE position IN ('Designer', 'Copy Writing') AND team IS NULL;

UPDATE users SET team = 'Customer Retention Department' 
WHERE position IN ('Customer Service') AND team IS NULL;

UPDATE users SET team = 'IT Department' 
WHERE position IN ('Web Developer') AND team IS NULL;

-- Step 15: Create helper function to get team members (FIXED)
CREATE OR REPLACE FUNCTION get_team_members(team_name TEXT)
RETURNS TABLE (
    id UUID,
    username TEXT,
    name TEXT,
    email TEXT,
    role TEXT,
    department TEXT,
    user_position TEXT  -- Changed from 'position' to avoid reserved keyword
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.name,
        u.email,
        u.role,
        u.department,
        u."position"  -- Quoted to handle reserved keyword
    FROM users u
    WHERE u.team = team_name
    ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 16: Create helper function to get manager info
CREATE OR REPLACE FUNCTION get_team_manager(team_name TEXT)
RETURNS TABLE (
    id UUID,
    username TEXT,
    name TEXT,
    email TEXT,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.name,
        u.email,
        u.role
    FROM users u
    JOIN teams t ON u.team = t.name
    JOIN manager_roles mr ON t.manager_role = mr.role_name
    WHERE t.name = team_name 
    AND u.role = mr.role_name
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE teams IS 'Team definitions and management';
COMMENT ON TABLE manager_roles IS 'Manager role definitions with permissions';
COMMENT ON TABLE team_assignments_audit IS 'Audit trail for team assignment changes';
COMMENT ON FUNCTION get_team_members(TEXT) IS 'Helper function to retrieve all members of a specific team';
COMMENT ON FUNCTION get_team_manager(TEXT) IS 'Helper function to get the manager of a specific team';

-- Final notification
SELECT 'Teams and manager roles have been successfully added to the database! Syntax error fixed.' as status;


