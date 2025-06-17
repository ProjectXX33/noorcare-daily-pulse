-- ===============================================
-- COMPLETE CAMPAIGN TABLES FIX - Version 2.1.0
-- This script creates ALL missing tables for the campaign system
-- ===============================================

-- 1. DROP AND RECREATE custom_campaign_strategies table with correct structure
DROP TABLE IF EXISTS custom_campaign_strategies CASCADE;

CREATE TABLE custom_campaign_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic Campaign Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'custom',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    confidence_score INTEGER DEFAULT 80,
    
    -- Budget Information (in SAR) - Match application exactly
    budget_min INTEGER NOT NULL DEFAULT 1000,
    budget_recommended INTEGER NOT NULL DEFAULT 2000,
    budget_max INTEGER NOT NULL DEFAULT 5000,
    
    -- Duration
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    start_date DATE,
    end_date DATE,
    
    -- Expected Results - Match application field names exactly
    expected_clicks INTEGER DEFAULT 500,
    expected_conversions INTEGER DEFAULT 25,
    expected_revenue INTEGER DEFAULT 1500,
    expected_roas DECIMAL(4,2) DEFAULT 2.00,
    expected_cpc DECIMAL(6,2) DEFAULT 2.50,
    expected_ctr DECIMAL(5,2) DEFAULT 2.00,
    
    -- Strategy Details (JSON) - Match application structure
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
    
    -- Additional fields for compatibility
    approved_at TIMESTAMP WITH TIME ZONE,
    launched_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE campaign_performance_tracking table (MISSING from your database)
DROP TABLE IF EXISTS campaign_performance_tracking CASCADE;

CREATE TABLE campaign_performance_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES custom_campaign_strategies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Performance Metrics
    actual_spent DECIMAL(10,2) DEFAULT 0.00,
    actual_revenue DECIMAL(10,2) DEFAULT 0.00,
    actual_clicks INTEGER DEFAULT 0,
    actual_conversions INTEGER DEFAULT 0,
    actual_impressions INTEGER DEFAULT 0,
    actual_cpc DECIMAL(6,2) DEFAULT 0.00,
    actual_ctr DECIMAL(5,2) DEFAULT 0.00,
    actual_roas DECIMAL(4,2) DEFAULT 0.00,
    
    -- Performance Period
    tracking_start_date DATE NOT NULL,
    tracking_end_date DATE,
    
    -- Optimization Notes
    optimization_notes TEXT,
    performance_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Platform-specific performance (JSON)
    platform_performance JSONB DEFAULT '{}'::jsonb,
    
    -- Daily/Weekly performance tracking (JSON)
    daily_metrics JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE campaign_custom_performance table (for CampaignPerformanceAnalytics)
DROP TABLE IF EXISTS campaign_custom_performance CASCADE;

CREATE TABLE campaign_custom_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id VARCHAR(255) NOT NULL, -- Can be custom ID or UUID
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Campaign Basic Info
    campaign_name VARCHAR(255),
    campaign_type VARCHAR(100),
    
    -- Performance Data
    spent DECIMAL(10,2) DEFAULT 0.00,
    revenue DECIMAL(10,2) DEFAULT 0.00,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    
    -- Calculated Metrics
    roas DECIMAL(4,2) DEFAULT 0.00,
    cpc DECIMAL(6,2) DEFAULT 0.00,
    ctr DECIMAL(5,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Performance Notes
    optimization_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- custom_campaign_strategies indexes
CREATE INDEX idx_custom_campaigns_created_by ON custom_campaign_strategies(created_by);
CREATE INDEX idx_custom_campaigns_type ON custom_campaign_strategies(campaign_type);
CREATE INDEX idx_custom_campaigns_status ON custom_campaign_strategies(status);
CREATE INDEX idx_custom_campaigns_priority ON custom_campaign_strategies(priority);
CREATE INDEX idx_custom_campaigns_created_at ON custom_campaign_strategies(created_at);
CREATE INDEX idx_custom_campaigns_is_template ON custom_campaign_strategies(is_template);

-- GIN indexes for JSONB columns
CREATE INDEX idx_custom_campaigns_platforms ON custom_campaign_strategies USING GIN (platforms);
CREATE INDEX idx_custom_campaigns_target_audiences ON custom_campaign_strategies USING GIN (target_audiences);
CREATE INDEX idx_custom_campaigns_keywords ON custom_campaign_strategies USING GIN (keywords);
CREATE INDEX idx_custom_campaigns_target_products ON custom_campaign_strategies USING GIN (target_product_ids);

-- campaign_performance_tracking indexes
CREATE INDEX idx_campaign_performance_campaign_id ON campaign_performance_tracking(campaign_id);
CREATE INDEX idx_campaign_performance_user_id ON campaign_performance_tracking(user_id);
CREATE INDEX idx_campaign_performance_tracking_date ON campaign_performance_tracking(tracking_start_date);
CREATE INDEX idx_campaign_performance_active ON campaign_performance_tracking(is_active);

-- campaign_custom_performance indexes
CREATE INDEX idx_campaign_custom_performance_campaign_id ON campaign_custom_performance(campaign_id);
CREATE INDEX idx_campaign_custom_performance_user_id ON campaign_custom_performance(user_id);
CREATE INDEX idx_campaign_custom_performance_active ON campaign_custom_performance(is_active);

-- ===============================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ===============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for all tables
CREATE TRIGGER update_custom_campaigns_updated_at 
    BEFORE UPDATE ON custom_campaign_strategies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_performance_updated_at 
    BEFORE UPDATE ON campaign_performance_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_custom_performance_updated_at 
    BEFORE UPDATE ON campaign_custom_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE custom_campaign_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_custom_performance ENABLE ROW LEVEL SECURITY;

-- Policies for custom_campaign_strategies
CREATE POLICY "Users can view own campaigns and public templates" ON custom_campaign_strategies
    FOR SELECT USING (
        created_by = auth.uid() OR 
        is_public = true OR 
        is_template = true
    );

CREATE POLICY "Users can create campaigns" ON custom_campaign_strategies
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own campaigns" ON custom_campaign_strategies
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own campaigns" ON custom_campaign_strategies
    FOR DELETE USING (created_by = auth.uid());

-- Admin policy for all campaign operations
CREATE POLICY "Admins have full access to campaigns" ON custom_campaign_strategies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.role = 'Admin')
        )
    );

-- Media Buyer policy
CREATE POLICY "Media buyers can manage campaigns" ON custom_campaign_strategies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.position = 'Media Buyer'
        )
    );

-- Policies for campaign_performance_tracking
CREATE POLICY "Users can view own performance tracking" ON campaign_performance_tracking
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create performance tracking" ON campaign_performance_tracking
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own performance tracking" ON campaign_performance_tracking
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to performance tracking" ON campaign_performance_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.role = 'Admin')
        )
    );

-- Policies for campaign_custom_performance
CREATE POLICY "Users can view own custom performance" ON campaign_custom_performance
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create custom performance" ON campaign_custom_performance
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own custom performance" ON campaign_custom_performance
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to custom performance" ON campaign_custom_performance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.role = 'Admin')
        )
    );

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

GRANT ALL ON custom_campaign_strategies TO authenticated;
GRANT ALL ON campaign_performance_tracking TO authenticated;
GRANT ALL ON campaign_custom_performance TO authenticated;

-- ===============================================
-- INSERT SAMPLE DATA FOR TESTING
-- ===============================================

-- Insert sample campaigns (only if admin user exists)
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get first admin user
    SELECT id INTO admin_user_id FROM users WHERE role IN ('admin', 'Admin') LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Insert sample campaign templates
        INSERT INTO custom_campaign_strategies (
            created_by, title, description, campaign_type, priority, confidence_score,
            budget_min, budget_recommended, budget_max, duration_weeks,
            expected_clicks, expected_conversions, expected_revenue, expected_roas,
            target_audiences, platforms, ad_formats, keywords,
            is_template, is_public, status
        ) VALUES 
        (
            admin_user_id,
            'E-commerce Conversion Template',
            'High-converting template for e-commerce products with proven results',
            'conversion',
            'high',
            90,
            1500, 3000, 6000, 4,
            1200, 80, 6000, 2.50,
            '["Lookalike audiences", "Website visitors", "Interest targeting"]'::jsonb,
            '["Facebook/Instagram", "Google Ads"]'::jsonb,
            '["Video ads", "Carousel ads", "Single image ads"]'::jsonb,
            '["buy online", "shop now", "best price", "discount"]'::jsonb,
            true,
            true,
            'active'
        ),
        (
            admin_user_id,
            'Brand Awareness Template',
            'Build brand recognition and reach new audiences effectively',
            'awareness',
            'medium',
            75,
            1000, 2000, 4000, 6,
            2000, 40, 2400, 1.20,
            '["Cold audiences", "Interest targeting", "Demographic targeting"]'::jsonb,
            '["Facebook/Instagram", "TikTok"]'::jsonb,
            '["Video ads", "Image carousels", "Stories"]'::jsonb,
            '["brand awareness", "new products", "discover", "trending"]'::jsonb,
            true,
            true,
            'active'
        );
        
        RAISE NOTICE 'Sample campaign templates inserted successfully';
    ELSE
        RAISE NOTICE 'No admin user found - skipping sample data insertion';
    END IF;
END $$;

-- ===============================================
-- DEBUG AND TEST FUNCTIONS
-- ===============================================

-- Function to test campaign creation
CREATE OR REPLACE FUNCTION test_campaign_creation(
    p_title VARCHAR(255) DEFAULT 'Test Campaign',
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    campaign_id UUID,
    error_message TEXT
) AS $$
DECLARE
    user_id UUID;
    new_campaign_id UUID;
BEGIN
    -- Use provided user_id or get current authenticated user
    user_id := COALESCE(p_user_id, auth.uid());
    
    -- If still no user, get first admin
    IF user_id IS NULL THEN
        SELECT id INTO user_id FROM users WHERE role IN ('admin', 'Admin') LIMIT 1;
    END IF;
    
    -- Check if user exists
    IF user_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'No valid user found'::TEXT;
        RETURN;
    END IF;
    
    -- Try to insert campaign
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
            p_title || ' - ' || NOW()::TEXT,
            'Test campaign created by test function',
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
        ) RETURNING id INTO new_campaign_id;
        
        RETURN QUERY SELECT true, new_campaign_id, 'Campaign created successfully'::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, NULL::UUID, SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check table status
CREATE OR REPLACE FUNCTION check_campaign_tables_status()
RETURNS TABLE (
    table_name TEXT,
    exists BOOLEAN,
    row_count BIGINT,
    rls_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'custom_campaign_strategies'::TEXT,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_campaign_strategies'),
        COALESCE((SELECT COUNT(*) FROM custom_campaign_strategies), 0),
        COALESCE((SELECT relrowsecurity FROM pg_class WHERE relname = 'custom_campaign_strategies'), false)
    UNION ALL
    SELECT 
        'campaign_performance_tracking'::TEXT,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_performance_tracking'),
        COALESCE((SELECT COUNT(*) FROM campaign_performance_tracking), 0),
        COALESCE((SELECT relrowsecurity FROM pg_class WHERE relname = 'campaign_performance_tracking'), false)
    UNION ALL
    SELECT 
        'campaign_custom_performance'::TEXT,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_custom_performance'),
        COALESCE((SELECT COUNT(*) FROM campaign_custom_performance), 0),
        COALESCE((SELECT relrowsecurity FROM pg_class WHERE relname = 'campaign_custom_performance'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- FINAL STATUS CHECK
-- ===============================================

DO $$
DECLARE
    campaigns_count INTEGER;
    performance_count INTEGER;
    custom_performance_count INTEGER;
    policies_count INTEGER;
BEGIN
    -- Check table creation
    SELECT COUNT(*) INTO campaigns_count 
    FROM information_schema.tables 
    WHERE table_name = 'custom_campaign_strategies';
    
    SELECT COUNT(*) INTO performance_count 
    FROM information_schema.tables 
    WHERE table_name = 'campaign_performance_tracking';
    
    SELECT COUNT(*) INTO custom_performance_count 
    FROM information_schema.tables 
    WHERE table_name = 'campaign_custom_performance';
    
    -- Check policies
    SELECT COUNT(*) INTO policies_count 
    FROM pg_policies 
    WHERE tablename IN ('custom_campaign_strategies', 'campaign_performance_tracking', 'campaign_custom_performance');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CAMPAIGN TABLES SETUP COMPLETE - v2.1.0';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'custom_campaign_strategies: %', CASE WHEN campaigns_count > 0 THEN 'CREATED ✅' ELSE 'FAILED ❌' END;
    RAISE NOTICE 'campaign_performance_tracking: %', CASE WHEN performance_count > 0 THEN 'CREATED ✅' ELSE 'FAILED ❌' END;
    RAISE NOTICE 'campaign_custom_performance: %', CASE WHEN custom_performance_count > 0 THEN 'CREATED ✅' ELSE 'FAILED ❌' END;
    RAISE NOTICE 'RLS Policies: % created', policies_count;
    RAISE NOTICE 'Status: %', CASE WHEN campaigns_count > 0 AND performance_count > 0 THEN 'READY FOR CAMPAIGNS ✅' ELSE 'SETUP INCOMPLETE ❌' END;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Run: SELECT * FROM check_campaign_tables_status();';
    RAISE NOTICE 'Test: SELECT * FROM test_campaign_creation();';
    RAISE NOTICE '========================================';
END $$; 