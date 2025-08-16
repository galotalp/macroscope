import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { 
  Appbar, 
  Card, 
  Title, 
  Button, 
  Text, 
  Snackbar, 
  ActivityIndicator, 
  List,
  Divider,
  Chip,
  IconButton,
  Dialog,
  Portal,
  Paragraph,
  Avatar,
  TextInput
} from 'react-native-paper';
import UserAvatar from '../components/UserAvatar';
import supabaseService from '../services/supabaseService';

interface ResearchGroupSettingsScreenProps {
  groupId: string;
  onNavigateBack: () => void;
  onGroupDeleted: () => void;
}

interface GroupMember {
  id: string;
  role: string;
  joined_at: string;
  users: {
    id: string;
    username: string;
    email: string;
    profile_picture?: string;
  };
}

interface JoinRequest {
  id: string;
  status: string;
  requested_at: string;
  users: {
    id: string;
    username: string;
    email: string;
    profile_picture?: string;
  };
}

interface GroupDetails {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  created_at: string;
  created_by: string;
}

interface DefaultChecklistItem {
  id: string;
  title: string;
  description?: string;
  display_order: number;
  created_at: string;
}

const ResearchGroupSettingsScreen: React.FC<ResearchGroupSettingsScreenProps> = ({ 
  groupId, 
  onNavigateBack, 
  onGroupDeleted 
}) => {
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');

  // Default checklist items state
  const [defaultChecklistItems, setDefaultChecklistItems] = useState<DefaultChecklistItem[]>([]);
  const [checklistDialogVisible, setChecklistDialogVisible] = useState(false);
  const [editingChecklistItem, setEditingChecklistItem] = useState<DefaultChecklistItem | null>(null);
  const [checklistItemTitle, setChecklistItemTitle] = useState('');
  const [checklistItemDescription, setChecklistItemDescription] = useState('');
  const [checklistItemLoading, setChecklistItemLoading] = useState(false);

  // Ownership transfer state
  const [transferDialogVisible, setTransferDialogVisible] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [isGroupCreator, setIsGroupCreator] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadGroupDetails();
  }, [groupId]);

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await supabaseService.getGroupDetails(groupId);
      setGroupDetails(response.group);
      setMembers(response.members || []);
      setJoinRequests(response.joinRequests || []);
      setIsAdmin(response.isAdmin || false);

      // Check if current user is the group creator
      const currentUser = await supabaseService.getCurrentUser();
      if (currentUser && response.group) {
        setCurrentUserId(currentUser.id);
        setIsGroupCreator(response.group.created_by === currentUser.id);
      }

      // Load default checklist items
      await loadDefaultChecklistItems();
    } catch (error) {
      console.error('Error loading group details:', error);
      showSnackbar('Failed to load group details', 'red');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultChecklistItems = async () => {
    try {
      const response = await supabaseService.getGroupDefaultChecklistItems(groupId);
      setDefaultChecklistItems(response.defaultItems || []);
    } catch (error) {
      console.error('Error loading default checklist items:', error);
      // Don't show error for this - it's not critical
    }
  };

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const handleJoinRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(requestId);
    try {
      await supabaseService.respondToJoinRequest(groupId, requestId, action);
      showSnackbar(`Join request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      loadGroupDetails(); // Refresh the data
    } catch (error) {
      console.error('Error responding to join request:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to process request', 'red');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = (userId: string, username: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${username} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeMember(userId)
        }
      ]
    );
  };

  const removeMember = async (userId: string) => {
    setActionLoading(userId);
    try {
      await supabaseService.removeMemberFromGroup(groupId, userId);
      showSnackbar('Member removed successfully');
      loadGroupDetails(); // Refresh the data
    } catch (error) {
      console.error('Error removing member:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to remove member', 'red');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditGroup = () => {
    if (groupDetails) {
      setEditGroupName(groupDetails.name);
      setEditGroupDescription(groupDetails.description || '');
      setEditDialogVisible(true);
    }
  };

  const handleSaveGroupChanges = async () => {
    if (!editGroupName.trim()) {
      showSnackbar('Group name cannot be empty', 'red');
      return;
    }

    setEditLoading(true);
    try {
      await supabaseService.updateResearchGroup(groupId, {
        name: editGroupName.trim(),
        description: editGroupDescription.trim()
      });
      
      showSnackbar('Group updated successfully');
      setEditDialogVisible(false);
      loadGroupDetails(); // Refresh data
    } catch (error) {
      console.error('Error updating group:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to update group', 'red');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteGroup = () => {
    setDeleteDialogVisible(true);
  };

  const confirmDeleteGroup = async () => {
    try {
      await supabaseService.deleteResearchGroup(groupId);
      showSnackbar('Group deleted successfully');
      setDeleteDialogVisible(false);
      setTimeout(() => {
        onGroupDeleted();
      }, 1000);
    } catch (error) {
      console.error('Error deleting group:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to delete group', 'red');
    }
  };

  // Ownership transfer handlers
  const handleTransferOwnership = () => {
    setSelectedNewAdmin(null);
    setTransferDialogVisible(true);
  };

  const confirmTransferOwnership = async () => {
    if (!selectedNewAdmin) {
      showSnackbar('Please select a new admin', 'red');
      return;
    }

    try {
      setTransferLoading(true);
      await supabaseService.transferGroupOwnership(groupId, selectedNewAdmin);
      showSnackbar('Group ownership transferred successfully');
      setTransferDialogVisible(false);
      await loadGroupDetails(); // Refresh data
    } catch (error) {
      console.error('Error transferring ownership:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to transfer ownership', 'red');
    } finally {
      setTransferLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Default checklist item handlers
  const handleAddChecklistItem = () => {
    setEditingChecklistItem(null);
    setChecklistItemTitle('');
    setChecklistItemDescription('');
    setChecklistDialogVisible(true);
  };

  const handleEditChecklistItem = (item: DefaultChecklistItem) => {
    setEditingChecklistItem(item);
    setChecklistItemTitle(item.title);
    setChecklistItemDescription(item.description || '');
    setChecklistDialogVisible(true);
  };

  const handleSaveChecklistItem = async () => {
    if (!checklistItemTitle.trim()) {
      showSnackbar('Please enter a title', 'red');
      return;
    }

    try {
      setChecklistItemLoading(true);
      if (editingChecklistItem) {
        // Update existing item
        await supabaseService.updateGroupDefaultChecklistItem(editingChecklistItem.id, {
          title: checklistItemTitle.trim(),
          description: checklistItemDescription.trim() || undefined
        });
        showSnackbar('Checklist item updated successfully');
      } else {
        // Create new item
        await supabaseService.addGroupDefaultChecklistItem(
          groupId,
          checklistItemTitle.trim(),
          checklistItemDescription.trim() || undefined
        );
        showSnackbar('Checklist item added successfully');
      }
      
      setChecklistDialogVisible(false);
      await loadDefaultChecklistItems();
    } catch (error) {
      console.error('Error saving checklist item:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to save checklist item', 'red');
    } finally {
      setChecklistItemLoading(false);
    }
  };

  const handleDeleteChecklistItem = (item: DefaultChecklistItem) => {
    Alert.alert(
      'Delete Checklist Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.deleteGroupDefaultChecklistItem(item.id);
              showSnackbar('Checklist item deleted successfully');
              await loadDefaultChecklistItems();
            } catch (error) {
              console.error('Error deleting checklist item:', error);
              showSnackbar(error instanceof Error ? error.message : 'Failed to delete checklist item', 'red');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onNavigateBack} />
          <Appbar.Content title="Group Settings" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading group details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onNavigateBack} />
        <Appbar.Content title="Group Settings" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Group Info */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.groupHeader}>
              <Title style={styles.groupTitle}>{groupDetails?.name}</Title>
              {isAdmin && (
                <IconButton
                  icon="pencil"
                  onPress={handleEditGroup}
                  style={styles.editButton}
                />
              )}
            </View>
            {groupDetails?.description && (
              <Text style={styles.description}>{groupDetails.description}</Text>
            )}
            <View style={styles.chipContainer}>
              <Chip icon="key" style={styles.inviteChip}>
                Invite Code: {groupDetails?.invite_code}
              </Chip>
            </View>
            <Text style={styles.infoText}>
              Created: {groupDetails?.created_at && formatDate(groupDetails.created_at)}
            </Text>
          </Card.Content>
        </Card>

        {/* Join Requests - Admin Only */}
        {isAdmin && joinRequests.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Pending Join Requests ({joinRequests.length})</Title>
              {joinRequests.map((request) => {
                const getInitials = (name: string): string => {
                  return name
                    .split(' ')
                    .map((word) => word.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                };
                
                return (
                  <View key={request.id} style={styles.requestItem}>
                    <View style={styles.memberAvatar}>
                      <UserAvatar
                        profilePictureUrl={request.users?.profile_picture}
                        username={request.users?.username || 'Unknown'}
                        size={40}
                      />
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.users?.username || 'Unknown User'}</Text>
                      <Text style={styles.requestEmail}>{request.users?.email || 'No email'}</Text>
                      <Text style={styles.requestDate}>
                        Requested: {formatDate(request.requested_at)}
                      </Text>
                    </View>
                  <View style={styles.requestActions}>
                    <Button
                      mode="contained"
                      onPress={() => handleJoinRequestAction(request.id, 'approve')}
                      style={styles.approveButton}
                      disabled={actionLoading === request.id}
                      compact
                    >
                      {actionLoading === request.id ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        'Approve'
                      )}
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => handleJoinRequestAction(request.id, 'reject')}
                      style={styles.rejectButton}
                      disabled={actionLoading === request.id}
                      compact
                    >
                      Reject
                    </Button>
                  </View>
                  </View>
                );
              })}
            </Card.Content>
          </Card>
        )}

        {/* Members */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Members ({members.length})</Title>
            {members.map((member) => {
              const getInitials = (name: string): string => {
                return name
                  .split(' ')
                  .map((word) => word.charAt(0))
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
              };
              
              return (
                <View key={member.id} style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <UserAvatar
                      profilePictureUrl={member.users?.profile_picture}
                      username={member.users?.username || 'Unknown'}
                      size={40}
                    />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.users?.username || 'Unknown User'}</Text>
                    <Text style={styles.memberEmail}>{member.users?.email || 'No email'}</Text>
                    <View style={styles.memberDetails}>
                    <Chip 
                      style={member.role === 'admin' ? styles.adminChip : styles.memberChip}
                    >
                      {member.role}
                    </Chip>
                    <Text style={styles.joinDate}>
                      Joined: {formatDate(member.joined_at)}
                    </Text>
                  </View>
                </View>
                {isAdmin && member.role !== 'admin' && (
                  <IconButton
                    icon="account-remove"
                    onPress={() => handleRemoveMember(member.users.id, member.users.username)}
                    disabled={actionLoading === member.users.id}
                    style={styles.removeButton}
                  />
                )}
                </View>
              );
            })}
          </Card.Content>
        </Card>

        {/* Default Checklist Items - Admin Only */}
        {isAdmin && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Title style={styles.sectionTitle}>Default Checklist Items</Title>
                {isAdmin && (
                  <IconButton
                    icon="plus"
                    onPress={handleAddChecklistItem}
                    style={styles.addButton}
                  />
                )}
              </View>
              <Text style={styles.sectionDescription}>
                These checklist items will be automatically added to all new projects in this group.
              </Text>
              
              {defaultChecklistItems.length === 0 ? (
                <Text style={styles.emptyText}>No default checklist items yet. Add one to get started!</Text>
              ) : (
                defaultChecklistItems.map((item) => (
                  <View key={item.id} style={styles.checklistItem}>
                    <View style={styles.checklistItemContent}>
                      <Text style={styles.checklistItemTitle}>{item.title}</Text>
                      {item.description && (
                        <Text style={styles.checklistItemDescription}>{item.description}</Text>
                      )}
                    </View>
                    <View style={styles.checklistItemActions}>
                      {isAdmin && (
                        <>
                          <IconButton
                            icon="pencil"
                            size={20}
                            onPress={() => handleEditChecklistItem(item)}
                            style={styles.editChecklistButton}
                          />
                          <IconButton
                            icon="delete"
                            size={20}
                            onPress={() => handleDeleteChecklistItem(item)}
                            style={styles.deleteChecklistButton}
                          />
                        </>
                      )}
                    </View>
                  </View>
                ))
              )}
            </Card.Content>
          </Card>
        )}

        {/* Transfer Ownership - Group Creator Only */}
        {isGroupCreator && members.length > 1 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.transferTitle}>Transfer Ownership</Title>
              <Text style={styles.transferDescription}>
                Transfer ownership of this group to another member. The new owner will gain full admin privileges and you will become a regular member.
              </Text>
              <Button
                mode="outlined"
                onPress={handleTransferOwnership}
                style={styles.transferButton}
                icon="account-switch"
                disabled={transferLoading}
              >
                Transfer Ownership
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Delete Group - Admin Only */}
        {isAdmin && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.dangerTitle}>Danger Zone</Title>
              <Text style={styles.dangerDescription}>
                Deleting this group will permanently remove all group data, including projects and member information.
              </Text>
              <Button
                mode="contained"
                onPress={handleDeleteGroup}
                style={styles.deleteButton}
                icon="delete"
              >
                Delete Group
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Edit Group Dialog */}
      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Edit Group</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Group Name"
              value={editGroupName}
              onChangeText={setEditGroupName}
              style={styles.dialogInput}
              disabled={editLoading}
            />
            <TextInput
              label="Description (Optional)"
              value={editGroupDescription}
              onChangeText={setEditGroupDescription}
              style={styles.dialogInput}
              multiline
              numberOfLines={3}
              disabled={editLoading}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)} disabled={editLoading}>
              Cancel
            </Button>
            <Button onPress={handleSaveGroupChanges} mode="contained" disabled={editLoading}>
              {editLoading ? <ActivityIndicator size="small" color="white" /> : 'Save'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Checklist Item Dialog */}
      <Portal>
        <Dialog visible={checklistDialogVisible} onDismiss={() => setChecklistDialogVisible(false)}>
          <Dialog.Title>{editingChecklistItem ? 'Edit Checklist Item' : 'Add Checklist Item'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Title"
              value={checklistItemTitle}
              onChangeText={setChecklistItemTitle}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Description (optional)"
              value={checklistItemDescription}
              onChangeText={setChecklistItemDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setChecklistDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveChecklistItem} mode="contained" disabled={checklistItemLoading}>
              {checklistItemLoading ? <ActivityIndicator size="small" color="white" /> : 'Save'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Transfer Ownership Dialog */}
      <Portal>
        <Dialog visible={transferDialogVisible} onDismiss={() => setTransferDialogVisible(false)}>
          <Dialog.Title>Transfer Group Ownership</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogDescription}>
              Select a new owner for "{groupDetails?.name}". You will become a regular member and lose admin privileges.
            </Text>
            <Text style={styles.dialogSubtext}>
              Choose from current group members:
            </Text>
            {members
              .filter(member => member.users.id !== currentUserId)
              .map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberSelector,
                    selectedNewAdmin === member.users.id && styles.memberSelectorSelected
                  ]}
                  onPress={() => setSelectedNewAdmin(member.users.id)}
                >
                  <UserAvatar
                    profilePictureUrl={member.users?.profile_picture}
                    username={member.users?.username || 'Unknown'}
                    size={40}
                  />
                  <View style={styles.memberSelectorInfo}>
                    <Text style={styles.memberSelectorName}>{member.users?.username}</Text>
                    <Text style={styles.memberSelectorEmail}>{member.users?.email}</Text>
                  </View>
                  {selectedNewAdmin === member.users.id && (
                    <IconButton icon="check" size={20} iconColor={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            }
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTransferDialogVisible(false)} disabled={transferLoading}>
              Cancel
            </Button>
            <Button 
              onPress={confirmTransferOwnership} 
              mode="contained" 
              disabled={transferLoading || !selectedNewAdmin}
            >
              {transferLoading ? <ActivityIndicator size="small" color="white" /> : 'Transfer Ownership'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Group</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to delete "{groupDetails?.name}"? This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDeleteGroup} mode="contained" buttonColor="#d32f2f">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupTitle: {
    flex: 1,
  },
  editButton: {
    margin: 0,
  },
  description: {
    marginTop: 8,
    color: '#666',
  },
  dialogInput: {
    marginBottom: 16,
  },
  chipContainer: {
    marginVertical: 8,
  },
  inviteChip: {
    backgroundColor: '#e3f2fd',
  },
  infoText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '500',
  },
  requestEmail: {
    fontSize: 14,
    color: '#666',
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    borderColor: '#f44336',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
  },
  memberDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  adminChip: {
    backgroundColor: '#ff9800',
    marginRight: 8,
  },
  memberChip: {
    backgroundColor: '#2196f3',
    marginRight: 8,
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    backgroundColor: '#ffebee',
  },
  dangerTitle: {
    color: '#d32f2f',
  },
  dangerDescription: {
    color: '#666',
    marginVertical: 8,
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    marginTop: 8,
  },
  memberAvatar: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionDescription: {
    color: '#666',
    marginBottom: 16,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#e3f2fd',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  checklistItemContent: {
    flex: 1,
  },
  checklistItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  checklistItemDescription: {
    fontSize: 14,
    color: '#666',
  },
  checklistItemActions: {
    flexDirection: 'row',
  },
  editChecklistButton: {
    backgroundColor: '#e8f5e8',
    marginRight: 4,
  },
  deleteChecklistButton: {
    backgroundColor: '#ffebee',
  },
  dialogInput: {
    marginBottom: 12,
  },
  // Transfer ownership styles
  transferTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  transferDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  transferButton: {
    marginTop: 8,
    borderColor: '#1976d2',
  },
  // Dialog styles
  dialogDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
    lineHeight: 20,
  },
  dialogSubtext: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
  },
  // Member selector styles
  memberSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  memberSelectorSelected: {
    borderColor: '#1976d2',
    backgroundColor: '#e3f2fd',
  },
  memberSelectorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberSelectorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberSelectorEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default ResearchGroupSettingsScreen;
