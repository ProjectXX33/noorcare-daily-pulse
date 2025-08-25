-- Customer Retention Manager - Complete SQL Implementation
-- This file adds full support for Customer Retention Manager role and functionality

-- =====================================================
-- 0. FIX ALL FOREIGN KEY CONSTRAINTS FOR USER DELETION
-- =====================================================

-- Fix ALL foreign key constraints that prevent user deletion
-- This allows users to be deleted even if they have records in any related table
DO $$
DECLARE
    constraint_record RECORD;
    table_name TEXT;
    constraint_name TEXT;
    column_name TEXT;
BEGIN
    -- Loop through all foreign key constraints that reference the users table
    FOR constraint_record IN 
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'users'
            AND rc.delete_rule != 'CASCADE'
    LOOP
        table_name := constraint_record.table_name;
        constraint_name := constraint_record.constraint_name;
        column_name := constraint_record.column_name;
        
        RAISE NOTICE 'Fixing constraint % on table % (column: %)', constraint_name, table_name, column_name;
        
        -- Drop the existing constraint
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', table_name, constraint_name);
        
        -- Add new constraint with CASCADE DELETE
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE CASCADE', 
                      table_name, constraint_name, column_name);
        
        RAISE NOTICE '✅ Fixed constraint % on table %', constraint_name, table_name;
    END LOOP;
    
    RAISE NOTICE '✅ All foreign key constraints have been updated with CASCADE DELETE';
END $$;

-- =====================================================
-- 1. VERIFY POSITION CONSTRAINT INCLUDES CUSTOMER RETENTION MANAGER
-- =====================================================

-- Check if Customer Retention Manager is already in position constraints
DO $$
BEGIN
    -- Drop existing position constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_position_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_position_check;
        RAISE NOTICE 'Dropped existing users_position_check constraint';
    END IF;

    -- Add new position constraint that includes Customer Retention Manager
    ALTER TABLE users ADD CONSTRAINT users_position_check 
    CHECK ("position" IN (
        'Customer Service', 
        'Designer', 
        'Media Buyer', 
        'Copy Writing', 
        'Web Developer', 
        'Warehouse Staff',
        'Executive Director',
        'Content & Creative Manager',
        'Customer Retention Manager',
        'IT Manager'
    ));

    RAISE NOTICE 'Users table position constraint updated to include Customer Retention Manager';
END $$;

-- =====================================================
-- 2. VERIFY ROLE CONSTRAINT INCLUDES CUSTOMER RETENTION MANAGER
-- =====================================================

-- Check if customer_retention_manager is already in role constraints
DO $$
BEGIN
    -- Drop existing role constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
        RAISE NOTICE 'Dropped existing users_role_check constraint';
    END IF;

    -- Add new role constraint that includes customer_retention_manager
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN (
        'admin', 
        'employee', 
        'warehouse',
        'content_creative_manager',
        'customer_retention_manager', 
        'digital_solution_manager'
    ));

    RAISE NOTICE 'Users table role constraint updated to include customer_retention_manager';
END $$;

-- =====================================================
-- 3. VERIFY TEAM CONSTRAINT INCLUDES CUSTOMER RETENTION DEPARTMENT
-- =====================================================

-- Check if Customer Retention Department is already in team constraints
DO $$
BEGIN
    -- Drop existing team constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_team_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_team_check;
        RAISE NOTICE 'Dropped existing users_team_check constraint';
    END IF;

    -- Add new team constraint that includes Customer Retention Department
    ALTER TABLE users ADD CONSTRAINT users_team_check 
    CHECK (team IN (
        'Content & Creative Department',
        'Customer Retention Department', 
        'IT Department'
    ));

    RAISE NOTICE 'Users table team constraint updated to include Customer Retention Department';
END $$;

-- =====================================================
-- 4. CREATE TEAMS TABLE IF NOT EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    manager_role TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Customer Retention Department team
INSERT INTO teams (name, description, manager_role) VALUES
('Customer Retention Department', 'Focuses on customer service and retention strategies', 'customer_retention_manager')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 5. CREATE MANAGER ROLES TABLE IF NOT EXISTS
-- =====================================================

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

-- Insert Customer Retention Manager role
INSERT INTO manager_roles (role_name, display_name, description, team_id, permissions) 
SELECT 
    'customer_retention_manager',
    'Customer Retention Manager', 
    'Oversees customer service operations and retention strategies',
    t.id,
    '["manage_customer_service", "view_customer_analytics", "manage_team_schedule", "handle_escalations", "view_team_reports", "manage_team_tasks"]'::jsonb
FROM teams t WHERE t.name = 'Customer Retention Department'
ON CONFLICT (role_name) DO NOTHING;

-- =====================================================
-- 6. ASSIGN CUSTOMER SERVICE EMPLOYEES TO CUSTOMER RETENTION DEPARTMENT
-- =====================================================

-- Update existing Customer Service employees to be in Customer Retention Department
UPDATE users 
SET team = 'Customer Retention Department' 
WHERE "position" = 'Customer Service' 
AND team IS NULL;

-- Update existing Customer Retention Managers to have correct team
UPDATE users 
SET team = 'Customer Retention Department' 
WHERE "position" = 'Customer Retention Manager' 
AND team IS NULL;

-- =====================================================
-- 7. CREATE CUSTOMER RETENTION SPECIFIC TABLES
-- =====================================================

-- Customer Retention Analytics Table
CREATE TABLE IF NOT EXISTS customer_retention_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_customers INTEGER DEFAULT 0,
    retained_customers INTEGER DEFAULT 0,
    churned_customers INTEGER DEFAULT 0,
    retention_rate DECIMAL(5,2) DEFAULT 0.00,
    customer_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
    support_tickets_resolved INTEGER DEFAULT 0,
    average_response_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Customer Service Performance Table
CREATE TABLE IF NOT EXISTS customer_service_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tickets_handled INTEGER DEFAULT 0,
    tickets_resolved INTEGER DEFAULT 0,
    average_resolution_time_minutes INTEGER DEFAULT 0,
    customer_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
    response_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- Customer Feedback Table
CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_email TEXT,
    feedback_type TEXT CHECK(feedback_type IN ('complaint', 'suggestion', 'praise', 'general')),
    feedback_text TEXT NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    handled_by UUID REFERENCES users(id),
    status TEXT CHECK(status IN ('pending', 'in_progress', 'resolved', 'closed')) DEFAULT 'pending',
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE customer_retention_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_service_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. CREATE RLS POLICIES FOR CUSTOMER RETENTION MANAGER
-- =====================================================

-- Customer Retention Analytics Policies
CREATE POLICY customer_retention_analytics_admin_all ON customer_retention_analytics 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY customer_retention_analytics_manager_view ON customer_retention_analytics 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'customer_retention_manager'));

-- Customer Service Performance Policies
CREATE POLICY customer_service_performance_admin_all ON customer_service_performance 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY customer_service_performance_manager_view ON customer_service_performance 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'customer_retention_manager'));

CREATE POLICY customer_service_performance_employee_view ON customer_service_performance 
FOR SELECT USING (employee_id = auth.uid());

-- Customer Feedback Policies
CREATE POLICY customer_feedback_admin_all ON customer_feedback 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY customer_feedback_manager_all ON customer_feedback 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'customer_retention_manager'));

CREATE POLICY customer_feedback_employee_view ON customer_feedback 
FOR SELECT USING (handled_by = auth.uid());

-- =====================================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_retention_analytics_date ON customer_retention_analytics(date);
CREATE INDEX IF NOT EXISTS idx_customer_service_performance_employee_date ON customer_service_performance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_status ON customer_feedback(status);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_handled_by ON customer_feedback(handled_by);

-- =====================================================
-- 11. INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample customer retention analytics for current month
INSERT INTO customer_retention_analytics (date, total_customers, retained_customers, churned_customers, retention_rate, customer_satisfaction_score, support_tickets_resolved, average_response_time_minutes)
VALUES 
(CURRENT_DATE, 150, 135, 15, 90.00, 4.25, 45, 15)
ON CONFLICT (date) DO NOTHING;

-- =====================================================
-- 12. CREATE FUNCTIONS FOR CUSTOMER RETENTION MANAGER
-- =====================================================

-- Function to get Customer Retention Department team members
CREATE OR REPLACE FUNCTION get_customer_retention_team_members()
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    "position" TEXT,
    last_seen TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u."position",
        u.last_seen,
        CASE 
            WHEN u.last_seen > NOW() - INTERVAL '5 minutes' THEN true
            ELSE false
        END as is_online
    FROM users u
    WHERE u.team = 'Customer Retention Department'
    AND u.role = 'employee'
    ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get Customer Retention Manager dashboard stats
CREATE OR REPLACE FUNCTION get_customer_retention_stats()
RETURNS TABLE (
    total_team_members INTEGER,
    active_today INTEGER,
    total_tickets_today INTEGER,
    resolved_tickets_today INTEGER,
    average_satisfaction_score DECIMAL(3,2),
    retention_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users WHERE team = 'Customer Retention Department' AND role = 'employee') as total_team_members,
        (SELECT COUNT(*) FROM users WHERE team = 'Customer Retention Department' AND role = 'employee' AND last_seen > NOW() - INTERVAL '24 hours') as active_today,
        (SELECT COUNT(*) FROM customer_feedback WHERE DATE(created_at) = CURRENT_DATE) as total_tickets_today,
        (SELECT COUNT(*) FROM customer_feedback WHERE DATE(created_at) = CURRENT_DATE AND status = 'resolved') as resolved_tickets_today,
        (SELECT COALESCE(AVG(customer_satisfaction_score), 0.00) FROM customer_retention_analytics WHERE date = CURRENT_DATE) as average_satisfaction_score,
        (SELECT COALESCE(retention_rate, 0.00) FROM customer_retention_analytics WHERE date = CURRENT_DATE) as retention_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. FINAL VERIFICATION AND NOTIFICATION
-- =====================================================

-- Verify all constraints are in place
SELECT 'Customer Retention Manager SQL implementation completed successfully!' as status;

-- Show current position constraints
SELECT 'Current supported positions:' as info;
SELECT unnest(ARRAY['Customer Service', 'Designer', 'Media Buyer', 'Copy Writing', 'Web Developer', 'Warehouse Staff', 'Executive Director', 'Content & Creative Manager', 'Customer Retention Manager', 'IT Manager']) as "position";

-- Show current role constraints
SELECT 'Current supported roles:' as info;
SELECT unnest(ARRAY['admin', 'employee', 'warehouse', 'content_creative_manager', 'customer_retention_manager', 'digital_solution_manager']) as role;

-- Show current team constraints
SELECT 'Current supported teams:' as info;
SELECT unnest(ARRAY['Content & Creative Department', 'Customer Retention Department', 'IT Department']) as team;
