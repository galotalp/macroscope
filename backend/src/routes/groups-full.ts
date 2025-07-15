import express from 'express';
import { supabase } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

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

    // Generate a unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create the group
    const { data: group, error: groupError } = await supabase
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

    // Add creator as a member
    const { error: membershipError } = await supabase
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
  } catch (error) {
    console.error('Error in create group route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search groups by name or invite code
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Search groups by name or invite code
    const { data: groups, error } = await supabase
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
  } catch (error) {
    console.error('Error in search groups route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request to join a group
router.post('/:groupId/request-join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is already a member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Check if user already has a pending request
    const { data: existingRequest, error: requestError } = await supabase
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

    // Create join request
    const { error: insertError } = await supabase
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
  } catch (error) {
    console.error('Error in request join route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group details including members and join requests (for group admins)
router.get('/:groupId/details', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user is admin of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
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

    // Get members
    const { data: members, error: membersError } = await supabase
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

    // Get pending join requests
    const { data: joinRequests, error: requestsError } = await supabase
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
  } catch (error) {
    console.error('Error in group details route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or reject join request
router.post('/:groupId/join-requests/:requestId/:action', authenticateToken, async (req, res) => {
  try {
    const { groupId, requestId, action } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user is admin of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Get the join request
    const { data: joinRequest, error: requestError } = await supabase
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

    // Update the request status
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

    // If approved, add user to group
    if (action === 'approve') {
      const { error: membershipInsertError } = await supabase
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
  } catch (error) {
    console.error('Error in join request action route:', error);
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

    // Check if user is admin of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Cannot remove the group creator
    const { data: group, error: groupError } = await supabase
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

    // Remove member
    const { error: removeError } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (removeError) {
      console.error('Error removing member:', removeError);
      return res.status(500).json({ error: 'Failed to remove member' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error in remove member route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete group (only creator can delete)
router.delete('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user is the creator of the group
    const { data: group, error: groupError } = await supabase
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

    // Delete the group (cascade will handle memberships and join requests)
    const { error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (deleteError) {
      console.error('Error deleting group:', deleteError);
      return res.status(500).json({ error: 'Failed to delete group' });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error in delete group route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a group (old endpoint - keeping for backward compatibility)
router.post('/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is already a member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Add user to group directly (for backward compatibility)
    const { error: insertError } = await supabase
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
  } catch (error) {
    console.error('Error in join group route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
