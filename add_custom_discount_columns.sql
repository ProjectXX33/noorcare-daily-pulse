-- Add Custom Discount Columns to Order Submissions Table
-- Migration to add custom discount functionality

-- Add custom discount columns after coupon information
ALTER TABLE order_submissions 
ADD COLUMN IF NOT EXISTS custom_discount_type VARCHAR(20), -- 'percent' or 'fixed'
ADD COLUMN IF NOT EXISTS custom_discount_amount DECIMAL(10,2), 
ADD COLUMN IF NOT EXISTS custom_discount_reason TEXT;

-- Add comments for the new columns
COMMENT ON COLUMN order_submissions.custom_discount_type IS 'Type of custom discount: percent or fixed';
COMMENT ON COLUMN order_submissions.custom_discount_amount IS 'Amount of custom discount applied';
COMMENT ON COLUMN order_submissions.custom_discount_reason IS 'Reason for applying custom discount';

-- Update the search_text generated column to include custom discount reason
-- First drop the existing generated column
ALTER TABLE order_submissions DROP COLUMN IF EXISTS search_text;

-- Recreate the search_text column with custom discount reason included
ALTER TABLE order_submissions ADD COLUMN search_text TEXT GENERATED ALWAYS AS (
    customer_first_name || ' ' || customer_last_name || ' ' || customer_phone || ' ' || 
    COALESCE(order_number, '') || ' ' || 
    COALESCE(billing_city, '') || ' ' ||
    COALESCE(customer_note, '') || ' ' ||
    COALESCE(custom_discount_reason, '')
) STORED;

-- Recreate the search index
DROP INDEX IF EXISTS idx_order_submissions_search_simple;
CREATE INDEX idx_order_submissions_search_simple ON order_submissions USING gin(to_tsvector('english', search_text));

-- Log the migration
INSERT INTO schema_migrations (migration_name, executed_at) 
VALUES ('add_custom_discount_columns', NOW())
ON CONFLICT (migration_name) DO NOTHING; 