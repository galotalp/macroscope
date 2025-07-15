-- Database schema for Research Coordinator App
-- Run this in your Supabase SQL editor

-- Drop existing tables (WARNING: This will delete all data!)
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
DROP TABLE IF EXISTS project_assignments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
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
CREATE TABLE groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_memberships table
CREATE TABLE group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create projects table
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_assignments table
CREATE TABLE project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Create project_files table
CREATE TABLE project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_path VARCHAR(500),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create checklists table
CREATE TABLE checklists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create checklist_items table
CREATE TABLE checklist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX idx_projects_group_id ON projects(group_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_checklists_project_id ON checklists(project_id);
CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(checklist_id);

-- Create triggers for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can create a user account" ON users
    FOR INSERT WITH CHECK (true);

-- Groups policies
CREATE POLICY "Users can view groups they belong to" ON groups
    FOR SELECT USING (
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" ON groups
    FOR UPDATE USING (
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Group memberships policies
CREATE POLICY "Users can view memberships of their groups" ON group_memberships
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Group admins can manage memberships" ON group_memberships
    FOR ALL USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Projects policies
CREATE POLICY "Users can view projects in their groups" ON projects
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can create projects" ON projects
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid()
        ) AND auth.uid() = created_by
    );

CREATE POLICY "Project creators and group admins can update projects" ON projects
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Project assignments policies
CREATE POLICY "Users can view assignments for their projects" ON project_assignments
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE group_id IN (
                SELECT group_id FROM group_memberships 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Project creators can manage assignments" ON project_assignments
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE created_by = auth.uid()
        )
    );

-- Project files policies
CREATE POLICY "Users can view files for their projects" ON project_files
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE group_id IN (
                SELECT group_id FROM group_memberships 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can upload files to their projects" ON project_files
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects 
            WHERE group_id IN (
                SELECT group_id FROM group_memberships 
                WHERE user_id = auth.uid()
            )
        ) AND auth.uid() = uploaded_by
    );

-- Checklists policies
CREATE POLICY "Users can view checklists for their projects" ON checklists
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE group_id IN (
                SELECT group_id FROM group_memberships 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create checklists for their projects" ON checklists
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects 
            WHERE group_id IN (
                SELECT group_id FROM group_memberships 
                WHERE user_id = auth.uid()
            )
        ) AND auth.uid() = created_by
    );

-- Checklist items policies
CREATE POLICY "Users can view checklist items for their projects" ON checklist_items
    FOR SELECT USING (
        checklist_id IN (
            SELECT id FROM checklists 
            WHERE project_id IN (
                SELECT id FROM projects 
                WHERE group_id IN (
                    SELECT group_id FROM group_memberships 
                    WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can manage checklist items for their projects" ON checklist_items
    FOR ALL USING (
        checklist_id IN (
            SELECT id FROM checklists 
            WHERE project_id IN (
                SELECT id FROM projects 
                WHERE group_id IN (
                    SELECT group_id FROM group_memberships 
                    WHERE user_id = auth.uid()
                )
            )
        )
    );
