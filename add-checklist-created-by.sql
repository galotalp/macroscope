-- MIGRATION: Add created_by column to checklist_items table
-- This migration adds the missing created_by column to the checklist_items table
-- Run this in your Supabase SQL editor

-- Add the missing created_by column
ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Update existing checklist items to have a created_by value (set to NULL for now)
-- You can optionally update these to a specific user ID if needed

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'checklist_items' 
AND column_name = 'created_by';
