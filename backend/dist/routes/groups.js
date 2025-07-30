"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const joinRequests = [];
const generateRequestId = () => Math.random().toString(36).substring(2, 15);
const getUserInfo = async (userId) => {
    if (!database_1.supabase)
        throw new Error('Database not available');
    const { data: user, error } = await database_1.supabase
        .from('users')
        .select('username, email, profile_picture')
        .eq('id', userId)
        .single();
    if (error)
        throw error;
    return user;
};
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
        const { data: group, error: groupError } = await database_1.supabase
            .from('groups')
            .insert([
            { name, description, created_by: req.user.id }
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
            group: Object.assign(Object.assign({}, group), { invite_code: `TMP-${group.id.substring(0, 8)}` })
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
        created_at,
        created_by
      `)
            .ilike('name', `%${query}%`);
        if (error) {
            console.error('Error searching groups:', error);
            return res.status(500).json({ error: 'Failed to search groups' });
        }
        const groupsWithInviteCodes = groups.map(group => (Object.assign(Object.assign({}, group), { invite_code: `TMP-${group.id.substring(0, 8)}` })));
        res.json({ groups: groupsWithInviteCodes });
    }
    catch (error) {
        console.error('Error in search groups route:', error);
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
        const existingRequest = joinRequests.find(r => r.groupId === groupId && r.userId === req.user.id && r.status === 'pending');
        if (existingRequest) {
            return res.status(400).json({ error: 'You already have a pending request for this group' });
        }
        const userInfo = await getUserInfo(req.user.id);
        const joinRequest = {
            id: generateRequestId(),
            groupId,
            userId: req.user.id,
            username: userInfo.username,
            email: userInfo.email,
            profile_picture: userInfo.profile_picture,
            status: 'pending',
            requestedAt: new Date()
        };
        joinRequests.push(joinRequest);
        res.status(201).json({
            message: 'Join request sent successfully. The group owner will review your request.',
            groupName: group.name,
            requestId: joinRequest.id
        });
    }
    catch (error) {
        console.error('Error in request join route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/available', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: userGroups, error: userGroupsError } = await database_1.supabase
            .from('group_memberships')
            .select('group_id')
            .eq('user_id', req.user.id);
        if (userGroupsError) {
            console.error('Error fetching user groups:', userGroupsError);
            return res.status(500).json({ error: 'Failed to fetch user groups' });
        }
        const userGroupIds = userGroups.map((membership) => membership.group_id);
        let query = database_1.supabase
            .from('groups')
            .select('id, name, description, created_at, created_by');
        if (userGroupIds.length > 0) {
            query = query.not('id', 'in', `(${userGroupIds.join(',')})`);
        }
        const { data: availableGroups, error: availableError } = await query;
        if (availableError) {
            console.error('Error fetching available groups:', availableError);
            return res.status(500).json({ error: 'Failed to fetch available groups' });
        }
        const groupsWithInviteCodes = availableGroups.map(group => (Object.assign(Object.assign({}, group), { invite_code: `TMP-${group.id.substring(0, 8)}` })));
        res.json({ groups: groupsWithInviteCodes });
    }
    catch (error) {
        console.error('Error in available groups route:', error);
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
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied. You must be a member of this group.' });
        }
        const isAdmin = membership.role === 'admin';
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
          email,
          profile_picture
        )
      `)
            .eq('group_id', groupId);
        if (membersError) {
            console.error('Error fetching members:', membersError);
            return res.status(500).json({ error: 'Failed to fetch members' });
        }
        const pendingRequests = isAdmin ? joinRequests.filter(r => r.groupId === groupId && r.status === 'pending') : [];
        res.json({
            group: Object.assign(Object.assign({}, group), { invite_code: `TMP-${group.id.substring(0, 8)}` }),
            members,
            joinRequests: isAdmin ? pendingRequests.map(r => ({
                id: r.id,
                status: r.status,
                requested_at: r.requestedAt.toISOString(),
                users: {
                    id: r.userId,
                    username: r.username,
                    email: r.email,
                    profile_picture: r.profile_picture
                }
            })) : [],
            isAdmin
        });
    }
    catch (error) {
        console.error('Error in group details route:', error);
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
router.put('/:groupId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description } = req.body;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Group name is required' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }
        if (membership.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only group admins can edit group details.' });
        }
        const { data: updatedGroup, error: updateError } = await database_1.supabase
            .from('groups')
            .update({
            name: name.trim(),
            description: (description === null || description === void 0 ? void 0 : description.trim()) || null
        })
            .eq('id', groupId)
            .select()
            .single();
        if (updateError) {
            console.error('Error updating group:', updateError);
            return res.status(500).json({ error: 'Failed to update group' });
        }
        res.json({
            message: 'Group updated successfully',
            group: updatedGroup
        });
    }
    catch (error) {
        console.error('Error in update group route:', error);
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
        const requestIndex = joinRequests.findIndex(r => r.id === requestId && r.groupId === groupId);
        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Join request not found' });
        }
        const joinRequest = joinRequests[requestIndex];
        if (joinRequest.status !== 'pending') {
            return res.status(400).json({ error: 'This request has already been processed' });
        }
        joinRequest.status = action === 'approve' ? 'approved' : 'rejected';
        joinRequest.respondedAt = new Date();
        joinRequest.respondedBy = req.user.id;
        if (action === 'approve') {
            const { error: membershipInsertError } = await database_1.supabase
                .from('group_memberships')
                .insert([
                { group_id: groupId, user_id: joinRequest.userId, role: 'member' }
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
router.get('/pending-requests-count', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: adminGroups, error: groupsError } = await database_1.supabase
            .from('group_memberships')
            .select('group_id, groups!group_memberships_group_id_fkey(id, name)')
            .eq('user_id', req.user.id)
            .eq('role', 'admin');
        if (groupsError) {
            console.error('Error fetching admin groups:', groupsError);
            return res.status(500).json({ error: 'Failed to fetch groups' });
        }
        const groupCounts = (adminGroups || []).map(membership => {
            var _a;
            const groupId = membership.group_id;
            const pendingCount = joinRequests.filter(r => r.groupId === groupId && r.status === 'pending').length;
            return {
                groupId,
                groupName: ((_a = membership.groups) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Group',
                pendingRequestsCount: pendingCount
            };
        });
        const totalPendingRequests = groupCounts.reduce((sum, group) => sum + group.pendingRequestsCount, 0);
        res.json({
            totalPendingRequests,
            groupCounts
        });
    }
    catch (error) {
        console.error('Error in pending requests count route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=groups.js.map