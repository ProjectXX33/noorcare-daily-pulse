-- Add Executive Director to position constraints
-- This updates the position constraint to include Executive Director

DO $$
BEGIN
    -- Check if constraint exists before dropping
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_position_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_position_check;
        RAISE NOTICE 'Dropped existing users_position_check constraint';
    END IF;

    -- Add new position constraint that includes Executive Director
    ALTER TABLE users ADD CONSTRAINT users_position_check 
    CHECK (position IN (
        'Customer Service', 
        'Designer', 
        'Media Buyer', 
        'Copy Writing', 
        'Web Developer', 
        'Warehouse Staff',
        'Executive Director'
    ));

    RAISE NOTICE 'Users table position constraint updated to include Executive Director';
END $$;

-- Final notification
SELECT 'Executive Director position has been successfully added to the database constraints!' as status;


