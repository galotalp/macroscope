-- Migration: Update Foreign Key Constraints for Account Deletion
-- This migration updates foreign key constraints to support safe account deletion
-- while preserving data integrity for shared resources.

-- Step 1: Update projects table - allow created_by to be NULL when user is deleted
-- This allows projects to survive when their creator deletes their account
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_created_by_fkey,
ADD CONSTRAINT projects_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Step 2: Update project_checklist_items table - allow created_by to be NULL
-- This allows checklist items to survive when their creator deletes their account
ALTER TABLE project_checklist_items
DROP CONSTRAINT IF EXISTS project_checklist_items_created_by_fkey,
ADD CONSTRAINT project_checklist_items_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Step 3: Update group_default_checklist_items table - allow created_by to be NULL
-- This allows default checklist templates to survive when their creator deletes their account
ALTER TABLE group_default_checklist_items
DROP CONSTRAINT IF EXISTS group_default_checklist_items_created_by_fkey,
ADD CONSTRAINT group_default_checklist_items_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Note: We keep CASCADE for groups.created_by because group ownership will be handled
-- through our transfer mechanism before deletion. Groups without owners should not exist.

-- Note: project_files.uploaded_by already uses SET NULL, which is correct.
-- Note: Other CASCADE relationships (group_memberships.user_id, project_members.user_id, etc.)
-- should remain CASCADE as these represent direct user participation that should be removed.

-- Add indexes to improve performance of NULL checks after deletion
CREATE INDEX IF NOT EXISTS idx_projects_created_by_null ON projects(created_by) WHERE created_by IS NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_items_created_by_null ON project_checklist_items(created_by) WHERE created_by IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_default_checklist_created_by_null ON group_default_checklist_items(created_by) WHERE created_by IS NULL;