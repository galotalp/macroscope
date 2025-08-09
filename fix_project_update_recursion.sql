-- Fix infinite recursion in project UPDATE policy by simplifying it

-- Drop the current problematic UPDATE policy
DROP POLICY IF EXISTS "project_members_can_edit_projects" ON projects;

-- Create a much simpler UPDATE policy without potential recursion
-- Only project creators and group admins can update projects
CREATE POLICY "project_creators_and_group_admins_can_update" ON projects
  FOR UPDATE USING (
    -- Project creator can always update
    created_by = auth.uid() OR
    -- Group admins can update projects in their groups
    EXISTS (
      SELECT 1 FROM group_memberships gm 
      WHERE gm.group_id = projects.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin'
    )
  );

-- Show the updated policy
SELECT 'projects UPDATE policies:', policyname, cmd 
FROM pg_policies 
WHERE tablename = 'projects' AND schemaname = 'public' AND cmd = 'UPDATE';

SELECT 'Project UPDATE policy simplified - no more recursion' as status;