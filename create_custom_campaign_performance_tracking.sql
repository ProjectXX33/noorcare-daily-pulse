-- Create campaign performance tracking table  
DROP TABLE IF EXISTS campaign_performance_tracking CASCADE;
DROP VIEW IF EXISTS campaign_analytics_dashboard CASCADE;
CREATE TABLE campaign_performance_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES custom_campaign_strategies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Performance Metrics
    actual_spent DECIMAL(12,2) DEFAULT 0.00,
    actual_clicks INTEGER DEFAULT 0,
    actual_conversions INTEGER DEFAULT 0,
    actual_revenue DECIMAL(12,2) DEFAULT 0.00,
    actual_reach INTEGER DEFAULT 0,
    actual_impressions INTEGER DEFAULT 0,
    
    -- Calculated Metrics
    actual_roas DECIMAL(5,2) DEFAULT 0.00,
    actual_cpc DECIMAL(6,2) DEFAULT 0.00,
    actual_ctr DECIMAL(5,2) DEFAULT 0.00,
    actual_conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    actual_cpm DECIMAL(6,2) DEFAULT 0.00,
    
    -- Performance vs Expected (percentages)
    roas_variance DECIMAL(6,2) DEFAULT 0.00, -- (actual - expected) / expected * 100
    revenue_variance DECIMAL(6,2) DEFAULT 0.00,
    click_variance DECIMAL(6,2) DEFAULT 0.00,
    conversion_variance DECIMAL(6,2) DEFAULT 0.00,
    
    -- Overall Performance Rating
    performance_score INTEGER CHECK(performance_score BETWEEN 0 AND 100) DEFAULT 0,
    performance_rating TEXT CHECK(performance_rating IN ('Excellent', 'Good', 'Average', 'Poor', 'Terrible')) DEFAULT 'Average',
    
    -- Platform-specific performance (JSONB)
    platform_performance JSONB DEFAULT '{
        "Facebook/Instagram": {"spent": 0, "clicks": 0, "conversions": 0, "revenue": 0},
        "Google Ads": {"spent": 0, "clicks": 0, "conversions": 0, "revenue": 0},
        "TikTok": {"spent": 0, "clicks": 0, "conversions": 0, "revenue": 0},
        "Twitter": {"spent": 0, "clicks": 0, "conversions": 0, "revenue": 0}
    }'::jsonb,
    
    -- Daily performance tracking (JSONB array)
    daily_metrics JSONB DEFAULT '[]'::jsonb,
    
    -- Key Insights & Optimization Notes
    optimization_notes TEXT,
    key_insights JSONB DEFAULT '[]'::jsonb,
    success_factors JSONB DEFAULT '[]'::jsonb,
    improvement_areas JSONB DEFAULT '[]'::jsonb,
    
    -- Status and Flags
    is_active BOOLEAN DEFAULT true,
    needs_optimization BOOLEAN DEFAULT false,
    is_profitable BOOLEAN DEFAULT false,
    
    -- Timestamps
    tracking_start_date DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign_id ON campaign_performance_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_user_id ON campaign_performance_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_rating ON campaign_performance_tracking(performance_rating);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_score ON campaign_performance_tracking(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_active ON campaign_performance_tracking(is_active);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_profitable ON campaign_performance_tracking(is_profitable);

-- Create GIN index for JSONB columns
CREATE INDEX IF NOT EXISTS idx_campaign_performance_platform_perf ON campaign_performance_tracking USING GIN (platform_performance);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_daily_metrics ON campaign_performance_tracking USING GIN (daily_metrics);

-- Enable Row Level Security
ALTER TABLE campaign_performance_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY campaign_performance_select ON campaign_performance_tracking 
FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY campaign_performance_insert ON campaign_performance_tracking 
FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY campaign_performance_update ON campaign_performance_tracking 
FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY campaign_performance_delete ON campaign_performance_tracking 
FOR DELETE USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Function to calculate performance score automatically
CREATE OR REPLACE FUNCTION calculate_campaign_performance_score(
    p_actual_roas DECIMAL,
    p_expected_roas DECIMAL,
    p_actual_revenue DECIMAL,
    p_expected_revenue DECIMAL,
    p_actual_conversions INTEGER,
    p_expected_conversions INTEGER
) RETURNS INTEGER AS $$
DECLARE
    roas_score INTEGER := 0;
    revenue_score INTEGER := 0;
    conversion_score INTEGER := 0;
    final_score INTEGER := 0;
BEGIN
    -- ROAS Score (40% weight)
    IF p_expected_roas > 0 THEN
        IF p_actual_roas >= p_expected_roas * 1.2 THEN roas_score := 40; -- Exceeds by 20%+
        ELSIF p_actual_roas >= p_expected_roas * 1.1 THEN roas_score := 35; -- Exceeds by 10%+
        ELSIF p_actual_roas >= p_expected_roas * 0.9 THEN roas_score := 30; -- Within 10%
        ELSIF p_actual_roas >= p_expected_roas * 0.7 THEN roas_score := 20; -- Within 30%
        ELSE roas_score := 10; -- Below 70%
        END IF;
    END IF;
    
    -- Revenue Score (35% weight)
    IF p_expected_revenue > 0 THEN
        IF p_actual_revenue >= p_expected_revenue * 1.2 THEN revenue_score := 35;
        ELSIF p_actual_revenue >= p_expected_revenue * 1.1 THEN revenue_score := 30;
        ELSIF p_actual_revenue >= p_expected_revenue * 0.9 THEN revenue_score := 25;
        ELSIF p_actual_revenue >= p_expected_revenue * 0.7 THEN revenue_score := 15;
        ELSE revenue_score := 5;
        END IF;
    END IF;
    
    -- Conversion Score (25% weight)
    IF p_expected_conversions > 0 THEN
        IF p_actual_conversions >= p_expected_conversions * 1.2 THEN conversion_score := 25;
        ELSIF p_actual_conversions >= p_expected_conversions * 1.1 THEN conversion_score := 22;
        ELSIF p_actual_conversions >= p_expected_conversions * 0.9 THEN conversion_score := 18;
        ELSIF p_actual_conversions >= p_expected_conversions * 0.7 THEN conversion_score := 12;
        ELSE conversion_score := 5;
        END IF;
    END IF;
    
    final_score := roas_score + revenue_score + conversion_score;
    
    -- Ensure score is between 0 and 100
    IF final_score > 100 THEN final_score := 100; END IF;
    IF final_score < 0 THEN final_score := 0; END IF;
    
    RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Function to determine performance rating based on score
CREATE OR REPLACE FUNCTION get_performance_rating(score INTEGER) RETURNS TEXT AS $$
BEGIN
    IF score >= 85 THEN RETURN 'Excellent';
    ELSIF score >= 70 THEN RETURN 'Good';
    ELSIF score >= 50 THEN RETURN 'Average';
    ELSIF score >= 30 THEN RETURN 'Poor';
    ELSE RETURN 'Terrible';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate performance metrics when data is updated
CREATE OR REPLACE FUNCTION update_campaign_performance_metrics()
RETURNS TRIGGER AS $$
DECLARE
    expected_data RECORD;
BEGIN
    -- Get expected values from the campaign strategy
    SELECT 
        expected_roas,
        expected_revenue,
        expected_conversions,
        expected_clicks
    INTO expected_data
    FROM custom_campaign_strategies 
    WHERE id = NEW.campaign_id;
    
    -- Calculate actual metrics
    IF NEW.actual_spent > 0 THEN
        NEW.actual_roas := NEW.actual_revenue / NEW.actual_spent;
        NEW.actual_cpc := NEW.actual_spent / GREATEST(NEW.actual_clicks, 1);
    END IF;
    
    IF NEW.actual_impressions > 0 THEN
        NEW.actual_ctr := (NEW.actual_clicks::DECIMAL / NEW.actual_impressions) * 100;
        NEW.actual_cpm := (NEW.actual_spent / NEW.actual_impressions) * 1000;
    END IF;
    
    IF NEW.actual_clicks > 0 THEN
        NEW.actual_conversion_rate := (NEW.actual_conversions::DECIMAL / NEW.actual_clicks) * 100;
    END IF;
    
    -- Calculate variance percentages
    IF expected_data.expected_roas > 0 THEN
        NEW.roas_variance := ((NEW.actual_roas - expected_data.expected_roas) / expected_data.expected_roas) * 100;
    END IF;
    
    IF expected_data.expected_revenue > 0 THEN
        NEW.revenue_variance := ((NEW.actual_revenue - expected_data.expected_revenue) / expected_data.expected_revenue) * 100;
    END IF;
    
    IF expected_data.expected_conversions > 0 THEN
        NEW.conversion_variance := ((NEW.actual_conversions - expected_data.expected_conversions) / expected_data.expected_conversions) * 100;
    END IF;
    
    IF expected_data.expected_clicks > 0 THEN
        NEW.click_variance := ((NEW.actual_clicks - expected_data.expected_clicks) / expected_data.expected_clicks) * 100;
    END IF;
    
    -- Calculate performance score
    NEW.performance_score := calculate_campaign_performance_score(
        NEW.actual_roas,
        expected_data.expected_roas,
        NEW.actual_revenue,
        expected_data.expected_revenue,
        NEW.actual_conversions,
        expected_data.expected_conversions
    );
    
    -- Set performance rating
    NEW.performance_rating := get_performance_rating(NEW.performance_score);
    
    -- Set flags
    NEW.is_profitable := NEW.actual_roas > 1.0;
    NEW.needs_optimization := NEW.performance_score < 50;
    
    -- Update timestamp
    NEW.last_updated := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_campaign_performance_metrics
    BEFORE INSERT OR UPDATE ON campaign_performance_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_performance_metrics();

-- Create view for comprehensive campaign analytics
CREATE OR REPLACE VIEW campaign_analytics_dashboard AS
SELECT 
    cs.id as campaign_id,
    cs.title as strategy_name,
    cs.campaign_type,
    cs.priority as priority_level,
    cs.status as campaign_status,
    cs.budget_recommended as target_budget_recommended,
    cs.expected_roas,
    cs.expected_revenue,
    cs.expected_conversions,
    cs.duration_weeks * 7 as duration_days,
    
    u.name as creator_name,
    u.position as creator_position,
    
    cpt.actual_spent,
    cpt.actual_clicks,
    cpt.actual_conversions,
    cpt.actual_revenue,
    cpt.actual_roas,
    cpt.actual_cpc,
    cpt.actual_ctr,
    cpt.actual_conversion_rate,
    
    cpt.roas_variance,
    cpt.revenue_variance,
    cpt.conversion_variance,
    
    cpt.performance_score,
    cpt.performance_rating,
    cpt.is_profitable,
    cpt.needs_optimization,
    
    -- ROI calculation
    CASE 
        WHEN cpt.actual_spent > 0 
        THEN ROUND(((cpt.actual_revenue - cpt.actual_spent) / cpt.actual_spent) * 100, 2)
        ELSE 0 
    END as roi_percentage,
    
    -- Budget utilization
    CASE 
        WHEN cs.budget_recommended > 0 
        THEN ROUND((cpt.actual_spent / cs.budget_recommended) * 100, 2)
        ELSE 0 
    END as budget_utilization_percentage,
    
    -- Days running
    CASE 
        WHEN cpt.tracking_start_date IS NOT NULL 
        THEN EXTRACT(DAY FROM NOW() - cpt.tracking_start_date)
        ELSE 0 
    END as days_running,
    
    cpt.platform_performance,
    cpt.optimization_notes,
    cpt.created_at as tracking_started,
    cpt.last_updated

FROM custom_campaign_strategies cs
LEFT JOIN campaign_performance_tracking cpt ON cs.id = cpt.campaign_id
LEFT JOIN users u ON cs.created_by = u.id
WHERE cs.status IN ('active', 'completed')
ORDER BY cpt.performance_score DESC, cpt.last_updated DESC;

-- Grant permissions
GRANT ALL ON campaign_performance_tracking TO authenticated;
GRANT ALL ON campaign_analytics_dashboard TO authenticated;

-- Insert sample performance data for demonstration
INSERT INTO campaign_performance_tracking (
    campaign_id, user_id, actual_spent, actual_clicks, actual_conversions, 
    actual_revenue, actual_reach, actual_impressions, tracking_start_date
) 
SELECT 
    cs.id,
    cs.created_by,
    cs.budget_recommended * 0.8, -- 80% of budget spent
    cs.expected_clicks * (0.7 + random() * 0.6), -- Random performance between 70%-130%
    cs.expected_conversions * (0.6 + random() * 0.8), -- Random performance between 60%-140%
    cs.expected_revenue * (0.5 + random() * 1.0), -- Random performance between 50%-150%
    10000 * (0.8 + random() * 0.4), -- Random reach performance
    cs.expected_clicks * 50, -- Assuming 50 impressions per click
    NOW() - INTERVAL '7 days' -- Started 7 days ago
FROM custom_campaign_strategies cs
WHERE cs.is_template = true
LIMIT 2; 