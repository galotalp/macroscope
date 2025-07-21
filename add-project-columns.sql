-- MIGRATION: Add priority and notes columns to projects table
-- This migration adds the missing priority and notes columns to the projects table
-- Run this in your Supabase SQL editor

-- Add the missing columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS file_folder_path VARCHAR(255);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('priority', 'notes', 'file_folder_path');
