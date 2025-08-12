-- Clear test files that were uploaded to public buckets
-- Run this in Supabase SQL Editor

-- Delete file records from database
DELETE FROM project_files;

-- Also clear any profile picture URLs that might be invalid
UPDATE users SET profile_picture = NULL WHERE profile_picture IS NOT NULL;

-- Verify cleanup
SELECT 'Project files cleared' as status, count(*) as remaining FROM project_files
UNION ALL
SELECT 'Profile pictures cleared', count(*) FROM users WHERE profile_picture IS NOT NULL;