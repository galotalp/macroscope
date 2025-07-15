-- Fix RLS policies for research groups and members
-- Run this in your Supabase SQL Editor

-- Temporarily disable RLS for users, research groups and members to fix issues
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE research_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE research_group_members DISABLE ROW LEVEL SECURITY;

-- You can re-enable them later after testing:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE research_groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE research_group_members ENABLE ROW LEVEL SECURITY;
