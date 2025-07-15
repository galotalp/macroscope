"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get projects for a group
router.get('/group/:groupId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        // Verify user is a member of the group
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Get projects for the group
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
// Create a new project
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, description, groupId } = req.body;
        if (!name || !groupId) {
            return res.status(400).json({ error: 'Project name and group ID are required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        // Verify user is a member of the group
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Create the project
        const { data: project, error } = await database_1.supabase
            .from('projects')
            .insert([
            { name, description, group_id: groupId, created_by: req.user.id }
        ])
            .select()
            .single();
        if (error) {
            console.error('Error creating project:', error);
            return res.status(500).json({ error: 'Failed to create project' });
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
exports.default = router;
//# sourceMappingURL=projects.js.map