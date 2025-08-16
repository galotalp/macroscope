-- Migration: Account Deletion Functions
-- This migration creates the SQL functions needed for safe account deletion
-- with ownership transfer capabilities.

-- Function 1: Analyze user's deletion impact
-- Returns categorized information about what will happen when user deletes account
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
-- Transfers ownership of a group and all related projects from one user to another
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

  -- Transfer default checklist items created by old admin
  UPDATE group_default_checklist_items
  SET created_by = new_admin_id
  WHERE group_id = target_group_id 
  AND created_by = old_admin_id;

  -- Update old admin to member role (will be deleted if they're deleting account)
  UPDATE group_memberships 
  SET role = 'member' 
  WHERE group_id = target_group_id 
  AND user_id = old_admin_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Safe user account deletion
-- Safely deletes a user account after handling all ownership transfers
CREATE OR REPLACE FUNCTION delete_user_account(
  target_user_id UUID,
  transfer_mappings JSON DEFAULT NULL -- Format: [{"group_id": "uuid", "new_admin_id": "uuid"}]
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

  -- Count projects that will become orphaned (created_by will be set to NULL)
  SELECT COUNT(*) INTO projects_orphaned
  FROM projects 
  WHERE created_by = target_user_id;

  -- Remove user from all remaining group memberships (CASCADE)
  DELETE FROM group_memberships WHERE user_id = target_user_id;
  GET DIAGNOSTICS memberships_removed = ROW_COUNT;

  -- Remove user from all project memberships (CASCADE)
  DELETE FROM project_members WHERE user_id = target_user_id;

  -- Remove user from all project assignments (CASCADE) 
  DELETE FROM project_assignments WHERE user_id = target_user_id;

  -- Delete the user profile (this will trigger CASCADE for remaining references)
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
    -- Log the error and re-raise
    RAISE EXCEPTION 'Account deletion failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: Validate ownership transfer (helper function)
-- Validates that a proposed ownership transfer is valid
CREATE OR REPLACE FUNCTION validate_ownership_transfer(
  target_group_id UUID,
  old_admin_id UUID,
  new_admin_id UUID
) RETURNS JSON AS $$
DECLARE
  validation_result JSON;
  is_valid BOOLEAN := TRUE;
  errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check if group exists
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = target_group_id) THEN
    is_valid := FALSE;
    errors := array_append(errors, 'Group does not exist');
  END IF;

  -- Check if old admin is actually admin
  IF NOT EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = target_group_id 
    AND user_id = old_admin_id 
    AND role = 'admin'
  ) THEN
    is_valid := FALSE;
    errors := array_append(errors, 'Old admin is not an admin of this group');
  END IF;

  -- Check if new admin is a member
  IF NOT EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = target_group_id 
    AND user_id = new_admin_id
  ) THEN
    is_valid := FALSE;
    errors := array_append(errors, 'New admin is not a member of this group');
  END IF;

  -- Check if new admin is different from old admin
  IF old_admin_id = new_admin_id THEN
    is_valid := FALSE;
    errors := array_append(errors, 'New admin must be different from current admin');
  END IF;

  validation_result := json_build_object(
    'is_valid', is_valid,
    'errors', array_to_json(errors),
    'group_id', target_group_id,
    'old_admin_id', old_admin_id,
    'new_admin_id', new_admin_id
  );

  RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION analyze_user_deletion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_group_ownership(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_ownership_transfer(UUID, UUID, UUID) TO authenticated;