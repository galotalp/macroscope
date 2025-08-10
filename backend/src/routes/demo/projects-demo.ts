import express from 'express';
import { authenticateToken } from '../../middleware/auth';

const router = express.Router();

// In-memory storage for demo
let projects: any[] = [];
let nextProjectId = 1;

// Get projects for a group
router.get('/group/:groupId', authenticateToken, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    
    const groupProjects = projects.filter(p => p.group_id === groupId);
    
    res.json({ projects: groupProjects });
  } catch (error) {
    console.error('Error in projects route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, groupId } = req.body;

    if (!name || !groupId) {
      return res.status(400).json({ error: 'Project name and group ID are required' });
    }

    // Create the project
    const newProject = {
      id: nextProjectId++,
      name,
      description,
      group_id: parseInt(groupId),
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };

    projects.push(newProject);

    res.status(201).json({
      message: 'Project created successfully',
      project: newProject
    });
  } catch (error) {
    console.error('Error in create project route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
