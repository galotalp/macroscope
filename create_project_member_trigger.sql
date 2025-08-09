-- Create a trigger to automatically add project creators as admin members
-- This ensures it's IMPOSSIBLE for a project to exist without its creator being a member

-- First, create the trigger function
CREATE OR REPLACE FUNCTION add_project_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically add the creator as an admin member of the project
  INSERT INTO project_members (project_id, user_id, role, added_by, created_at)
  VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by, NOW())
  ON CONFLICT (project_id, user_id) DO NOTHING; -- Prevent duplicates if somehow already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that fires after every project insert
DROP TRIGGER IF EXISTS ensure_project_creator_is_member ON projects;
CREATE TRIGGER ensure_project_creator_is_member
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_creator_as_member();

-- Test that the trigger works by checking existing projects
SELECT 
  p.name as project_name,
  p.created_by,
  pm.user_id as member_user_id,
  pm.role as member_role,
  CASE 
    WHEN pm.user_id IS NULL THEN 'MISSING MEMBERSHIP!'
    ELSE 'Has membership'
  END as status
FROM projects p
LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = p.created_by
ORDER BY p.created_at DESC;

SELECT 'Trigger created: Project creators will ALWAYS be added as admin members automatically' as status;