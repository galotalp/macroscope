import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, Card, Title, TextInput, Button, Snackbar, ActivityIndicator } from 'react-native-paper';
import apiService from '../services/api';

interface CreateGroupScreenProps {
  onNavigateBack: () => void;
  onCreateSuccess: () => void;
}

const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ onNavigateBack, onCreateSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) {
      showSnackbar('Please enter a group name', 'red');
      return;
    }

    setLoading(true);
    try {
      await apiService.createResearchGroup(name.trim(), description.trim());
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
});

export default CreateGroupScreen;
