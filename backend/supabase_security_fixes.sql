-- SECURITY FIXES FOR SUPABASE
-- This script enables Row Level Security (RLS) on all public tables
-- Run this in the Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Now let's create RLS policies for tables that don't have them yet

-- USERS table policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id);

-- Users can view other users' basic info (for group member lists)
CREATE POLICY "Users can view basic user info" ON public.users
    FOR SELECT USING (true);

-- GROUPS table policies (if different from research_groups)
-- Authenticated users can view groups they're members of
CREATE POLICY "Members can view groups" ON public.groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships
            WHERE group_memberships.group_id = groups.id
            AND group_memberships.user_id = auth.uid()::text
        )
    );

-- GROUP_MEMBERSHIPS table policies
-- Members can view group memberships for their groups
CREATE POLICY "Members can view group memberships" ON public.group_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm2
            WHERE gm2.group_id = group_memberships.group_id
            AND gm2.user_id = auth.uid()::text
        )
    );

-- Group owners can manage memberships
CREATE POLICY "Group owners can manage memberships" ON public.group_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.groups
            WHERE groups.id = group_memberships.group_id
            AND groups.created_by = auth.uid()::text
        )
    );

-- PROJECTS table policies
-- Group members can view projects
CREATE POLICY "Group members can view projects" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships
            WHERE group_memberships.group_id = projects.group_id
            AND group_memberships.user_id = auth.uid()::text
        )
    );

-- Project members can update projects
CREATE POLICY "Project members can update projects" ON public.projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments
            WHERE project_assignments.project_id = projects.id
            AND project_assignments.user_id = auth.uid()::text
        )
    );

-- Group members can create projects
CREATE POLICY "Group members can create projects" ON public.projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_memberships
            WHERE group_memberships.group_id = projects.group_id
            AND group_memberships.user_id = auth.uid()::text
        )
    );

-- Project members can delete projects
CREATE POLICY "Project members can delete projects" ON public.projects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments
            WHERE project_assignments.project_id = projects.id
            AND project_assignments.user_id = auth.uid()::text
        )
    );

-- PROJECT_ASSIGNMENTS table policies
-- Project members can view assignments
CREATE POLICY "Project members can view assignments" ON public.project_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa2
            WHERE pa2.project_id = project_assignments.project_id
            AND pa2.user_id = auth.uid()::text
        )
    );

-- Project members can manage assignments
CREATE POLICY "Project members can manage assignments" ON public.project_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa2
            WHERE pa2.project_id = project_assignments.project_id
            AND pa2.user_id = auth.uid()::text
        )
    );

-- CHECKLIST_ITEMS table policies
-- Project members can view checklist items
CREATE POLICY "Project members can view checklist items" ON public.checklist_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments
            WHERE project_assignments.project_id = checklist_items.project_id
            AND project_assignments.user_id = auth.uid()::text
        )
    );

-- Project members can manage checklist items
CREATE POLICY "Project members can manage checklist items" ON public.checklist_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments
            WHERE project_assignments.project_id = checklist_items.project_id
            AND project_assignments.user_id = auth.uid()::text
        )
    );

-- PROJECT_FILES table policies
-- Group members can view project files
CREATE POLICY "Group members can view project files" ON public.project_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.group_memberships gm ON gm.group_id = p.group_id
            WHERE p.id = project_files.project_id
            AND gm.user_id = auth.uid()::text
        )
    );

-- Project members can manage project files
CREATE POLICY "Project members can manage project files" ON public.project_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments
            WHERE project_assignments.project_id = project_files.project_id
            AND project_assignments.user_id = auth.uid()::text
        )
    );

-- CHECKLISTS table policies (if it exists separately)
-- Project members can view checklists
CREATE POLICY "Project members can view checklists" ON public.checklists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments
            WHERE project_assignments.project_id = checklists.project_id
            AND project_assignments.user_id = auth.uid()::text
        )
    );

-- Project members can manage checklists
CREATE POLICY "Project members can manage checklists" ON public.checklists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments
            WHERE project_assignments.project_id = checklists.project_id
            AND project_assignments.user_id = auth.uid()::text
        )
    );

-- Note: After running this script, verify that all operations still work correctly
-- You may need to adjust policies based on your specific business logic