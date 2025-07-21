-- Database schema for Research Coordinator App
-- Run this in your Supabase SQL editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_memberships table
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    notes TEXT,
    file_folder_path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create project_assignments table
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Create checklist_items table
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_group_id ON projects(group_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_project_id ON checklist_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON project_files(uploaded_by);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Create policies for groups table
CREATE POLICY "Users can view groups they are members of" ON groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships 
            WHERE group_memberships.group_id = groups.id 
            AND group_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" ON groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_memberships 
            WHERE group_memberships.group_id = groups.id 
            AND group_memberships.user_id = auth.uid()
            AND group_memberships.role = 'admin'
        )
    );

-- Create policies for group_memberships table
CREATE POLICY "Users can view group memberships" ON group_memberships
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_memberships.group_id
            AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join groups" ON group_memberships
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups" ON group_memberships
    FOR DELETE USING (user_id = auth.uid());

-- Create policies for projects table
CREATE POLICY "Group members can view projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships 
            WHERE group_memberships.group_id = projects.group_id 
            AND group_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can create projects" ON projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_memberships 
            WHERE group_memberships.group_id = projects.group_id 
            AND group_memberships.user_id = auth.uid()
        )
        AND auth.uid() = created_by
    );

CREATE POLICY "Group members can update projects" ON projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_memberships 
            WHERE group_memberships.group_id = projects.group_id 
            AND group_memberships.user_id = auth.uid()
        )
    );

-- Create policies for project_assignments table
CREATE POLICY "Group members can view project assignments" ON project_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN group_memberships gm ON p.group_id = gm.group_id
            WHERE p.id = project_assignments.project_id
            AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can create project assignments" ON project_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN group_memberships gm ON p.group_id = gm.group_id
            WHERE p.id = project_assignments.project_id
            AND gm.user_id = auth.uid()
        )
    );

-- Create policies for checklist_items table
CREATE POLICY "Group members can view checklist items" ON checklist_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN group_memberships gm ON p.group_id = gm.group_id
            WHERE p.id = checklist_items.project_id
            AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can create checklist items" ON checklist_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN group_memberships gm ON p.group_id = gm.group_id
            WHERE p.id = checklist_items.project_id
            AND gm.user_id = auth.uid()
        )
        AND auth.uid() = created_by
    );

CREATE POLICY "Group members can update checklist items" ON checklist_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN group_memberships gm ON p.group_id = gm.group_id
            WHERE p.id = checklist_items.project_id
            AND gm.user_id = auth.uid()
        )
    );

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

-- Create functions to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
