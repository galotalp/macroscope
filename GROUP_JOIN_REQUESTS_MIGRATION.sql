-- ============================================================================
-- Migration: Add group_join_requests table for persistent join request storage
-- Date: 2025-08-06
-- Description: Replaces in-memory join request storage with database persistence
-- ============================================================================

-- Drop table if you need to recreate it (comment this out if keeping existing data)
-- DROP TABLE IF EXISTS group_join_requests;

-- Create the group_join_requests table
CREATE TABLE IF NOT EXISTS group_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES users(id),
    
    -- Ensure a user can only have one pending request per group
    CONSTRAINT unique_pending_request UNIQUE(group_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_id ON group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user_id ON group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_status ON group_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_requested_at ON group_join_requests(requested_at DESC);

-- Add helpful comments
COMMENT ON TABLE group_join_requests IS 'Stores persistent join requests for research groups';
COMMENT ON COLUMN group_join_requests.status IS 'Request status: pending, approved, or rejected';
COMMENT ON COLUMN group_join_requests.message IS 'Optional message from the user requesting to join';
COMMENT ON COLUMN group_join_requests.responded_by IS 'User ID of the admin who responded to the request';
COMMENT ON COLUMN group_join_requests.responded_at IS 'Timestamp when the request was approved or rejected';

-- Enable Row Level Security
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own join requests" ON group_join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON group_join_requests;
DROP POLICY IF EXISTS "Group admins can view join requests for their groups" ON group_join_requests;
DROP POLICY IF EXISTS "Group admins can respond to join requests" ON group_join_requests;
DROP POLICY IF EXISTS "Users can delete their own pending requests" ON group_join_requests;

-- RLS Policy: Users can view their own requests
CREATE POLICY "Users can view their own join requests" ON group_join_requests
    FOR SELECT 
    USING (user_id = auth.uid());

-- RLS Policy: Users can create their own requests
CREATE POLICY "Users can create join requests" ON group_join_requests
    FOR INSERT 
    WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- RLS Policy: Users can delete their own pending requests (cancel request)
CREATE POLICY "Users can delete their own pending requests" ON group_join_requests
    FOR DELETE 
    USING (user_id = auth.uid() AND status = 'pending');

-- RLS Policy: Group admins can view all requests for their groups
CREATE POLICY "Group admins can view join requests for their groups" ON group_join_requests
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm 
            WHERE gm.group_id = group_join_requests.group_id 
            AND gm.user_id = auth.uid() 
            AND gm.role = 'admin'
        )
    );

-- RLS Policy: Group admins can update requests for their groups (approve/reject)
CREATE POLICY "Group admins can respond to join requests" ON group_join_requests
    FOR UPDATE 
    USING (
        status = 'pending' AND
        EXISTS (
            SELECT 1 FROM group_memberships gm 
            WHERE gm.group_id = group_join_requests.group_id 
            AND gm.user_id = auth.uid() 
            AND gm.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_memberships gm 
            WHERE gm.group_id = group_join_requests.group_id 
            AND gm.user_id = auth.uid() 
            AND gm.role = 'admin'
        )
    );

-- Create a function to automatically add user to group when request is approved
CREATE OR REPLACE FUNCTION handle_approved_join_request()
RETURNS TRIGGER AS $$
BEGIN
    -- When a request is approved, add the user to the group
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        INSERT INTO group_memberships (group_id, user_id, role)
        VALUES (NEW.group_id, NEW.user_id, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-add members when requests are approved
DROP TRIGGER IF EXISTS on_join_request_approved ON group_join_requests;
CREATE TRIGGER on_join_request_approved
    AFTER UPDATE ON group_join_requests
    FOR EACH ROW
    WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
    EXECUTE FUNCTION handle_approved_join_request();

-- Create a function to prevent duplicate pending requests
CREATE OR REPLACE FUNCTION check_duplicate_pending_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user already has a pending request for this group
    IF EXISTS (
        SELECT 1 FROM group_join_requests 
        WHERE group_id = NEW.group_id 
        AND user_id = NEW.user_id 
        AND status = 'pending'
        AND id != COALESCE(NEW.id, gen_random_uuid())
    ) THEN
        RAISE EXCEPTION 'User already has a pending join request for this group';
    END IF;
    
    -- Check if user is already a member of the group
    IF EXISTS (
        SELECT 1 FROM group_memberships 
        WHERE group_id = NEW.group_id 
        AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'User is already a member of this group';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicate requests
DROP TRIGGER IF EXISTS check_duplicate_request ON group_join_requests;
CREATE TRIGGER check_duplicate_request
    BEFORE INSERT ON group_join_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_pending_request();

-- ============================================================================
-- Verification Queries (run these to verify the migration worked)
-- ============================================================================

-- Check if table was created
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'group_join_requests'
) AS table_exists;

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'group_join_requests'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'group_join_requests';

-- Check policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'group_join_requests';

-- ============================================================================
-- Sample Test Data (optional - comment out in production)
-- ============================================================================

-- Insert a test request (replace with actual UUIDs from your database)
-- INSERT INTO group_join_requests (group_id, user_id, message)
-- VALUES (
--     (SELECT id FROM groups LIMIT 1),
--     (SELECT id FROM users WHERE email != (SELECT email FROM users JOIN groups ON groups.created_by = users.id LIMIT 1) LIMIT 1),
--     'I would like to join this research group to collaborate on projects.'
-- );

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================

-- To rollback this migration, uncomment and run:
-- DROP TRIGGER IF EXISTS on_join_request_approved ON group_join_requests;
-- DROP TRIGGER IF EXISTS check_duplicate_request ON group_join_requests;
-- DROP FUNCTION IF EXISTS handle_approved_join_request();
-- DROP FUNCTION IF EXISTS check_duplicate_pending_request();
-- DROP TABLE IF EXISTS group_join_requests;