-- Add INSERT policy for user registration
CREATE POLICY "Anyone can register" ON users
    FOR INSERT WITH CHECK (true);
