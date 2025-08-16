-- Migration: Row Level Security Policies for Account Deletion
-- This migration adds RLS policies to ensure users can only analyze/delete their own accounts
-- and transfer ownership of groups they admin.

-- Policy 1: Users can only analyze their own account deletion
-- This ensures users can't see other users' private group/project information
CREATE POLICY "Users can analyze their own account deletion" ON users
    FOR SELECT USING (
        auth.uid() = id
        AND current_setting('request.method', true) = 'POST'
        AND current_setting('request.path', true) LIKE '%analyze_user_deletion%'
    );

-- Policy 2: Group admins can transfer ownership of their groups
-- This policy allows the transfer_group_ownership function to work correctly
-- by ensuring the calling user is actually an admin of the group
CREATE OR REPLACE FUNCTION can_transfer_group_ownership(
    target_group_id UUID,
    old_admin_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the current user is the old admin and is actually an admin
    RETURN EXISTS (
        SELECT 1 FROM group_memberships 
        WHERE group_id = target_group_id 
        AND user_id = old_admin_id
        AND user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy 3: Users can only delete their own account
-- This is enforced at the application level, but we add this as extra security
CREATE OR REPLACE FUNCTION can_delete_user_account(target_user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Users can only delete their own account
    RETURN auth.uid() = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the account deletion functions to include security checks
CREATE OR REPLACE FUNCTION analyze_user_deletion_secure(target_user_id UUID) 
RETURNS TABLE(
  solo_groups JSON,
  admin_groups JSON,
  member_groups JSON,
  projects_created JSON,
  can_delete_immediately BOOLEAN
) AS $$
BEGIN
    -- Security check: users can only analyze their own account
    IF auth.uid() != target_user_id THEN
        RAISE EXCEPTION 'Access denied: can only analyze your own account deletion';
    END IF;
    
    -- Call the original function
    RETURN QUERY SELECT * FROM analyze_user_deletion(target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION transfer_group_ownership_secure(
  target_group_id UUID,
  old_admin_id UUID,
  new_admin_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Security check: user must be the old admin
    IF auth.uid() != old_admin_id THEN
        RAISE EXCEPTION 'Access denied: can only transfer ownership of groups you admin';
    END IF;
    
    -- Additional check using our helper function
    IF NOT can_transfer_group_ownership(target_group_id, old_admin_id) THEN
        RAISE EXCEPTION 'Access denied: you are not an admin of this group';
    END IF;
    
    -- Call the original function
    PERFORM transfer_group_ownership(target_group_id, old_admin_id, new_admin_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_user_account_secure(
  target_user_id UUID,
  transfer_mappings JSON DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    -- Security check: users can only delete their own account
    IF auth.uid() != target_user_id THEN
        RAISE EXCEPTION 'Access denied: can only delete your own account';
    END IF;
    
    -- Call the original function
    RETURN delete_user_account(target_user_id, transfer_mappings);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the secure functions
GRANT EXECUTE ON FUNCTION analyze_user_deletion_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_group_ownership_secure(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account_secure(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION can_transfer_group_ownership(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_user_account(UUID) TO authenticated;

-- Revoke execute on the non-secure functions from public (keep for internal use)
REVOKE EXECUTE ON FUNCTION analyze_user_deletion(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION transfer_group_ownership(UUID, UUID, UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION delete_user_account(UUID, JSON) FROM authenticated;