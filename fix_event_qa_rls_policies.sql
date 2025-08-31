-- =====================================================
-- FIX EVENT Q&A RLS POLICIES FOR CONTENT & CREATIVE MANAGER
-- =====================================================
-- This script updates the event_qa RLS policies to allow content_creative_manager
-- to answer questions and edit Q&A, not just create questions
-- =====================================================

-- Step 1: Check current event_qa RLS policies
-- =====================================================
SELECT '=== CURRENT EVENT Q&A POLICIES ===' as step;

SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'event_qa'
ORDER BY policyname;

-- Step 2: Drop existing update and delete policies
-- =====================================================
SELECT '=== DROPPING OLD POLICIES ===' as step;

DROP POLICY IF EXISTS "event_qa_update_policy" ON event_qa;
DROP POLICY IF EXISTS "event_qa_delete_policy" ON event_qa;

-- Step 3: Create new update policy that includes content_creative_manager
-- =====================================================
SELECT '=== CREATING NEW UPDATE POLICY ===' as step;

-- Policy for updating Q&A: 
-- - Question creators can edit their own questions (if not answered yet)
-- - Admins and Content & Creative Managers can answer questions and edit any Q&A
-- - Media Buyers can answer questions
CREATE POLICY "event_qa_update_policy" ON event_qa
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL AND (
            -- Question creator can edit their own unanswered questions
            (created_by = auth.uid() AND answered_by IS NULL) OR
            -- Admins can edit any Q&A
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
            -- Content & Creative Managers can answer questions and edit any Q&A
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'content_creative_manager') OR
            -- Media Buyers can answer questions
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND position = 'Media Buyer')
        )
    );

-- Step 4: Create new delete policy that includes content_creative_manager
-- =====================================================
SELECT '=== CREATING NEW DELETE POLICY ===' as step;

-- Policy for deleting Q&A:
-- - Question creators can delete their own unanswered questions
-- - Admins and Content & Creative Managers can delete any Q&A
CREATE POLICY "event_qa_delete_policy" ON event_qa
    FOR DELETE 
    USING (
        auth.uid() IS NOT NULL AND (
            -- Question creator can delete their own unanswered questions
            (created_by = auth.uid() AND answered_by IS NULL) OR
            -- Admins can delete any Q&A
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
            -- Content & Creative Managers can delete any Q&A
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'content_creative_manager')
        )
    );

-- Step 5: Verify the new policies
-- =====================================================
SELECT '=== VERIFYING NEW POLICIES ===' as step;

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%content_creative_manager%' 
        THEN '✅ PASS - Includes content_creative_manager'
        ELSE '❌ FAIL - Missing content_creative_manager'
    END as status
FROM pg_policies 
WHERE tablename = 'event_qa'
ORDER BY policyname;

-- Step 6: Test summary
-- =====================================================
SELECT '=== TEST SUMMARY ===' as step;

SELECT 
    'Content & Creative Managers can now:' as capability,
    '✅ Answer questions' as answer_questions,
    '✅ Edit any Q&A' as edit_qa,
    '✅ Delete any Q&A' as delete_qa;

SELECT 
    'Dr Walaa should now be able to add both Questions AND Answers!' as message;
