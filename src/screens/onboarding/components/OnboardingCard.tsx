/**
 * OnboardingCard - Full-screen card layout for onboarding steps
 *
 * Provides consistent layout with:
 * - Illustration area (top 40%)
 * - Content area with title + description (center)
 * - Actions area for buttons (bottom)
 * - Optional children for custom content (e.g., form inputs)
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface OnboardingCardProps {
  /** Icon or illustration component */
  illustration: React.ReactNode;
  /** Main title */
  title: string;
  /** Description text */
  description: string;
  /** Action buttons (Next/Get Started) */
  actions?: React.ReactNode;
  /** Additional content (e.g., handicap input) */
  children?: React.ReactNode;
  /** Container style override */
  style?: ViewStyle;
}

export function OnboardingCard({
  illustration,
  title,
  description,
  actions,
  children,
  style,
}: OnboardingCardProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 80 }, // Space for skip button
        style,
      ]}
    >
      {/* Centered content group */}
      <View style={styles.centerGroup}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>{illustration}</View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>

        {/* Additional content (e.g., form inputs) */}
        {children}
      </View>

      {/* Actions Area - pinned to bottom */}
      {actions && (
        <View
          style={[
            styles.actionsContainer,
            { paddingBottom: insets.bottom + 100 },
          ]}
        >
          {actions}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  centerGroup: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  illustrationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  actionsContainer: {
    alignSelf: 'stretch',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});

export default OnboardingCard;
