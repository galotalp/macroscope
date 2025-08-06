-- ================================================
-- SUPABASE PASSWORD RESET MIGRATION
-- Copy and paste this into your Supabase SQL Editor
-- ================================================

-- Add password reset columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on password reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Add comments for documentation
COMMENT ON COLUMN users.password_reset_token IS 'Temporary token for password reset verification (expires in 1 hour)';
COMMENT ON COLUMN users.password_reset_token_expires IS 'Expiration timestamp for password reset token';

-- Verify the migration worked
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('password_reset_token', 'password_reset_token_expires')
ORDER BY column_name;