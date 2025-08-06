-- Add email verification columns to users table
-- Run this SQL in your Supabase SQL editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- Create index on verification token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

-- Update existing users to be verified (so they don't get locked out)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;