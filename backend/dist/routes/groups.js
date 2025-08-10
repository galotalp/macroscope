"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
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
        const { error: memberError } = await database_1.supabase
            .from('group_memberships')
            .insert([
            { group_id: group.id, user_id: req.user.id, role: 'admin' }
        ]);
        if (memberError) {
            console.error('Error adding member:', memberError);
            await database_1.supabase.from('groups').delete().eq('id', group.id);
            return res.status(500).json({ error: 'Failed to add user to group' });
        }
        res.status(201).json({
            group,
            message: 'Group created successfully'
        });
    }
    catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/search', auth_1.authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        let groupsQuery = database_1.supabase
            .from('groups')
            .select('*');
        if (query && typeof query === 'string') {
            groupsQuery = groupsQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
        }
        const { data: groups, error } = await groupsQuery;
        if (error) {
            console.error('Error searching groups:', error);
            return res.status(500).json({ error: 'Failed to search groups' });
        }
        const { data: memberships } = await database_1.supabase
            .from('group_memberships')
            .select('group_id')
            .eq('user_id', req.user.id);
        const memberGroupIds = (memberships === null || memberships === void 0 ? void 0 : memberships.map(m => m.group_id)) || [];
        const availableGroups = groups.filter(g => !memberGroupIds.includes(g.id));
        res.json({ groups: availableGroups });
    }
    catch (error) {
        console.error('Error searching groups:', error);
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
            .select('name')
            .eq('id', groupId)
            .single();
        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        const { data: existingMembership } = await database_1.supabase
            .from('group_memberships')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (existingMembership) {
            return res.status(400).json({ error: 'You are already a member of this group' });
        }
        const { error: memberError } = await database_1.supabase
            .from('group_memberships')
            .insert([
            { group_id: groupId, user_id: req.user.id, role: 'member' }
        ]);
        if (memberError) {
            console.error('Error joining group:', memberError);
            return res.status(500).json({ error: 'Failed to join group' });
        }
        res.json({
            message: 'Successfully joined the group',
            groupName: group.name
        });
    }
    catch (error) {
        console.error('Error in join group route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:groupId/request-join', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        const { groupId } = req.params;
        const { message } = req.body;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: group, error: groupError } = await database_1.supabase
            .from('groups')
            .select('name')
            .eq('id', groupId)
            .single();
        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        const { data: existingMembership } = await database_1.supabase
            .from('group_memberships')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (existingMembership) {
            return res.status(400).json({ error: 'You are already a member of this group' });
        }
        const { data: existingRequest } = await database_1.supabase
            .from('group_join_requests')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .eq('status', 'pending')
            .single();
        if (existingRequest) {
            return res.status(400).json({ error: 'You already have a pending request for this group' });
        }
        const { data: joinRequest, error: requestError } = await database_1.supabase
            .from('group_join_requests')
            .insert([
            {
                group_id: groupId,
                user_id: req.user.id,
                message: message || null,
                status: 'pending'
            }
        ])
            .select()
            .single();
        if (requestError) {
            console.error('Error creating join request:', requestError);
            if ((_a = requestError.message) === null || _a === void 0 ? void 0 : _a.includes('duplicate')) {
                return res.status(400).json({ error: 'You already have a pending request for this group' });
            }
            return res.status(500).json({ error: 'Failed to create join request' });
        }
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
router.get('/:groupId/details', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: group, error: groupError } = await database_1.supabase
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .single();
        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        const { data: membership } = await database_1.supabase
            .from('group_memberships')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        const isAdmin = membership.role === 'admin';
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
            return res.status(500).json({ error: 'Failed to fetch group members' });
        }
        let joinRequests = [];
        console.log('🔍 DEBUG: Checking join requests for group:', groupId, 'isAdmin:', isAdmin);
        if (isAdmin) {
            const { data: requests, error: requestsError } = await database_1.supabase
                .from('group_join_requests')
                .select(`
          id,
          status,
          message,
          requested_at,
          users!group_join_requests_user_id_fkey (
            id,
            username,
            email,
            profile_picture
          )
        `)
                .eq('group_id', groupId)
                .eq('status', 'pending')
                .order('requested_at', { ascending: false });
            if (!requestsError) {
                joinRequests = requests || [];
                console.log('🔍 DEBUG: Join requests query successful, found:', (requests === null || requests === void 0 ? void 0 : requests.length) || 0, 'requests');
                console.log('🔍 DEBUG: Requests data:', JSON.stringify(requests, null, 2));
            }
            else {
                console.error('❌ DEBUG: Error fetching join requests:', requestsError);
            }
        }
        console.log('🔍 DEBUG: Final response - isAdmin:', isAdmin, 'joinRequests length:', (joinRequests === null || joinRequests === void 0 ? void 0 : joinRequests.length) || 0);
        res.json({
            group: Object.assign(Object.assign({}, group), { invite_code: `TMP-${group.id.substring(0, 8)}` }),
            members,
            joinRequests: isAdmin ? joinRequests : [],
            userRole: membership.role,
            isAdmin: isAdmin
        });
    }
    catch (error) {
        console.error('Error fetching group details:', error);
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
        const { data: membership } = await database_1.supabase
            .from('group_memberships')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only group admins can update group settings' });
        }
        const { data: updatedGroup, error } = await database_1.supabase
            .from('groups')
            .update({ name, description })
            .eq('id', groupId)
            .select()
            .single();
        if (error) {
            console.error('Error updating group:', error);
            return res.status(500).json({ error: 'Failed to update group' });
        }
        res.json({ group: updatedGroup, message: 'Group updated successfully' });
    }
    catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:groupId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership } = await database_1.supabase
            .from('group_memberships')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only group admins can delete groups' });
        }
        const { error } = await database_1.supabase
            .from('groups')
            .delete()
            .eq('id', groupId);
        if (error) {
            console.error('Error deleting group:', error);
            return res.status(500).json({ error: 'Failed to delete group' });
        }
        res.json({ message: 'Group deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:groupId/members/:userId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: adminMembership } = await database_1.supabase
            .from('group_memberships')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (!adminMembership || adminMembership.role !== 'admin') {
            return res.status(403).json({ error: 'Only group admins can remove members' });
        }
        if (userId === req.user.id) {
            const { data: adminCount } = await database_1.supabase
                .from('group_memberships')
                .select('id')
                .eq('group_id', groupId)
                .eq('role', 'admin');
            if (adminCount && adminCount.length <= 1) {
                return res.status(400).json({ error: 'Cannot remove the last admin from the group' });
            }
        }
        const { error } = await database_1.supabase
            .from('group_memberships')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);
        if (error) {
            console.error('Error removing member:', error);
            return res.status(500).json({ error: 'Failed to remove member' });
        }
        res.json({ message: 'Member removed successfully' });
    }
    catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:groupId/join-requests/:requestId/:action', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        const { groupId, requestId, action } = req.params;
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership } = await database_1.supabase
            .from('group_memberships')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only group admins can respond to join requests' });
        }
        const { data: joinRequest, error: fetchError } = await database_1.supabase
            .from('group_join_requests')
            .select('*, users!group_join_requests_user_id_fkey(username, email)')
            .eq('id', requestId)
            .eq('group_id', groupId)
            .single();
        if (fetchError || !joinRequest) {
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
            const { error: memberError } = await database_1.supabase
                .from('group_memberships')
                .insert([
                { group_id: groupId, user_id: joinRequest.user_id, role: 'member' }
            ]);
            if (memberError && !((_a = memberError.message) === null || _a === void 0 ? void 0 : _a.includes('duplicate'))) {
                console.error('Error adding member:', memberError);
            }
        }
        res.json({
            message: `Join request ${action}d successfully`,
            username: joinRequest.users.username
        });
    }
    catch (error) {
        console.error('Error processing join request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/pending-requests-count', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: adminGroups, error: adminError } = await database_1.supabase
            .from('group_memberships')
            .select(`
        group_id,
        groups (
          id,
          name
        )
      `)
            .eq('user_id', req.user.id)
            .eq('role', 'admin');
        if (adminError) {
            console.error('Error fetching admin groups:', adminError);
            return res.status(500).json({ error: 'Failed to fetch admin groups' });
        }
        if (!adminGroups || adminGroups.length === 0) {
            return res.json({ groups: [] });
        }
        const groupIds = adminGroups.map(g => g.group_id);
        const { data: requestCounts, error: countError } = await database_1.supabase
            .from('group_join_requests')
            .select('group_id')
            .in('group_id', groupIds)
            .eq('status', 'pending');
        if (countError) {
            console.error('Error fetching request counts:', countError);
            return res.status(500).json({ error: 'Failed to fetch request counts' });
        }
        const countMap = new Map();
        (requestCounts || []).forEach(req => {
            countMap.set(req.group_id, (countMap.get(req.group_id) || 0) + 1);
        });
        const groupCounts = adminGroups.map(membership => {
            var _a;
            return ({
                groupId: membership.group_id,
                groupName: ((_a = membership.groups) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Group',
                pendingRequestsCount: countMap.get(membership.group_id) || 0
            });
        });
        const totalPendingRequests = groupCounts.reduce((total, group) => total + group.pendingRequestsCount, 0);
        res.json({
            totalPendingRequests,
            groupCounts
        });
    }
    catch (error) {
        console.error('Error fetching pending request counts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/available', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: allGroups, error: groupsError } = await database_1.supabase
            .from('groups')
            .select('*')
            .order('created_at', { ascending: false });
        if (groupsError) {
            console.error('Error fetching groups:', groupsError);
            return res.status(500).json({ error: 'Failed to fetch groups' });
        }
        const { data: memberships } = await database_1.supabase
            .from('group_memberships')
            .select('group_id')
            .eq('user_id', req.user.id);
        const memberGroupIds = (memberships === null || memberships === void 0 ? void 0 : memberships.map(m => m.group_id)) || [];
        const availableGroups = allGroups.filter(g => !memberGroupIds.includes(g.id));
        res.json({ groups: availableGroups });
    }
    catch (error) {
        console.error('Error fetching available groups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:groupId/members', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership } = await database_1.supabase
            .from('group_memberships')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        const { data: members, error } = await database_1.supabase
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
        if (error) {
            console.error('Error fetching members:', error);
            return res.status(500).json({ error: 'Failed to fetch group members' });
        }
        res.json({ members });
    }
    catch (error) {
        console.error('Error fetching group members:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=groups.js.map