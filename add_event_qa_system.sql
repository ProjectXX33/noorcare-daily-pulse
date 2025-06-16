-- Add Q&A System for Events
-- Run this script in Supabase SQL Editor to add Q&A functionality to events

-- =====================================================
-- 1. CREATE EVENT Q&A TABLE
-- =====================================================

-- Create event_qa table to store questions and answers for events
CREATE TABLE IF NOT EXISTS event_qa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    answered_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT event_qa_question_not_empty CHECK (LENGTH(TRIM(question)) > 0),
    CONSTRAINT event_qa_order_positive CHECK (order_index >= 0)
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for event lookup
CREATE INDEX IF NOT EXISTS idx_event_qa_event_id ON event_qa(event_id);

-- Index for ordering Q&A items
CREATE INDEX IF NOT EXISTS idx_event_qa_order ON event_qa(event_id, order_index);

-- Index for active Q&A items
CREATE INDEX IF NOT EXISTS idx_event_qa_active ON event_qa(event_id, is_active) WHERE is_active = true;

-- Index for creator lookup
CREATE INDEX IF NOT EXISTS idx_event_qa_created_by ON event_qa(created_by);

-- Index for answerer lookup
CREATE INDEX IF NOT EXISTS idx_event_qa_answered_by ON event_qa(answered_by) WHERE answered_by IS NOT NULL;

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS for event_qa table
ALTER TABLE event_qa ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Policy for viewing Q&A: All authenticated users can view
CREATE POLICY "event_qa_select_policy" ON event_qa
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL AND
        is_active = true
    );

-- Policy for creating Q&A: Only authenticated users can create questions
CREATE POLICY "event_qa_insert_policy" ON event_qa
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by = auth.uid()
    );

-- Policy for updating Q&A: 
-- - Question creators can edit their own questions (if not answered yet)
-- - Admins and Media Buyers can answer questions and edit any Q&A
CREATE POLICY "event_qa_update_policy" ON event_qa
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL AND (
            -- Question creator can edit their own unanswered questions
            (created_by = auth.uid() AND answered_by IS NULL) OR
            -- Admins can edit any Q&A
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
            -- Media Buyers can answer questions
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND position = 'Media Buyer')
        )
    );

-- Policy for deleting Q&A:
-- - Question creators can delete their own unanswered questions
-- - Admins can delete any Q&A
CREATE POLICY "event_qa_delete_policy" ON event_qa
    FOR DELETE 
    USING (
        auth.uid() IS NOT NULL AND (
            -- Question creator can delete their own unanswered questions
            (created_by = auth.uid() AND answered_by IS NULL) OR
            -- Admins can delete any Q&A
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- =====================================================
-- 5. CREATE HELPFUL FUNCTIONS
-- =====================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_qa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- If answer is being added, set answered_at and answered_by
    IF OLD.answer IS NULL AND NEW.answer IS NOT NULL THEN
        NEW.answered_at = CURRENT_TIMESTAMP;
        IF NEW.answered_by IS NULL THEN
            NEW.answered_by = auth.uid();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS trigger_update_event_qa_updated_at ON event_qa;
CREATE TRIGGER trigger_update_event_qa_updated_at
    BEFORE UPDATE ON event_qa
    FOR EACH ROW
    EXECUTE FUNCTION update_event_qa_updated_at();

-- =====================================================
-- 6. CREATE HELPER VIEWS
-- =====================================================

-- View for Q&A with user information
CREATE OR REPLACE VIEW event_qa_with_users AS
SELECT 
    eq.*,
    creator.name as creator_name,
    creator.email as creator_email,
    answerer.name as answerer_name,
    answerer.email as answerer_email
FROM event_qa eq
LEFT JOIN users creator ON eq.created_by = creator.id
LEFT JOIN users answerer ON eq.answered_by = answerer.id
WHERE eq.is_active = true
ORDER BY eq.event_id, eq.order_index, eq.created_at;

-- =====================================================
-- 7. INSERT SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Uncomment to insert sample Q&A data
/*
-- Insert sample Q&A for testing (requires existing events and users)
DO $$
DECLARE
    sample_event_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get a sample event
    SELECT id INTO sample_event_id FROM events LIMIT 1;
    
    -- Get an admin user
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF sample_event_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
        INSERT INTO event_qa (event_id, question, answer, created_by, answered_by, order_index) VALUES
        (sample_event_id, 'What time does the event start?', 'The event starts at 9:00 AM sharp.', admin_user_id, admin_user_id, 1),
        (sample_event_id, 'Is there a dress code for this event?', 'Business casual attire is recommended.', admin_user_id, admin_user_id, 2),
        (sample_event_id, 'Will lunch be provided?', 'Yes, lunch will be provided for all attendees.', admin_user_id, admin_user_id, 3),
        (sample_event_id, 'Where is the parking available?', NULL, admin_user_id, NULL, 4);
        
        RAISE NOTICE 'Sample Q&A data inserted successfully!';
    ELSE
        RAISE NOTICE 'No events or admin users found. Sample data not inserted.';
    END IF;
END $$;
*/

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Check table was created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'event_qa' 
ORDER BY ordinal_position;

-- Check indexes were created
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'event_qa';

-- Check RLS policies were created
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'event_qa';

COMMENT ON TABLE event_qa IS 'Table for storing questions and answers related to events';
COMMENT ON COLUMN event_qa.event_id IS 'Foreign key reference to the events table';
COMMENT ON COLUMN event_qa.question IS 'The question text - cannot be empty';
COMMENT ON COLUMN event_qa.answer IS 'The answer text - can be null for unanswered questions';
COMMENT ON COLUMN event_qa.order_index IS 'Display order for Q&A items within an event';
COMMENT ON COLUMN event_qa.is_active IS 'Soft delete flag - false means the Q&A is deleted';
COMMENT ON COLUMN event_qa.created_by IS 'User who created the question';
COMMENT ON COLUMN event_qa.answered_by IS 'User who provided the answer';
COMMENT ON COLUMN event_qa.answered_at IS 'Timestamp when the question was answered'; 