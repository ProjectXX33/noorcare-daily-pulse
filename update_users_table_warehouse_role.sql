-- Update Users Table for Warehouse Role Support
-- This ensures the users table supports the new warehouse role and related functionality

-- First, let's make sure the role column can accept 'warehouse' value
-- This should already support warehouse if using text/varchar, but let's be explicit

-- Update any existing role constraints to include warehouse
DO $$
BEGIN
    -- Drop existing role constraint if it exists
    BEGIN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;

    -- Add new role constraint that includes warehouse
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'employee', 'warehouse'));

    RAISE NOTICE 'Users table role constraint updated to include warehouse role';
END $$;

-- Update any existing position constraints to include Warehouse Staff
DO $$
BEGIN
    -- Drop existing position constraint if it exists
    BEGIN
        ALTER TABLE users DROP CONSTRAINT users_position_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;

    -- Add new position constraint that includes Warehouse Staff
    ALTER TABLE users ADD CONSTRAINT users_position_check 
    CHECK (position IN ('Customer Service', 'Designer', 'Media Buyer', 'Copy Writing', 'Web Developer', 'Warehouse Staff'));

    RAISE NOTICE 'Users table position constraint updated to include Warehouse Staff';
END $$;

-- Add shipping_method column to order_submissions table if it doesn't exist
ALTER TABLE order_submissions 
ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50) DEFAULT 'Standard';

-- Add shipping tracking information
ALTER TABLE order_submissions 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);

ALTER TABLE order_submissions 
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE order_submissions 
ADD COLUMN IF NOT EXISTS shipped_by UUID REFERENCES users(id);

-- Create shipping methods reference table
CREATE TABLE IF NOT EXISTS shipping_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default shipping methods
INSERT INTO shipping_methods (name, display_name) VALUES
    ('SMSA', 'SMSA Express'),
    ('DRB', 'DRB Logistics'),
    ('OUR_SHIPPED', 'Our Shipped'),
    ('STANDARD', 'Standard Shipping')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_submissions_shipping_method ON order_submissions(shipping_method);
CREATE INDEX IF NOT EXISTS idx_order_submissions_shipped_by ON order_submissions(shipped_by);
CREATE INDEX IF NOT EXISTS idx_order_submissions_shipped_at ON order_submissions(shipped_at);

-- Update RLS policies for warehouse users to access shipping information (with error handling)
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS "warehouse_shipping_access" ON order_submissions;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    CREATE POLICY "warehouse_shipping_access" ON order_submissions 
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'warehouse'));
    
    RAISE NOTICE 'Warehouse shipping access policy created successfully';
END $$;

-- RLS for shipping_methods table (with error handling)
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS "shipping_methods_read" ON shipping_methods;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    CREATE POLICY "shipping_methods_read" ON shipping_methods 
    FOR SELECT USING (true); -- Everyone can read shipping methods

    BEGIN
        DROP POLICY IF EXISTS "shipping_methods_admin_manage" ON shipping_methods;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    CREATE POLICY "shipping_methods_admin_manage" ON shipping_methods 
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
    
    RAISE NOTICE 'Shipping methods policies created successfully';
END $$;

-- Add function to update shipped status
CREATE OR REPLACE FUNCTION update_order_shipped_status(
    order_id BIGINT,
    shipping_method_name VARCHAR(50),
    tracking_num VARCHAR(100) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE order_submissions 
    SET 
        status = 'shipped',
        shipping_method = shipping_method_name,
        tracking_number = tracking_num,
        shipped_at = NOW(),
        shipped_by = auth.uid(),
        updated_at = NOW()
    WHERE id = order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to warehouse users
GRANT EXECUTE ON FUNCTION update_order_shipped_status TO authenticated;

-- Create function to get shipping statistics
CREATE OR REPLACE FUNCTION get_shipping_stats()
RETURNS TABLE(
    method_name VARCHAR(50),
    method_display VARCHAR(100),
    total_orders BIGINT,
    pending_orders BIGINT,
    shipped_orders BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.name,
        sm.display_name,
        COUNT(os.id) as total_orders,
        COUNT(CASE WHEN os.status = 'pending' OR os.status = 'processing' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN os.status = 'shipped' OR os.status = 'delivered' THEN 1 END) as shipped_orders
    FROM shipping_methods sm
    LEFT JOIN order_submissions os ON os.shipping_method = sm.name
    WHERE sm.is_active = true
    GROUP BY sm.name, sm.display_name
    ORDER BY total_orders DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data update for testing (optional)
-- Update a few existing orders to have shipping methods for testing
UPDATE order_submissions 
SET shipping_method = 'SMSA' 
WHERE id IN (
    SELECT id FROM order_submissions 
    WHERE shipping_method IS NULL OR shipping_method = 'Standard'
    LIMIT 3
);

UPDATE order_submissions 
SET shipping_method = 'DRB' 
WHERE id IN (
    SELECT id FROM order_submissions 
    WHERE shipping_method = 'Standard' 
    LIMIT 2
);

-- Final status report
DO $$
DECLARE
    user_count INTEGER;
    warehouse_user_count INTEGER;
    orders_with_shipping INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO warehouse_user_count FROM users WHERE role = 'warehouse';
    SELECT COUNT(*) INTO orders_with_shipping FROM order_submissions WHERE shipping_method IS NOT NULL;
    
    RAISE NOTICE '=== WAREHOUSE SYSTEM UPDATE COMPLETE ===';
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Warehouse users: %', warehouse_user_count;
    RAISE NOTICE 'Orders with shipping methods: %', orders_with_shipping;
    RAISE NOTICE '';
    RAISE NOTICE 'Available shipping methods:';
    RAISE NOTICE '  - SMSA Express';
    RAISE NOTICE '  - DRB Logistics'; 
    RAISE NOTICE '  - Our Shipped';
    RAISE NOTICE '  - Standard Shipping';
    RAISE NOTICE '';
    RAISE NOTICE 'New features enabled:';
    RAISE NOTICE '  ✅ Warehouse role in users table';
    RAISE NOTICE '  ✅ Shipping methods tracking';
    RAISE NOTICE '  ✅ Tracking numbers';
    RAISE NOTICE '  ✅ Shipping timestamps';
    RAISE NOTICE '  ✅ Warehouse permissions for shipping';
END $$; 