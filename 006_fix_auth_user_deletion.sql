-- Migration: Fix Auth User Deletion
-- This migration fixes the account deletion to properly remove auth users

-- Update the delete_user_account function to handle auth users
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

  -- Delete from auth.users first (this should cascade to users table)
  -- Note: In a real implementation, this should be done via Supabase Admin API
  -- For now, we'll delete both explicitly
  DELETE FROM auth.users WHERE id = target_user_id;
  
  -- Delete the user profile (if it still exists after auth deletion)
  DELETE FROM users WHERE id = target_user_id;

  -- Build deletion summary
  deletion_summary := json_build_object(
    'user_deleted', TRUE,
    'solo_groups_deleted', solo_groups_deleted,
    'groups_transferred', groups_transferred,
    'memberships_removed', memberships_removed,
    'projects_orphaned', projects_orphaned,
    'auth_user_deleted', TRUE,
    'timestamp', NOW()
  );

  RETURN deletion_summary;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Account deletion failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the secure wrapper as well
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