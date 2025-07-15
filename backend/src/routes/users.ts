import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const { data: user, error } = await supabase
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
  } catch (error) {
    console.error('Error in profile route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { bio } = req.body;
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    const { data: user, error } = await supabase
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
  } catch (error) {
    console.error('Error in profile update route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile picture
router.post('/profile/upload-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const profilePictureUrl = `/uploads/${req.file.filename}`;

    // Update user's profile picture in database
    const { data: user, error } = await supabase
      .from('users')
      .update({ profile_picture: profilePictureUrl })
      .eq('id', req.user.id)
      .select('id, username, email, bio, profile_picture, created_at')
      .single();

    if (error) {
      console.error('Error updating profile picture:', error);
      // Delete the uploaded file if database update fails
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'Failed to update profile picture' });
    }

    res.json({ 
      user,
      message: 'Profile picture updated successfully'
    });
  } catch (error) {
    console.error('Error in profile picture upload route:', error);
    // Delete the uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get user's current password hash
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error in change password route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
