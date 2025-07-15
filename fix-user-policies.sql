-- Check existing policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users';

-- If the policy exists, drop it and recreate it
DROP POLICY IF EXISTS "Anyone can register" ON users;

-- Create a more permissive registration policy
CREATE POLICY "Allow user registration" ON users
    FOR INSERT 
    WITH CHECK (true);

-- Also ensure the policy for viewing own profile exists
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT 
    USING (auth.uid()::text = id::text OR auth.uid() IS NULL);
