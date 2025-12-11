/**
 * SectionHeader - Reusable section header with icon and description
 *
 * Provides consistent section headers across the app with:
 * - Title text with optional icon
 * - Optional description/subtitle
 * - Customizable styling and colors
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   title="Frequently Asked Questions"
 *   description="Find quick answers to common questions"
 *   icon="frequently-asked-questions"
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface SectionHeaderProps {
  /** Section title text */
  title: string;
  /** Optional description/subtitle below title */
  description?: string;
  /** Optional icon name from MaterialCommunityIcons */
  icon?: string;
  /** Icon size (defaults to 22) */
  iconSize?: number;
  /** Use primary color for icon (defaults to true) */
  primaryIcon?: boolean;
  /** Container style override */
  style?: ViewStyle;
  /** Title style override */
  titleStyle?: TextStyle;
  /** Description style override */
  descriptionStyle?: TextStyle;
  /** Right-side action content */
  rightContent?: React.ReactNode;
}

export const SectionHeader = React.memo(function SectionHeader({
  title,
  description,
  icon,
  iconSize = 22,
  primaryIcon = true,
  style,
  titleStyle,
  descriptionStyle,
  rightContent,
}: SectionHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          {icon && (
            <Icon
              source={icon}
              size={iconSize}
              color={primaryIcon ? colors.primary : colors.textSecondary}
            />
          )}
          <Text
            style={[styles.title, { color: colors.textPrimary }, titleStyle]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        </View>
        {rightContent}
      </View>
      {description && (
        <Text
          style={[
            styles.description,
            { color: colors.textSecondary },
            icon && styles.descriptionWithIcon,
            descriptionStyle,
          ]}
        >
          {description}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    ...typography.h4,
  },
  description: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  descriptionWithIcon: {
    // Align with title text when icon is present
    marginLeft: 22 + spacing.sm,
  },
});

export default SectionHeader;
