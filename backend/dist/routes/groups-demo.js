"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
let groups = [];
let memberships = [];
let nextGroupId = 1;
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userMemberships = memberships.filter(m => m.user_id === req.user.id);
        const userGroups = groups.filter(g => userMemberships.some(m => m.group_id === g.id));
        res.json({ groups: userGroups });
    }
    catch (error) {
        console.error('Error in groups route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Group name is required' });
        }
        const newGroup = {
            id: nextGroupId++,
            name,
            description,
            created_by: req.user.id,
            created_at: new Date().toISOString()
        };
        groups.push(newGroup);
        memberships.push({
            group_id: newGroup.id,
            user_id: req.user.id,
            role: 'admin'
        });
        res.status(201).json({
            message: 'Group created successfully',
            group: newGroup
        });
    }
    catch (error) {
        console.error('Error in create group route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:groupId/join', auth_1.authenticateToken, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const group = groups.find(g => g.id === groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        const existingMembership = memberships.find(m => m.group_id === groupId && m.user_id === req.user.id);
        if (existingMembership) {
            return res.status(400).json({ error: 'You are already a member of this group' });
        }
        memberships.push({
            group_id: groupId,
            user_id: req.user.id,
            role: 'member'
        });
        res.json({
            message: 'Successfully joined group',
            group
        });
    }
    catch (error) {
        console.error('Error in join group route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/available', auth_1.authenticateToken, async (req, res) => {
    try {
        const userMemberships = memberships.filter(m => m.user_id === req.user.id);
        const userGroupIds = userMemberships.map(m => m.group_id);
        const availableGroups = groups.filter(g => !userGroupIds.includes(g.id));
        res.json({ groups: availableGroups });
    }
    catch (error) {
        console.error('Error in available groups route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=groups-demo.js.map