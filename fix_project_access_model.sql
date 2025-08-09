-- Create a project_members table for fine-grained project access
CREATE TABLE IF NOT EXISTS project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('member', 'editor', 'admin')) DEFAULT 'member',
  added_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Create policies for project_members
CREATE POLICY "group_members_can_view_project_members" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN group_memberships gm ON gm.group_id = p.group_id
      WHERE p.id = project_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "project_creators_can_add_members" ON project_members
  FOR INSERT WITH CHECK (
    added_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

-- Update projects policies to implement the new access model
DROP POLICY IF EXISTS "Group members can view projects" ON projects;
DROP POLICY IF EXISTS "Group members can create projects" ON projects;
DROP POLICY IF EXISTS "Project creators and admins can update projects" ON projects;
DROP POLICY IF EXISTS "Project creators and admins can delete projects" ON projects;

-- New project policies: Group members can view, only project members can edit
CREATE POLICY "group_members_can_view_all_projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm 
      WHERE gm.group_id = projects.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_members_can_create_projects" ON projects
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM group_memberships gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_can_edit_projects" ON projects
  FOR UPDATE USING (
    -- Project creator can always edit
    created_by = auth.uid() OR
    -- Group admins can edit any project
    EXISTS (
      SELECT 1 FROM group_memberships gm 
      WHERE gm.group_id = projects.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin'
    ) OR
    -- Project members with editor role can edit
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = projects.id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('editor', 'admin')
    )
  );

CREATE POLICY "project_creators_and_admins_can_delete" ON projects
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_memberships gm 
      WHERE gm.group_id = projects.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin'
    )
  );

-- Update checklist policies to match new model
DROP POLICY IF EXISTS "users_can_create_checklist_items" ON project_checklist_items;
DROP POLICY IF EXISTS "users_can_view_checklist_items" ON project_checklist_items;
DROP POLICY IF EXISTS "users_can_update_checklist_items" ON project_checklist_items;
DROP POLICY IF EXISTS "users_can_delete_checklist_items" ON project_checklist_items;

-- Group members can view all checklists, project members can edit
CREATE POLICY "group_members_view_checklists" ON project_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN group_memberships gm ON gm.group_id = p.group_id
      WHERE p.id = project_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_can_manage_checklists" ON project_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND (
        -- Project creator can manage
        p.created_by = auth.uid() OR
        -- Group admins can manage
        EXISTS (
          SELECT 1 FROM group_memberships gm 
          WHERE gm.group_id = p.group_id 
          AND gm.user_id = auth.uid() 
          AND gm.role = 'admin'
        ) OR
        -- Project members can manage
        EXISTS (
          SELECT 1 FROM project_members pm 
          WHERE pm.project_id = p.id 
          AND pm.user_id = auth.uid()
        )
      )
    )
  );

SELECT 'New project access model implemented' as status;