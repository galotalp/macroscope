"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/project-files');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|png|jpg|jpeg|gif|mp4|mov|avi)$/i;
        if (allowedTypes.test(file.originalname)) {
            cb(null, true);
        }
        else {
            cb(new Error('File type not allowed'));
        }
    }
});
router.get('/group/:groupId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
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
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, description, groupId, priority, notes, memberIds } = req.body;
        if (!name || !groupId) {
            return res.status(400).json({ error: 'Project name and group ID are required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: project, error } = await database_1.supabase
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
        const assignments = [req.user.id, ...(memberIds || [])];
        const uniqueAssignments = [...new Set(assignments)];
        if (uniqueAssignments.length > 0) {
            const assignmentInserts = uniqueAssignments.map(userId => ({
                project_id: project.id,
                user_id: userId
            }));
            const { error: assignmentError } = await database_1.supabase
                .from('project_assignments')
                .insert(assignmentInserts);
            if (assignmentError) {
                console.error('Error creating assignments:', assignmentError);
            }
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
router.get('/:projectId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: assignments, error: assignmentError } = await database_1.supabase
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
        const { data: checklist, error: checklistError } = await database_1.supabase
            .from('checklist_items')
            .select('*')
            .eq('project_id', projectId);
        if (checklistError) {
            console.error('Error fetching checklist:', checklistError);
        }
        const { data: files, error: filesError } = await database_1.supabase
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
    }
    catch (error) {
        console.error('Error in project details route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:projectId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description, priority, notes, status } = req.body;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: updatedProject, error: updateError } = await database_1.supabase
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
    }
    catch (error) {
        console.error('Error in update project route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:projectId/checklist', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description } = req.body;
        console.log('Adding checklist item:', { projectId, title, description });
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: item, error: insertError } = await database_1.supabase
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
    }
    catch (error) {
        console.error('Error in create checklist item route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:projectId/checklist/:itemId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId, itemId } = req.params;
        const { title, description, completed } = req.body;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: item, error: updateError } = await database_1.supabase
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
    }
    catch (error) {
        console.error('Error in update checklist item route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:projectId/checklist/:itemId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId, itemId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { error: deleteError } = await database_1.supabase
            .from('checklist_items')
            .delete()
            .eq('id', itemId)
            .eq('project_id', projectId);
        if (deleteError) {
            console.error('Error deleting checklist item:', deleteError);
            return res.status(500).json({ error: 'Failed to delete checklist item' });
        }
        res.json({ message: 'Checklist item deleted successfully' });
    }
    catch (error) {
        console.error('Error in delete checklist item route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/group/:groupId/members', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: memberships, error: membersError } = await database_1.supabase
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
        const members = (memberships === null || memberships === void 0 ? void 0 : memberships.map(m => m.users).filter(Boolean)) || [];
        res.json({ members });
    }
    catch (error) {
        console.error('Error in group members route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:projectId/assign', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { data: assigneeMembership, error: assigneeError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', userId)
            .single();
        if (assigneeError || !assigneeMembership) {
            return res.status(400).json({ error: 'User must be a member of the group to be assigned to the project' });
        }
        const { data: existingAssignment, error: existingError } = await database_1.supabase
            .from('project_assignments')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .single();
        if (existingAssignment) {
            return res.status(400).json({ error: 'User is already assigned to this project' });
        }
        const { data: assignment, error: assignmentError } = await database_1.supabase
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
    }
    catch (error) {
        console.error('Error in assign user route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:projectId/files', auth_1.authenticateToken, async (req, res) => {
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
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const buffer = Buffer.from(fileData, 'base64');
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}-${filename}`;
        const storagePath = `project-files/${projectId}/${uniqueFilename}`;
        const { data: uploadData, error: uploadError } = await database_1.supabase.storage
            .from('project-files')
            .upload(storagePath, buffer, {
            contentType: mimeType || 'application/octet-stream',
            duplex: 'half'
        });
        if (uploadError) {
            console.error('Error uploading to Supabase Storage:', uploadError);
            return res.status(500).json({ error: 'Failed to upload file to storage' });
        }
        const { data: { publicUrl } } = database_1.supabase.storage
            .from('project-files')
            .getPublicUrl(storagePath);
        const { data: fileRecord, error: fileError } = await database_1.supabase
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
            await database_1.supabase.storage.from('project-files').remove([storagePath]);
            return res.status(500).json({ error: 'Failed to save file record' });
        }
        console.log('File uploaded successfully to Supabase Storage');
        res.status(201).json({
            message: 'File uploaded successfully',
            file: fileRecord
        });
    }
    catch (error) {
        console.error('Error in file upload route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:projectId/files', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        const { projectId } = req.params;
        const { sortBy = 'created_at', sortOrder = 'desc' } = req.query;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        try {
            let query = database_1.supabase
                .from('project_files')
                .select('*')
                .eq('project_id', projectId);
            const { data: files, error: filesError } = await query;
            if (filesError) {
                console.error('Error fetching files:', filesError);
                if (filesError.code === '42P01' || ((_a = filesError.message) === null || _a === void 0 ? void 0 : _a.includes('does not exist'))) {
                    return res.json({ files: [] });
                }
                return res.status(500).json({ error: 'Failed to fetch files' });
            }
            if (!files || files.length === 0) {
                return res.json({ files: [] });
            }
            query = database_1.supabase
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
            const validSortFields = ['filename', 'file_size', 'mime_type'];
            let sortField = validSortFields.includes(sortBy) ? sortBy : 'filename';
            const order = sortOrder === 'asc' ? 'asc' : 'desc';
            query = query.order(sortField, { ascending: order === 'asc' });
            const { data: filesWithUsers, error: joinError } = await query;
            if (joinError) {
                console.error('Error fetching files with user info:', joinError);
                res.json({ files });
            }
            else {
                res.json({ files: filesWithUsers });
            }
        }
        catch (error) {
            console.error('Error in files query:', error);
            res.json({ files: [] });
        }
    }
    catch (error) {
        console.error('Error in get files route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:projectId/files/:fileId/download', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId, fileId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: fileRecord, error: fileError } = await database_1.supabase
            .from('project_files')
            .select('*, projects!project_files_project_id_fkey(group_id)')
            .eq('id', fileId)
            .eq('project_id', projectId)
            .single();
        if (fileError || !fileRecord) {
            return res.status(404).json({ error: 'File not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', fileRecord.projects.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({
            downloadUrl: fileRecord.public_url,
            filename: fileRecord.filename,
            mimeType: fileRecord.mime_type
        });
    }
    catch (error) {
        console.error('Error in file download route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:projectId/files/:fileId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId, fileId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: fileRecord, error: fileError } = await database_1.supabase
            .from('project_files')
            .select('*, projects!project_files_project_id_fkey(group_id)')
            .eq('id', fileId)
            .eq('project_id', projectId)
            .single();
        if (fileError || !fileRecord) {
            return res.status(404).json({ error: 'File not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', fileRecord.projects.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (fileRecord.storage_path) {
            const { error: storageError } = await database_1.supabase.storage
                .from('project-files')
                .remove([fileRecord.storage_path]);
            if (storageError) {
                console.error('Error deleting file from storage:', storageError);
            }
        }
        const { error: deleteError } = await database_1.supabase
            .from('project_files')
            .delete()
            .eq('id', fileId);
        if (deleteError) {
            console.error('Error deleting file record:', deleteError);
            return res.status(500).json({ error: 'Failed to delete file record' });
        }
        res.json({ message: 'File deleted successfully' });
    }
    catch (error) {
        console.error('Error in file delete route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:projectId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: project, error: projectError } = await database_1.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const { data: membership, error: membershipError } = await database_1.supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', project.group_id)
            .eq('user_id', req.user.id)
            .single();
        if (membershipError || !membership) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await database_1.supabase
            .from('checklist_items')
            .delete()
            .eq('project_id', projectId);
        await database_1.supabase
            .from('project_assignments')
            .delete()
            .eq('project_id', projectId);
        await database_1.supabase
            .from('project_files')
            .delete()
            .eq('project_id', projectId);
        const { error: deleteError } = await database_1.supabase
            .from('projects')
            .delete()
            .eq('id', projectId);
        if (deleteError) {
            console.error('Error deleting project:', deleteError);
            return res.status(500).json({ error: 'Failed to delete project' });
        }
        res.json({ message: 'Project deleted successfully' });
    }
    catch (error) {
        console.error('Error in delete project route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=projects.js.map