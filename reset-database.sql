-- RESET DATABASE - DELETE ALL USER DATA
-- This will delete all users, groups, projects, and related data
-- RUN THIS ONLY IF YOU WANT TO START COMPLETELY FRESH

-- Delete in correct order to avoid foreign key conflicts

-- 1. Delete project files
DELETE FROM project_files;

-- 2. Delete project checklist items
DELETE FROM project_checklist_items;

-- 3. Delete project checklists
DELETE FROM project_checklists;

-- 4. Delete projects
DELETE FROM projects;

-- 5. Delete group join requests
DELETE FROM group_join_requests;

-- 6. Delete group memberships
DELETE FROM group_memberships;

-- 7. Delete groups
DELETE FROM groups;

-- 8. Delete notification preferences
DELETE FROM notification_preferences;

-- 9. Delete notifications
DELETE FROM notifications;

-- 10. Delete password reset tokens (if table exists)
DELETE FROM password_reset_tokens WHERE true;

-- 11. Delete email verification tokens (if table exists)
DELETE FROM email_verification_tokens WHERE true;

-- 12. Delete users from your custom users table
DELETE FROM users;

-- 13. Delete Supabase auth users (this removes all authentication data)
-- This is the most important - it removes all auth.users entries
DELETE FROM auth.users;

-- Verify cleanup
SELECT 'Users remaining' as table_name, count(*) as count FROM auth.users
UNION ALL
SELECT 'Custom users remaining', count(*) FROM users
UNION ALL
SELECT 'Groups remaining', count(*) FROM groups
UNION ALL
SELECT 'Projects remaining', count(*) FROM projects
UNION ALL
SELECT 'Group memberships remaining', count(*) FROM group_memberships;

-- Reset any auto-increment sequences if needed
-- (PostgreSQL uses sequences for auto-incrementing)

COMMIT;