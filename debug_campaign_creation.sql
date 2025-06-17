-- DEBUG CAMPAIGN CREATION ISSUES
-- Run this step by step to identify the exact problem

-- Step 1: Check if tables exist
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name IN ('custom_campaign_strategies', 'campaign_performance_tracking', 'users')
ORDER BY table_name;

-- Step 2: Check custom_campaign_strategies table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'custom_campaign_strategies'
ORDER BY ordinal_position;

-- Step 3: Check if there are any users in the database
SELECT 
    id,
    email,
    role,
    position
FROM users 
LIMIT 5;

-- Step 4: Check RLS policies on custom_campaign_strategies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'custom_campaign_strategies';

-- Step 5: Test inserting a simple campaign with minimal data
INSERT INTO custom_campaign_strategies (
    created_by,
    title,
    description,
    campaign_type,
    priority,
    confidence_score,
    budget_min,
    budget_recommended,
    budget_max,
    duration_weeks,
    expected_clicks,
    expected_conversions,
    expected_revenue,
    expected_roas,
    expected_cpc,
    expected_ctr,
    target_audiences,
    platforms,
    ad_formats,
    keywords,
    status
) 
SELECT 
    u.id,
    'Debug Test Campaign',
    'Test campaign for debugging',
    'custom',
    'medium',
    85,
    1000,
    2000,
    5000,
    4,
    500,
    25,
    1500,
    2.00,
    2.50,
    2.00,
    '["Test Audience"]'::jsonb,
    '["Facebook/Instagram"]'::jsonb,
    '["Single Image"]'::jsonb,
    '["test", "debug"]'::jsonb,
    'draft'
FROM users u 
LIMIT 1;

-- Step 6: Check if the insert worked
SELECT 
    id,
    title,
    created_by,
    campaign_type,
    status,
    created_at
FROM custom_campaign_strategies 
WHERE title = 'Debug Test Campaign';

-- Step 7: Try to select with auth.uid() to test RLS
SELECT 
    id,
    title,
    created_by,
    status
FROM custom_campaign_strategies 
WHERE created_by = auth.uid();

-- Step 8: Check grants and permissions
SELECT 
    table_schema,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name = 'custom_campaign_strategies';

-- Clean up test data
DELETE FROM custom_campaign_strategies WHERE title = 'Debug Test Campaign'; 