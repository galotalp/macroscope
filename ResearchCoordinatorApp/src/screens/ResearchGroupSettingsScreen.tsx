import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
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
import apiService from '../services/api';

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

  useEffect(() => {
    loadGroupDetails();
  }, [groupId]);

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getGroupDetails(groupId);
      setGroupDetails(response.group);
      setMembers(response.members || []);
      setJoinRequests(response.joinRequests || []);
      setIsAdmin(response.isAdmin || false);
    } catch (error) {
      console.error('Error loading group details:', error);
      showSnackbar('Failed to load group details', 'red');
    } finally {
      setLoading(false);
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
      await apiService.respondToJoinRequest(groupId, requestId, action);
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
      await apiService.removeMemberFromGroup(groupId, userId);
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
      await apiService.updateResearchGroup(groupId, {
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
      await apiService.deleteResearchGroup(groupId);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
                        profilePictureUrl={request.users.profile_picture}
                        username={request.users.username}
                        size={40}
                      />
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.users.username}</Text>
                      <Text style={styles.requestEmail}>{request.users.email}</Text>
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
                      profilePictureUrl={member.users.profile_picture}
                      username={member.users.username}
                      size={40}
                    />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.users.username}</Text>
                    <Text style={styles.memberEmail}>{member.users.email}</Text>
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
});

export default ResearchGroupSettingsScreen;
