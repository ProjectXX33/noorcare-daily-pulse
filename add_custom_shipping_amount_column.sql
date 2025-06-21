-- Add custom_shipping_amount column to order_submissions table
-- This column is used to store custom shipping amounts when the user overrides the default shipping calculation

ALTER TABLE order_submissions 
ADD COLUMN IF NOT EXISTS custom_shipping_amount DECIMAL(10,2);

-- Add comment for documentation
COMMENT ON COLUMN order_submissions.custom_shipping_amount IS 'Custom shipping amount when user overrides default shipping calculation';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_submissions' 
AND column_name = 'custom_shipping_amount'; 