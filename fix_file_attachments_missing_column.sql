-- Fix for file_attachments table missing file_type column
-- This resolves the error: "column file_attachments.file_type does not exist"

-- Add the missing file_type column to file_attachments table
ALTER TABLE file_attachments 
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Update existing records to have a default file_type based on file extension
UPDATE file_attachments 
SET file_type = CASE 
    WHEN file_name ILIKE '%.pdf' THEN 'application/pdf'
    WHEN file_name ILIKE '%.doc' OR file_name ILIKE '%.docx' THEN 'application/msword'
    WHEN file_name ILIKE '%.xls' OR file_name ILIKE '%.xlsx' THEN 'application/vnd.ms-excel'
    WHEN file_name ILIKE '%.jpg' OR file_name ILIKE '%.jpeg' THEN 'image/jpeg'
    WHEN file_name ILIKE '%.png' THEN 'image/png'
    WHEN file_name ILIKE '%.gif' THEN 'image/gif'
    WHEN file_name ILIKE '%.txt' THEN 'text/plain'
    WHEN file_name ILIKE '%.zip' THEN 'application/zip'
    WHEN file_name ILIKE '%.rar' THEN 'application/x-rar-compressed'
    ELSE 'application/octet-stream'
END
WHERE file_type IS NULL;

-- Verify the fix
SELECT 
    COUNT(*) as total_attachments,
    COUNT(file_type) as attachments_with_type,
    COUNT(*) - COUNT(file_type) as missing_file_type
FROM file_attachments;

-- Show sample of updated records
SELECT id, file_name, file_type, created_at
FROM file_attachments 
ORDER BY created_at DESC 
LIMIT 5;

-- Note: This script should be run in your Supabase SQL editor
-- After running this script, the file download functionality should work properly 