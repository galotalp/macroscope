import express from 'express';
import { supabase } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Helper function to get user info
const getUserInfo = async (userId: string) => {
  if (!supabase) throw new Error('Database not available');
  
  const { data: user, error } = await supabase
    .from('users')
    .select('username, email, profile_picture')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return user;
};

// Get user's groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const { data: userGroups, error } = await supabase
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

    const groups = userGroups.map((membership: any) => membership.groups);
    res.json({ groups });
  } catch (error) {
    console.error('Error in groups route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new group
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Create the group
    const { data: group, error: groupError } = await supabase
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

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('group_memberships')
      .insert([
        { group_id: group.id, user_id: req.user.id, role: 'admin' }
      ]);

    if (memberError) {
      console.error('Error adding member:', memberError);
      // Try to clean up the group if member addition failed
      await supabase.from('groups').delete().eq('id', group.id);
      return res.status(500).json({ error: 'Failed to add user to group' });
    }

    res.status(201).json({ 
      group,
      message: 'Group created successfully'
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search available groups
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    let groupsQuery = supabase
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

    // Get user's memberships to filter out groups they're already in
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', req.user.id);

    const memberGroupIds = memberships?.map(m => m.group_id) || [];
    const availableGroups = groups.filter(g => !memberGroupIds.includes(g.id));

    res.json({ groups: availableGroups });
  } catch (error) {
    console.error('Error searching groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a group directly (public groups)
router.post('/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Add user as member
    const { error: memberError } = await supabase
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
  } catch (error) {
    console.error('Error in join group route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request to join a group (creates a pending request) - NOW USING DATABASE
router.post('/:groupId/request-join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message } = req.body;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Check if user already has a pending request (the database constraint will also catch this)
    const { data: existingRequest } = await supabase
      .from('group_join_requests')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request for this group' });
    }

    // Create join request in database
    const { data: joinRequest, error: requestError } = await supabase
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
      if (requestError.message?.includes('duplicate')) {
        return res.status(400).json({ error: 'You already have a pending request for this group' });
      }
      return res.status(500).json({ error: 'Failed to create join request' });
    }

    res.status(201).json({
      message: 'Join request sent successfully. The group owner will review your request.',
      groupName: group.name,
      requestId: joinRequest.id
    });
  } catch (error) {
    console.error('Error in request join route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group details including members and join requests
router.get('/:groupId/details', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member and their role
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const isAdmin = membership.role === 'admin';

    // Get all members
    const { data: members, error: membersError } = await supabase
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

    // Get pending join requests from database (only if user is admin)
    let joinRequests: any[] = [];
    console.log('🔍 DEBUG: Checking join requests for group:', groupId, 'isAdmin:', isAdmin);
    
    if (isAdmin) {
      const { data: requests, error: requestsError } = await supabase
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
        console.log('🔍 DEBUG: Join requests query successful, found:', requests?.length || 0, 'requests');
        console.log('🔍 DEBUG: Requests data:', JSON.stringify(requests, null, 2));
      } else {
        console.error('❌ DEBUG: Error fetching join requests:', requestsError);
      }
    }

    console.log('🔍 DEBUG: Final response - isAdmin:', isAdmin, 'joinRequests length:', joinRequests?.length || 0);
    
    res.json({
      group: {
        ...group,
        invite_code: `TMP-${group.id.substring(0, 8)}`
      },
      members,
      joinRequests: isAdmin ? joinRequests : [],
      userRole: membership.role,
      isAdmin: isAdmin
    });
  } catch (error) {
    console.error('Error fetching group details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update group
router.put('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can update group settings' });
    }

    // Update group
    const { data: updatedGroup, error } = await supabase
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
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete group
router.delete('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can delete groups' });
    }

    // Delete group (cascades to memberships and projects)
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      console.error('Error deleting group:', error);
      return res.status(500).json({ error: 'Failed to delete group' });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from group
router.delete('/:groupId/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if requesting user is admin
    const { data: adminMembership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (!adminMembership || adminMembership.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can remove members' });
    }

    // Don't allow removing the last admin
    if (userId === req.user.id) {
      const { data: adminCount } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', groupId)
        .eq('role', 'admin');

      if (adminCount && adminCount.length <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin from the group' });
      }
    }

    // Remove member
    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing member:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or reject join request - NOW USING DATABASE
router.post('/:groupId/join-requests/:requestId/:action', authenticateToken, async (req, res) => {
  try {
    const { groupId, requestId, action } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can respond to join requests' });
    }

    // Get the join request
    const { data: joinRequest, error: fetchError } = await supabase
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

    // Update the request status in database
    const { error: updateError } = await supabase
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

    // If approved, add user to group (the trigger should handle this, but we'll do it explicitly too)
    if (action === 'approve') {
      const { error: memberError } = await supabase
        .from('group_memberships')
        .insert([
          { group_id: groupId, user_id: joinRequest.user_id, role: 'member' }
        ]);

      if (memberError && !memberError.message?.includes('duplicate')) {
        console.error('Error adding member:', memberError);
        // Don't fail the request, the trigger might have already added them
      }
    }

    res.json({
      message: `Join request ${action}d successfully`,
      username: joinRequest.users.username
    });
  } catch (error) {
    console.error('Error processing join request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending join request counts for admin groups - NOW USING DATABASE
router.get('/pending-requests-count', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get groups where user is admin
    const { data: adminGroups, error: adminError } = await supabase
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

    // Get pending request counts from database
    const groupIds = adminGroups.map(g => g.group_id);
    
    const { data: requestCounts, error: countError } = await supabase
      .from('group_join_requests')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('status', 'pending');

    if (countError) {
      console.error('Error fetching request counts:', countError);
      return res.status(500).json({ error: 'Failed to fetch request counts' });
    }

    // Count requests per group
    const countMap = new Map<string, number>();
    (requestCounts || []).forEach(req => {
      countMap.set(req.group_id, (countMap.get(req.group_id) || 0) + 1);
    });

    const groupCounts = adminGroups.map(membership => ({
      groupId: membership.group_id,
      groupName: (membership.groups as any)?.name || 'Unknown Group',
      pendingRequestsCount: countMap.get(membership.group_id) || 0
    }));

    res.json({ groups: groupCounts });
  } catch (error) {
    console.error('Error fetching pending request counts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available groups (not joined by user)
router.get('/available', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get all groups
    const { data: allGroups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }

    // Get user's memberships
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', req.user.id);

    const memberGroupIds = memberships?.map(m => m.group_id) || [];
    const availableGroups = allGroups.filter(g => !memberGroupIds.includes(g.id));

    res.json({ groups: availableGroups });
  } catch (error) {
    console.error('Error fetching available groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group members
router.get('/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user is a member of the group
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Get all members
    const { data: members, error } = await supabase
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
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;