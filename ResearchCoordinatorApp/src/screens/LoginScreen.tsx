import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Card, Title, Snackbar, ActivityIndicator, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../services/api';
import { transformErrorMessage } from '../utils/errorMessages';
import { colors, spacing, typography, shadows, borderRadius } from '../theme';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
  onNavigateToRegister: () => void;
  onRequiresVerification: (email: string) => void;
  registrationMessage?: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onNavigateToRegister, onRequiresVerification, registrationMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [successSnackbarVisible, setSuccessSnackbarVisible] = useState(!!registrationMessage);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setSnackbarMessage('Please fill in all fields');
      setSnackbarVisible(true);
      return;
    }

    console.log('Attempting login for:', email);
    setLoading(true);
    try {
      const response = await apiService.login(email, password);
      console.log('Login successful:', response);
      if (response.token && response.user) {
        onLoginSuccess(response.user, response.token);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check if error indicates email verification is required
      if (error.message && error.message.includes('verify your email')) {
        onRequiresVerification(email);
        return;
      }
      
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
          <Text style={styles.headerSubtitle}>See the big picture in research</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.formContainer}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={loading}
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
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.button}
                contentStyle={styles.buttonContent}
                disabled={loading}
                buttonColor={colors.primary}
              >
                {loading ? <ActivityIndicator color="white" /> : 'Sign In'}
              </Button>

              <Button
                mode="text"
                onPress={onNavigateToRegister}
                style={styles.linkButton}
                disabled={loading}
                textColor={colors.primary}
              >
                Don't have an account? Sign Up
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

        {registrationMessage && (
          <Snackbar
            visible={successSnackbarVisible}
            onDismiss={() => setSuccessSnackbarVisible(false)}
            duration={5000}
            style={[styles.snackbar, { backgroundColor: colors.success }]}
          >
            {registrationMessage}
          </Snackbar>
        )}
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

export default LoginScreen;
