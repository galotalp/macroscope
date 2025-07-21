"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: userGroups, error } = await database_1.supabase
            .from('group_memberships')
            .select(`
        groups (
          id,
          name,
          description,
          created_at,
          created_by
        )
      `)
            .eq('user_id', req.user.id);
        if (error) {
            console.error('Error fetching groups:', error);
            return res.status(500).json({ error: 'Failed to fetch groups' });
        }
        const groups = userGroups.map((membership) => membership.groups);
        res.json({ groups });
    }
    catch (error) {
        console.error('Error in groups route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Group name is required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { data: group, error: groupError } = await database_1.supabase
            .from('groups')
            .insert([
            { name, description, created_by: req.user.id, invite_code: inviteCode }
        ])
            .select()
            .single();
        if (groupError) {
            console.error('Error creating group:', groupError);
            return res.status(500).json({ error: 'Failed to create group' });
        }
        const { error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .insert([
            { group_id: group.id, user_id: req.user.id, role: 'admin' }
        ]);
        if (membershipError) {
            console.error('Error adding creator to group:', membershipError);
            return res.status(500).json({ error: 'Failed to add creator to group' });
        }
        res.status(201).json({
            message: 'Group created successfully',
            group
        });
    }
    catch (error) {
        console.error('Error in create group route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/search', auth_1.authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: groups, error } = await database_1.supabase
            .from('groups')
            .select(`
        id,
        name,
        description,
        invite_code,
        created_at,
        created_by
      `)
            .or(`name.ilike.%${query}%,invite_code.ilike.%${query}%`);
        if (error) {
            console.error('Error searching groups:', error);
            return res.status(500).json({ error: 'Failed to search groups' });
        }
        res.json({ groups });
    }
    catch (error) {
        console.error('Error in search groups route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:groupId/request-join', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: group, error: groupError } = await database_1.supabase
            .from('groups')
            .select('id, name')
            .eq('id', groupId)
            .single();
        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        const { data: existingMembership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (existingMembership) {
            return res.status(400).json({ error: 'You are already a member of this group' });
        }
        const { data: existingRequest, error: requestError } = await database_1.supabase
            .from('group_join_requests')
            .select('id, status')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return res.status(400).json({ error: 'You already have a pending request for this group' });
            }
            if (existingRequest.status === 'approved') {
                return res.status(400).json({ error: 'Your request was already approved' });
            }
        }
        const { error: insertError } = await database_1.supabase
            .from('group_join_requests')
            .insert([
            { group_id: groupId, user_id: req.user.id, status: 'pending' }
        ]);
        if (insertError) {
            console.error('Error creating join request:', insertError);
            return res.status(500).json({ error: 'Failed to create join request' });
        }
        res.status(201).json({
            message: 'Join request sent successfully',
            groupName: group.name
        });
    }
    catch (error) {
        console.error('Error in request join route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:groupId/details', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        const { data: group, error: groupError } = await database_1.supabase
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .single();
        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        const { data: members, error: membersError } = await database_1.supabase
            .from('group_memberships')
            .select(`
        id,
        role,
        joined_at,
        users (
          id,
          username,
          email
        )
      `)
            .eq('group_id', groupId);
        if (membersError) {
            console.error('Error fetching members:', membersError);
            return res.status(500).json({ error: 'Failed to fetch members' });
        }
        const { data: joinRequests, error: requestsError } = await database_1.supabase
            .from('group_join_requests')
            .select(`
        id,
        status,
        requested_at,
        users (
          id,
          username,
          email
        )
      `)
            .eq('group_id', groupId)
            .eq('status', 'pending');
        if (requestsError) {
            console.error('Error fetching join requests:', requestsError);
            return res.status(500).json({ error: 'Failed to fetch join requests' });
        }
        res.json({
            group,
            members,
            joinRequests
        });
    }
    catch (error) {
        console.error('Error in group details route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:groupId/join-requests/:requestId/:action', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId, requestId, action } = req.params;
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        const { data: joinRequest, error: requestError } = await database_1.supabase
            .from('group_join_requests')
            .select('*')
            .eq('id', requestId)
            .eq('group_id', groupId)
            .single();
        if (requestError || !joinRequest) {
            return res.status(404).json({ error: 'Join request not found' });
        }
        if (joinRequest.status !== 'pending') {
            return res.status(400).json({ error: 'This request has already been processed' });
        }
        const { error: updateError } = await database_1.supabase
            .from('group_join_requests')
            .update({
            status: action === 'approve' ? 'approved' : 'rejected',
            responded_at: new Date().toISOString(),
            responded_by: req.user.id
        })
            .eq('id', requestId);
        if (updateError) {
            console.error('Error updating join request:', updateError);
            return res.status(500).json({ error: 'Failed to update join request' });
        }
        if (action === 'approve') {
            const { error: membershipInsertError } = await database_1.supabase
                .from('group_memberships')
                .insert([
                { group_id: groupId, user_id: joinRequest.user_id, role: 'member' }
            ]);
            if (membershipInsertError) {
                console.error('Error adding user to group:', membershipInsertError);
                return res.status(500).json({ error: 'Failed to add user to group' });
            }
        }
        res.json({
            message: `Join request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
        });
    }
    catch (error) {
        console.error('Error in join request action route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:groupId/members/:userId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        const { data: group, error: groupError } = await database_1.supabase
            .from('groups')
            .select('created_by')
            .eq('id', groupId)
            .single();
        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        if (group.created_by === userId) {
            return res.status(400).json({ error: 'Cannot remove the group creator' });
        }
        const { error: removeError } = await database_1.supabase
            .from('group_memberships')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);
        if (removeError) {
            console.error('Error removing member:', removeError);
            return res.status(500).json({ error: 'Failed to remove member' });
        }
        res.json({ message: 'Member removed successfully' });
    }
    catch (error) {
        console.error('Error in remove member route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:groupId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: group, error: groupError } = await database_1.supabase
            .from('groups')
            .select('created_by')
            .eq('id', groupId)
            .single();
        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        if (group.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Access denied. Only the group creator can delete the group.' });
        }
        const { error: deleteError } = await database_1.supabase
            .from('groups')
            .delete()
            .eq('id', groupId);
        if (deleteError) {
            console.error('Error deleting group:', deleteError);
            return res.status(500).json({ error: 'Failed to delete group' });
        }
        res.json({ message: 'Group deleted successfully' });
    }
    catch (error) {
        console.error('Error in delete group route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:groupId/join', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: group, error: groupError } = await database_1.supabase
            .from('groups')
            .select('id, name')
            .eq('id', groupId)
            .single();
        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        const { data: existingMembership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (existingMembership) {
            return res.status(400).json({ error: 'You are already a member of this group' });
        }
        const { error: insertError } = await database_1.supabase
            .from('group_memberships')
            .insert([
            { group_id: groupId, user_id: req.user.id, role: 'member' }
        ]);
        if (insertError) {
            console.error('Error joining group:', insertError);
            return res.status(500).json({ error: 'Failed to join group' });
        }
        res.status(201).json({
            message: 'Successfully joined group',
            groupName: group.name
        });
    }
    catch (error) {
        console.error('Error in join group route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=groups-full.js.map