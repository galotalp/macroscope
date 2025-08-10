import { DefaultTheme } from 'react-native-paper';

// MacroScope color palette - beige primary with orange/blue accents
export const colors = {
  // Primary colors - Light yellowy beige tones (matching website)
  primary: '#d4c4a0', // Light yellowy beige for buttons and primary elements
  primaryDark: '#a08866', // Medium beige-brown for accents
  primaryLight: '#e5d9c1', // Very light beige
  
  // Secondary colors - Soft blues from icon accents  
  secondary: '#5b9bd5', // Soft blue from icon
  secondaryDark: '#4a7ca3', // Deeper blue
  secondaryLight: '#7bb3e0', // Light blue
  
  // Accent colors - Subtle orange accents and supporting colors
  accent: '#d4874b', // Muted orange accent (less bright)
  accentOrange: '#c17b47', // Softer orange
  accentGreen: '#34d399', // Emerald green (keeping for success states)
  accentPurple: '#a855f7', // Purple (keeping for variety)
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Neutral colors - Soft cream/beige tones from icon background
  background: '#f8f6f0', // Soft cream background (much more subtle)
  surface: '#ffffff', // Pure white for cards
  surfaceVariant: '#f5f2eb', // Very light beige tint
  cardBackground: '#ffffff', // Clean white cards
  
  // On-surface colors for UI elements
  onSurface: '#4a4235', // Dark brown text (matching website)
  onSurfaceVariant: '#64748b',
  
  // Text colors
  text: '#4a4235', // Dark brown text (matching website)
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  textInverse: '#ffffff', // White text on colored backgrounds
  
  // Border colors
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#cbd5e1',
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  backdropLight: 'rgba(248, 250, 252, 0.8)',
  
  // Priority colors (keeping existing logic but modernized)
  priorityHigh: '#ef4444',
  priorityMedium: '#f59e0b',
  priorityLow: '#10b981',
  priorityCompleted: '#3b82f6', // Blue for completed projects
  priorityNone: '#6b7280',
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography scale
export const typography = {
  // Font sizes - Enhanced scale for better hierarchy
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    huge: 32,
    giant: 40,
  },
  // Font weights
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  // Line heights - Optimized for readability
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.8,
  },
  // Letter spacing - For better legibility
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 1.5,
  },
};

// Border radius scale
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Shadow styles
export const shadows = {
  small: {
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

// React Native Paper theme configuration
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryLight,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    background: colors.background,
    error: colors.error,
    onPrimary: colors.textInverse,
    onSecondary: colors.textInverse,
    onSurface: colors.onSurface,
    onSurfaceVariant: colors.onSurfaceVariant,
    onBackground: colors.text,
    outline: colors.border,
    outlineVariant: colors.borderLight,
    inverseSurface: colors.text,
    inverseOnSurface: colors.textInverse,
    inversePrimary: colors.primaryLight,
    // Custom color additions
    accent: colors.accent,
    accentOrange: colors.accentOrange,
    accentGreen: colors.accentGreen,
    accentPurple: colors.accentPurple,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
    textSecondary: colors.textSecondary,
    textLight: colors.textLight,
    borderLight: colors.borderLight,
    borderDark: colors.borderDark,
  },
  roundness: borderRadius.md,
};

// Text styles for consistent typography
export const textStyles = {
  // Headings
  h1: {
    fontSize: typography.fontSize.giant,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
    color: colors.text,
  },
  h2: {
    fontSize: typography.fontSize.huge,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
    color: colors.text,
  },
  h3: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    color: colors.text,
  },
  h4: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.snug,
    color: colors.text,
  },
  h5: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    color: colors.text,
  },
  // Body text
  body: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal,
    color: colors.text,
  },
  bodyLarge: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.relaxed,
    color: colors.text,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal,
    color: colors.textSecondary,
  },
  // Specialized text
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal,
    color: colors.textLight,
    letterSpacing: typography.letterSpacing.wide,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    color: colors.text,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.wide,
  },
  link: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },
};

// Component-specific theme styles
export const componentStyles = {
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  button: {
    primary: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
    },
    secondary: {
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.md,
    },
    accent: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.md,
    },
  },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    ...shadows.large,
  },
  appBar: {
    backgroundColor: colors.primary,
    elevation: 4,
  },
  priorityChip: {
    high: {
      backgroundColor: colors.priorityHigh,
      color: colors.textInverse,
    },
    medium: {
      backgroundColor: colors.priorityMedium,
      color: colors.textInverse,
    },
    low: {
      backgroundColor: colors.priorityLow,
      color: colors.textInverse,
    },
    completed: {
      backgroundColor: colors.priorityCompleted,
      color: colors.textInverse,
    },
    none: {
      backgroundColor: colors.priorityNone,
      color: colors.textInverse,
    },
  },
};

export default theme;