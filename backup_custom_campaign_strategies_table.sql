-- Create table for storing custom campaign strategies
CREATE TABLE custom_campaign_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Campaign Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('awareness', 'conversion', 'retargeting', 'seasonal', 'custom')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    
    -- Budget Information (in SAR)
    budget_min INTEGER NOT NULL DEFAULT 0,
    budget_recommended INTEGER NOT NULL,
    budget_max INTEGER NOT NULL,
    
    -- Duration
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    start_date DATE,
    end_date DATE,
    
    -- Expected Results
    expected_clicks INTEGER DEFAULT 0,
    expected_conversions INTEGER DEFAULT 0,
    expected_revenue INTEGER DEFAULT 0,
    expected_roas DECIMAL(4,2) DEFAULT 0.00,
    expected_cpc DECIMAL(6,2) DEFAULT 0.00,
    expected_ctr DECIMAL(5,2) DEFAULT 0.00,
    
    -- Strategy Details (JSON)
    target_audiences JSONB DEFAULT '[]'::jsonb,
    platforms JSONB DEFAULT '[]'::jsonb,
    ad_formats JSONB DEFAULT '[]'::jsonb,
    keywords JSONB DEFAULT '[]'::jsonb,
    
    -- Platform Budget Breakdown (JSON)
    platform_budgets JSONB DEFAULT '{}'::jsonb,
    
    -- Target Products (JSON array of product IDs)
    target_product_ids JSONB DEFAULT '[]'::jsonb,
    
    -- Campaign Insights and Recommendations (JSON)
    insights JSONB DEFAULT '[]'::jsonb,
    
    -- Status and Metadata
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    is_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Performance Tracking
    actual_spend INTEGER DEFAULT 0,
    actual_clicks INTEGER DEFAULT 0,
    actual_conversions INTEGER DEFAULT 0,
    actual_revenue INTEGER DEFAULT 0,
    actual_roas DECIMAL(4,2) DEFAULT 0.00,
    
    -- AI Analysis
    ai_recommendation_score INTEGER CHECK (ai_recommendation_score >= 0 AND ai_recommendation_score <= 100),
    ai_optimization_suggestions JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    launched_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_custom_campaigns_created_by ON custom_campaign_strategies(created_by);
CREATE INDEX idx_custom_campaigns_type ON custom_campaign_strategies(campaign_type);
CREATE INDEX idx_custom_campaigns_status ON custom_campaign_strategies(status);
CREATE INDEX idx_custom_campaigns_priority ON custom_campaign_strategies(priority);
CREATE INDEX idx_custom_campaigns_created_at ON custom_campaign_strategies(created_at);
CREATE INDEX idx_custom_campaigns_is_template ON custom_campaign_strategies(is_template);
CREATE INDEX idx_custom_campaigns_is_public ON custom_campaign_strategies(is_public);

-- Create GIN indexes for JSONB columns for better search performance
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

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_custom_campaign_updated_at
    BEFORE UPDATE ON custom_campaign_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_campaign_updated_at();

-- RLS (Row Level Security) policies
ALTER TABLE custom_campaign_strategies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own campaigns and public templates
CREATE POLICY "Users can view own campaigns and public templates" ON custom_campaign_strategies
    FOR SELECT USING (
        created_by = auth.uid() OR 
        is_public = true OR 
        is_template = true
    );

-- Policy: Users can insert their own campaigns
CREATE POLICY "Users can create campaigns" ON custom_campaign_strategies
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own campaigns
CREATE POLICY "Users can update own campaigns" ON custom_campaign_strategies
    FOR UPDATE USING (created_by = auth.uid());

-- Policy: Users can delete their own campaigns (except templates)
CREATE POLICY "Users can delete own campaigns" ON custom_campaign_strategies
    FOR DELETE USING (created_by = auth.uid() AND is_template = false);

-- Admin policy: Admins can do everything
CREATE POLICY "Admins have full access" ON custom_campaign_strategies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create a view for campaign performance summary
CREATE VIEW campaign_performance_summary AS
SELECT 
    cs.*,
    u.name as creator_name,
    u.position as creator_position,
    CASE 
        WHEN cs.actual_revenue > 0 AND cs.actual_spend > 0 
        THEN cs.actual_revenue::decimal / cs.actual_spend::decimal
        ELSE 0
    END as calculated_roas,
    CASE 
        WHEN cs.actual_clicks > 0 AND cs.actual_spend > 0
        THEN cs.actual_spend::decimal / cs.actual_clicks::decimal  
        ELSE 0
    END as calculated_cpc,
    CASE 
        WHEN cs.expected_revenue > 0 AND cs.actual_revenue > 0
        THEN ((cs.actual_revenue - cs.expected_revenue)::decimal / cs.expected_revenue::decimal) * 100
        ELSE 0
    END as revenue_variance_percentage
FROM custom_campaign_strategies cs
LEFT JOIN users u ON cs.created_by = u.id;

-- Insert some sample templates for media buyers
INSERT INTO custom_campaign_strategies (
    created_by, title, description, campaign_type, priority, confidence_score,
    budget_min, budget_recommended, budget_max, duration_weeks,
    expected_clicks, expected_conversions, expected_revenue, expected_roas, expected_cpc, expected_ctr,
    target_audiences, platforms, ad_formats, keywords,
    platform_budgets, insights, is_template, is_public
) VALUES 
(
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1), -- Get first admin user ID
    'E-commerce Conversion Template',
    'High-converting template for e-commerce products with proven results',
    'conversion',
    'high',
    90,
    1000, 2000, 4000, 4,
    1000, 60, 4500, 2.25, 2.00, 2.5,
    '["Lookalike audiences", "Interest targeting", "Website visitors"]'::jsonb,
    '["Facebook/Instagram", "Google Ads"]'::jsonb,
    '["Video ads", "Carousel ads", "Single image ads"]'::jsonb,
    '["buy online", "shop now", "best price"]'::jsonb,
    '{"Facebook/Instagram": {"budget": 1200, "percentage": 60}, "Google Ads": {"budget": 800, "percentage": 40}}'::jsonb,
    '[{"type": "optimization", "title": "Budget Optimization", "description": "Start with 70% budget and scale based on performance"}]'::jsonb,
    true,
    true
),
(
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'Brand Awareness Template', 
    'Build brand recognition and reach new audiences effectively',
    'awareness',
    'medium',
    75,
    800, 1500, 3000, 6,
    1500, 30, 1800, 1.2, 1.0, 1.8,
    '["Cold audiences", "Interest targeting", "Demographic targeting"]'::jsonb,
    '["Facebook/Instagram", "TikTok", "Google Display"]'::jsonb,
    '["Brand videos", "Image carousels", "Interactive ads"]'::jsonb,
    '["brand awareness", "new products", "discover"]'::jsonb,
    '{"Facebook/Instagram": {"budget": 900, "percentage": 60}, "TikTok": {"budget": 450, "percentage": 30}, "Google Display": {"budget": 150, "percentage": 10}}'::jsonb,
    '[{"type": "targeting", "title": "Audience Strategy", "description": "Focus on broad audiences for maximum reach and brand exposure"}]'::jsonb,
    true,
    true
);

-- Grant necessary permissions
GRANT ALL ON custom_campaign_strategies TO authenticated;
GRANT ALL ON campaign_performance_summary TO authenticated; 