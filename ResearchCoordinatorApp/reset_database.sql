-- Reset Database - Delete All Data
-- This will delete all users, groups, projects, and files

BEGIN;

-- Delete all data in dependency order (most dependent first)
DELETE FROM group_join_requests;
DELETE FROM group_memberships;
DELETE FROM project_members;
DELETE FROM project_files;
DELETE FROM project_checklist_items;
DELETE FROM group_default_checklist_items;
DELETE FROM projects;
DELETE FROM groups;

-- Delete all users from auth.users (this will cascade)
DELETE FROM auth.users;
DELETE FROM users;

COMMIT;

-- Verify deletion
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Groups', COUNT(*) FROM groups
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects
UNION ALL
SELECT 'Project Files', COUNT(*) FROM project_files
UNION ALL
SELECT 'Project Checklist Items', COUNT(*) FROM project_checklist_items
UNION ALL
SELECT 'Group Default Checklist Items', COUNT(*) FROM group_default_checklist_items
UNION ALL
SELECT 'Project Members', COUNT(*) FROM project_members
UNION ALL
SELECT 'Group Memberships', COUNT(*) FROM group_memberships
UNION ALL
SELECT 'Group Join Requests', COUNT(*) FROM group_join_requests;