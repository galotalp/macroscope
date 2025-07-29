import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// In-memory storage for demo (same as the auth-demo users array)
// In a real app, this would be shared, but for demo it's acceptable to have duplicate logic
let users: any[] = [];

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
  } catch (error) {
    console.error('Error in profile route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
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
  } catch (error) {
    console.error('Error in profile update route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile picture
router.post('/profile/upload-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('🚨 DEMO USERS ROUTE HIT! (This should not happen) 🚨');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const profilePictureUrl = `/uploads/${req.file.filename}`;
    
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      // Delete the uploaded file if user not found
      fs.unlinkSync(req.file.path);
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

    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[userIndex].password_hash);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    users[userIndex].password_hash = newPasswordHash;

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error in change password route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the users array for sharing with auth-demo
export { users };
export default router;
