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

// Create a new group (simplified - without invite_code for now)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Create the group without invite_code
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
      group: {
        ...group,
        invite_code: `TMP-${group.id.substring(0, 8)}` // Temporary invite code
      }
    });
  } catch (error) {
    console.error('Error in create group route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search groups by name (simplified)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Search groups by name only
    const { data: groups, error } = await supabase
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

    // Add temporary invite codes
    const groupsWithInviteCodes = groups.map(group => ({
      ...group,
      invite_code: `TMP-${group.id.substring(0, 8)}`
    }));

    res.json({ groups: groupsWithInviteCodes });
  } catch (error) {
    console.error('Error in search groups route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a group directly (simplified - without join requests)
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

    // Add user to group directly
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

// Request to join a group (placeholder - joins directly for now)
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

    // For now, just join directly (simulating instant approval)
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
      message: 'Join request approved automatically (demo mode)',
      groupName: group.name
    });
  } catch (error) {
    console.error('Error in request join route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available groups to join
router.get('/available', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get all groups the user is NOT a member of
    const { data: userGroups, error: userGroupsError } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', req.user.id);

    if (userGroupsError) {
      console.error('Error fetching user groups:', userGroupsError);
      return res.status(500).json({ error: 'Failed to fetch user groups' });
    }

    const userGroupIds = userGroups.map((membership: any) => membership.group_id);

    // Get all groups excluding the ones user is already in
    let query = supabase
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

    // Add temporary invite codes
    const groupsWithInviteCodes = availableGroups.map(group => ({
      ...group,
      invite_code: `TMP-${group.id.substring(0, 8)}`
    }));

    res.json({ groups: groupsWithInviteCodes });
  } catch (error) {
    console.error('Error in available groups route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group details (simplified - no join requests for now)
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

    res.json({
      group: {
        ...group,
        invite_code: `TMP-${group.id.substring(0, 8)}`
      },
      members,
      joinRequests: [] // No join requests for now
    });
  } catch (error) {
    console.error('Error in group details route:', error);
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

    // Delete the group (cascade will handle memberships)
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

// Placeholder for join request actions
router.post('/:groupId/join-requests/:requestId/:action', authenticateToken, async (req, res) => {
  res.status(501).json({ error: 'Join request approval not implemented yet (requires database migration)' });
});

export default router;
