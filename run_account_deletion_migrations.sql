-- Account Deletion Migrations Runner
-- This script applies all the account deletion migrations in the correct order.
-- Run this script in your Supabase SQL editor to enable account deletion functionality.

-- IMPORTANT: Backup your database before running these migrations!

BEGIN;

-- Migration 1: Update foreign key constraints
\echo 'Running migration 1: Update foreign key constraints...'

-- Update projects table - allow created_by to be NULL when user is deleted
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_created_by_fkey,
ADD CONSTRAINT projects_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Update project_checklist_items table - allow created_by to be NULL
-- First, check if the table exists (it might have a different name)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_checklist_items') THEN
        ALTER TABLE project_checklist_items
        DROP CONSTRAINT IF EXISTS project_checklist_items_created_by_fkey,
        ADD CONSTRAINT project_checklist_items_created_by_fkey
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL;
    END IF;
    
    -- Also check for 'checklist_items' table name
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checklist_items') THEN
        ALTER TABLE checklist_items
        DROP CONSTRAINT IF EXISTS checklist_items_created_by_fkey,
        ADD CONSTRAINT checklist_items_created_by_fkey
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL;
    END IF;
END $$;

-- Update group_default_checklist_items table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_default_checklist_items') THEN
        ALTER TABLE group_default_checklist_items
        DROP CONSTRAINT IF EXISTS group_default_checklist_items_created_by_fkey,
        ADD CONSTRAINT group_default_checklist_items_created_by_fkey
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL;
    END IF;
END $$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by_null ON projects(created_by) WHERE created_by IS NULL;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_checklist_items') THEN
        CREATE INDEX IF NOT EXISTS idx_project_checklist_items_created_by_null ON project_checklist_items(created_by) WHERE created_by IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checklist_items') THEN
        CREATE INDEX IF NOT EXISTS idx_checklist_items_created_by_null ON checklist_items(created_by) WHERE created_by IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_default_checklist_items') THEN
        CREATE INDEX IF NOT EXISTS idx_group_default_checklist_created_by_null ON group_default_checklist_items(created_by) WHERE created_by IS NULL;
    END IF;
END $$;

\echo 'Migration 1 completed: Foreign key constraints updated'

-- Migration 2: Create account deletion functions
\echo 'Running migration 2: Create account deletion functions...'

-- Function 1: Analyze user's deletion impact
CREATE OR REPLACE FUNCTION analyze_user_deletion(target_user_id UUID) 
RETURNS TABLE(
  solo_groups JSON,
  admin_groups JSON,
  member_groups JSON,
  projects_created JSON,
  can_delete_immediately BOOLEAN
) AS $$
DECLARE
  solo_groups_data JSON;
  admin_groups_data JSON;
  member_groups_data JSON;
  projects_data JSON;
  can_delete BOOLEAN DEFAULT TRUE;
BEGIN
  -- Get groups where user is the only member (will be deleted)
  SELECT json_agg(
    json_build_object(
      'id', g.id,
      'name', g.name,
      'description', g.description,
      'project_count', (
        SELECT COUNT(*) FROM projects p WHERE p.group_id = g.id
      )
    )
  ) INTO solo_groups_data
  FROM groups g
  WHERE g.created_by = target_user_id
  AND (
    SELECT COUNT(*) FROM group_memberships gm 
    WHERE gm.group_id = g.id
  ) = 1;

  -- Get groups where user is admin but has other members (need transfer)
  SELECT json_agg(
    json_build_object(
      'id', g.id,
      'name', g.name,
      'description', g.description,
      'member_count', (
        SELECT COUNT(*) FROM group_memberships gm 
        WHERE gm.group_id = g.id
      ),
      'potential_admins', (
        SELECT json_agg(
          json_build_object(
            'id', u.id,
            'username', u.username,
            'email', u.email
          )
        )
        FROM group_memberships gm2
        JOIN users u ON u.id = gm2.user_id
        WHERE gm2.group_id = g.id 
        AND gm2.user_id != target_user_id
        AND gm2.role = 'member'
      ),
      'projects_to_transfer', (
        SELECT COUNT(*) FROM projects p 
        WHERE p.group_id = g.id AND p.created_by = target_user_id
      )
    )
  ) INTO admin_groups_data
  FROM groups g
  JOIN group_memberships gm ON gm.group_id = g.id
  WHERE gm.user_id = target_user_id 
  AND gm.role = 'admin'
  AND (
    SELECT COUNT(*) FROM group_memberships gm2 
    WHERE gm2.group_id = g.id
  ) > 1;

  -- Get groups where user is just a member (simple removal)
  SELECT json_agg(
    json_build_object(
      'id', g.id,
      'name', g.name,
      'description', g.description
    )
  ) INTO member_groups_data
  FROM groups g
  JOIN group_memberships gm ON gm.group_id = g.id
  WHERE gm.user_id = target_user_id 
  AND gm.role = 'member';

  -- Get all projects created by user (for reference)
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'group_id', p.group_id,
      'group_name', g.name,
      'member_count', (
        SELECT COUNT(*) FROM project_members pm 
        WHERE pm.project_id = p.id
      )
    )
  ) INTO projects_data
  FROM projects p
  JOIN groups g ON g.id = p.group_id
  WHERE p.created_by = target_user_id;

  -- User cannot delete immediately if they're admin of groups with other members
  IF admin_groups_data IS NOT NULL THEN
    can_delete := FALSE;
  END IF;

  -- Return the analysis
  RETURN QUERY SELECT 
    COALESCE(solo_groups_data, '[]'::JSON),
    COALESCE(admin_groups_data, '[]'::JSON),
    COALESCE(member_groups_data, '[]'::JSON),
    COALESCE(projects_data, '[]'::JSON),
    can_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Transfer group ownership
CREATE OR REPLACE FUNCTION transfer_group_ownership(
  target_group_id UUID,
  old_admin_id UUID,
  new_admin_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Validate that the new admin is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = target_group_id 
    AND user_id = new_admin_id
  ) THEN
    RAISE EXCEPTION 'New admin must be an existing group member';
  END IF;

  -- Validate that the old admin is actually an admin
  IF NOT EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = target_group_id 
    AND user_id = old_admin_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Old admin is not an admin of this group';
  END IF;

  -- Update the new admin's role
  UPDATE group_memberships 
  SET role = 'admin' 
  WHERE group_id = target_group_id 
  AND user_id = new_admin_id;

  -- Transfer group ownership
  UPDATE groups
  SET created_by = new_admin_id
  WHERE id = target_group_id;

  -- Transfer all projects in this group created by the old admin
  UPDATE projects 
  SET created_by = new_admin_id
  WHERE group_id = target_group_id 
  AND created_by = old_admin_id;

  -- Transfer default checklist items created by old admin (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_default_checklist_items') THEN
    UPDATE group_default_checklist_items
    SET created_by = new_admin_id
    WHERE group_id = target_group_id 
    AND created_by = old_admin_id;
  END IF;

  -- Update old admin to member role (will be deleted if they're deleting account)
  UPDATE group_memberships 
  SET role = 'member' 
  WHERE group_id = target_group_id 
  AND user_id = old_admin_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Safe user account deletion
CREATE OR REPLACE FUNCTION delete_user_account(
  target_user_id UUID,
  transfer_mappings JSON DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  analysis_result RECORD;
  mapping RECORD;
  deletion_summary JSON;
  solo_groups_deleted INTEGER := 0;
  groups_transferred INTEGER := 0;
  memberships_removed INTEGER := 0;
  projects_orphaned INTEGER := 0;
BEGIN
  -- First, analyze the user's data
  SELECT * INTO analysis_result 
  FROM analyze_user_deletion(target_user_id);

  -- If user has admin groups, they must provide transfer mappings
  IF NOT analysis_result.can_delete_immediately AND transfer_mappings IS NULL THEN
    RAISE EXCEPTION 'User has admin groups with other members. Transfer mappings required.';
  END IF;

  -- Process ownership transfers if provided
  IF transfer_mappings IS NOT NULL THEN
    FOR mapping IN 
      SELECT * FROM json_to_recordset(transfer_mappings) 
      AS x(group_id UUID, new_admin_id UUID)
    LOOP
      -- Perform the ownership transfer
      PERFORM transfer_group_ownership(
        mapping.group_id,
        target_user_id,
        mapping.new_admin_id
      );
      groups_transferred := groups_transferred + 1;
    END LOOP;
  END IF;

  -- Count projects that will become orphaned
  SELECT COUNT(*) INTO projects_orphaned
  FROM projects 
  WHERE created_by = target_user_id;

  -- Delete solo groups (CASCADE will handle projects, memberships, etc.)
  DELETE FROM groups 
  WHERE created_by = target_user_id
  AND id IN (
    SELECT g.id FROM groups g
    WHERE g.created_by = target_user_id
    AND (
      SELECT COUNT(*) FROM group_memberships gm 
      WHERE gm.group_id = g.id
    ) = 1
  );
  GET DIAGNOSTICS solo_groups_deleted = ROW_COUNT;

  -- Remove user from all remaining group memberships (CASCADE)
  DELETE FROM group_memberships WHERE user_id = target_user_id;
  GET DIAGNOSTICS memberships_removed = ROW_COUNT;

  -- Remove user from all project memberships (CASCADE)
  DELETE FROM project_members WHERE user_id = target_user_id;

  -- Check if project_assignments table exists and clean up
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_assignments') THEN
    DELETE FROM project_assignments WHERE user_id = target_user_id;
  END IF;

  -- Delete the user profile (this will trigger SET NULL for created_by fields)
  DELETE FROM users WHERE id = target_user_id;

  -- Build deletion summary
  deletion_summary := json_build_object(
    'user_deleted', TRUE,
    'solo_groups_deleted', solo_groups_deleted,
    'groups_transferred', groups_transferred,
    'memberships_removed', memberships_removed,
    'projects_orphaned', projects_orphaned,
    'timestamp', NOW()
  );

  RETURN deletion_summary;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Account deletion failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

\echo 'Migration 2 completed: Account deletion functions created'

-- Migration 3: Create secure wrapper functions
\echo 'Running migration 3: Create secure wrapper functions...'

-- Security function
CREATE OR REPLACE FUNCTION can_transfer_group_ownership(
    target_group_id UUID,
    old_admin_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM group_memberships 
        WHERE group_id = target_group_id 
        AND user_id = old_admin_id
        AND user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure wrapper functions
CREATE OR REPLACE FUNCTION analyze_user_deletion_secure(target_user_id UUID) 
RETURNS TABLE(
  solo_groups JSON,
  admin_groups JSON,
  member_groups JSON,
  projects_created JSON,
  can_delete_immediately BOOLEAN
) AS $$
BEGIN
    IF auth.uid() != target_user_id THEN
        RAISE EXCEPTION 'Access denied: can only analyze your own account deletion';
    END IF;
    
    RETURN QUERY SELECT * FROM analyze_user_deletion(target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION transfer_group_ownership_secure(
  target_group_id UUID,
  old_admin_id UUID,
  new_admin_id UUID
) RETURNS VOID AS $$
BEGIN
    IF auth.uid() != old_admin_id THEN
        RAISE EXCEPTION 'Access denied: can only transfer ownership of groups you admin';
    END IF;
    
    IF NOT can_transfer_group_ownership(target_group_id, old_admin_id) THEN
        RAISE EXCEPTION 'Access denied: you are not an admin of this group';
    END IF;
    
    PERFORM transfer_group_ownership(target_group_id, old_admin_id, new_admin_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_user_account_secure(
  target_user_id UUID,
  transfer_mappings JSON DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    IF auth.uid() != target_user_id THEN
        RAISE EXCEPTION 'Access denied: can only delete your own account';
    END IF;
    
    RETURN delete_user_account(target_user_id, transfer_mappings);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION analyze_user_deletion_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_group_ownership_secure(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account_secure(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION can_transfer_group_ownership(UUID, UUID) TO authenticated;

\echo 'Migration 3 completed: Secure wrapper functions created'

COMMIT;

\echo 'All account deletion migrations completed successfully!'
\echo ''
\echo 'You can now use these functions in your application:'
\echo '1. analyze_user_deletion_secure(auth.uid()) - to analyze deletion impact'
\echo '2. transfer_group_ownership_secure(group_id, auth.uid(), new_admin_id) - to transfer ownership'
\echo '3. delete_user_account_secure(auth.uid(), transfer_mappings) - to delete account'
\echo ''
\echo 'Remember to test thoroughly before using in production!'