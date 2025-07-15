-- Add group join requests table
CREATE TABLE IF NOT EXISTS group_join_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(group_id, user_id)
);

-- Add index for better performance
CREATE INDEX idx_group_join_requests_group_id ON group_join_requests(group_id);
CREATE INDEX idx_group_join_requests_user_id ON group_join_requests(user_id);
CREATE INDEX idx_group_join_requests_status ON group_join_requests(status);

-- Add a unique invite code to groups for easier joining
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_code VARCHAR(8) UNIQUE;

-- Generate invite codes for existing groups
UPDATE groups SET invite_code = substr(md5(random()::text), 1, 8) WHERE invite_code IS NULL;

-- Grant permissions
GRANT ALL ON group_join_requests TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
