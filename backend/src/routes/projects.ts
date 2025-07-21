import express from 'express';
import { supabase } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get projects for a group
router.get('/group/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get projects for the group
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('group_id', groupId);

    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    res.json({ projects });
  } catch (error) {
    console.error('Error in projects route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, groupId, priority, notes, memberIds } = req.body;

    if (!name || !groupId) {
      return res.status(400).json({ error: 'Project name and group ID are required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create the project
    const { data: project, error } = await supabase
      .from('projects')
      .insert([
        { 
          name, 
          description, 
          group_id: groupId, 
          created_by: req.user.id,
          status: 'planning',
          priority: priority || 'medium',
          notes: notes || ''
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Failed to create project', details: error.message });
    }

    // Add project assignments (including creator)
    const assignments = [req.user.id, ...(memberIds || [])];
    const uniqueAssignments = [...new Set(assignments)];
    
    if (uniqueAssignments.length > 0) {
      const assignmentInserts = uniqueAssignments.map(userId => ({
        project_id: project.id,
        user_id: userId
      }));

      const { error: assignmentError } = await supabase
        .from('project_assignments')
        .insert(assignmentInserts);

      if (assignmentError) {
        console.error('Error creating assignments:', assignmentError);
        // Don't fail the project creation, just log the error
      }
    }

    // Create default checklist items
    const defaultItems = [
      { title: 'Manuscript written', description: 'Complete the manuscript draft' },
      { title: 'Ethics submitted', description: 'Submit ethics application' },
      { title: 'Ethics approved', description: 'Receive ethics approval' },
      { title: 'Manuscript submitted', description: 'Submit manuscript to journal' }
    ];

    const checklistInserts = defaultItems.map(item => ({
      project_id: project.id,
      title: item.title,
      description: item.description,
      created_by: req.user.id
    }));

    const { error: checklistError } = await supabase
      .from('checklist_items')
      .insert(checklistInserts);

    if (checklistError) {
      console.error('Error creating checklist items:', checklistError);
      // Don't fail the project creation, just log the error
    }

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Error in create project route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project details with members and checklist
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get project assignments
    const { data: assignments, error: assignmentError } = await supabase
      .from('project_assignments')
      .select(`
        users (
          id,
          username,
          email
        )
      `)
      .eq('project_id', projectId);

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
    }

    // Get checklist items
    const { data: checklist, error: checklistError } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', projectId);

    if (checklistError) {
      console.error('Error fetching checklist:', checklistError);
    }

    // Get project files
    const { data: files, error: filesError } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);

    if (filesError) {
      console.error('Error fetching files:', filesError);
    }

    res.json({
      project,
      members: assignments || [],
      checklist: checklist || [],
      files: files || []
    });
  } catch (error) {
    console.error('Error in project details route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, priority, notes, status } = req.body;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        name: name || project.name,
        description: description || project.description,
        status: status || project.status,
        priority: priority || project.priority,
        notes: notes || project.notes
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating project:', updateError);
      return res.status(500).json({ error: 'Failed to update project' });
    }

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Error in update project route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add checklist item
router.post('/:projectId/checklist', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create checklist item
    const { data: item, error: insertError } = await supabase
      .from('checklist_items')
      .insert([
        {
          project_id: projectId,
          title,
          description: description || '',
          created_by: req.user.id
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating checklist item:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));
      return res.status(500).json({ error: 'Failed to create checklist item', details: insertError.message });
    }

    res.status(201).json({
      message: 'Checklist item created successfully',
      item
    });
  } catch (error) {
    console.error('Error in create checklist item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update checklist item
router.put('/:projectId/checklist/:itemId', authenticateToken, async (req, res) => {
  try {
    const { projectId, itemId } = req.params;
    const { title, description, completed } = req.body;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update checklist item
    const { data: item, error: updateError } = await supabase
      .from('checklist_items')
      .update({
        title,
        description,
        completed: completed !== undefined ? completed : false
      })
      .eq('id', itemId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating checklist item:', updateError);
      return res.status(500).json({ error: 'Failed to update checklist item' });
    }

    res.json({
      message: 'Checklist item updated successfully',
      item
    });
  } catch (error) {
    console.error('Error in update checklist item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete checklist item
router.delete('/:projectId/checklist/:itemId', authenticateToken, async (req, res) => {
  try {
    const { projectId, itemId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete checklist item
    const { error: deleteError } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting checklist item:', deleteError);
      return res.status(500).json({ error: 'Failed to delete checklist item' });
    }

    res.json({ message: 'Checklist item deleted successfully' });
  } catch (error) {
    console.error('Error in delete checklist item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group members for project assignment
router.get('/group/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get group members
    const { data: members, error: membersError } = await supabase
      .from('group_memberships')
      .select(`
        users (
          id,
          username,
          email
        )
      `)
      .eq('group_id', groupId);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return res.status(500).json({ error: 'Failed to fetch group members' });
    }

    res.json({ members });
  } catch (error) {
    console.error('Error in group members route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign user to project
router.post('/:projectId/assign', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user being assigned is also a member of the group
    const { data: assigneeMembership, error: assigneeError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', userId)
      .single();

    if (assigneeError || !assigneeMembership) {
      return res.status(400).json({ error: 'User must be a member of the group to be assigned to the project' });
    }

    // Check if user is already assigned
    const { data: existingAssignment, error: existingError } = await supabase
      .from('project_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (existingAssignment) {
      return res.status(400).json({ error: 'User is already assigned to this project' });
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('project_assignments')
      .insert([
        {
          project_id: projectId,
          user_id: userId
        }
      ])
      .select()
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      return res.status(500).json({ error: 'Failed to assign user to project' });
    }

    res.status(201).json({
      message: 'User assigned to project successfully',
      assignment
    });
  } catch (error) {
    console.error('Error in assign user route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
