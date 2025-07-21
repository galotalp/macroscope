-- MIGRATION: Fix checklist_items table columns
-- This migration ensures all required columns exist in the checklist_items table
-- Run this in your Supabase SQL editor

-- Check current columns in checklist_items table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'checklist_items' 
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_checklist_items_project_id ON checklist_items(project_id);

-- Verify final structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'checklist_items' 
ORDER BY ordinal_position;
