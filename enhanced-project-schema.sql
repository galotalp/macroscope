-- Enhanced database schema for projects
-- Add new columns to projects table

-- Add project priority, notes, and file folder path
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS file_folder_path VARCHAR(255);

-- Create project_files table for file uploads
CREATE TABLE IF NOT EXISTS project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_path VARCHAR(500) NOT NULL
);

-- Create indexes for project_files
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON project_files(uploaded_by);

-- Enable RLS for project_files
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Create policies for project_files
CREATE POLICY "Group members can view project files" ON project_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN group_memberships gm ON p.group_id = gm.group_id
            WHERE p.id = project_files.project_id
            AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can upload project files" ON project_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN group_memberships gm ON p.group_id = gm.group_id
            WHERE p.id = project_files.project_id
            AND gm.user_id = auth.uid()
        )
        AND auth.uid() = uploaded_by
    );

-- Update default checklist items
-- This will be handled in the backend when creating a project

-- Grant permissions
GRANT ALL ON project_files TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
