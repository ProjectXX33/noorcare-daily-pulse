-- Fix visual feeding data that contains JSON instead of URLs
-- This script will extract the publicUrl from JSON responses and update the database

-- First, let's see what we have
SELECT 
  id,
  title,
  visual_feeding,
  CASE 
    WHEN visual_feeding LIKE '{"success":true%' THEN 'JSON_RESPONSE'
    WHEN visual_feeding LIKE 'http%' THEN 'URL'
    ELSE 'OTHER'
  END as data_type
FROM tasks 
WHERE visual_feeding IS NOT NULL AND visual_feeding != '';

-- Update visual_feeding field to extract publicUrl from JSON responses
UPDATE tasks 
SET visual_feeding = (
  CASE 
    WHEN visual_feeding LIKE '{"success":true%' THEN 
      -- Extract publicUrl from JSON response
      (visual_feeding::json->>'publicUrl')
    ELSE 
      visual_feeding 
  END
)
WHERE visual_feeding IS NOT NULL 
  AND visual_feeding != '' 
  AND visual_feeding LIKE '{"success":true%';

-- Also fix attachment_file field if it has the same issue
UPDATE tasks 
SET attachment_file = (
  CASE 
    WHEN attachment_file LIKE '{"success":true%' THEN 
      -- Extract publicUrl from JSON response
      (attachment_file::json->>'publicUrl')
    ELSE 
      attachment_file 
  END
)
WHERE attachment_file IS NOT NULL 
  AND attachment_file != '' 
  AND attachment_file LIKE '{"success":true%';

-- Verify the fix
SELECT 
  id,
  title,
  visual_feeding,
  CASE 
    WHEN visual_feeding LIKE 'http%' THEN 'URL'
    WHEN visual_feeding IS NULL OR visual_feeding = '' THEN 'EMPTY'
    ELSE 'OTHER'
  END as data_type
FROM tasks 
WHERE visual_feeding IS NOT NULL AND visual_feeding != ''
ORDER BY updated_at DESC
LIMIT 10;
