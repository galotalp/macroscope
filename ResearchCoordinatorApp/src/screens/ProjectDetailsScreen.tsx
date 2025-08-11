import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Appbar, Card, Title, Button, Text, FAB, Snackbar, ActivityIndicator, List, Checkbox, IconButton, Chip, Dialog, Portal, Menu, Divider, SegmentedButtons, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import UserAvatar from '../components/UserAvatar';
import supabaseService from '../services/supabaseService';
import { transformErrorMessage } from '../utils/errorMessages';
import { colors, spacing, typography, shadows, borderRadius, componentStyles } from '../theme';

interface ProjectDetailsScreenProps {
  projectId: string;
  onNavigateBack: () => void;
  onProjectDeleted?: () => void;
}

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  created_at: string;
}

interface ProjectMember {
  users: {
    id: string;
    username: string;
    email: string;
    profile_picture?: string;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  priority?: string;
  notes?: string;
  status?: string;
  group_id: string;
}

interface ProjectFile {
  id: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at?: string;
  users?: {
    id: string;
    username: string;
    email: string;
  };
}

const ProjectDetailsScreen: React.FC<ProjectDetailsScreenProps> = ({ projectId, onNavigateBack, onProjectDeleted }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');
  const [editMode, setEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [showAddChecklistDialog, setShowAddChecklistDialog] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistDescription, setNewChecklistDescription] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sortBy, setSortBy] = useState('uploaded_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  useEffect(() => {
    loadProjectDetails();
  }, [projectId]);

  const loadProjectDetails = async () => {
    try {
      const response = await supabaseService.getProjectDetails(projectId);
      console.log('Project details loaded successfully');
      
      if (!response || !response.project) {
        throw new Error('Invalid project data received');
      }
      
      setProject(response.project);
      setChecklist(response.checklist || []);
      setMembers(response.members || []);
      setFiles(response.files || []);
      setEditedProject(response.project);
      
      // Also load files separately with current sorting
      loadProjectFiles();
    } catch (error) {
      console.error('Error loading project details:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const loadProjectFiles = async () => {
    try {
      const response = await supabaseService.getProjectFiles(projectId, sortBy, sortOrder);
      setFiles(response.files || []);
    } catch (error) {
      console.error('Error loading project files:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadProjectDetails();
  }, [projectId]);

  const handleSaveProject = async () => {
    try {
      await supabaseService.updateProject(projectId, {
        name: editedProject.name,
        description: editedProject.description,
        priority: editedProject.priority,
        notes: editedProject.notes,
      });
      setProject(editedProject as Project);
      setEditMode(false);
      showSnackbar('Project updated successfully');
    } catch (error) {
      console.error('Error updating project:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    }
  };

  const handleToggleChecklistItem = async (itemId: string, currentCompleted: boolean) => {
    try {
      await supabaseService.updateChecklistItem(projectId, itemId, {
        completed: !currentCompleted,
      });
      setChecklist(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, completed: !currentCompleted } : item
        )
      );
    } catch (error) {
      console.error('Error updating checklist item:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistTitle.trim()) return;

    try {
      await supabaseService.addChecklistItem(projectId, newChecklistTitle, newChecklistDescription);
      setNewChecklistTitle('');
      setNewChecklistDescription('');
      setShowAddChecklistDialog(false);
      loadProjectDetails();
      showSnackbar('Checklist item added successfully');
    } catch (error) {
      console.error('Error adding checklist item:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      await supabaseService.deleteChecklistItem(projectId, itemId);
      setChecklist(prev => prev.filter(item => item.id !== itemId));
      showSnackbar('Checklist item deleted successfully');
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await supabaseService.deleteProject(projectId);
      showSnackbar('Project deleted successfully');
      setShowDeleteDialog(false);
      
      // Wait a moment for the snackbar to show, then navigate back
      setTimeout(() => {
        if (onProjectDeleted) {
          onProjectDeleted();
        }
        onNavigateBack();
      }, 1500);
    } catch (error) {
      console.error('Error deleting project:', error);
      showSnackbar(transformErrorMessage(error), 'red');
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      console.log('DocumentPicker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('Selected file:', file);
        
        setUploading(true);

        // Create a File object for the upload with proper structure
        const fileToUpload = {
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
          type: file.mimeType || 'application/octet-stream',
          size: file.size
        };

        console.log('File to upload:', fileToUpload);

        await supabaseService.uploadProjectFile(projectId, fileToUpload);
        showSnackbar('File uploaded successfully');
        loadProjectFiles(); // Refresh the file list
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDownload = async (fileId: string, filename: string) => {
    try {
      setLoading(true);
      showSnackbar('Downloading file...', 'orange');
      
      const result = await supabaseService.downloadProjectFile(projectId, fileId);
      const downloadUrl = result.downloadUrl;
      
      if (!downloadUrl) {
        throw new Error('No download URL received');
      }

      // Download to local storage first
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileUri = FileSystem.documentDirectory + sanitizedFilename;
      
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
      
      // Check file exists
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      
      if (!fileInfo.exists) {
        throw new Error('Downloaded file not found');
      }
      
      if (fileInfo.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      showSnackbar('File ready! Choose where to save...', 'green');
      
      // Use Expo Sharing to present native iOS share sheet
      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: result.mimeType,
            dialogTitle: `Save ${filename}`,
            UTI: result.mimeType
          });
          showSnackbar('File shared successfully!', 'green');
        } catch (shareError) {
          console.error('Share error:', shareError);
          showSnackbar('File saved to app storage', 'orange');
          console.log('File saved at:', downloadResult.uri);
        }
      } else {
        showSnackbar('File downloaded successfully!', 'green');
        console.log('File saved at:', downloadResult.uri);
      }
      
    } catch (error) {
      console.error('Error downloading file:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDelete = async (fileId: string, filename: string) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${filename}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.deleteProjectFile(projectId, fileId);
              showSnackbar('File deleted successfully');
              loadProjectFiles(); // Refresh the file list
            } catch (error) {
              console.error('Error deleting file:', error);
              showSnackbar(transformErrorMessage(error), 'red');
            }
          },
        },
      ]
    );
  };

  const loadAvailableMembers = async () => {
    if (!project) return;
    
    try {
      const response = await supabaseService.getProjectMembers(project.group_id);
      const currentMemberIds = members.map(m => m.users?.id || m.id);
      const available = response.members.filter((member: any) => 
        !currentMemberIds.includes(member.id)
      );
      setAvailableMembers(available);
    } catch (error) {
      console.error('Error loading available members:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    }
  };

  const handleAddMember = async () => {
    if (!selectedMemberId) return;

    try {
      await supabaseService.assignUserToProject(projectId, selectedMemberId);
      setShowAddMemberDialog(false);
      setSelectedMemberId('');
      showSnackbar('Member added successfully');
      loadProjectDetails(); // Refresh to get updated member list
    } catch (error) {
      console.error('Error adding member:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    }
  };

  const handleRemoveMember = async (userId: string, username: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove "${username}" from this project?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.removeUserFromProject(projectId, userId);
              showSnackbar('Member removed successfully');
              loadProjectDetails(); // Refresh to get updated member list
            } catch (error) {
              console.error('Error removing member:', error);
              showSnackbar(transformErrorMessage(error), 'red');
            }
          },
        },
      ]
    );
  };

  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to desc for date, asc for name/type
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'uploaded_at' ? 'desc' : 'asc');
    }
  };

  useEffect(() => {
    if (project) {
      loadProjectFiles();
    }
  }, [sortBy, sortOrder]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return colors.priorityHigh;
      case 'medium': return colors.priorityMedium;
      case 'low': return colors.priorityLow;
      case 'completed': return colors.priorityCompleted;
      default: return colors.priorityNone;
    }
  };

  const getPriorityLabel = (priority?: string) => {
    return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'No Priority';
  };

  const getCompletedTasksCount = () => {
    return checklist.filter(item => item.completed).length;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'file-image';
    if (mimeType.startsWith('video/')) return 'file-video';
    if (mimeType.includes('pdf')) return 'file-pdf-box';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-powerpoint';
    if (mimeType.includes('text')) return 'file-document';
    return 'file';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onNavigateBack} />
          <Appbar.Content title="Project Details" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading project details...</Text>
        </View>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onNavigateBack} />
          <Appbar.Content title="Project Details" />
        </Appbar.Header>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Project not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.appBarGradient}
      >
        <Appbar.Header style={styles.appBar}>
          <Appbar.BackAction onPress={onNavigateBack} iconColor={colors.textInverse} />
          <Appbar.Content title={project.name} titleStyle={styles.appBarTitle} />
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Appbar.Action 
                icon="dots-vertical" 
                onPress={() => setMenuVisible(true)} 
                iconColor={colors.textInverse}
              />
            }
          >
            <Menu.Item onPress={() => { setEditMode(true); setMenuVisible(false); }} title="Edit Project" />
            <Divider />
            <Menu.Item 
              onPress={() => { setShowDeleteDialog(true); setMenuVisible(false); }} 
              title="Delete Project" 
              titleStyle={{ color: colors.error }}
              leadingIcon="delete"
            />
          </Menu>
        </Appbar.Header>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.projectCard}>
          <Card.Content>
            {editMode ? (
              <>
                <TextInput
                  style={styles.input}
                  value={editedProject.name}
                  onChangeText={(text) => setEditedProject({ ...editedProject, name: text })}
                  placeholder="Project Name"
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProject.description}
                  onChangeText={(text) => setEditedProject({ ...editedProject, description: text })}
                  placeholder="Description"
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.prioritySelector}>
                  <Text style={styles.label}>Priority:</Text>
                  <View style={styles.priorityButtons}>
                    {['high', 'medium', 'low', 'completed'].map((priority) => (
                      <TouchableOpacity
                        key={priority}
                        onPress={() => setEditedProject({ ...editedProject, priority })}
                        style={[
                          styles.priorityButton,
                          editedProject.priority === priority && styles.selectedPriorityButton,
                          { backgroundColor: editedProject.priority === priority ? getPriorityColor(priority) : '#E0E0E0' }
                        ]}
                      >
                        <Text style={[
                          styles.priorityButtonText,
                          editedProject.priority === priority && styles.selectedPriorityButtonText
                        ]}>
                          {getPriorityLabel(priority)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProject.notes}
                  onChangeText={(text) => setEditedProject({ ...editedProject, notes: text })}
                  placeholder="Notes"
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.editButtons}>
                  <Button mode="outlined" onPress={() => setEditMode(false)} style={styles.cancelButton}>
                    Cancel
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={handleSaveProject}
                    buttonColor={colors.primary}
                  >
                    Save
                  </Button>
                </View>
              </>
            ) : (
              <>
                <View style={styles.projectHeader}>
                  <Title style={styles.projectTitle}>{project.name || 'Untitled Project'}</Title>
                  {project.priority && (
                    <View style={[styles.priorityChip, { backgroundColor: getPriorityColor(project.priority) }]}>
                      <Text style={styles.priorityText}>
                        {getPriorityLabel(project.priority)}
                      </Text>
                    </View>
                  )}
                </View>
                {project.description && (
                  <Text style={styles.description}>{project.description}</Text>
                )}
                {project.notes && (
                  <Text style={styles.notes}>Notes: {project.notes}</Text>
                )}
                <Text style={styles.dateText}>
                  Created: {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
                <Text style={styles.statusText}>
                  Tasks Completed: {getCompletedTasksCount()} / {checklist.length}
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Checklist</Title>
              <IconButton
                icon="plus"
                size={24}
                onPress={() => setShowAddChecklistDialog(true)}
              />
            </View>
            {checklist.length === 0 ? (
              <Text style={styles.emptyText}>No checklist items</Text>
            ) : (
              checklist.map((item) => (
                <View key={item.id} style={styles.checklistItem}>
                  <TouchableOpacity
                    style={[styles.customCheckbox, item.completed && styles.customCheckboxChecked]}
                    onPress={() => handleToggleChecklistItem(item.id, item.completed)}
                  >
                    {item.completed && (
                      <IconButton
                        icon="check"
                        size={16}
                        iconColor={colors.textInverse}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                  <View style={styles.checklistContent}>
                    <Text style={[styles.checklistTitle, item.completed && styles.completedText]}>
                      {item.title}
                    </Text>
                    {item.description && (
                      <Text style={[styles.checklistDescription, item.completed && styles.completedText]}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteChecklistItem(item.id)}
                  />
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Files</Title>
              <Button
                mode="contained"
                onPress={handleFileUpload}
                loading={uploading}
                disabled={uploading}
                icon="upload"
                compact
              >
                Upload
              </Button>
            </View>

            {/* Sort Controls */}
            <View style={styles.sortControls}>
              <SegmentedButtons
                value={sortBy}
                onValueChange={handleSortChange}
                buttons={[
                  { value: 'uploaded_at', label: `Date ${sortBy === 'uploaded_at' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}` },
                  { value: 'filename', label: `Name ${sortBy === 'filename' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}` },
                  { value: 'mime_type', label: `Type ${sortBy === 'mime_type' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}` },
                ]}
                style={styles.segmentedButtons}
              />
            </View>

            {files.length === 0 ? (
              <Text style={styles.emptyText}>No files uploaded</Text>
            ) : (
              files.map((file) => (
                <View key={file.id} style={styles.fileItem}>
                  <List.Icon icon={getFileIcon(file.mime_type)} />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName}>{file.original_name}</Text>
                    <Text style={styles.fileDetails}>
                      {formatFileSize(file.file_size)} • Uploaded: {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : 'Unknown date'}
                    </Text>
                    <Text style={styles.fileUploader}>
                      Uploaded by {file.users?.username || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.fileActions}>
                    <IconButton
                      icon="download"
                      size={20}
                      onPress={() => handleFileDownload(file.id, file.original_name)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleFileDelete(file.id, file.original_name)}
                    />
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Team Members</Title>
              <IconButton
                icon="plus"
                size={24}
                onPress={() => {
                  loadAvailableMembers();
                  setShowAddMemberDialog(true);
                }}
              />
            </View>
            {members.length === 0 ? (
              <Text style={styles.emptyText}>No team members assigned</Text>
            ) : (
              members.map((member, index) => {
                const user = member.users || member;
                const getInitials = (name: string): string => {
                  return name
                    .split(' ')
                    .map((word) => word.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                };
                
                return (
                  <List.Item
                    key={user.id || index}
                    title={user.username || 'Unknown User'}
                    description={user.email || ''}
                    left={() => (
                      <View style={styles.memberAvatar}>
                        <UserAvatar
                          profilePictureUrl={user.profile_picture}
                          username={user.username}
                          size={40}
                        />
                      </View>
                    )}
                    right={() => (
                      <IconButton
                        icon="close"
                        size={20}
                        onPress={() => handleRemoveMember(user.id, user.username)}
                      />
                    )}
                  />
                );
              })
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog 
          visible={showAddChecklistDialog} 
          onDismiss={() => setShowAddChecklistDialog(false)}
          style={{ marginTop: -150 }}
        >
          <Dialog.Title>Add Checklist Item</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={styles.dialogInput}
              value={newChecklistTitle}
              onChangeText={setNewChecklistTitle}
              placeholder="Title"
              autoFocus
              mode="outlined"
            />
            <TextInput
              style={[styles.dialogInput, styles.textArea]}
              value={newChecklistDescription}
              onChangeText={setNewChecklistDescription}
              placeholder="Description (optional)"
              multiline
              numberOfLines={3}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddChecklistDialog(false)}>Cancel</Button>
            <Button onPress={handleAddChecklistItem} disabled={!newChecklistTitle.trim()}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Project</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this project? This action cannot be undone.</Text>
            <Text style={styles.warningText}>
              All checklist items, assignments, and files associated with this project will be permanently deleted.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button 
              onPress={handleDeleteProject} 
              textColor="#F44336"
              loading={deleting}
              disabled={deleting}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showAddMemberDialog} onDismiss={() => setShowAddMemberDialog(false)}>
          <Dialog.Title>Add Team Member</Dialog.Title>
          <Dialog.Content>
            {availableMembers.length === 0 ? (
              <Text>No additional members available to add.</Text>
            ) : (
              <>
                <Text style={styles.dialogLabel}>Select a member to add:</Text>
                <ScrollView style={styles.membersList}>
                  {availableMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.memberOption,
                        selectedMemberId === member.id && styles.selectedMemberOption
                      ]}
                      onPress={() => setSelectedMemberId(member.id)}
                    >
                      <UserAvatar
                        profilePictureUrl={member.profile_picture}
                        username={member.username}
                        size={32}
                      />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.username}</Text>
                        <Text style={styles.memberEmail}>{member.email}</Text>
                      </View>
                      {selectedMemberId === member.id && (
                        <IconButton icon="check" size={20} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowAddMemberDialog(false);
              setSelectedMemberId('');
            }}>
              Cancel
            </Button>
            <Button 
              onPress={handleAddMember} 
              disabled={!selectedMemberId || availableMembers.length === 0}
            >
              Add Member
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: snackbarColor }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBarGradient: {
    elevation: 4,
  },
  appBar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  appBarTitle: {
    color: colors.textInverse,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  projectCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
    backgroundColor: colors.surface,
  },
  sectionCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
    backgroundColor: colors.surface,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  projectTitle: {
    flex: 1,
    marginRight: spacing.sm,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  priorityChip: {
    height: 32,
    minWidth: 85,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: 0,
    paddingVertical: 0,
    flexDirection: 'row',
  },
  priorityText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 14,
    width: '100%',
  },
  description: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.normal * typography.fontSize.md,
  },
  notes: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.text,
    fontStyle: 'italic',
    fontSize: typography.fontSize.sm,
  },
  dateText: {
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  checklistContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  checklistTitle: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
  checklistDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  customCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  customCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkIcon: {
    margin: 0,
    width: 16,
    height: 16,
  },
  input: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: typography.fontSize.md,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  prioritySelector: {
    marginBottom: spacing.md,
  },
  priorityButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  priorityButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    ...shadows.small,
  },
  selectedPriorityButton: {
    ...shadows.medium,
  },
  priorityButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  selectedPriorityButtonText: {
    color: colors.textInverse,
    fontWeight: typography.fontWeight.bold,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    marginRight: spacing.sm,
    borderColor: colors.border,
  },
  dialogInput: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  warningText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontStyle: 'italic',
  },
  sortControls: {
    marginBottom: spacing.md,
  },
  segmentedButtons: {
    marginBottom: spacing.sm,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  fileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  fileName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  fileDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  fileUploader: {
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogLabel: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  membersList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  selectedMemberOption: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default ProjectDetailsScreen;