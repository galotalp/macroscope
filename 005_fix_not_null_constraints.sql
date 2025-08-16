-- Migration: Fix NOT NULL constraints for account deletion
-- This migration fixes NOT NULL constraints that conflict with the SET NULL foreign key behavior

-- Fix project_members.added_by constraint
ALTER TABLE project_members 
DROP CONSTRAINT IF EXISTS project_members_added_by_fkey,
ADD CONSTRAINT project_members_added_by_fkey 
  FOREIGN KEY (added_by) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Allow NULL values in created_by fields that use SET NULL foreign keys
ALTER TABLE project_checklist_items ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE group_default_checklist_items ALTER COLUMN created_by DROP NOT NULL;

-- Note: projects.created_by should already allow NULL from the previous migration
-- but let's make sure
ALTER TABLE projects ALTER COLUMN created_by DROP NOT NULL;