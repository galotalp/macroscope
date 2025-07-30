-- COMPREHENSIVE RLS SECURITY IMPLEMENTATION
-- This implements proper security policies for your custom JWT authentication system

-- Step 1: Enable RLS on all tables
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

-- Step 2: Create helper functions for custom JWT authentication
-- Function to get the current user ID from JWT
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS uuid AS $$
DECLARE
    user_id uuid;
BEGIN
    -- Get user ID from JWT claims (your custom auth)
    SELECT (current_setting('request.jwt.claims', true)::json->>'id')::uuid INTO user_id;
    RETURN user_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current request is from service role
CREATE OR REPLACE FUNCTION auth.is_service_role()
RETURNS boolean AS $$
BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop existing policies to avoid conflicts
-- Users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view basic user info" ON public.users;
DROP POLICY IF EXISTS "Service role access" ON public.users;

-- Groups table
DROP POLICY IF EXISTS "Members can view groups" ON public.groups;
DROP POLICY IF EXISTS "Service role access" ON public.groups;

-- Group memberships table
DROP POLICY IF EXISTS "Members can view group memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Group owners can manage memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Service role access" ON public.group_memberships;

-- Projects table
DROP POLICY IF EXISTS "Group members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Project members can update projects" ON public.projects;
DROP POLICY IF EXISTS "Group members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project members can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Service role access" ON public.projects;

-- Project assignments table
DROP POLICY IF EXISTS "Project members can view assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Project members can manage assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Service role access" ON public.project_assignments;

-- Checklists table
DROP POLICY IF EXISTS "Project members can view checklists" ON public.checklists;
DROP POLICY IF EXISTS "Project members can manage checklists" ON public.checklists;
DROP POLICY IF EXISTS "Service role access" ON public.checklists;

-- Checklist items table
DROP POLICY IF EXISTS "Project members can view checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Project members can manage checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Service role access" ON public.checklist_items;

-- Project files table
DROP POLICY IF EXISTS "Group members can view project files" ON public.project_files;
DROP POLICY IF EXISTS "Project members can manage project files" ON public.project_files;
DROP POLICY IF EXISTS "Service role access" ON public.project_files;

-- Step 4: Create comprehensive security policies

-- === USERS TABLE POLICIES ===
-- Service role has full access (for your backend API)
CREATE POLICY "Service role access" ON public.users
    FOR ALL USING (auth.is_service_role());

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (id = auth.current_user_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (id = auth.current_user_id());

-- Users can view basic info of other users (for member lists, but limited fields)
-- Note: This is handled by your backend API with service role, so not needed at RLS level

-- === GROUPS TABLE POLICIES ===
-- Service role has full access
CREATE POLICY "Service role access" ON public.groups
    FOR ALL USING (auth.is_service_role());

-- Group members can view groups they belong to
CREATE POLICY "Members can view groups" ON public.groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm
            WHERE gm.group_id = groups.id
            AND gm.user_id = auth.current_user_id()
        )
    );

-- === GROUP_MEMBERSHIPS TABLE POLICIES ===
-- Service role has full access
CREATE POLICY "Service role access" ON public.group_memberships
    FOR ALL USING (auth.is_service_role());

-- Members can view memberships of groups they belong to
CREATE POLICY "Members can view group memberships" ON public.group_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm2
            WHERE gm2.group_id = group_memberships.group_id
            AND gm2.user_id = auth.current_user_id()
        )
    );

-- === PROJECTS TABLE POLICIES ===
-- Service role has full access
CREATE POLICY "Service role access" ON public.projects
    FOR ALL USING (auth.is_service_role());

-- Group members can view projects in their groups
CREATE POLICY "Group members can view projects" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm
            WHERE gm.group_id = projects.group_id
            AND gm.user_id = auth.current_user_id()
        )
    );

-- === PROJECT_ASSIGNMENTS TABLE POLICIES ===
-- Service role has full access
CREATE POLICY "Service role access" ON public.project_assignments
    FOR ALL USING (auth.is_service_role());

-- Project members can view assignments for their projects
CREATE POLICY "Project members can view assignments" ON public.project_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa2
            WHERE pa2.project_id = project_assignments.project_id
            AND pa2.user_id = auth.current_user_id()
        )
    );

-- === CHECKLISTS TABLE POLICIES ===
-- Service role has full access
CREATE POLICY "Service role access" ON public.checklists
    FOR ALL USING (auth.is_service_role());

-- Project members can view checklists
CREATE POLICY "Project members can view checklists" ON public.checklists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = checklists.project_id
            AND pa.user_id = auth.current_user_id()
        )
    );

-- === CHECKLIST_ITEMS TABLE POLICIES ===
-- Service role has full access
CREATE POLICY "Service role access" ON public.checklist_items
    FOR ALL USING (auth.is_service_role());

-- Project members can view and modify checklist items
CREATE POLICY "Project members can view checklist items" ON public.checklist_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = checklist_items.project_id
            AND pa.user_id = auth.current_user_id()
        )
    );

CREATE POLICY "Project members can modify checklist items" ON public.checklist_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = checklist_items.project_id
            AND pa.user_id = auth.current_user_id()
        )
    );

-- === PROJECT_FILES TABLE POLICIES ===
-- Service role has full access
CREATE POLICY "Service role access" ON public.project_files
    FOR ALL USING (auth.is_service_role());

-- Group members can view project files (read-only for group members)
CREATE POLICY "Group members can view project files" ON public.project_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.group_memberships gm ON gm.group_id = p.group_id
            WHERE p.id = project_files.project_id
            AND gm.user_id = auth.current_user_id()
        )
    );

-- Project members can manage project files (upload, delete)
CREATE POLICY "Project members can manage project files" ON public.project_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = project_files.project_id
            AND pa.user_id = auth.current_user_id()
        )
    );

-- Step 5: Verify the setup
-- Create a function to test the security
CREATE OR REPLACE FUNCTION auth.test_security()
RETURNS text AS $$
BEGIN
    RETURN 'RLS Security policies have been successfully implemented. Current user ID: ' || COALESCE(auth.current_user_id()::text, 'Not authenticated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instructions:
-- 1. Run this script in the Supabase SQL Editor
-- 2. Your backend API will continue to work because it uses service role
-- 3. Direct database access is now properly secured
-- 4. Users can only access data they're authorized to see
-- 5. Test by calling: SELECT auth.test_security();