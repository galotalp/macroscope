"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
let users = [];
exports.users = users;
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
        }
    }
});
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                bio: user.bio || '',
                profile_picture: user.profile_picture || null,
                created_at: user.created_at
            }
        });
    }
    catch (error) {
        console.error('Error in profile route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { bio } = req.body;
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        users[userIndex].bio = bio;
        res.json({
            user: {
                id: users[userIndex].id,
                username: users[userIndex].username,
                email: users[userIndex].email,
                bio: users[userIndex].bio || '',
                profile_picture: users[userIndex].profile_picture || null,
                created_at: users[userIndex].created_at
            }
        });
    }
    catch (error) {
        console.error('Error in profile update route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/profile/upload-picture', auth_1.authenticateToken, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const profilePictureUrl = `/uploads/${req.file.filename}`;
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'User not found' });
        }
        users[userIndex].profile_picture = profilePictureUrl;
        res.json({
            user: {
                id: users[userIndex].id,
                username: users[userIndex].username,
                email: users[userIndex].email,
                bio: users[userIndex].bio || '',
                profile_picture: users[userIndex].profile_picture,
                created_at: users[userIndex].created_at
            },
            message: 'Profile picture updated successfully'
        });
    }
    catch (error) {
        console.error('Error in profile picture upload route:', error);
        if (req.file) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/change-password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, users[userIndex].password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        const saltRounds = 10;
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
        users[userIndex].password_hash = newPasswordHash;
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Error in change password route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=users-demo.js.map