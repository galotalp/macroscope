-- Create a function to bypass RLS for user registration
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_user_with_bypass(
    user_email TEXT,
    user_password_hash TEXT,
    user_full_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
    new_user_id UUID;
    result JSON;
BEGIN
    INSERT INTO users (email, password_hash, full_name, created_at)
    VALUES (user_email, user_password_hash, user_full_name, NOW())
    RETURNING id INTO new_user_id;
    
    -- Return user data as JSON
    SELECT json_build_object(
        'id', id,
        'email', email,
        'full_name', full_name,
        'created_at', created_at
    )
    INTO result
    FROM users
    WHERE id = new_user_id;
    
    RETURN result;
END;
$$;
