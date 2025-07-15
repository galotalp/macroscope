"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// In-memory storage for demo
let projects = [];
let nextProjectId = 1;
// Get projects for a group
router.get('/group/:groupId', auth_1.authenticateToken, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const groupProjects = projects.filter(p => p.group_id === groupId);
        res.json({ projects: groupProjects });
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
    }
    catch (error) {
        console.error('Error in create project route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=projects-demo.js.map