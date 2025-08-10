import express from 'express';
import { authenticateToken } from '../../middleware/auth';

const router = express.Router();

// In-memory storage for demo
let groups: any[] = [];
let memberships: any[] = [];
let nextGroupId = 1;

// Get user's groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userMemberships = memberships.filter(m => m.user_id === req.user.id);
    const userGroups = groups.filter(g => userMemberships.some(m => m.group_id === g.id));
    
    res.json({ groups: userGroups });
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

    // Create the group
    const newGroup = {
      id: nextGroupId++,
      name,
      description,
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };

    groups.push(newGroup);

    // Add creator as a member
    memberships.push({
      group_id: newGroup.id,
      user_id: req.user.id,
      role: 'admin'
    });

    res.status(201).json({
      message: 'Group created successfully',
      group: newGroup
    });
  } catch (error) {
    console.error('Error in create group route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a group
router.post('/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);

    // Check if group exists
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is already a member
    const existingMembership = memberships.find(m => 
      m.group_id === groupId && m.user_id === req.user.id
    );

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Add user to group
    memberships.push({
      group_id: groupId,
      user_id: req.user.id,
      role: 'member'
    });

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
    const userMemberships = memberships.filter(m => m.user_id === req.user.id);
    const userGroupIds = userMemberships.map(m => m.group_id);
    
    const availableGroups = groups.filter(g => !userGroupIds.includes(g.id));

    res.json({ groups: availableGroups });
  } catch (error) {
    console.error('Error in available groups route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
