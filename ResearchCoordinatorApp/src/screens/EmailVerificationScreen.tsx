import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, AppState } from 'react-native';
import { Card, Title, Button, Text, Snackbar, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import apiService from '../services/api';
import { transformErrorMessage } from '../utils/errorMessages';
import { colors, spacing, typography, shadows, borderRadius } from '../theme';

interface EmailVerificationScreenProps {
  email: string;
  password?: string;
  onNavigateBack: () => void;
  onNavigateToLogin: () => void;
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ 
  email,
  password,
  onNavigateBack, 
  onNavigateToLogin
}) => {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState(colors.success);

  // Check verification status when screen loads (if password is available)
  useEffect(() => {
    if (password) {
      // Wait a moment then check status automatically
      const timer = setTimeout(() => {
        checkVerificationStatus(true); // Initial auto-check
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [password]);

  // Listen for app state changes to detect when user returns from email
  useEffect(() => {
    if (!password) return; // Only set up listener if we can check status

    const handleAppStateChange = (nextAppState: string) => {
      // When app comes to foreground (user returns from email app)
      if (nextAppState === 'active') {
        console.log('App became active, checking verification status...');
        // Small delay to ensure any background verification completed
        setTimeout(() => {
          checkVerificationStatus(true); // Auto-check when app becomes active
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [password]);

  const checkVerificationStatus = async (isAutoCheck = false) => {
    if (!password) {
      setSnackbarMessage('Unable to check status. Please go back to login and try again.');
      setSnackbarColor(colors.error);
      setSnackbarVisible(true);
      return;
    }

    setCheckingStatus(true);
    try {
      const result = await apiService.checkVerificationStatus(email, password);
      
      if (result.isVerified) {
        setSnackbarMessage('Email verified! Please log in with your credentials.');
        setSnackbarColor(colors.success);
        setSnackbarVisible(true);
        
        // Wait a moment to show the success message, then go to login
        setTimeout(() => {
          onNavigateToLogin();
        }, 2000);
      } else if (!isAutoCheck) {
        // Only show "not verified" message for manual checks, not auto-checks
        setSnackbarMessage('Email not yet verified. Please check your email and click the verification link.');
        setSnackbarColor(colors.error);
        setSnackbarVisible(true);
      }
    } catch (error) {
      console.error('Verification status check failed:', error);
      if (!isAutoCheck) {
        // Only show error messages for manual checks, not auto-checks
        setSnackbarMessage('Unable to check verification status. Please try again later.');
        setSnackbarColor(colors.error);
        setSnackbarVisible(true);
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      await apiService.resendVerificationEmail(email);
      setSnackbarMessage('Verification email sent successfully!');
      setSnackbarColor(colors.success);
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Resend verification error:', error);
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
          <MaterialIcons name="mark-email-unread" size={80} color={colors.primary} />
          <Title style={styles.headerTitle}>Check Your Email</Title>
          <Text style={styles.headerSubtitle}>
            We've sent a verification link to your email address
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.emailContainer}>
              <Text style={styles.emailLabel}>Email sent to:</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            <Text style={styles.instructionText}>
              Click the verification link in your email to complete your account setup.
            </Text>

            <Text style={styles.troubleshootText}>
              Didn't receive the email? Check your spam folder or click the button below to resend.
            </Text>

            <View style={styles.buttonContainer}>
              {password && (
                <Button
                  mode="contained"
                  onPress={() => checkVerificationStatus(false)}
                  style={styles.checkButton}
                  contentStyle={styles.buttonContent}
                  disabled={loading || checkingStatus}
                  buttonColor={colors.success}
                >
                  {checkingStatus ? <ActivityIndicator color="white" /> : '✓ Check Status'}
                </Button>
              )}

              <Button
                mode="contained"
                onPress={handleResendEmail}
                style={styles.resendButton}
                contentStyle={styles.buttonContent}
                disabled={loading || checkingStatus}
                buttonColor={colors.primary}
              >
                {loading ? <ActivityIndicator color="white" /> : 'Resend Email'}
              </Button>

              <Button
                mode="outlined"
                onPress={onNavigateToLogin}
                style={styles.loginButton}
                disabled={loading || checkingStatus}
                textColor={colors.primary}
              >
                Back to Login
              </Button>

              <Button
                mode="text"
                onPress={onNavigateBack}
                style={styles.backButton}
                disabled={loading}
                textColor={colors.primaryDark}
              >
                ← Change Email Address
              </Button>
            </View>
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
  emailContainer: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  emailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  emailText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
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
  checkButton: {
    borderRadius: borderRadius.md,
    ...shadows.medium,
  },
  resendButton: {
    borderRadius: borderRadius.md,
    ...shadows.medium,
  },
  loginButton: {
    borderRadius: borderRadius.md,
    borderColor: colors.primary,
  },
  backButton: {
    marginTop: spacing.sm,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  snackbar: {
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
});

export default EmailVerificationScreen;