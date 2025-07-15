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

// Join a group
router.post('/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is already a member
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
      console.error('Error checking membership:', membershipCheckError);
      return res.status(500).json({ error: 'Failed to check membership' });
    }

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Add user to group
    const { error: joinError } = await supabase
      .from('group_memberships')
      .insert([
        { group_id: groupId, user_id: req.user.id, role: 'member' }
      ]);

    if (joinError) {
      console.error('Error joining group:', joinError);
      return res.status(500).json({ error: 'Failed to join group' });
    }

    res.json({
      message: 'Successfully joined group',
      group
    });
  } catch (error) {
    console.error('Error in join group route:', error);
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

    res.json({ groups: availableGroups });
  } catch (error) {
    console.error('Error in available groups route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
