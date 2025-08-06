import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Card, Title, Snackbar, ActivityIndicator, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../services/api';
import { transformErrorMessage } from '../utils/errorMessages';
import { colors, spacing, typography, shadows, borderRadius } from '../theme';
import { User } from '../types';

interface RegisterScreenProps {
  onRegisterSuccess: (email: string, password?: string) => void;
  onNavigateToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegisterSuccess, onNavigateToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setSnackbarMessage('Please fill in all fields');
      setSnackbarVisible(true);
      return;
    }

    if (password !== confirmPassword) {
      setSnackbarMessage('Passwords do not match');
      setSnackbarVisible(true);
      return;
    }

    if (password.length < 6) {
      setSnackbarMessage('Password must be at least 6 characters');
      setSnackbarVisible(true);
      return;
    }

    console.log('Attempting registration for:', email, username);
    setLoading(true);
    try {
      const response = await apiService.register(email, password, username);
      console.log('Registration successful:', response);
      // Navigate to email verification screen
      onRegisterSuccess(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      setSnackbarMessage(transformErrorMessage(error));
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surfaceVariant, colors.primaryLight]}
      style={styles.gradientContainer}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Title style={styles.headerTitle}>MacroScope</Title>
          <Text style={styles.headerSubtitle}>Join the research coordination platform</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.formContainer}>
              <TextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                mode="outlined"
                disabled={loading}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
              />

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={loading}
                autoComplete="off"
                autoCorrect={false}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                mode="outlined"
                secureTextEntry
                disabled={loading}
                autoComplete="off"
                autoCorrect={false}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
              />

              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                mode="outlined"
                secureTextEntry
                disabled={loading}
                autoComplete="off"
                autoCorrect={false}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
              />

              <Button
                mode="contained"
                onPress={handleRegister}
                style={styles.button}
                contentStyle={styles.buttonContent}
                disabled={loading}
                buttonColor={colors.primary}
              >
                {loading ? <ActivityIndicator color="white" /> : 'Create Account'}
              </Button>

              <Button
                mode="text"
                onPress={onNavigateToLogin}
                style={styles.linkButton}
                disabled={loading}
                textColor={colors.primary}
              >
                Already have an account? Sign In
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={[styles.snackbar, { backgroundColor: colors.error }]}
        >
          {snackbarMessage}
        </Snackbar>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: typography.fontSize.huge,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.primaryDark,
    textAlign: 'center',
    opacity: 0.8,
  },
  card: {
    borderRadius: borderRadius.xl,
    ...shadows.large,
    backgroundColor: colors.surface,
  },
  cardContent: {
    padding: spacing.xl,
  },
  formContainer: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.medium,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  linkButton: {
    marginTop: spacing.sm,
  },
  snackbar: {
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
});

export default RegisterScreen;
