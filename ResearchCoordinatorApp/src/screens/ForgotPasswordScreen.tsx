import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Card, Title, Button, Text, TextInput, Snackbar, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import supabaseService from '../services/supabaseService';
import { transformErrorMessage } from '../utils/errorMessages';
import { colors, spacing, typography, shadows, borderRadius } from '../theme';

interface ForgotPasswordScreenProps {
  onNavigateBack: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ 
  onNavigateBack
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState(colors.success);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setSnackbarMessage('Please enter your email address');
      setSnackbarColor(colors.error);
      setSnackbarVisible(true);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setSnackbarMessage('Please enter a valid email address');
      setSnackbarColor(colors.error);
      setSnackbarVisible(true);
      return;
    }

    setLoading(true);
    try {
      await supabaseService.forgotPassword(email.trim());
      setEmailSent(true);
      setSnackbarMessage('Password reset email sent! Check your inbox.');
      setSnackbarColor(colors.success);
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Forgot password error:', error);
      setSnackbarMessage(transformErrorMessage(error));
      setSnackbarColor(colors.error);
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
          <MaterialIcons name="lock-reset" size={80} color={colors.primary} />
          <Title style={styles.headerTitle}>Reset Password</Title>
          <Text style={styles.headerSubtitle}>
            {emailSent 
              ? 'Check your email for reset instructions'
              : 'Enter your email to receive reset instructions'
            }
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            {!emailSent ? (
              <>
                <TextInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  disabled={loading}
                  style={styles.input}
                  outlineColor={colors.primaryLight}
                  activeOutlineColor={colors.primary}
                />

                <Text style={styles.instructionText}>
                  Enter the email address associated with your MacroScope account. 
                  We'll send you a link to reset your password.
                </Text>

                <View style={styles.buttonContainer}>
                  <Button
                    mode="contained"
                    onPress={handleForgotPassword}
                    style={styles.resetButton}
                    contentStyle={styles.buttonContent}
                    disabled={loading}
                    buttonColor={colors.primary}
                  >
                    {loading ? <ActivityIndicator color="white" /> : 'Send Reset Link'}
                  </Button>

                  <Button
                    mode="text"
                    onPress={onNavigateBack}
                    style={styles.backButton}
                    disabled={loading}
                    textColor={colors.primaryDark}
                  >
                    ← Back to Login
                  </Button>
                </View>
              </>
            ) : (
              <>
                <View style={styles.successContainer}>
                  <MaterialIcons name="check-circle" size={60} color={colors.success} />
                  <Text style={styles.successTitle}>Email Sent! ✉️</Text>
                  <Text style={styles.successText}>
                    We've sent password reset instructions to:
                  </Text>
                  <Text style={styles.emailText}>{email}</Text>
                </View>

                <Text style={styles.instructionText}>
                  Click the link in the email to reset your password. 
                  The link will expire in 1 hour.
                </Text>

                <Text style={styles.troubleshootText}>
                  Didn't receive the email? Check your spam folder, or try again with a different email address.
                </Text>

                <View style={styles.buttonContainer}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                    style={styles.resendButton}
                    textColor={colors.primary}
                  >
                    Try Different Email
                  </Button>

                  <Button
                    mode="text"
                    onPress={onNavigateBack}
                    style={styles.backButton}
                    textColor={colors.primaryDark}
                  >
                    ← Back to Login
                  </Button>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={4000}
          style={[styles.snackbar, { backgroundColor: snackbarColor }]}
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
    marginTop: spacing.md,
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
  input: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  instructionText: {
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  troubleshootText: {
    fontSize: typography.fontSize.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  resetButton: {
    borderRadius: borderRadius.md,
    ...shadows.medium,
  },
  resendButton: {
    borderRadius: borderRadius.md,
    borderColor: colors.primary,
  },
  backButton: {
    marginTop: spacing.sm,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emailText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  snackbar: {
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
});

export default ForgotPasswordScreen;