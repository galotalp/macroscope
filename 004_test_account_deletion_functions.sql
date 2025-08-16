-- Test Script: Account Deletion Functions
-- This script provides test cases and examples for the account deletion functionality.
-- Run these tests in a development environment to verify the functions work correctly.

-- WARNING: This script creates and deletes test data. Only run in development!

-- Test Setup: Create test users and data
DO $$
DECLARE
    test_user1_id UUID;
    test_user2_id UUID;
    test_user3_id UUID;
    test_group1_id UUID;
    test_group2_id UUID;
    test_project1_id UUID;
    analysis_result RECORD;
    transfer_result JSON;
    deletion_result JSON;
BEGIN
    -- Skip if we're in production (basic check)
    IF current_database() LIKE '%prod%' OR current_database() LIKE '%production%' THEN
        RAISE EXCEPTION 'Cannot run tests in production database!';
    END IF;

    RAISE NOTICE 'Starting account deletion function tests...';
    
    -- Create test users
    INSERT INTO users (id, username, email, password_hash)
    VALUES 
        (gen_random_uuid(), 'test_user1', 'test1@example.com', 'fake_hash'),
        (gen_random_uuid(), 'test_user2', 'test2@example.com', 'fake_hash'),
        (gen_random_uuid(), 'test_user3', 'test3@example.com', 'fake_hash')
    RETURNING id INTO test_user1_id, test_user2_id, test_user3_id;

    -- Get the user IDs
    SELECT id INTO test_user1_id FROM users WHERE username = 'test_user1';
    SELECT id INTO test_user2_id FROM users WHERE username = 'test_user2';
    SELECT id INTO test_user3_id FROM users WHERE username = 'test_user3';

    RAISE NOTICE 'Created test users: %, %, %', test_user1_id, test_user2_id, test_user3_id;

    -- Create test groups
    INSERT INTO groups (id, name, description, created_by)
    VALUES 
        (gen_random_uuid(), 'Test Group 1', 'Solo group', test_user1_id),
        (gen_random_uuid(), 'Test Group 2', 'Multi-member group', test_user1_id)
    RETURNING id INTO test_group1_id, test_group2_id;

    -- Get the group IDs
    SELECT id INTO test_group1_id FROM groups WHERE name = 'Test Group 1';
    SELECT id INTO test_group2_id FROM groups WHERE name = 'Test Group 2';

    -- Create group memberships
    INSERT INTO group_memberships (group_id, user_id, role)
    VALUES 
        (test_group1_id, test_user1_id, 'admin'),  -- Solo group
        (test_group2_id, test_user1_id, 'admin'),  -- Multi-member group
        (test_group2_id, test_user2_id, 'member'), -- Additional member
        (test_group2_id, test_user3_id, 'member'); -- Additional member

    -- Create test projects
    INSERT INTO projects (id, name, description, group_id, created_by)
    VALUES 
        (gen_random_uuid(), 'Test Project 1', 'Project in solo group', test_group1_id, test_user1_id),
        (gen_random_uuid(), 'Test Project 2', 'Project in multi group', test_group2_id, test_user1_id);

    SELECT id INTO test_project1_id FROM projects WHERE name = 'Test Project 1';

    -- Add project members
    INSERT INTO project_members (project_id, user_id, role)
    VALUES 
        (test_project1_id, test_user1_id, 'admin'),
        ((SELECT id FROM projects WHERE name = 'Test Project 2'), test_user1_id, 'admin'),
        ((SELECT id FROM projects WHERE name = 'Test Project 2'), test_user2_id, 'member');

    RAISE NOTICE 'Test data created successfully';

    -- TEST 1: Analyze user deletion
    RAISE NOTICE 'TEST 1: Analyzing user deletion for test_user1...';
    
    SELECT * INTO analysis_result FROM analyze_user_deletion(test_user1_id);
    
    RAISE NOTICE 'Analysis result:';
    RAISE NOTICE '  Solo groups: %', analysis_result.solo_groups;
    RAISE NOTICE '  Admin groups: %', analysis_result.admin_groups;
    RAISE NOTICE '  Member groups: %', analysis_result.member_groups;
    RAISE NOTICE '  Projects created: %', analysis_result.projects_created;
    RAISE NOTICE '  Can delete immediately: %', analysis_result.can_delete_immediately;

    -- Should show can_delete_immediately = FALSE because user1 is admin of group with other members

    -- TEST 2: Validate ownership transfer
    RAISE NOTICE 'TEST 2: Validating ownership transfer...';
    
    SELECT validate_ownership_transfer(test_group2_id, test_user1_id, test_user2_id) INTO transfer_result;
    RAISE NOTICE 'Validation result: %', transfer_result;

    -- Should be valid transfer

    -- TEST 3: Transfer group ownership
    RAISE NOTICE 'TEST 3: Transferring group ownership...';
    
    PERFORM transfer_group_ownership(test_group2_id, test_user1_id, test_user2_id);
    RAISE NOTICE 'Ownership transferred successfully';

    -- Verify transfer worked
    IF EXISTS (SELECT 1 FROM groups WHERE id = test_group2_id AND created_by = test_user2_id) THEN
        RAISE NOTICE 'Group ownership transfer verified';
    ELSE
        RAISE EXCEPTION 'Group ownership transfer failed';
    END IF;

    -- Verify projects were transferred
    IF EXISTS (SELECT 1 FROM projects WHERE group_id = test_group2_id AND created_by = test_user2_id) THEN
        RAISE NOTICE 'Project ownership transfer verified';
    ELSE
        RAISE EXCEPTION 'Project ownership transfer failed';
    END IF;

    -- TEST 4: Delete user account
    RAISE NOTICE 'TEST 4: Deleting user account...';
    
    -- Now user1 should be able to delete (no longer admin of multi-member groups)
    SELECT * INTO analysis_result FROM analyze_user_deletion(test_user1_id);
    
    IF analysis_result.can_delete_immediately THEN
        RAISE NOTICE 'User can now delete immediately after transfers';
        
        -- Perform the deletion
        SELECT delete_user_account(test_user1_id, NULL) INTO deletion_result;
        RAISE NOTICE 'Deletion result: %', deletion_result;
        
        -- Verify user was deleted
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = test_user1_id) THEN
            RAISE NOTICE 'User deletion verified';
        ELSE
            RAISE EXCEPTION 'User deletion failed';
        END IF;
        
    ELSE
        RAISE EXCEPTION 'User should be able to delete after transfers';
    END IF;

    -- TEST 5: Verify data integrity
    RAISE NOTICE 'TEST 5: Verifying data integrity after deletion...';
    
    -- Solo group should be deleted
    IF NOT EXISTS (SELECT 1 FROM groups WHERE id = test_group1_id) THEN
        RAISE NOTICE 'Solo group correctly deleted';
    ELSE
        RAISE EXCEPTION 'Solo group should have been deleted';
    END IF;
    
    -- Multi-member group should still exist with new owner
    IF EXISTS (SELECT 1 FROM groups WHERE id = test_group2_id AND created_by = test_user2_id) THEN
        RAISE NOTICE 'Multi-member group preserved with new owner';
    ELSE
        RAISE EXCEPTION 'Multi-member group should still exist';
    END IF;
    
    -- Projects in transferred group should still exist
    IF EXISTS (SELECT 1 FROM projects WHERE group_id = test_group2_id AND created_by = test_user2_id) THEN
        RAISE NOTICE 'Projects in transferred group preserved';
    ELSE
        RAISE EXCEPTION 'Projects should be preserved';
    END IF;

    RAISE NOTICE 'All tests passed successfully!';

    -- Cleanup test data
    DELETE FROM projects WHERE group_id IN (test_group1_id, test_group2_id);
    DELETE FROM group_memberships WHERE group_id IN (test_group1_id, test_group2_id);
    DELETE FROM groups WHERE id IN (test_group1_id, test_group2_id);
    DELETE FROM users WHERE id IN (test_user1_id, test_user2_id, test_user3_id);
    
    RAISE NOTICE 'Test cleanup completed';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test failed with error: %', SQLERRM;
        -- Attempt cleanup even on failure
        BEGIN
            DELETE FROM projects WHERE name LIKE 'Test Project%';
            DELETE FROM group_memberships WHERE group_id IN (
                SELECT id FROM groups WHERE name LIKE 'Test Group%'
            );
            DELETE FROM groups WHERE name LIKE 'Test Group%';
            DELETE FROM users WHERE username LIKE 'test_user%';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Cleanup also failed: %', SQLERRM;
        END;
        RAISE;
END;
$$;

-- Example usage queries for reference:

/*
-- Example 1: Analyze current user's deletion impact
SELECT * FROM analyze_user_deletion_secure(auth.uid());

-- Example 2: Transfer ownership of a group (as current admin)
SELECT transfer_group_ownership_secure(
    'group-uuid-here'::UUID,
    auth.uid(),
    'new-admin-user-uuid'::UUID
);

-- Example 3: Delete current user's account with transfers
SELECT delete_user_account_secure(
    auth.uid(),
    '[{"group_id": "group-uuid-1", "new_admin_id": "user-uuid-1"}]'::JSON
);

-- Example 4: Delete current user's account without transfers (if possible)
SELECT delete_user_account_secure(auth.uid(), NULL);
*/