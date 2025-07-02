-- Complete Warehouse & Shipping Management System Tables
-- Run this file to create all necessary tables and functions

-- =====================================================
-- 1. USERS TABLE UPDATES
-- =====================================================

-- Update users table constraints to support warehouse role
DO $$
BEGIN
    -- Drop existing constraints if they exist
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_position_check;
    
    -- Add new constraints with warehouse support
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'employee', 'warehouse'));
    
    ALTER TABLE users ADD CONSTRAINT users_position_check 
    CHECK (position IN ('Customer Service', 'Designer', 'Media Buyer', 'Copy Writing', 'Web Developer', 'Warehouse Staff'));
    
    RAISE NOTICE 'Users table constraints updated successfully';
END $$;

-- =====================================================
-- 2. SHIPPING METHODS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS shipping_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    tracking_url_template VARCHAR(500), -- For tracking links like https://track.smsa.com/{tracking_number}
    estimated_delivery_days INTEGER DEFAULT 3,
    cost_per_kg DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert shipping methods
INSERT INTO shipping_methods (name, display_name, description, tracking_url_template, estimated_delivery_days) VALUES
    ('SMSA', 'SMSA Express', 'SMSA Express delivery service', 'https://track.smsa.com.sa/track.aspx?tracknumbers={tracking_number}', 2),
    ('DRB', 'DRB Logistics', 'DRB Logistics delivery service', 'https://www.drblogistics.com/track/{tracking_number}', 3),
    ('OUR_SHIPPED', 'Our Shipped', 'In-house delivery service', null, 1),
    ('STANDARD', 'Standard Shipping', 'Standard delivery service', null, 5)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    tracking_url_template = EXCLUDED.tracking_url_template,
    estimated_delivery_days = EXCLUDED.estimated_delivery_days,
    updated_at = NOW();

-- =====================================================
-- 3. ORDER SUBMISSIONS TABLE UPDATES
-- =====================================================

-- Add shipping-related columns to order_submissions
ALTER TABLE order_submissions 
ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50) DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shipped_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Add foreign key constraint for shipping method
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_order_submissions_shipping_method'
    ) THEN
        ALTER TABLE order_submissions 
        ADD CONSTRAINT fk_order_submissions_shipping_method 
        FOREIGN KEY (shipping_method) REFERENCES shipping_methods(name);
    END IF;
END $$;

-- =====================================================
-- 4. ORDER NOTES TABLE (Enhanced)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL REFERENCES order_submissions(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_name VARCHAR(255) NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general' CHECK (note_type IN ('general', 'status_change', 'cancel_reason', 'warehouse', 'shipping', 'delivery')),
    is_internal BOOLEAN DEFAULT false, -- Internal notes not visible to customers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. ORDER STATUS HISTORY TABLE (Enhanced)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL REFERENCES order_submissions(id) ON DELETE CASCADE,
    old_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    reason TEXT,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_by_name VARCHAR(255) NOT NULL,
    shipping_method VARCHAR(50), -- Track shipping method changes
    tracking_number VARCHAR(100), -- Track tracking number additions
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. SHIPPING TRACKING EVENTS TABLE (New)
-- =====================================================

CREATE TABLE IF NOT EXISTS shipping_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL REFERENCES order_submissions(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception'
    event_description TEXT,
    event_location VARCHAR(255),
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    shipping_method VARCHAR(50) REFERENCES shipping_methods(name),
    created_by UUID REFERENCES users(id), -- NULL for external tracking updates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. WAREHOUSE PERFORMANCE METRICS TABLE (New)
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouse_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    orders_processed INTEGER DEFAULT 0,
    orders_shipped INTEGER DEFAULT 0,
    orders_cancelled INTEGER DEFAULT 0,
    average_processing_time_minutes INTEGER DEFAULT 0,
    total_working_minutes INTEGER DEFAULT 0,
    performance_score DECIMAL(5,2) DEFAULT 0.00, -- Calculated score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- =====================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Order submissions indexes
CREATE INDEX IF NOT EXISTS idx_order_submissions_shipping_method ON order_submissions(shipping_method);
CREATE INDEX IF NOT EXISTS idx_order_submissions_shipped_by ON order_submissions(shipped_by);
CREATE INDEX IF NOT EXISTS idx_order_submissions_shipped_at ON order_submissions(shipped_at);
CREATE INDEX IF NOT EXISTS idx_order_submissions_tracking_number ON order_submissions(tracking_number);
CREATE INDEX IF NOT EXISTS idx_order_submissions_status_shipped_at ON order_submissions(status, shipped_at);

-- Order notes indexes
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_created_by ON order_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_order_notes_created_at ON order_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_order_notes_note_type ON order_notes(note_type);

-- Order status history indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON order_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON order_status_history(changed_at);

-- Shipping tracking events indexes
CREATE INDEX IF NOT EXISTS idx_shipping_tracking_events_order_id ON shipping_tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_tracking_events_tracking_number ON shipping_tracking_events(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_tracking_events_event_timestamp ON shipping_tracking_events(event_timestamp);

-- Warehouse performance indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_performance_metrics_user_date ON warehouse_performance_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_warehouse_performance_metrics_date ON warehouse_performance_metrics(date);

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Shipping methods policies
DROP POLICY IF EXISTS "shipping_methods_read" ON shipping_methods;
CREATE POLICY "shipping_methods_read" ON shipping_methods 
FOR SELECT USING (true); -- Everyone can read shipping methods

DROP POLICY IF EXISTS "shipping_methods_admin_manage" ON shipping_methods;
CREATE POLICY "shipping_methods_admin_manage" ON shipping_methods 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Order notes policies
DROP POLICY IF EXISTS "order_notes_admin_all" ON order_notes;
CREATE POLICY "order_notes_admin_all" ON order_notes 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "order_notes_warehouse_all" ON order_notes;
CREATE POLICY "order_notes_warehouse_all" ON order_notes 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'warehouse'));

DROP POLICY IF EXISTS "order_notes_employee_read" ON order_notes;
CREATE POLICY "order_notes_employee_read" ON order_notes 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee'));

DROP POLICY IF EXISTS "order_notes_user_own" ON order_notes;
CREATE POLICY "order_notes_user_own" ON order_notes 
FOR ALL USING (created_by = auth.uid());

-- Order status history policies
DROP POLICY IF EXISTS "order_status_history_admin_all" ON order_status_history;
CREATE POLICY "order_status_history_admin_all" ON order_status_history 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "order_status_history_warehouse_all" ON order_status_history;
CREATE POLICY "order_status_history_warehouse_all" ON order_status_history 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'warehouse'));

DROP POLICY IF EXISTS "order_status_history_employee_read" ON order_status_history;
CREATE POLICY "order_status_history_employee_read" ON order_status_history 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee'));

-- Shipping tracking events policies
DROP POLICY IF EXISTS "shipping_tracking_events_read_all" ON shipping_tracking_events;
CREATE POLICY "shipping_tracking_events_read_all" ON shipping_tracking_events 
FOR SELECT USING (true); -- Everyone can read tracking events

DROP POLICY IF EXISTS "shipping_tracking_events_warehouse_manage" ON shipping_tracking_events;
CREATE POLICY "shipping_tracking_events_warehouse_manage" ON shipping_tracking_events 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'warehouse')));

-- Warehouse performance metrics policies
DROP POLICY IF EXISTS "warehouse_performance_admin_all" ON warehouse_performance_metrics;
CREATE POLICY "warehouse_performance_admin_all" ON warehouse_performance_metrics 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "warehouse_performance_user_own" ON warehouse_performance_metrics;
CREATE POLICY "warehouse_performance_user_own" ON warehouse_performance_metrics 
FOR SELECT USING (user_id = auth.uid());

-- Order submissions warehouse access
DROP POLICY IF EXISTS "warehouse_shipping_access" ON order_submissions;
CREATE POLICY "warehouse_shipping_access" ON order_submissions 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'warehouse'));

-- =====================================================
-- 10. FUNCTIONS AND PROCEDURES
-- =====================================================

-- Function to update order shipped status
CREATE OR REPLACE FUNCTION update_order_shipped_status(
    order_id BIGINT,
    shipping_method_name VARCHAR(50),
    tracking_num VARCHAR(100) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID;
    current_user_name VARCHAR(255);
    estimated_delivery DATE;
BEGIN
    -- Get current user info
    SELECT auth.uid() INTO current_user_id;
    SELECT name INTO current_user_name FROM users WHERE id = current_user_id;
    
    -- Calculate estimated delivery date
    SELECT CURRENT_DATE + estimated_delivery_days 
    INTO estimated_delivery 
    FROM shipping_methods 
    WHERE name = shipping_method_name;
    
    -- Update order
    UPDATE order_submissions 
    SET 
        status = 'shipped',
        shipping_method = shipping_method_name,
        tracking_number = tracking_num,
        shipped_at = NOW(),
        shipped_by = current_user_id,
        estimated_delivery_date = estimated_delivery,
        updated_at = NOW()
    WHERE id = order_id;
    
    -- Add tracking event
    IF tracking_num IS NOT NULL THEN
        INSERT INTO shipping_tracking_events (
            order_id, tracking_number, event_type, event_description, 
            event_timestamp, shipping_method, created_by
        ) VALUES (
            order_id, tracking_num, 'picked_up', 
            'Order picked up and shipped via ' || shipping_method_name,
            NOW(), shipping_method_name, current_user_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shipping statistics
CREATE OR REPLACE FUNCTION get_shipping_stats()
RETURNS TABLE(
    method_name VARCHAR(50),
    method_display VARCHAR(100),
    total_orders BIGINT,
    pending_orders BIGINT,
    shipped_orders BIGINT,
    delivered_orders BIGINT,
    avg_processing_days NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.name,
        sm.display_name,
        COUNT(os.id) as total_orders,
        COUNT(CASE WHEN os.status IN ('pending', 'processing') THEN 1 END) as pending_orders,
        COUNT(CASE WHEN os.status = 'shipped' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN os.status = 'delivered' THEN 1 END) as delivered_orders,
        ROUND(AVG(
            CASE 
                WHEN os.shipped_at IS NOT NULL AND os.created_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (os.shipped_at - os.created_at::timestamp with time zone)) / 86400 
            END
        ), 2) as avg_processing_days
    FROM shipping_methods sm
    LEFT JOIN order_submissions os ON os.shipping_method = sm.name
    WHERE sm.is_active = true
    GROUP BY sm.name, sm.display_name
    ORDER BY total_orders DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate warehouse performance
CREATE OR REPLACE FUNCTION calculate_warehouse_performance(
    user_id_param UUID,
    date_param DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
    orders_processed_count INTEGER := 0;
    orders_shipped_count INTEGER := 0;
    orders_cancelled_count INTEGER := 0;
    avg_processing_time INTEGER := 0;
    performance_score DECIMAL(5,2) := 0.00;
BEGIN
    -- Count orders processed today
    SELECT COUNT(*) INTO orders_processed_count
    FROM order_status_history 
    WHERE changed_by = user_id_param 
    AND DATE(changed_at) = date_param;
    
    -- Count orders shipped today
    SELECT COUNT(*) INTO orders_shipped_count
    FROM order_submissions 
    WHERE shipped_by = user_id_param 
    AND DATE(shipped_at) = date_param;
    
    -- Count orders cancelled today
    SELECT COUNT(*) INTO orders_cancelled_count
    FROM order_status_history 
    WHERE changed_by = user_id_param 
    AND new_status = 'cancelled'
    AND DATE(changed_at) = date_param;
    
    -- Calculate average processing time (in minutes)
    SELECT COALESCE(AVG(
        EXTRACT(EPOCH FROM (shipped_at - created_at)) / 60
    ), 0)::INTEGER INTO avg_processing_time
    FROM order_submissions 
    WHERE shipped_by = user_id_param 
    AND DATE(shipped_at) = date_param;
    
    -- Calculate performance score (simple formula)
    performance_score := LEAST(100.0, 
        (orders_shipped_count * 10) + 
        (orders_processed_count * 2) - 
        (orders_cancelled_count * 5) +
        CASE WHEN avg_processing_time > 0 AND avg_processing_time < 60 THEN 20 ELSE 0 END
    );
    
    -- Insert or update performance metrics
    INSERT INTO warehouse_performance_metrics (
        user_id, date, orders_processed, orders_shipped, orders_cancelled,
        average_processing_time_minutes, performance_score
    ) VALUES (
        user_id_param, date_param, orders_processed_count, orders_shipped_count,
        orders_cancelled_count, avg_processing_time, performance_score
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
        orders_processed = EXCLUDED.orders_processed,
        orders_shipped = EXCLUDED.orders_shipped,
        orders_cancelled = EXCLUDED.orders_cancelled,
        average_processing_time_minutes = EXCLUDED.average_processing_time_minutes,
        performance_score = EXCLUDED.performance_score,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add tracking event
CREATE OR REPLACE FUNCTION add_tracking_event(
    order_id_param BIGINT,
    tracking_number_param VARCHAR(100),
    event_type_param VARCHAR(50),
    event_description_param TEXT,
    event_location_param VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
    shipping_method_name VARCHAR(50);
BEGIN
    -- Get shipping method for the order
    SELECT shipping_method INTO shipping_method_name
    FROM order_submissions 
    WHERE id = order_id_param;
    
    -- Insert tracking event
    INSERT INTO shipping_tracking_events (
        order_id, tracking_number, event_type, event_description,
        event_location, event_timestamp, shipping_method, created_by
    ) VALUES (
        order_id_param, tracking_number_param, event_type_param, 
        event_description_param, event_location_param, NOW(),
        shipping_method_name, auth.uid()
    ) RETURNING id INTO event_id;
    
    -- Update order status if delivered
    IF event_type_param = 'delivered' THEN
        UPDATE order_submissions 
        SET 
            status = 'delivered',
            actual_delivery_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = order_id_param;
    END IF;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_shipping_methods_updated_at ON shipping_methods;
CREATE TRIGGER update_shipping_methods_updated_at
    BEFORE UPDATE ON shipping_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_notes_updated_at ON order_notes;
CREATE TRIGGER update_order_notes_updated_at
    BEFORE UPDATE ON order_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warehouse_performance_updated_at ON warehouse_performance_metrics;
CREATE TRIGGER update_warehouse_performance_updated_at
    BEFORE UPDATE ON warehouse_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_order_shipped_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_shipping_stats TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_warehouse_performance TO authenticated;
GRANT EXECUTE ON FUNCTION add_tracking_event TO authenticated;

-- =====================================================
-- 13. SAMPLE DATA (Optional)
-- =====================================================

-- Update some existing orders with shipping methods for testing
DO $$
DECLARE
    order_record RECORD;
    methods VARCHAR[] := ARRAY['SMSA', 'DRB', 'OUR_SHIPPED', 'STANDARD'];
    random_method VARCHAR;
BEGIN
    -- Update up to 10 existing orders with random shipping methods
    FOR order_record IN 
        SELECT id FROM order_submissions 
        WHERE shipping_method IS NULL 
        LIMIT 10
    LOOP
        random_method := methods[1 + (random() * array_length(methods, 1))::int];
        
        UPDATE order_submissions 
        SET shipping_method = random_method
        WHERE id = order_record.id;
    END LOOP;
    
    RAISE NOTICE 'Sample shipping methods assigned to existing orders';
END $$;

-- =====================================================
-- 14. FINAL STATUS REPORT
-- =====================================================

DO $$
DECLARE
    user_count INTEGER;
    warehouse_user_count INTEGER;
    orders_count INTEGER;
    shipping_methods_count INTEGER;
    tables_created TEXT[];
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO warehouse_user_count FROM users WHERE role = 'warehouse';
    SELECT COUNT(*) INTO orders_count FROM order_submissions;
    SELECT COUNT(*) INTO shipping_methods_count FROM shipping_methods WHERE is_active = true;
    
    -- List of tables created/updated
    tables_created := ARRAY[
        'users (updated with warehouse role)',
        'shipping_methods',
        'order_submissions (enhanced with shipping columns)',
        'order_notes',
        'order_status_history',
        'shipping_tracking_events',
        'warehouse_performance_metrics'
    ];
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'WAREHOUSE SHIPPING SYSTEM SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'DATABASE STATISTICS:';
    RAISE NOTICE '  📊 Total users: %', user_count;
    RAISE NOTICE '  🏪 Warehouse users: %', warehouse_user_count;
    RAISE NOTICE '  📦 Total orders: %', orders_count;
    RAISE NOTICE '  🚚 Shipping methods: %', shipping_methods_count;
    RAISE NOTICE '';
    RAISE NOTICE 'TABLES CREATED/UPDATED:';
    FOR i IN 1..array_length(tables_created, 1) LOOP
        RAISE NOTICE '  ✅ %', tables_created[i];
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE 'SHIPPING METHODS AVAILABLE:';
    RAISE NOTICE '  🚚 SMSA Express';
    RAISE NOTICE '  🚛 DRB Logistics';
    RAISE NOTICE '  🏪 Our Shipped';
    RAISE NOTICE '  📦 Standard Shipping';
    RAISE NOTICE '';
    RAISE NOTICE 'FUNCTIONS CREATED:';
    RAISE NOTICE '  ⚡ update_order_shipped_status()';
    RAISE NOTICE '  📊 get_shipping_stats()';
    RAISE NOTICE '  📈 calculate_warehouse_performance()';
    RAISE NOTICE '  📍 add_tracking_event()';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. Create warehouse users via admin panel';
    RAISE NOTICE '  2. Test warehouse dashboard access';
    RAISE NOTICE '  3. Verify shipping method selection';
    RAISE NOTICE '  4. Test order status updates';
    RAISE NOTICE '';
    RAISE NOTICE '✅ System ready for warehouse operations!';
    RAISE NOTICE '========================================';
END $$; 