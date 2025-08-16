import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { 
  Appbar, 
  Card, 
  Title, 
  TextInput, 
  Button, 
  Snackbar, 
  ActivityIndicator,
  Text,
  Dialog,
  Portal,
  Checkbox,
} from 'react-native-paper';
import supabaseService from '../services/supabaseService';
import { transformErrorMessage } from '../utils/errorMessages';
import UserAvatar from '../components/UserAvatar';

interface SettingsScreenProps {
  onNavigateBack: () => void;
  onAccountDeleted?: () => void;
}

interface DeletionAnalysis {
  solo_groups: Array<{
    id: string;
    name: string;
    description: string;
    project_count: number;
  }>;
  admin_groups: Array<{
    id: string;
    name: string;
    description: string;
    member_count: number;
    potential_admins: Array<{
      id: string;
      username: string;
      email: string;
    }>;
    projects_to_transfer: number;
  }>;
  member_groups: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  projects_created: Array<{
    id: string;
    name: string;
    group_id: string;
    group_name: string;
    member_count: number;
  }>;
  can_delete_immediately: boolean;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigateBack, onAccountDeleted }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');

  // Account deletion state
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deletionAnalysis, setDeletionAnalysis] = useState<DeletionAnalysis | null>(null);
  const [analyzingDeletion, setAnalyzingDeletion] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [transferMappings, setTransferMappings] = useState<Array<{group_id: string, new_admin_id: string}>>([]);
  const [groupTransferChoices, setGroupTransferChoices] = useState<Array<{group_id: string, should_transfer: boolean}>>([]);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showSnackbar('Please fill in all fields', 'red');
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar('New passwords do not match', 'red');
      return;
    }

    if (newPassword.length < 6) {
      showSnackbar('Password must be at least 6 characters', 'red');
      return;
    }

    setLoading(true);
    
    try {
      await supabaseService.changePassword(currentPassword, newPassword);
      
      // Show success message
      showSnackbar('Password successfully changed!', 'green');
      
      // Clear form fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setLoading(false);
      
    } catch (error) {
      console.error('Error in handleChangePassword:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      showSnackbar(errorMessage, 'red');
      setLoading(false);
    }
  };

  // Account deletion handlers
  const handleDeleteAccount = async () => {
    setAnalyzingDeletion(true);
    try {
      const analysis = await supabaseService.analyzeAccountDeletion();
      setDeletionAnalysis(analysis);
      setDeleteDialogVisible(true);
      
      // Initialize transfer choices and mappings for admin groups
      if (analysis.admin_groups && analysis.admin_groups.length > 0) {
        const initialChoices = analysis.admin_groups.map(group => ({
          group_id: group.id,
          should_transfer: false // Default to delete unless user chooses to transfer
        }));
        setGroupTransferChoices(initialChoices);
        
        const initialMappings = analysis.admin_groups.map(group => ({
          group_id: group.id,
          new_admin_id: group.potential_admins[0]?.id || ''
        }));
        setTransferMappings(initialMappings);
      }
    } catch (error) {
      console.error('Error analyzing account deletion:', error);
      showSnackbar('Failed to analyze account deletion impact', 'red');
    } finally {
      setAnalyzingDeletion(false);
    }
  };

  const handleTransferMappingChange = (groupId: string, newAdminId: string) => {
    setTransferMappings(prev => 
      prev.map(mapping => 
        mapping.group_id === groupId 
          ? { ...mapping, new_admin_id: newAdminId }
          : mapping
      )
    );
  };

  const handleTransferChoiceChange = (groupId: string, shouldTransfer: boolean) => {
    setGroupTransferChoices(prev => 
      prev.map(choice => 
        choice.group_id === groupId 
          ? { ...choice, should_transfer: shouldTransfer }
          : choice
      )
    );
  };

  const confirmDeleteAccount = async () => {
    if (!confirmationChecked) return;
    
    setDeletingAccount(true);
    try {
      // Build final transfer mappings based on user choices
      const finalTransferMappings = groupTransferChoices
        .filter(choice => choice.should_transfer)
        .map(choice => {
          const mapping = transferMappings.find(m => m.group_id === choice.group_id);
          return mapping;
        })
        .filter(mapping => mapping && mapping.new_admin_id) // Only include complete mappings
        .filter(mapping => mapping !== undefined); // Remove any undefined values

      // Validate that groups chosen for transfer have admins selected
      const groupsToTransfer = groupTransferChoices.filter(choice => choice.should_transfer);
      const incompleteTransfers = groupsToTransfer.filter(choice => {
        const mapping = transferMappings.find(m => m.group_id === choice.group_id);
        return !mapping || !mapping.new_admin_id;
      });

      if (incompleteTransfers.length > 0) {
        showSnackbar('Please select new admins for all groups you chose to transfer', 'red');
        return;
      }

      await supabaseService.deleteUserAccount(finalTransferMappings.length > 0 ? finalTransferMappings : undefined);
      
      setDeleteDialogVisible(false);
      showSnackbar('Account deleted successfully', 'green');
      
      // Navigate to login/logout
      setTimeout(() => {
        if (onAccountDeleted) {
          onAccountDeleted();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error deleting account:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onNavigateBack} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Change Password</Title>
            
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              disabled={loading}
            />

            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              disabled={loading}
            />

            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              disabled={loading}
            />

            <Button
              mode="contained"
              onPress={handleChangePassword}
              style={styles.button}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="white" /> : 'Change Password'}
            </Button>
          </Card.Content>
        </Card>

        {/* Danger Zone - Account Deletion */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.dangerTitle}>Danger Zone</Title>
            <Text style={styles.dangerDescription}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </Text>
            <Button
              mode="contained"
              onPress={handleDeleteAccount}
              style={styles.deleteButton}
              icon="delete"
              disabled={analyzingDeletion}
            >
              {analyzingDeletion ? <ActivityIndicator size="small" color="white" /> : 'Delete Account'}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Account Deletion Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={styles.deleteDialog}>
          <Dialog.Title style={styles.deleteDialogTitle}>Delete Account</Dialog.Title>
          <Dialog.Content style={[styles.deleteDialogContent, { borderWidth: 0, borderTopWidth: 0, borderBottomWidth: 0 }]}>
            <ScrollView style={styles.dialogScrollView} showsVerticalScrollIndicator={true}>
              <Text style={styles.deleteWarning}>
                ⚠️ This action will permanently delete your account and cannot be undone.
              </Text>

              {deletionAnalysis && (
                <View style={styles.analysisContainer}>
                  {/* Solo Groups (will be deleted) */}
                  {deletionAnalysis.solo_groups && deletionAnalysis.solo_groups.length > 0 && (
                    <View style={styles.analysisSection}>
                      <Text style={styles.analysisSectionTitle}>
                        📂 Groups to be deleted ({deletionAnalysis.solo_groups.length})
                      </Text>
                      <Text style={styles.analysisSectionDescription}>
                        These groups will be permanently deleted along with all their projects:
                      </Text>
                      {deletionAnalysis.solo_groups.map(group => (
                        <View key={group.id} style={styles.analysisItem}>
                          <Text style={styles.analysisItemName}>• {group.name}</Text>
                          <Text style={styles.analysisItemDetail}>
                            {group.project_count} project{group.project_count !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Admin Groups (transfer or delete choice) */}
                  {deletionAnalysis.admin_groups && deletionAnalysis.admin_groups.length > 0 && (
                    <View style={styles.analysisSection}>
                      <Text style={styles.analysisSectionTitle}>
                        👑 Groups you admin ({deletionAnalysis.admin_groups.length})
                      </Text>
                      <Text style={styles.analysisSectionDescription}>
                        Choose whether to transfer ownership or delete these groups:
                      </Text>
                      {deletionAnalysis.admin_groups.map((group, index) => {
                        const transferChoice = groupTransferChoices.find(choice => choice.group_id === group.id);
                        const shouldTransfer = transferChoice?.should_transfer || false;
                        
                        return (
                          <View key={group.id} style={styles.transferGroup}>
                            <Text style={styles.transferGroupName}>📁 {group.name}</Text>
                            <Text style={styles.transferGroupDetails}>
                              {group.member_count} members, {group.projects_to_transfer} projects
                            </Text>
                            
                            {/* Transfer Choice Checkbox */}
                            <TouchableOpacity
                              style={styles.transferChoiceContainer}
                              onPress={() => handleTransferChoiceChange(group.id, !shouldTransfer)}
                            >
                              <View style={styles.checkboxWrapper}>
                                <Checkbox
                                  status={shouldTransfer ? 'checked' : 'unchecked'}
                                  onPress={() => handleTransferChoiceChange(group.id, !shouldTransfer)}
                                />
                              </View>
                              <Text style={styles.transferChoiceText}>
                                Transfer ownership to another member (otherwise this group will be deleted)
                              </Text>
                            </TouchableOpacity>

                            {/* Admin Selection (only show if transfer is chosen) */}
                            {shouldTransfer && (
                              <View style={styles.transferSelection}>
                                <Text style={styles.transferLabel}>New Admin:</Text>
                                <View style={styles.adminOptions}>
                                  {group.potential_admins.map(admin => (
                                    <TouchableOpacity
                                      key={admin.id}
                                      style={[
                                        styles.adminOption,
                                        transferMappings[index]?.new_admin_id === admin.id && styles.adminOptionSelected
                                      ]}
                                      onPress={() => handleTransferMappingChange(group.id, admin.id)}
                                    >
                                      <Text style={styles.adminOptionText}>{admin.username}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Member Groups (simple removal) */}
                  {deletionAnalysis.member_groups && deletionAnalysis.member_groups.length > 0 && (
                    <View style={styles.analysisSection}>
                      <Text style={styles.analysisSectionTitle}>
                        👥 Group memberships to be removed ({deletionAnalysis.member_groups.length})
                      </Text>
                      <Text style={styles.analysisSectionDescription}>
                        You will be removed from these groups:
                      </Text>
                      {deletionAnalysis.member_groups.map(group => (
                        <Text key={group.id} style={styles.analysisItemName}>• {group.name}</Text>
                      ))}
                    </View>
                  )}

                  {/* Confirmation */}
                  <View style={styles.confirmationSection}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => setConfirmationChecked(!confirmationChecked)}
                    >
                      <View style={styles.checkboxWrapper}>
                        <Checkbox
                          status={confirmationChecked ? 'checked' : 'unchecked'}
                          onPress={() => setConfirmationChecked(!confirmationChecked)}
                        />
                      </View>
                      <Text style={styles.confirmationText}>
                        I understand this action is permanent and cannot be undone
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions style={[styles.deleteDialogActions, { borderWidth: 0, borderTopWidth: 0, borderBottomWidth: 0 }]}>
            <Button onPress={() => setDeleteDialogVisible(false)} disabled={deletingAccount}>
              Cancel
            </Button>
            <Button 
              onPress={confirmDeleteAccount} 
              mode="contained" 
              buttonColor="#d32f2f"
              disabled={deletingAccount || !confirmationChecked}
            >
              {deletingAccount ? <ActivityIndicator size="small" color="white" /> : 'Delete Account'}
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
    backgroundColor: '#f0f4f0',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    elevation: 2,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  // Danger zone styles
  dangerTitle: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 18,
  },
  dangerDescription: {
    color: '#666',
    marginVertical: 8,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    marginTop: 8,
  },
  // Dialog styles
  deleteDialog: {
    maxHeight: '85%',
    marginVertical: 50,
    borderWidth: 0,
    borderColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  deleteDialogTitle: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  deleteDialogContent: {
    paddingBottom: 16,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  dialogScrollView: {
    maxHeight: 300,
    borderWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  deleteDialogActions: {
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    paddingTop: 8,
  },
  deleteWarning: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  // Analysis styles
  analysisContainer: {
    marginTop: 12,
  },
  analysisSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  analysisSectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  analysisItem: {
    marginBottom: 4,
  },
  analysisItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  analysisItemDetail: {
    fontSize: 12,
    color: '#666',
    marginLeft: 16,
  },
  // Transfer styles
  transferGroup: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  transferGroupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  transferGroupDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  transferSelection: {
    marginTop: 8,
  },
  transferLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  adminOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  adminOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  adminOptionSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  adminOptionText: {
    fontSize: 14,
    color: '#333',
  },
  // Confirmation styles
  confirmationSection: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  confirmationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  // Transfer choice styles
  transferChoiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 4,
  },
  transferChoiceText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default SettingsScreen;
