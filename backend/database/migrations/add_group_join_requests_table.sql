-- Migration: Add group_join_requests table for persistent join request storage
-- Created: 2025-08-06

CREATE TABLE IF NOT EXISTS group_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES users(id),
    
    -- Ensure unique pending requests per user per group
    UNIQUE(group_id, user_id) WHERE status = 'pending'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_id ON group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user_id ON group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_status ON group_join_requests(status);

-- Enable Row Level Security
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own requests
CREATE POLICY IF NOT EXISTS "Users can view their own join requests" ON group_join_requests
    FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Users can create their own requests
CREATE POLICY IF NOT EXISTS "Users can create join requests" ON group_join_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policy: Group admins can view requests for their groups
CREATE POLICY IF NOT EXISTS "Group admins can view join requests for their groups" ON group_join_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm 
            WHERE gm.group_id = group_join_requests.group_id 
            AND gm.user_id = auth.uid() 
            AND gm.role = 'admin'
        )
    );

-- RLS Policy: Group admins can update requests for their groups
CREATE POLICY IF NOT EXISTS "Group admins can respond to join requests" ON group_join_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm 
            WHERE gm.group_id = group_join_requests.group_id 
            AND gm.user_id = auth.uid() 
            AND gm.role = 'admin'
        )
    );

COMMENT ON TABLE group_join_requests IS 'Stores persistent join requests for research groups';
COMMENT ON COLUMN group_join_requests.status IS 'Request status: pending, approved, or rejected';
COMMENT ON COLUMN group_join_requests.message IS 'Optional message from the user requesting to join';
COMMENT ON COLUMN group_join_requests.responded_by IS 'User ID of the admin who responded to the request';