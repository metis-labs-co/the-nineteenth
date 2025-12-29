/**
 * FormSection - Reusable form section wrapper component
 *
 * Provides consistent spacing, typography, and layout for form sections with:
 * - Optional title with required indicator
 * - Optional description text
 * - Error message display
 * - Themed surface styling
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FormSection title="Competition Details">
 *   <TextInput ... />
 * </FormSection>
 *
 * // With description and required indicator
 * <FormSection
 *   title="Player Information"
 *   description="Enter details for each player"
 *   required
 * >
 *   <TextInput ... />
 * </FormSection>
 *
 * // With error message
 * <FormSection
 *   title="Handicap"
 *   error="Please enter a valid handicap between 0 and 54"
 * >
 *   <TextInput ... />
 * </FormSection>
 * ```
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export interface FormSectionProps {
  /** Optional section title */
  title?: string;
  /** Optional description text below title */
  description?: string;
  /** Form content */
  children: React.ReactNode;
  /** Optional error message to display */
  error?: string;
  /** Show required indicator (*) after title */
  required?: boolean;
  /** Hide the surface card styling (for nested sections) */
  noCard?: boolean;
  /** Container style override */
  style?: ViewStyle;
  /** Title style override */
  titleStyle?: TextStyle;
  /** Description style override */
  descriptionStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

export const FormSection = React.memo(function FormSection({
  title,
  description,
  children,
  error,
  required = false,
  noCard = false,
  style,
  titleStyle,
  descriptionStyle,
  testID,
}: FormSectionProps) {
  const colors = useThemeColors();

  const hasHeader = title || description;

  const content = (
    <>
      {hasHeader && (
        <View style={styles.header}>
          {title && (
            <Text
              style={[styles.title, { color: colors.textPrimary }, titleStyle]}
              accessibilityRole="header"
            >
              {title}
              {required && (
                <Text style={[styles.required, { color: colors.error }]}> *</Text>
              )}
            </Text>
          )}
          {description && (
            <Text
              style={[
                styles.description,
                { color: colors.textSecondary },
                descriptionStyle,
              ]}
            >
              {description}
            </Text>
          )}
        </View>
      )}
      {children}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}
    </>
  );

  if (noCard) {
    return (
      <View style={[styles.noCardContainer, style]} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        style,
      ]}
      testID={testID}
    >
      {content}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  noCardContainer: {
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
  },
  required: {
    ...typography.h4,
  },
  description: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  errorContainer: {
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.small,
  },
});

export default FormSection;
