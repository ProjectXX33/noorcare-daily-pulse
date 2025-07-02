ALTER TABLE order_submissions
ADD COLUMN IF NOT EXISTS copied_by_warehouse BOOLEAN DEFAULT FALSE; 