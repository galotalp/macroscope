-- Migration: Add password reset functionality to users table
-- Run this in Supabase SQL editor

-- Add password reset columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Create index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Add comment for documentation
COMMENT ON COLUMN users.password_reset_token IS 'Temporary token for password reset verification';
COMMENT ON COLUMN users.password_reset_token_expires IS 'Expiration time for password reset token';