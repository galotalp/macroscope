import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Appbar, 
  Card, 
  Title, 
  Button, 
  Text, 
  TextInput, 
  RadioButton, 
  Chip, 
  Switch, 
  List, 
  FAB,
  Snackbar,
  ActivityIndicator
} from 'react-native-paper';
import apiService from '../services/api';
import { transformErrorMessage } from '../utils/errorMessages';

interface User {
  id: string;
  username: string;
  email: string;
}

interface CreateProjectScreenProps {
  groupId: string;
  onNavigateBack: () => void;
  onProjectCreated: () => void;
}

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
}

const CreateProjectScreen: React.FC<CreateProjectScreenProps> = ({ 
  groupId, 
  onNavigateBack, 
  onProjectCreated 
}) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newChecklistDescription, setNewChecklistDescription] = useState('');
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');

  useEffect(() => {
    loadGroupMembers();
    addDefaultChecklistItems();
  }, [groupId]);

  const loadGroupMembers = async () => {
    try {
      const response = await apiService.getProjectMembers(groupId);
      console.log('Group members response:', JSON.stringify(response, null, 2));
      
      // Handle different possible response structures
      let members = [];
      if (response.members) {
        members = response.members.map((m: any) => {
          // If member has a nested users object, extract it
          if (m.users) {
            return m.users;
          }
          // Otherwise assume m is already the user object
          return m;
        });
      }
      
      setGroupMembers(members);
    } catch (error) {
      console.error('Error loading group members:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setMembersLoading(false);
    }
  };

  const addDefaultChecklistItems = () => {
    const defaultItems: ChecklistItem[] = [
      {
        id: '1',
        title: 'Manuscript written',
        description: 'Complete the manuscript draft'
      },
      {
        id: '2',
        title: 'Ethics submitted',
        description: 'Submit ethics application'
      },
      {
        id: '3',
        title: 'Ethics approved',
        description: 'Receive ethics approval'
      },
      {
        id: '4',
        title: 'Manuscript submitted',
        description: 'Submit manuscript to journal'
      }
    ];
    setChecklistItems(defaultItems);
  };

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem: ChecklistItem = {
        id: Date.now().toString(),
        title: newChecklistItem.trim(),
        description: newChecklistDescription.trim() || undefined
      };
      setChecklistItems(prev => [...prev, newItem]);
      setNewChecklistItem('');
      setNewChecklistDescription('');
      setShowChecklistForm(false);
    }
  };

  const removeChecklistItem = (itemId: string) => {
    setChecklistItems(prev => prev.filter(item => item.id !== itemId));
  };

  const validateForm = () => {
    if (!projectName.trim()) {
      showSnackbar('Project name is required', 'red');
      return false;
    }
    if (!projectDescription.trim()) {
      showSnackbar('Project description is required', 'red');
      return false;
    }
    return true;
  };

  const handleCreateProject = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const projectData = {
        name: projectName.trim(),
        description: projectDescription.trim(),
        groupId,
        priority,
        notes: notes.trim() || undefined,
        memberIds: selectedMembers
      };

      const response = await apiService.createProject(projectData);
      
      if (response.project) {
        // Add custom checklist items
        if (checklistItems.length > 0) {
          try {
            console.log('Adding checklist items:', checklistItems);
            console.log('Project ID:', response.project.id);
            
            for (const item of checklistItems) {
              console.log('Adding item:', item.title);
              const itemResponse = await apiService.addChecklistItem(
                response.project.id, 
                item.title, 
                item.description
              );
              console.log('Item added response:', itemResponse);
            }
            console.log('All checklist items added successfully');
          } catch (error) {
            console.error('Error adding checklist items:', error);
            showSnackbar(transformErrorMessage('Project created but failed to add some checklist items'), 'orange');
            return; // Don't navigate away if there was an error
          }
        }
        
        showSnackbar('Project created successfully!', 'green');
        setTimeout(() => {
          onProjectCreated();
          onNavigateBack();
        }, 1500);
      } else {
        showSnackbar(transformErrorMessage(response.message || 'Failed to create project'), 'red');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: 'low', label: 'Low', color: '#4CAF50' },
    { value: 'medium', label: 'Medium', color: '#FF9800' },
    { value: 'high', label: 'High', color: '#F44336' }
  ];

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onNavigateBack} />
        <Appbar.Content title="Create Project" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Project Basic Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Project Details</Title>
            
            <TextInput
              label="Project Name"
              value={projectName}
              onChangeText={setProjectName}
              style={styles.input}
              mode="outlined"
              placeholder="Enter project name"
            />

            <TextInput
              label="Description"
              value={projectDescription}
              onChangeText={setProjectDescription}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Describe your project"
            />

            <TextInput
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Additional notes or details"
            />
          </Card.Content>
        </Card>

        {/* Priority Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Priority</Title>
            <RadioButton.Group onValueChange={setPriority} value={priority}>
              {priorityOptions.map((option) => (
                <View key={option.value} style={styles.radioRow}>
                  <RadioButton value={option.value} />
                  <Text style={[styles.radioLabel, { color: option.color }]}>
                    {option.label}
                  </Text>
                </View>
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>

        {/* Member Assignment */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Assign Members</Title>
            {membersLoading ? (
              <ActivityIndicator size="small" style={styles.loader} />
            ) : (
              <View>
                <Text style={styles.helperText}>
                  Select members to assign to this project
                </Text>
                {groupMembers.map((member) => (
                  <View key={member.id} style={styles.memberRow}>
                    <Switch
                      value={selectedMembers.includes(member.id)}
                      onValueChange={() => toggleMemberSelection(member.id)}
                    />
                    <Text style={styles.memberName}>{member.username}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  </View>
                ))}
                {selectedMembers.length > 0 && (
                  <View style={styles.selectedMembersContainer}>
                    <Text style={styles.selectedMembersLabel}>Selected:</Text>
                    <View style={styles.chipContainer}>
                      {selectedMembers.map((memberId) => {
                        const member = groupMembers.find(m => m.id === memberId);
                        return member ? (
                          <Chip
                            key={memberId}
                            onClose={() => toggleMemberSelection(memberId)}
                            style={styles.chip}
                          >
                            {member.username}
                          </Chip>
                        ) : null;
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Checklist */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Project Checklist</Title>
            <Text style={styles.helperText}>
              Customize the tasks for this project. Remove unwanted items or add new ones.
            </Text>
            
            {checklistItems.map((item) => (
              <Card key={item.id} style={styles.checklistItemCard}>
                <Card.Content style={styles.checklistItemContent}>
                  <View style={styles.checklistItemLeft}>
                    <List.Icon icon="checkbox-marked-circle-outline" color="#4CAF50" />
                    <View style={styles.checklistItemText}>
                      <Text style={styles.checklistItemTitle}>{item.title}</Text>
                      {item.description && (
                        <Text style={styles.checklistItemDescription}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => removeChecklistItem(item.id)}
                    textColor="#F44336"
                    buttonColor="transparent"
                    style={styles.removeButton}
                    contentStyle={styles.removeButtonContent}
                    compact
                  >
                    Remove
                  </Button>
                </Card.Content>
              </Card>
            ))}

            {showChecklistForm ? (
              <View style={styles.checklistForm}>
                <TextInput
                  label="Task Title"
                  value={newChecklistItem}
                  onChangeText={setNewChecklistItem}
                  style={styles.input}
                  mode="outlined"
                  placeholder="Enter task title"
                />
                <TextInput
                  label="Description (Optional)"
                  value={newChecklistDescription}
                  onChangeText={setNewChecklistDescription}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  placeholder="Task description"
                />
                <View style={styles.checklistFormButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowChecklistForm(false)}
                    style={styles.formButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={addChecklistItem}
                    style={styles.formButton}
                  >
                    Add Task
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                mode="outlined"
                onPress={() => setShowChecklistForm(true)}
                style={styles.addButton}
                icon="plus"
              >
                Add Task
              </Button>
            )}
          </Card.Content>
        </Card>


        {/* Bottom spacing for FAB */}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <FAB
        icon="check"
        label="Create Project"
        onPress={handleCreateProject}
        style={styles.fab}
        loading={loading}
        disabled={loading}
      />

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
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  helperText: {
    marginBottom: 12,
    color: '#666',
    fontSize: 14,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberName: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
  },
  selectedMembersContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  selectedMembersLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 4,
  },
  checklistItemCard: {
    marginBottom: 8,
    elevation: 1,
    backgroundColor: '#f8f9fa',
  },
  checklistItemContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  checklistItemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  checklistItemText: {
    marginLeft: 8,
    flex: 1,
  },
  checklistItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  checklistItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  removeButton: {
    borderColor: '#F44336',
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  removeButtonContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  checklistForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  checklistFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  addButton: {
    marginTop: 16,
  },
  uploadButton: {
    marginTop: 8,
  },
  loader: {
    marginVertical: 20,
  },
  bottomSpace: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
});

export default CreateProjectScreen;
