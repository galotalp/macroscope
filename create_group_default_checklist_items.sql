-- Create table for group default checklist items
-- These are template checklist items that get automatically added to new projects in a group

CREATE TABLE IF NOT EXISTS group_default_checklist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_default_checklist_items_group_id ON group_default_checklist_items(group_id);
CREATE INDEX IF NOT EXISTS idx_group_default_checklist_items_display_order ON group_default_checklist_items(group_id, display_order);

-- Enable RLS
ALTER TABLE group_default_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group default checklist items
-- Group members can view default checklist items for their groups
CREATE POLICY "group_members_can_view_default_checklist_items" ON group_default_checklist_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM group_memberships gm
      WHERE gm.group_id = group_default_checklist_items.group_id 
        AND gm.user_id = auth.uid()
    )
  );

-- Group admins can create default checklist items
CREATE POLICY "group_admins_can_create_default_checklist_items" ON group_default_checklist_items
  FOR INSERT 
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 
      FROM group_memberships gm
      WHERE gm.group_id = group_default_checklist_items.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- Group admins can update default checklist items
CREATE POLICY "group_admins_can_update_default_checklist_items" ON group_default_checklist_items
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 
      FROM group_memberships gm
      WHERE gm.group_id = group_default_checklist_items.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- Group admins can delete default checklist items
CREATE POLICY "group_admins_can_delete_default_checklist_items" ON group_default_checklist_items
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 
      FROM group_memberships gm
      WHERE gm.group_id = group_default_checklist_items.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_default_checklist_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_group_default_checklist_items_updated_at_trigger
    BEFORE UPDATE ON group_default_checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_group_default_checklist_items_updated_at();

-- Show the new table structure
SELECT 'Group default checklist items table created!' as status;
\d group_default_checklist_items;