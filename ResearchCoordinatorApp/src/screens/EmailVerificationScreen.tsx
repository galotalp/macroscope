import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Card, Title, Button, Text, Snackbar, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import apiService from '../services/api';
import { transformErrorMessage } from '../utils/errorMessages';
import { colors, spacing, typography, shadows, borderRadius } from '../theme';

interface EmailVerificationScreenProps {
  email: string;
  onNavigateBack: () => void;
  onNavigateToLogin: () => void;
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ 
  email, 
  onNavigateBack, 
  onNavigateToLogin 
}) => {
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState(colors.success);

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
              <Button
                mode="contained"
                onPress={handleResendEmail}
                style={styles.resendButton}
                contentStyle={styles.buttonContent}
                disabled={loading}
                buttonColor={colors.primary}
              >
                {loading ? <ActivityIndicator color="white" /> : 'Resend Email'}
              </Button>

              <Button
                mode="outlined"
                onPress={onNavigateToLogin}
                style={styles.loginButton}
                disabled={loading}
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