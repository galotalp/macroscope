import express from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();


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
    const { bio, profile_picture } = req.body;
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Prepare update data
    const updateData: any = {};
    if (bio !== undefined) updateData.bio = bio;
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture;
    
    const { data: user, error } = await supabase
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
  } catch (error) {
    console.error('Error in profile update route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile picture
router.post('/profile/upload-picture', authenticateToken, async (req, res) => {
  try {
    const { filename, fileData, mimeType } = req.body;
    
    console.log('Profile picture upload attempt for user:', req.user.id);
    console.log('Filename:', filename);
    console.log('MimeType:', mimeType);
    
    if (!filename || !fileData) {
      return res.status(400).json({ error: 'Filename and file data are required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Create service role client for file upload
    const serviceSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, 'base64');
    
    // Generate unique file path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = filename.split('.').pop();
    const storagePath = `profile-pictures/${req.user.id}/${timestamp}-${randomString}.${fileExtension}`;

    // Upload to Supabase Storage
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

    // Get public URL
    const { data: { publicUrl } } = serviceSupabase.storage
      .from('profile-pictures')
      .getPublicUrl(storagePath);

    console.log('Profile picture uploaded successfully to:', publicUrl);

    // Update user's profile picture in database
    const { data: user, error } = await supabase
      .from('users')
      .update({ profile_picture: publicUrl })
      .eq('id', req.user.id)
      .select('id, username, email, bio, profile_picture, created_at')
      .single();

    if (error) {
      console.error('Error updating profile picture in database:', error);
      // Try to delete the uploaded file if database update fails
      await serviceSupabase.storage
        .from('profile-pictures')
        .remove([storagePath]);
      return res.status(500).json({ error: 'Failed to update profile picture' });
    }

    res.json({ 
      user,
      message: 'Profile picture updated successfully'
    });
  } catch (error) {
    console.error('Error in profile picture upload route:', error);
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
