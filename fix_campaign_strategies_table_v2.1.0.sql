-- Fix Campaign Strategies Table for Version 2.1.0
-- This SQL script fixes the campaign creation and approval errors

-- First, check if the table exists and create it if it doesn't
DO $$
BEGIN
    -- Check if custom_campaign_strategies table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'custom_campaign_strategies') THEN
        
        -- Create the table with proper structure
        CREATE TABLE custom_campaign_strategies (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            
            -- Campaign Details
            title VARCHAR(255) NOT NULL,
            description TEXT,
            campaign_type VARCHAR(50) NOT NULL DEFAULT 'custom',
            priority VARCHAR(20) NOT NULL DEFAULT 'medium',
            confidence_score INTEGER DEFAULT 80,
            
            -- Budget Information (in SAR) - Fixed column names
            budget_min INTEGER NOT NULL DEFAULT 1000,
            budget_recommended INTEGER NOT NULL DEFAULT 2000,
            budget_max INTEGER NOT NULL DEFAULT 5000,
            
            -- Duration
            duration_weeks INTEGER NOT NULL DEFAULT 4,
            start_date DATE,
            end_date DATE,
            
            -- Expected Results - Fixed column names to match application
            expected_clicks INTEGER DEFAULT 500,
            expected_conversions INTEGER DEFAULT 25,
            expected_revenue INTEGER DEFAULT 1500,
            expected_roas DECIMAL(4,2) DEFAULT 2.00,
            expected_cpc DECIMAL(6,2) DEFAULT 2.50,
            expected_ctr DECIMAL(5,2) DEFAULT 2.00,
            
            -- Strategy Details (JSON) - Fixed to match application structure
            target_audiences JSONB DEFAULT '["General Audience"]'::jsonb,
            platforms JSONB DEFAULT '["Facebook/Instagram"]'::jsonb,
            ad_formats JSONB DEFAULT '["Single Image"]'::jsonb,
            keywords JSONB DEFAULT '[]'::jsonb,
            
            -- Platform Budget Breakdown (JSON)
            platform_budgets JSONB DEFAULT '{"Facebook/Instagram": {"budget": 2000, "percentage": 100}}'::jsonb,
            
            -- Target Products (JSON array of product IDs)
            target_product_ids JSONB DEFAULT '[]'::jsonb,
            
            -- Campaign Insights and Recommendations (JSON)
            insights JSONB DEFAULT '[]'::jsonb,
            
            -- Status and Metadata
            status VARCHAR(20) DEFAULT 'draft',
            is_template BOOLEAN DEFAULT FALSE,
            is_public BOOLEAN DEFAULT FALSE,
            
            -- Performance Tracking
            actual_spend INTEGER DEFAULT 0,
            actual_clicks INTEGER DEFAULT 0,
            actual_conversions INTEGER DEFAULT 0,
            actual_revenue INTEGER DEFAULT 0,
            actual_roas DECIMAL(4,2) DEFAULT 0.00,
            
            -- AI Analysis
            ai_recommendation_score INTEGER DEFAULT 85,
            ai_optimization_suggestions JSONB DEFAULT '[]'::jsonb,
            
            -- Timestamps
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            launched_at TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE
        );
        
        RAISE NOTICE 'Created custom_campaign_strategies table';
    ELSE
        RAISE NOTICE 'Table custom_campaign_strategies already exists';
    END IF;
END $$;

-- Add missing columns if they don't exist (for existing installations)
DO $$
BEGIN
    -- Add budget_min if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'budget_min') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN budget_min INTEGER NOT NULL DEFAULT 1000;
        RAISE NOTICE 'Added budget_min column';
    END IF;
    
    -- Add budget_recommended if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'budget_recommended') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN budget_recommended INTEGER NOT NULL DEFAULT 2000;
        RAISE NOTICE 'Added budget_recommended column';
    END IF;
    
    -- Add budget_max if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'budget_max') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN budget_max INTEGER NOT NULL DEFAULT 5000;
        RAISE NOTICE 'Added budget_max column';
    END IF;
    
    -- Add expected_clicks if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'expected_clicks') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN expected_clicks INTEGER DEFAULT 500;
        RAISE NOTICE 'Added expected_clicks column';
    END IF;
    
    -- Add expected_conversions if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'expected_conversions') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN expected_conversions INTEGER DEFAULT 25;
        RAISE NOTICE 'Added expected_conversions column';
    END IF;
    
    -- Add expected_revenue if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'expected_revenue') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN expected_revenue INTEGER DEFAULT 1500;
        RAISE NOTICE 'Added expected_revenue column';
    END IF;
    
    -- Add expected_roas if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'expected_roas') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN expected_roas DECIMAL(4,2) DEFAULT 2.00;
        RAISE NOTICE 'Added expected_roas column';
    END IF;
    
    -- Add ai_recommendation_score if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'ai_recommendation_score') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN ai_recommendation_score INTEGER DEFAULT 85;
        RAISE NOTICE 'Added ai_recommendation_score column';
    END IF;
    
    -- Add target_audiences if it doesn't exist with proper default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'target_audiences') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN target_audiences JSONB DEFAULT '["General Audience"]'::jsonb;
        RAISE NOTICE 'Added target_audiences column';
    END IF;
    
    -- Add platforms if it doesn't exist with proper default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'custom_campaign_strategies' AND column_name = 'platforms') THEN
        ALTER TABLE custom_campaign_strategies ADD COLUMN platforms JSONB DEFAULT '["Facebook/Instagram"]'::jsonb;
        RAISE NOTICE 'Added platforms column';
    END IF;
    
END $$;

-- Create or replace indexes for better performance
DROP INDEX IF EXISTS idx_custom_campaigns_created_by;
DROP INDEX IF EXISTS idx_custom_campaigns_type;
DROP INDEX IF EXISTS idx_custom_campaigns_status;
DROP INDEX IF EXISTS idx_custom_campaigns_priority;
DROP INDEX IF EXISTS idx_custom_campaigns_created_at;

CREATE INDEX idx_custom_campaigns_created_by ON custom_campaign_strategies(created_by);
CREATE INDEX idx_custom_campaigns_type ON custom_campaign_strategies(campaign_type);
CREATE INDEX idx_custom_campaigns_status ON custom_campaign_strategies(status);
CREATE INDEX idx_custom_campaigns_priority ON custom_campaign_strategies(priority);
CREATE INDEX idx_custom_campaigns_created_at ON custom_campaign_strategies(created_at);

-- Create GIN indexes for JSONB columns
DROP INDEX IF EXISTS idx_custom_campaigns_platforms;
DROP INDEX IF EXISTS idx_custom_campaigns_target_audiences;
DROP INDEX IF EXISTS idx_custom_campaigns_keywords;
DROP INDEX IF EXISTS idx_custom_campaigns_target_products;

CREATE INDEX idx_custom_campaigns_platforms ON custom_campaign_strategies USING GIN (platforms);
CREATE INDEX idx_custom_campaigns_target_audiences ON custom_campaign_strategies USING GIN (target_audiences);
CREATE INDEX idx_custom_campaigns_keywords ON custom_campaign_strategies USING GIN (keywords);
CREATE INDEX idx_custom_campaigns_target_products ON custom_campaign_strategies USING GIN (target_product_ids);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_custom_campaign_updated_at ON custom_campaign_strategies;
CREATE TRIGGER trigger_update_custom_campaign_updated_at
    BEFORE UPDATE ON custom_campaign_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_campaign_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE custom_campaign_strategies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own campaigns and public templates" ON custom_campaign_strategies;
DROP POLICY IF EXISTS "Users can create campaigns" ON custom_campaign_strategies;
DROP POLICY IF EXISTS "Users can update own campaigns" ON custom_campaign_strategies;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON custom_campaign_strategies;
DROP POLICY IF EXISTS "Admins have full access" ON custom_campaign_strategies;

-- Recreate RLS policies with better error handling
CREATE POLICY "Users can view own campaigns and public templates" ON custom_campaign_strategies
    FOR SELECT USING (
        created_by = auth.uid() OR 
        is_public = true OR 
        is_template = true
    );

CREATE POLICY "Users can create campaigns" ON custom_campaign_strategies
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
    );

CREATE POLICY "Users can update own campaigns" ON custom_campaign_strategies
    FOR UPDATE USING (
        created_by = auth.uid()
    );

CREATE POLICY "Users can delete own campaigns" ON custom_campaign_strategies
    FOR DELETE USING (
        created_by = auth.uid() AND 
        (is_template = false OR is_template IS NULL)
    );

-- Admin policy with better user check
CREATE POLICY "Admins have full access" ON custom_campaign_strategies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.role = 'Admin')
        )
    );

-- Media Buyer policy - allow media buyers to create and manage campaigns
CREATE POLICY "Media buyers can manage campaigns" ON custom_campaign_strategies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.position = 'Media Buyer'
        )
    );

-- Fix any NULL values in existing data
UPDATE custom_campaign_strategies 
SET 
    budget_min = COALESCE(budget_min, 1000),
    budget_recommended = COALESCE(budget_recommended, 2000),
    budget_max = COALESCE(budget_max, 5000),
    expected_clicks = COALESCE(expected_clicks, 500),
    expected_conversions = COALESCE(expected_conversions, 25),
    expected_revenue = COALESCE(expected_revenue, 1500),
    expected_roas = COALESCE(expected_roas, 2.00),
    ai_recommendation_score = COALESCE(ai_recommendation_score, 85),
    target_audiences = COALESCE(target_audiences, '["General Audience"]'::jsonb),
    platforms = COALESCE(platforms, '["Facebook/Instagram"]'::jsonb),
    campaign_type = COALESCE(campaign_type, 'custom'),
    priority = COALESCE(priority, 'medium'),
    status = COALESCE(status, 'draft')
WHERE 
    budget_min IS NULL OR 
    budget_recommended IS NULL OR 
    budget_max IS NULL OR
    expected_clicks IS NULL OR 
    expected_conversions IS NULL OR 
    expected_revenue IS NULL OR
    target_audiences IS NULL OR
    platforms IS NULL;

-- Create a debug function to check campaign insertion
CREATE OR REPLACE FUNCTION debug_campaign_insertion(
    p_title VARCHAR(255),
    p_campaign_type VARCHAR(50) DEFAULT 'custom',
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    can_insert BOOLEAN,
    user_exists BOOLEAN,
    user_role TEXT,
    user_position TEXT,
    table_exists BOOLEAN,
    rls_enabled BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Check if user can insert
        CASE 
            WHEN u.id IS NOT NULL THEN true 
            ELSE false 
        END as can_insert,
        
        -- Check if user exists
        CASE 
            WHEN u.id IS NOT NULL THEN true 
            ELSE false 
        END as user_exists,
        
        -- User role
        u.role,
        
        -- User position
        u.position,
        
        -- Check if table exists
        CASE 
            WHEN t.table_name IS NOT NULL THEN true 
            ELSE false 
        END as table_exists,
        
        -- Check if RLS is enabled
        CASE 
            WHEN c.relname IS NOT NULL AND c.relrowsecurity THEN true 
            ELSE false 
        END as rls_enabled,
        
        -- Error message
        CASE 
            WHEN u.id IS NULL THEN 'User not found or not authenticated'
            WHEN t.table_name IS NULL THEN 'Table custom_campaign_strategies does not exist'
            WHEN NOT c.relrowsecurity THEN 'RLS not enabled on table'
            ELSE 'OK - Ready for insertion'
        END as error_message
    
    FROM (SELECT p_user_id as uid) auth_check
    LEFT JOIN users u ON u.id = p_user_id
    LEFT JOIN information_schema.tables t ON t.table_name = 'custom_campaign_strategies'
    LEFT JOIN pg_class c ON c.relname = 'custom_campaign_strategies';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the debug function
-- SELECT * FROM debug_campaign_insertion('Test Campaign');

-- Create a simplified insertion function for testing
CREATE OR REPLACE FUNCTION create_test_campaign(
    p_title VARCHAR(255) DEFAULT 'Test Campaign ' || NOW()::TEXT,
    p_description TEXT DEFAULT 'Test campaign created by SQL function'
)
RETURNS UUID AS $$
DECLARE
    campaign_id UUID;
    user_id UUID;
BEGIN
    -- Get current user ID
    user_id := auth.uid();
    
    -- If no user ID, try to get first admin
    IF user_id IS NULL THEN
        SELECT id INTO user_id FROM users WHERE role IN ('admin', 'Admin') LIMIT 1;
    END IF;
    
    -- Insert campaign
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
        p_title,
        p_description,
        'custom',
        'medium',
        1000,
        2000,
        5000,
        500,
        25,
        1500,
        2.00,
        '["General Audience"]'::jsonb,
        '["Facebook/Instagram"]'::jsonb,
        'draft'
    ) RETURNING id INTO campaign_id;
    
    RETURN campaign_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating campaign: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON custom_campaign_strategies TO authenticated;
GRANT ALL ON custom_campaign_strategies TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Final status check
DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Check table existence
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name = 'custom_campaign_strategies';
    
    -- Check policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'custom_campaign_strategies';
    
    -- Check indexes
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE tablename = 'custom_campaign_strategies';
    
    RAISE NOTICE '=== CAMPAIGN STRATEGIES TABLE STATUS ===';
    RAISE NOTICE 'Table exists: %', CASE WHEN table_count > 0 THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'RLS policies: % created', policy_count;
    RAISE NOTICE 'Indexes: % created', index_count;
    RAISE NOTICE 'Status: % for campaign creation', CASE WHEN table_count > 0 THEN 'READY' ELSE 'ERROR' END;
    RAISE NOTICE '=======================================';
END $$; 