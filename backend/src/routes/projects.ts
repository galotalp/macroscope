import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { supabase } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/project-files');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow most common file types
    const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|png|jpg|jpeg|gif|mp4|mov|avi)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Get projects for a group
router.get('/group/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get projects for the group
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('group_id', groupId);

    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    res.json({ projects });
  } catch (error) {
    console.error('Error in projects route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, groupId, priority, notes, memberIds } = req.body;

    if (!name || !groupId) {
      return res.status(400).json({ error: 'Project name and group ID are required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create the project
    const { data: project, error } = await supabase
      .from('projects')
      .insert([
        { 
          name, 
          description, 
          group_id: groupId, 
          created_by: req.user.id,
          status: 'planning',
          priority: priority || 'medium',
          notes: notes || ''
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Failed to create project', details: error.message });
    }

    // Add project assignments (including creator)
    const assignments = [req.user.id, ...(memberIds || [])];
    const uniqueAssignments = [...new Set(assignments)];
    
    if (uniqueAssignments.length > 0) {
      const assignmentInserts = uniqueAssignments.map(userId => ({
        project_id: project.id,
        user_id: userId
      }));

      const { error: assignmentError } = await supabase
        .from('project_assignments')
        .insert(assignmentInserts);

      if (assignmentError) {
        console.error('Error creating assignments:', assignmentError);
        // Don't fail the project creation, just log the error
      }
    }

    // Checklist items will be added separately via the frontend

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Error in create project route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project details with members and checklist
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get project assignments
    const { data: assignments, error: assignmentError } = await supabase
      .from('project_assignments')
      .select(`
        *,
        users!project_assignments_user_id_fkey (
          id,
          username,
          email
        )
      `)
      .eq('project_id', projectId);

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
    }

    // Get checklist items
    const { data: checklist, error: checklistError } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', projectId);

    if (checklistError) {
      console.error('Error fetching checklist:', checklistError);
    }

    // Get project files
    const { data: files, error: filesError } = await supabase
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
  } catch (error) {
    console.error('Error in project details route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, priority, notes, status } = req.body;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        name: name || project.name,
        description: description || project.description,
        status: status || project.status,
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
  } catch (error) {
    console.error('Error in update project route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add checklist item
router.post('/:projectId/checklist', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description } = req.body;

    console.log('Adding checklist item:', { projectId, title, description });

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create checklist item
    const { data: item, error: insertError } = await supabase
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
      console.error('Error details:', JSON.stringify(insertError, null, 2));
      return res.status(500).json({ error: 'Failed to create checklist item', details: insertError.message });
    }

    console.log('Checklist item created successfully:', item);

    res.status(201).json({
      message: 'Checklist item created successfully',
      item
    });
  } catch (error) {
    console.error('Error in create checklist item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update checklist item
router.put('/:projectId/checklist/:itemId', authenticateToken, async (req, res) => {
  try {
    const { projectId, itemId } = req.params;
    const { title, description, completed } = req.body;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update checklist item
    const { data: item, error: updateError } = await supabase
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
  } catch (error) {
    console.error('Error in update checklist item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete checklist item
router.delete('/:projectId/checklist/:itemId', authenticateToken, async (req, res) => {
  try {
    const { projectId, itemId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete checklist item
    const { error: deleteError } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting checklist item:', deleteError);
      return res.status(500).json({ error: 'Failed to delete checklist item' });
    }

    res.json({ message: 'Checklist item deleted successfully' });
  } catch (error) {
    console.error('Error in delete checklist item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group members for project assignment
router.get('/group/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get group members
    const { data: memberships, error: membersError } = await supabase
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

    // Extract just the user objects from the memberships
    const members = memberships?.map(m => m.users).filter(Boolean) || [];

    res.json({ members });
  } catch (error) {
    console.error('Error in group members route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign user to project
router.post('/:projectId/assign', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user being assigned is also a member of the group
    const { data: assigneeMembership, error: assigneeError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', userId)
      .single();

    if (assigneeError || !assigneeMembership) {
      return res.status(400).json({ error: 'User must be a member of the group to be assigned to the project' });
    }

    // Check if user is already assigned
    const { data: existingAssignment, error: existingError } = await supabase
      .from('project_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (existingAssignment) {
      return res.status(400).json({ error: 'User is already assigned to this project' });
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('project_assignments')
      .insert([
        {
          project_id: projectId,
          user_id: userId
        }
      ])
      .select()
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      return res.status(500).json({ error: 'Failed to assign user to project' });
    }

    res.status(201).json({
      message: 'User assigned to project successfully',
      assignment
    });
  } catch (error) {
    console.error('Error in assign user route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload file to project using Supabase Storage
router.post('/:projectId/files', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filename, fileData, mimeType, fileSize } = req.body;
    
    console.log('File upload attempt for project:', projectId);
    console.log('Filename:', filename);
    console.log('MimeType:', mimeType);
    console.log('FileSize:', fileSize);
    
    if (!filename || !fileData) {
      return res.status(400).json({ error: 'Filename and file data are required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, 'base64');
    
    // Create unique filename
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${filename}`;
    const storagePath = `project-files/${projectId}/${uniqueFilename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, buffer, {
        contentType: mimeType || 'application/octet-stream',
        duplex: 'half'
      });

    if (uploadError) {
      console.error('Error uploading to Supabase Storage:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(storagePath);

    // Save file info to database
    const { data: fileRecord, error: fileError } = await supabase
      .from('project_files')
      .insert([
        {
          project_id: projectId,
          filename: filename,
          storage_path: storagePath,
          public_url: publicUrl,
          file_size: fileSize || buffer.length,
          mime_type: mimeType || 'application/octet-stream',
          uploaded_by: req.user.id
        }
      ])
      .select()
      .single();

    if (fileError) {
      console.error('Error saving file record:', fileError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('project-files').remove([storagePath]);
      return res.status(500).json({ error: 'Failed to save file record' });
    }

    console.log('File uploaded successfully to Supabase Storage');

    res.status(201).json({
      message: 'File uploaded successfully',
      file: fileRecord
    });
  } catch (error) {
    console.error('Error in file upload route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get files for a project
router.get('/:projectId/files', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get files with uploader info
    try {
      let query = supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId);

      // Try to get files first without joining to see if table exists
      const { data: files, error: filesError } = await query;

      if (filesError) {
        console.error('Error fetching files:', filesError);
        // If table doesn't exist, return empty array
        if (filesError.code === '42P01' || filesError.message?.includes('does not exist')) {
          return res.json({ files: [] });
        }
        return res.status(500).json({ error: 'Failed to fetch files' });
      }

      // If no files, return empty array
      if (!files || files.length === 0) {
        return res.json({ files: [] });
      }

      // Now try to get files with user info and apply sorting
      query = supabase
        .from('project_files')
        .select(`
          *,
          users!project_files_uploaded_by_fkey (
            id,
            username,
            email
          )
        `)
        .eq('project_id', projectId);

      // Apply sorting only if we have data
      const validSortFields = ['filename', 'file_size', 'mime_type'];
      let sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'filename';
      
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      query = query.order(sortField, { ascending: order === 'asc' });

      const { data: filesWithUsers, error: joinError } = await query;

      if (joinError) {
        console.error('Error fetching files with user info:', joinError);
        // Fallback to files without user info
        res.json({ files });
      } else {
        res.json({ files: filesWithUsers });
      }

    } catch (error) {
      console.error('Error in files query:', error);
      res.json({ files: [] });
    }
  } catch (error) {
    console.error('Error in get files route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download file from Supabase Storage
router.get('/:projectId/files/:fileId/download', authenticateToken, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get file record
    const { data: fileRecord, error: fileError } = await supabase
      .from('project_files')
      .select('*, projects!project_files_project_id_fkey(group_id)')
      .eq('id', fileId)
      .eq('project_id', projectId)
      .single();

    if (fileError || !fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', fileRecord.projects.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return the public URL for download
    res.json({ 
      downloadUrl: fileRecord.public_url,
      filename: fileRecord.filename,
      mimeType: fileRecord.mime_type
    });
  } catch (error) {
    console.error('Error in file download route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete file from Supabase Storage
router.delete('/:projectId/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get file record
    const { data: fileRecord, error: fileError } = await supabase
      .from('project_files')
      .select('*, projects!project_files_project_id_fkey(group_id)')
      .eq('id', fileId)
      .eq('project_id', projectId)
      .single();

    if (fileError || !fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', fileRecord.projects.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from Supabase Storage
    if (fileRecord.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([fileRecord.storage_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage delete fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      console.error('Error deleting file record:', deleteError);
      return res.status(500).json({ error: 'Failed to delete file record' });
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error in file delete route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project
router.delete('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete related data first (cascade delete)
    // Delete checklist items
    await supabase
      .from('checklist_items')
      .delete()
      .eq('project_id', projectId);

    // Delete project assignments
    await supabase
      .from('project_assignments')
      .delete()
      .eq('project_id', projectId);

    // Delete project files (if any)
    await supabase
      .from('project_files')
      .delete()
      .eq('project_id', projectId);

    // Delete the project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return res.status(500).json({ error: 'Failed to delete project' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error in delete project route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
