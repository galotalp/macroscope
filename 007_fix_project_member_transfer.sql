-- Migration: Fix Project Member Transfer
-- This migration ensures that when project ownership is transferred,
-- the new owner is automatically added as a project member

CREATE OR REPLACE FUNCTION transfer_group_ownership(
  target_group_id UUID,
  old_admin_id UUID,
  new_admin_id UUID
) RETURNS VOID AS $$
DECLARE
  project_record RECORD;
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
  -- AND ensure the new owner is added as a project member
  FOR project_record IN 
    SELECT id FROM projects 
    WHERE group_id = target_group_id 
    AND created_by = old_admin_id
  LOOP
    -- Transfer project ownership
    UPDATE projects 
    SET created_by = new_admin_id
    WHERE id = project_record.id;
    
    -- Ensure new owner is a project member (insert if not exists)
    INSERT INTO project_members (project_id, user_id, role, added_by)
    VALUES (project_record.id, new_admin_id, 'admin', new_admin_id)
    ON CONFLICT (project_id, user_id) 
    DO UPDATE SET role = 'admin';
  END LOOP;

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

-- Also update the secure wrapper
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