"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Configure multer for file uploads
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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
// Get user profile
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: user, error } = await database_1.supabase
            .from('users')
            .select('id, username, email, bio, profile_picture, created_at')
            .eq('id', req.user.id)
            .single();
        if (error) {
            console.error('Error fetching user profile:', error);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Error in profile route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update user profile
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { bio } = req.body;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: user, error } = await database_1.supabase
            .from('users')
            .update({ bio })
            .eq('id', req.user.id)
            .select('id, username, email, bio, profile_picture, created_at')
            .single();
        if (error) {
            console.error('Error updating user profile:', error);
            return res.status(500).json({ error: 'Failed to update user profile' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Error in profile update route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Upload profile picture
router.post('/profile/upload-picture', auth_1.authenticateToken, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const profilePictureUrl = `/uploads/${req.file.filename}`;
        // Update user's profile picture in database
        const { data: user, error } = await database_1.supabase
            .from('users')
            .update({ profile_picture: profilePictureUrl })
            .eq('id', req.user.id)
            .select('id, username, email, bio, profile_picture, created_at')
            .single();
        if (error) {
            console.error('Error updating profile picture:', error);
            // Delete the uploaded file if database update fails
            fs_1.default.unlinkSync(req.file.path);
            return res.status(500).json({ error: 'Failed to update profile picture' });
        }
        res.json({
            user,
            message: 'Profile picture updated successfully'
        });
    }
    catch (error) {
        console.error('Error in profile picture upload route:', error);
        // Delete the uploaded file if there's an error
        if (req.file) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Change password
router.post('/change-password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        // Get user's current password hash
        const { data: user, error: userError } = await database_1.supabase
            .from('users')
            .select('password_hash')
            .eq('id', req.user.id)
            .single();
        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify current password
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
        // Update password in database
        const { error: updateError } = await database_1.supabase
            .from('users')
            .update({ password_hash: newPasswordHash })
            .eq('id', req.user.id);
        if (updateError) {
            console.error('Error updating password:', updateError);
            return res.status(500).json({ error: 'Failed to update password' });
        }
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Error in change password route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map