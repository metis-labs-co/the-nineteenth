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
      {/* Illustration Area */}
      <View style={styles.illustrationContainer}>{illustration}</View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>

        {/* Additional content (e.g., form inputs) */}
        {children}

        {/* Actions Area */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  illustrationContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  actionsContainer: {
    alignSelf: 'stretch',
    paddingTop: spacing.xl,
  },
});

export default OnboardingCard;
