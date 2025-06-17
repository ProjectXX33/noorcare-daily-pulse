-- FIXED CAMPAIGN TABLES - No Syntax Errors
-- Run this to fix all campaign table issues

-- 1. CREATE campaign_performance_tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS campaign_performance_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES custom_campaign_strategies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Performance Data
    actual_spent DECIMAL(10,2) DEFAULT 0.00,
    actual_revenue DECIMAL(10,2) DEFAULT 0.00,
    actual_clicks INTEGER DEFAULT 0,
    actual_conversions INTEGER DEFAULT 0,
    
    -- Tracking Info
    tracking_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    optimization_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns to custom_campaign_strategies
ALTER TABLE custom_campaign_strategies 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 3. Enable RLS on campaign_performance_tracking
ALTER TABLE campaign_performance_tracking ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage own performance data" ON campaign_performance_tracking;
DROP POLICY IF EXISTS "Admins can manage all performance data" ON campaign_performance_tracking;

-- 5. Create RLS policies for campaign_performance_tracking
CREATE POLICY "Users can manage own performance data" ON campaign_performance_tracking
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all performance data" ON campaign_performance_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.role = 'Admin')
        )
    );

-- 6. Grant permissions
GRANT ALL ON campaign_performance_tracking TO authenticated;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign_id ON campaign_performance_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_user_id ON campaign_performance_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_active ON campaign_performance_tracking(is_active);

-- 8. Simple test function (fixed syntax)
CREATE OR REPLACE FUNCTION test_campaign_creation_simple()
RETURNS TEXT AS $$
DECLARE
    test_id UUID;
    user_id UUID;
    result_text TEXT;
BEGIN
    -- Get a user ID
    SELECT id INTO user_id FROM users LIMIT 1;
    
    IF user_id IS NULL THEN
        RETURN 'ERROR: No users found in database';
    END IF;
    
    -- Try to create a test campaign
    BEGIN
        INSERT INTO custom_campaign_strategies (
            created_by,
            title,
            description,
            campaign_type,
            priority,
            budget_min,
            budget_recommended,
            budget_max,
            expected_clicks,
            expected_conversions,
            expected_revenue,
            expected_roas,
            target_audiences,
            platforms,
            status
        ) VALUES (
            user_id,
            'Test Campaign Fix - ' || NOW()::TEXT,
            'Testing campaign creation after fix',
            'custom',
            'medium',
            1000,
            2000,
            5000,
            500,
            25,
            1500,
            2.00,
            '["Test Audience"]'::jsonb,
            '["Facebook/Instagram"]'::jsonb,
            'draft'
        ) RETURNING id INTO test_id;
        
        -- Clean up test data
        DELETE FROM custom_campaign_strategies WHERE id = test_id;
        
        result_text := 'SUCCESS: Campaign creation is working! Test ID was: ' || test_id::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
        result_text := 'ERROR: ' || SQLERRM;
    END;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- 9. Check tables function (fixed syntax)
CREATE OR REPLACE FUNCTION check_tables_simple()
RETURNS TEXT AS $$
DECLARE
    custom_campaigns_exists BOOLEAN;
    performance_tracking_exists BOOLEAN;
    result_text TEXT;
BEGIN
    -- Check if tables exist
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'custom_campaign_strategies'
    ) INTO custom_campaigns_exists;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'campaign_performance_tracking'
    ) INTO performance_tracking_exists;
    
    result_text := 'Table Status:' || CHR(10) ||
                   'custom_campaign_strategies: ' || 
                   CASE WHEN custom_campaigns_exists THEN 'EXISTS ✅' ELSE 'MISSING ❌' END || CHR(10) ||
                   'campaign_performance_tracking: ' || 
                   CASE WHEN performance_tracking_exists THEN 'EXISTS ✅' ELSE 'MISSING ❌' END;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- 10. Run the checks and tests
SELECT check_tables_simple() AS table_status;
SELECT test_campaign_creation_simple() AS creation_test; 