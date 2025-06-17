-- Create Order Submissions Table
-- This table stores all order submissions from customer service representatives

CREATE TABLE IF NOT EXISTS order_submissions (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50),
    woocommerce_order_id INTEGER,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Customer Information
    customer_first_name VARCHAR(255) NOT NULL,
    customer_last_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    
    -- Billing Address
    billing_address_1 VARCHAR(255) NOT NULL,
    billing_address_2 VARCHAR(255),
    billing_city VARCHAR(100) NOT NULL,
    billing_state VARCHAR(100),
    billing_postcode VARCHAR(20),
    billing_country VARCHAR(100) DEFAULT 'Saudi Arabia',
    
    -- Order Details
    order_items JSONB NOT NULL, -- Array of {product_id, product_name, quantity, price}
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Coupon Information
    coupon_code VARCHAR(100),
    coupon_discount_type VARCHAR(20), -- 'percent' or 'fixed_cart'
    coupon_amount VARCHAR(20),
    
    -- Additional Information
    customer_note TEXT,
    internal_notes TEXT,
    include_shipping BOOLEAN DEFAULT true,
    
    -- Order Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, cancelled
    payment_method VARCHAR(50) DEFAULT 'cod',
    payment_status VARCHAR(50) DEFAULT 'pending',
    
    -- WooCommerce Integration
    is_synced_to_woocommerce BOOLEAN DEFAULT false,
    sync_error TEXT,
    last_sync_attempt TIMESTAMP WITH TIME ZONE,
    
    -- Search and filtering
    search_text TEXT GENERATED ALWAYS AS (
        customer_first_name || ' ' || customer_last_name || ' ' || customer_phone || ' ' || 
        COALESCE(order_number, '') || ' ' || 
        COALESCE(billing_city, '') || ' ' ||
        COALESCE(customer_note, '')
    ) STORED
);

-- Enable the pg_trgm extension for full-text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_submissions_created_by ON order_submissions(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_order_submissions_created_at ON order_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_submissions_status ON order_submissions(status);
CREATE INDEX IF NOT EXISTS idx_order_submissions_customer_name ON order_submissions(customer_first_name, customer_last_name);
CREATE INDEX IF NOT EXISTS idx_order_submissions_order_number ON order_submissions(order_number);
-- Create a simple GIN index for search_text without trgm for now
CREATE INDEX IF NOT EXISTS idx_order_submissions_search_simple ON order_submissions USING gin(to_tsvector('english', search_text));
-- If pg_trgm is available, you can uncomment this line instead:
-- CREATE INDEX IF NOT EXISTS idx_order_submissions_search ON order_submissions USING gin(search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_order_submissions_total_amount ON order_submissions(total_amount);
CREATE INDEX IF NOT EXISTS idx_order_submissions_wc_order_id ON order_submissions(woocommerce_order_id);

-- Enable Row Level Security (RLS)
ALTER TABLE order_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Customer Service can view their own orders
CREATE POLICY "Customer Service can view own orders" ON order_submissions
    FOR SELECT USING (
        auth.uid() = created_by_user_id OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Customer Service can insert their own orders
CREATE POLICY "Customer Service can create orders" ON order_submissions
    FOR INSERT WITH CHECK (
        auth.uid() = created_by_user_id AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.position = 'Customer Service' OR users.role = 'admin')
        )
    );

-- Policy: Customer Service can update their own orders, admins can update any
CREATE POLICY "Customer Service can update own orders" ON order_submissions
    FOR UPDATE USING (
        auth.uid() = created_by_user_id OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Only admins can delete orders
CREATE POLICY "Only admins can delete orders" ON order_submissions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_order_submissions_updated_at_trigger ON order_submissions;
CREATE TRIGGER update_order_submissions_updated_at_trigger
    BEFORE UPDATE ON order_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_order_submissions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE order_submissions IS 'Stores order submissions created by customer service representatives';
COMMENT ON COLUMN order_submissions.order_items IS 'JSON array containing product details: [{product_id, product_name, quantity, price, sku}]';
COMMENT ON COLUMN order_submissions.search_text IS 'Generated column for full-text search across customer and order details';
COMMENT ON COLUMN order_submissions.is_synced_to_woocommerce IS 'Whether this order was successfully synced to WooCommerce'; 