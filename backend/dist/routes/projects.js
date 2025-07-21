"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/group/:groupId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: projects, error } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('group_id', groupId);
        if (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ error: 'Failed to fetch projects' });
        }
        res.json({ projects });
    }
    catch (error) {
        console.error('Error in projects route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, description, groupId, priority, notes, memberIds } = req.body;
        if (!name || !groupId) {
            return res.status(400).json({ error: 'Project name and group ID are required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: project, error } = await database_1.supabase
            .from('projects')
            .insert([
            {
                name,
                description,
                group_id: groupId,
                created_by: req.user.id,
                priority: priority || 'medium',
                notes: notes || ''
            }
        ])
            .select()
            .single();
        if (error) {
            console.error('Error creating project:', error);
            return res.status(500).json({ error: 'Failed to create project' });
        }
        const assignments = [req.user.id, ...(memberIds || [])];
        const uniqueAssignments = [...new Set(assignments)];
        if (uniqueAssignments.length > 0) {
            const assignmentInserts = uniqueAssignments.map(userId => ({
                project_id: project.id,
                user_id: userId
            }));
            const { error: assignmentError } = await database_1.supabase
                .from('project_assignments')
                .insert(assignmentInserts);
            if (assignmentError) {
                console.error('Error creating assignments:', assignmentError);
            }
        }
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
        const { error: checklistError } = await database_1.supabase
            .from('checklist_items')
            .insert(checklistInserts);
        if (checklistError) {
            console.error('Error creating checklist items:', checklistError);
        }
        res.status(201).json({
            message: 'Project created successfully',
            project
        });
    }
    catch (error) {
        console.error('Error in create project route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:projectId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: assignments, error: assignmentError } = await database_1.supabase
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
        const { data: checklist, error: checklistError } = await database_1.supabase
            .from('checklist_items')
            .select('*')
            .eq('project_id', projectId);
        if (checklistError) {
            console.error('Error fetching checklist:', checklistError);
        }
        const { data: files, error: filesError } = await database_1.supabase
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
    }
    catch (error) {
        console.error('Error in project details route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:projectId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description, priority, notes } = req.body;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: updatedProject, error: updateError } = await database_1.supabase
            .from('projects')
            .update({
            name: name || project.name,
            description: description || project.description,
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
    }
    catch (error) {
        console.error('Error in update project route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:projectId/checklist', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: item, error: insertError } = await database_1.supabase
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
            return res.status(500).json({ error: 'Failed to create checklist item' });
        }
        res.status(201).json({
            message: 'Checklist item created successfully',
            item
        });
    }
    catch (error) {
        console.error('Error in create checklist item route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:projectId/checklist/:itemId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId, itemId } = req.params;
        const { title, description, completed } = req.body;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: item, error: updateError } = await database_1.supabase
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
    }
    catch (error) {
        console.error('Error in update checklist item route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:projectId/checklist/:itemId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId, itemId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { error: deleteError } = await database_1.supabase
            .from('checklist_items')
            .delete()
            .eq('id', itemId)
            .eq('project_id', projectId);
        if (deleteError) {
            console.error('Error deleting checklist item:', deleteError);
            return res.status(500).json({ error: 'Failed to delete checklist item' });
        }
        res.json({ message: 'Checklist item deleted successfully' });
    }
    catch (error) {
        console.error('Error in delete checklist item route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/group/:groupId/members', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: members, error: membersError } = await database_1.supabase
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
    }
    catch (error) {
        console.error('Error in group members route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=projects.js.map