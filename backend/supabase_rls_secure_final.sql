-- SECURE RLS IMPLEMENTATION (Without auth schema modifications)
-- This works within standard Supabase permissions

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

-- Step 2: Drop existing policies to avoid conflicts
-- Users table
DROP POLICY IF EXISTS "Service role full access users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Groups table
DROP POLICY IF EXISTS "Service role full access groups" ON public.groups;
DROP POLICY IF EXISTS "Members can view groups" ON public.groups;

-- Group memberships table
DROP POLICY IF EXISTS "Service role full access group_memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Members can view group memberships" ON public.group_memberships;

-- Projects table
DROP POLICY IF EXISTS "Service role full access projects" ON public.projects;
DROP POLICY IF EXISTS "Group members can view projects" ON public.projects;

-- Project assignments table
DROP POLICY IF EXISTS "Service role full access project_assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Project members can view assignments" ON public.project_assignments;

-- Checklists table
DROP POLICY IF EXISTS "Service role full access checklists" ON public.checklists;
DROP POLICY IF EXISTS "Project members can view checklists" ON public.checklists;

-- Checklist items table
DROP POLICY IF EXISTS "Service role full access checklist_items" ON public.checklist_items;
DROP POLICY IF EXISTS "Project members can view checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Project members can modify checklist items" ON public.checklist_items;

-- Project files table
DROP POLICY IF EXISTS "Service role full access project_files" ON public.project_files;
DROP POLICY IF EXISTS "Group members can view project files" ON public.project_files;
DROP POLICY IF EXISTS "Project members can manage project files" ON public.project_files;

-- Step 3: Create security policies for service role access
-- Since your backend uses service role, these policies allow full access for service role

-- === USERS TABLE POLICIES ===
CREATE POLICY "Service role full access users" ON public.users
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- === GROUPS TABLE POLICIES ===
CREATE POLICY "Service role full access groups" ON public.groups
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- === GROUP_MEMBERSHIPS TABLE POLICIES ===
CREATE POLICY "Service role full access group_memberships" ON public.group_memberships
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- === PROJECTS TABLE POLICIES ===
CREATE POLICY "Service role full access projects" ON public.projects
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- === PROJECT_ASSIGNMENTS TABLE POLICIES ===
CREATE POLICY "Service role full access project_assignments" ON public.project_assignments
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- === CHECKLISTS TABLE POLICIES ===
CREATE POLICY "Service role full access checklists" ON public.checklists
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- === CHECKLIST_ITEMS TABLE POLICIES ===
CREATE POLICY "Service role full access checklist_items" ON public.checklist_items
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- === PROJECT_FILES TABLE POLICIES ===
CREATE POLICY "Service role full access project_files" ON public.project_files
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- Step 4: Add user-level policies for direct database access (optional)
-- These are more restrictive and apply when NOT using service role

-- Users can view their own profile data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (
        id::text = current_setting('request.jwt.claims', true)::json->>'id'
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (
        id::text = current_setting('request.jwt.claims', true)::json->>'id'
    );

-- Group members can view their groups
CREATE POLICY "Members can view groups" ON public.groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm
            WHERE gm.group_id = groups.id
            AND gm.user_id::text = current_setting('request.jwt.claims', true)::json->>'id'
        )
    );

-- Members can view group memberships for their groups
CREATE POLICY "Members can view group memberships" ON public.group_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm2
            WHERE gm2.group_id = group_memberships.group_id
            AND gm2.user_id::text = current_setting('request.jwt.claims', true)::json->>'id'
        )
    );

-- Group members can view projects
CREATE POLICY "Group members can view projects" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm
            WHERE gm.group_id = projects.group_id
            AND gm.user_id::text = current_setting('request.jwt.claims', true)::json->>'id'
        )
    );

-- Project members can view assignments
CREATE POLICY "Project members can view assignments" ON public.project_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa2
            WHERE pa2.project_id = project_assignments.project_id
            AND pa2.user_id::text = current_setting('request.jwt.claims', true)::json->>'id'
        )
    );

-- Project members can view checklists
CREATE POLICY "Project members can view checklists" ON public.checklists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = checklists.project_id
            AND pa.user_id::text = current_setting('request.jwt.claims', true)::json->>'id'
        )
    );

-- Project members can view checklist items
CREATE POLICY "Project members can view checklist items" ON public.checklist_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = checklist_items.project_id
            AND pa.user_id::text = current_setting('request.jwt.claims', true)::json->>'id'
        )
    );

-- Group members can view project files
CREATE POLICY "Group members can view project files" ON public.project_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.group_memberships gm ON gm.group_id = p.group_id
            WHERE p.id = project_files.project_id
            AND gm.user_id::text = current_setting('request.jwt.claims', true)::json->>'id'
        )
    );

-- Summary:
-- 1. RLS is now enabled on all tables (fixes security warnings)
-- 2. Service role has full access (your backend API will work)
-- 3. Direct database access is restricted based on user relationships
-- 4. No custom functions in auth schema (works with standard permissions)