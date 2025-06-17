-- QUICK FIX FOR MISSING CAMPAIGN TABLES
-- Run this immediately to fix campaign creation errors

-- 1. CREATE campaign_performance_tracking table (MISSING!)
CREATE TABLE IF NOT EXISTS campaign_performance_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES custom_campaign_strategies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Performance Data (match the application code exactly)
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

-- 2. Fix custom_campaign_strategies table - add missing columns
ALTER TABLE custom_campaign_strategies 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 3. Fix RLS permissions for campaign_performance_tracking
ALTER TABLE campaign_performance_tracking ENABLE ROW LEVEL SECURITY;

-- Allow users to insert/update their own performance data
CREATE POLICY "Users can manage own performance data" ON campaign_performance_tracking
    FOR ALL USING (user_id = auth.uid());

-- Allow admins full access
CREATE POLICY "Admins can manage all performance data" ON campaign_performance_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.role = 'Admin')
        )
    );

-- 4. Grant permissions
GRANT ALL ON campaign_performance_tracking TO authenticated;

-- 5. Test campaign creation function
CREATE OR REPLACE FUNCTION test_campaign_fix()
RETURNS TEXT AS $$
DECLARE
    test_id UUID;
    user_id UUID;
BEGIN
    -- Get a user ID
    SELECT id INTO user_id FROM users LIMIT 1;
    
    IF user_id IS NULL THEN
        RETURN 'ERROR: No users found in database';
    END IF;
    
    -- Try to create a test campaign
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
        'Test Campaign Fix',
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
    
    RETURN 'SUCCESS: Campaign creation is now working!';
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_campaign_fix(); 