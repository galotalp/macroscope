"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const supabase_js_1 = require("@supabase/supabase-js");
const router = express_1.default.Router();
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
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { bio, profile_picture } = req.body;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const updateData = {};
        if (bio !== undefined)
            updateData.bio = bio;
        if (profile_picture !== undefined)
            updateData.profile_picture = profile_picture;
        const { data: user, error } = await database_1.supabase
            .from('users')
            .update(updateData)
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
router.post('/profile/upload-picture', auth_1.authenticateToken, async (req, res) => {
    try {
        const { filename, fileData, mimeType } = req.body;
        console.log('Profile picture upload attempt for user:', req.user.id);
        console.log('Filename:', filename);
        console.log('MimeType:', mimeType);
        if (!filename || !fileData) {
            return res.status(400).json({ error: 'Filename and file data are required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const serviceSupabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const buffer = Buffer.from(fileData, 'base64');
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileExtension = filename.split('.').pop();
        const storagePath = `profile-pictures/${req.user.id}/${timestamp}-${randomString}.${fileExtension}`;
        const { data: uploadData, error: uploadError } = await serviceSupabase.storage
            .from('profile-pictures')
            .upload(storagePath, buffer, {
            contentType: mimeType || 'image/jpeg',
            duplex: 'half'
        });
        if (uploadError) {
            console.error('Error uploading to Supabase Storage:', uploadError);
            return res.status(500).json({ error: 'Failed to upload profile picture to storage' });
        }
        const { data: { publicUrl } } = serviceSupabase.storage
            .from('profile-pictures')
            .getPublicUrl(storagePath);
        console.log('Profile picture uploaded successfully to:', publicUrl);
        const { data: user, error } = await database_1.supabase
            .from('users')
            .update({ profile_picture: publicUrl })
            .eq('id', req.user.id)
            .select('id, username, email, bio, profile_picture, created_at')
            .single();
        if (error) {
            console.error('Error updating profile picture in database:', error);
            await serviceSupabase.storage
                .from('profile-pictures')
                .remove([storagePath]);
            return res.status(500).json({ error: 'Failed to update profile picture' });
        }
        res.json({
            user,
            message: 'Profile picture updated successfully'
        });
    }
    catch (error) {
        console.error('Error in profile picture upload route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/change-password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: user, error: userError } = await database_1.supabase
            .from('users')
            .select('password_hash')
            .eq('id', req.user.id)
            .single();
        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        const saltRounds = 10;
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
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