import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Card, Title, TextInput, Button, Snackbar, ActivityIndicator } from 'react-native-paper';
import supabaseService from '../services/supabaseService';

interface SettingsScreenProps {
  onNavigateBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigateBack }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const handleChangePassword = async () => {
    console.log('handleChangePassword called');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      console.log('Validation failed: missing fields');
      showSnackbar('Please fill in all fields', 'red');
      return;
    }

    if (newPassword !== confirmPassword) {
      console.log('Validation failed: passwords do not match');
      showSnackbar('New passwords do not match', 'red');
      return;
    }

    if (newPassword.length < 6) {
      console.log('Validation failed: password too short');
      showSnackbar('Password must be at least 6 characters', 'red');
      return;
    }

    console.log('All validations passed, setting loading to true');
    setLoading(true);
    
    console.log('About to call supabaseService.changePassword');
    
    // Fire and forget - don't wait for the response since navigation will happen automatically
    supabaseService.changePassword(currentPassword, newPassword).then(response => {
      console.log('Password change response received:', response);
    }).catch(error => {
      console.error('Error in handleChangePassword:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      console.log('Showing error snackbar:', errorMessage);
      showSnackbar(errorMessage, 'red');
      setLoading(false);
    });
    
    // Show immediate feedback and clear form
    console.log('Showing success snackbar');
    showSnackbar('Changing password...', 'green');
    
    console.log('Clearing form fields');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    
    // Clear loading state quickly since auth state listener will handle navigation
    console.log('Setting timeout to clear loading state');
    setTimeout(() => {
      console.log('Timeout reached, setting loading to false');
      setLoading(false);
    }, 1000);
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
      </ScrollView>

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

export default SettingsScreen;
