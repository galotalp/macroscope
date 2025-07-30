-- SECURITY FIXES FOR CUSTOM AUTH SYSTEM
-- Since you're using custom JWT authentication, not Supabase Auth
-- These policies will work with your backend service role

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

-- Since you're using a backend API with service role key,
-- we need to create policies that allow service role full access

-- Create a reusable function to check if the request is from service role
CREATE OR REPLACE FUNCTION auth.is_service_role()
RETURNS boolean AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS table policies
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;
CREATE POLICY "Service role has full access to users" ON public.users
    FOR ALL USING (auth.is_service_role());

-- GROUPS table policies
DROP POLICY IF EXISTS "Service role has full access to groups" ON public.groups;
CREATE POLICY "Service role has full access to groups" ON public.groups
    FOR ALL USING (auth.is_service_role());

-- RESEARCH_GROUPS table policies (keeping existing policies)
-- Note: research_groups already has policies, just enabling RLS should work

-- RESEARCH_GROUP_MEMBERS table policies (keeping existing policies)
-- Note: research_group_members already has policies, just enabling RLS should work

-- GROUP_MEMBERSHIPS table policies
DROP POLICY IF EXISTS "Service role has full access to group_memberships" ON public.group_memberships;
CREATE POLICY "Service role has full access to group_memberships" ON public.group_memberships
    FOR ALL USING (auth.is_service_role());

-- PROJECTS table policies
DROP POLICY IF EXISTS "Service role has full access to projects" ON public.projects;
CREATE POLICY "Service role has full access to projects" ON public.projects
    FOR ALL USING (auth.is_service_role());

-- PROJECT_ASSIGNMENTS table policies
DROP POLICY IF EXISTS "Service role has full access to project_assignments" ON public.project_assignments;
CREATE POLICY "Service role has full access to project_assignments" ON public.project_assignments
    FOR ALL USING (auth.is_service_role());

-- CHECKLIST_ITEMS table policies
DROP POLICY IF EXISTS "Service role has full access to checklist_items" ON public.checklist_items;
CREATE POLICY "Service role has full access to checklist_items" ON public.checklist_items
    FOR ALL USING (auth.is_service_role());

-- PROJECT_FILES table policies
DROP POLICY IF EXISTS "Service role has full access to project_files" ON public.project_files;
CREATE POLICY "Service role has full access to project_files" ON public.project_files
    FOR ALL USING (auth.is_service_role());

-- CHECKLISTS table policies
DROP POLICY IF EXISTS "Service role has full access to checklists" ON public.checklists;
CREATE POLICY "Service role has full access to checklists" ON public.checklists
    FOR ALL USING (auth.is_service_role());

-- This approach ensures:
-- 1. RLS is enabled (fixing the security warnings)
-- 2. Your backend API (using service role) can still access everything
-- 3. Direct database access is blocked for unauthorized users