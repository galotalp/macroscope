import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, Card, Title, TextInput, Button, Snackbar, ActivityIndicator, Text, List, IconButton, Divider, Dialog, Portal } from 'react-native-paper';
import supabaseService from '../services/supabaseService';

interface CreateGroupScreenProps {
  onNavigateBack: () => void;
  onCreateSuccess: () => void;
}

interface DefaultChecklistItem {
  id: string;
  title: string;
  description?: string;
}

const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ onNavigateBack, onCreateSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');
  
  // Default checklist items state - start with predefined defaults
  const [defaultChecklistItems, setDefaultChecklistItems] = useState<DefaultChecklistItem[]>([
    { id: '1', title: 'Manuscript Submitted', description: 'Submit manuscript to target journal' },
    { id: '2', title: 'Manuscript Approved', description: 'Manuscript accepted for publication' },
    { id: '3', title: 'Ethics Submitted', description: 'Submit ethics application to review board' },
    { id: '4', title: 'Ethics Approved', description: 'Ethics approval received' },
  ]);
  const [showAddChecklistDialog, setShowAddChecklistDialog] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const addChecklistItem = () => {
    if (!newItemTitle.trim()) {
      showSnackbar('Please enter a checklist item title', 'red');
      return;
    }

    const newItem: DefaultChecklistItem = {
      id: `custom_${Date.now()}`, // Temporary ID with prefix to distinguish from predefined
      title: newItemTitle.trim(),
      description: newItemDescription.trim() || undefined
    };

    setDefaultChecklistItems([...defaultChecklistItems, newItem]);
    setNewItemTitle('');
    setNewItemDescription('');
    setShowAddChecklistDialog(false);
    showSnackbar('Checklist item added');
  };

  const removeChecklistItem = (id: string) => {
    setDefaultChecklistItems(defaultChecklistItems.filter(item => item.id !== id));
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) {
      showSnackbar('Please enter a group name', 'red');
      return;
    }

    setLoading(true);
    try {
      // Create the group first
      const response = await supabaseService.createResearchGroup(name.trim(), description.trim());
      
      // If there are default checklist items, create them
      if (defaultChecklistItems.length > 0 && response.group) {
        try {
          for (let i = 0; i < defaultChecklistItems.length; i++) {
            const item = defaultChecklistItems[i];
            await supabaseService.addGroupDefaultChecklistItem(
              response.group.id,
              item.title,
              item.description,
              i + 1 // display_order
            );
          }
        } catch (checklistError) {
          console.error('Error creating default checklist items:', checklistError);
          // Don't fail the group creation, just log the error
          showSnackbar('Group created, but some default checklist items failed to save', 'orange');
        }
      }
      
      showSnackbar('Research group created successfully!');
      setTimeout(() => {
        onCreateSuccess();
      }, 1000);
    } catch (error) {
      console.error('Error creating group:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to create group', 'red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={onNavigateBack} />
        <Appbar.Content title="Create Group" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>New Research Group</Title>
            
            <TextInput
              label="Group Name *"
              value={name}
              onChangeText={setName}
              style={styles.input}
              mode="outlined"
              disabled={loading}
              placeholder="Enter group name"
            />

            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={4}
              disabled={loading}
              placeholder="Describe your research group..."
            />
          </Card.Content>
        </Card>

        {/* Default Checklist Items */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Default Checklist Items</Title>
              <IconButton
                icon="plus"
                size={24}
                onPress={() => setShowAddChecklistDialog(true)}
                disabled={loading}
              />
            </View>
            <Text style={styles.sectionDescription}>
              These checklist items will be automatically added to all new projects in this group.
            </Text>

            {defaultChecklistItems.length === 0 ? (
              <Text style={styles.emptyText}>No default checklist items</Text>
            ) : (
              defaultChecklistItems.map((item) => (
                <View key={item.id} style={styles.checklistItem}>
                  <View style={styles.checklistContent}>
                    <Text style={styles.checklistTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.checklistDescription}>{item.description}</Text>
                    )}
                  </View>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => removeChecklistItem(item.id)}
                    disabled={loading}
                  />
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={handleCreateGroup}
              style={styles.button}
              disabled={loading || !name.trim()}
            >
              {loading ? <ActivityIndicator color="white" /> : 'Create Group'}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: snackbarColor }}
      >
        {snackbarMessage}
      </Snackbar>

      <Portal>
        <Dialog visible={showAddChecklistDialog} onDismiss={() => setShowAddChecklistDialog(false)}>
          <Dialog.Title>Add Default Checklist Item</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={styles.dialogInput}
              value={newItemTitle}
              onChangeText={setNewItemTitle}
              placeholder="Title"
              autoFocus
              mode="outlined"
            />
            <TextInput
              style={[styles.dialogInput, styles.textArea]}
              value={newItemDescription}
              onChangeText={setNewItemDescription}
              placeholder="Description (optional)"
              multiline
              numberOfLines={3}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddChecklistDialog(false)}>Cancel</Button>
            <Button onPress={addChecklistItem} disabled={!newItemTitle.trim()}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
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
    elevation: 2,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  sectionDescription: {
    color: '#666',
    marginBottom: 16,
    fontSize: 14,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checklistContent: {
    flex: 1,
    marginLeft: 4,
  },
  checklistTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  checklistDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  dialogInput: {
    marginBottom: 12,
  },
  textArea: {
    height: 80,
  },
});

export default CreateGroupScreen;
