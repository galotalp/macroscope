-- Check the schema of your tables to understand the data types
-- Run this first to see the column types

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN (
        'users', 'groups', 'research_groups', 'research_group_members',
        'group_memberships', 'projects', 'project_assignments', 
        'checklist_items', 'project_files', 'checklists'
    )
ORDER BY table_name, ordinal_position;