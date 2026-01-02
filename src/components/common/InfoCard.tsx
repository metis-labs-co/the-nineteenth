/**
 * InfoCard - Read-only information display card
 *
 * Provides a consistent container for displaying read-only information.
 * Unlike FormSection (for form inputs with validation), InfoCard is for
 * static display content like course details, invite codes, and summaries.
 *
 * @example
 * ```tsx
 * // Simple info display
 * <InfoCard title="Course Details" icon="golf">
 *   <Text style={styles.label}>Name</Text>
 *   <Text style={styles.value}>Royal Melbourne Golf Club</Text>
 * </InfoCard>
 *
 * // Highlight variant for important info
 * <InfoCard title="Invite Code" icon="key" variant="highlight">
 *   <Text style={styles.code}>ABC123</Text>
 *   <Text style={styles.hint}>Share this code with players</Text>
 * </InfoCard>
 *
 * // No title (just content container)
 * <InfoCard>
 *   <View style={styles.row}>
 *     <Text>Players</Text>
 *     <Text>12</Text>
 *   </View>
 * </InfoCard>
 * ```
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export interface InfoCardProps {
  /** Optional header title */
  title?: string;
  /** Card content */
  children: React.ReactNode;
  /** Visual variant - 'default' for neutral, 'highlight' for emphasis */
  variant?: 'default' | 'highlight';
  /** Material Community Icons name for title icon */
  icon?: string;
  /** Custom container styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

export const InfoCard = React.memo(function InfoCard({
  title,
  children,
  variant = 'default',
  icon,
  style,
  testID,
}: InfoCardProps) {
  const colors = useThemeColors();

  const isHighlight = variant === 'highlight';

  const containerStyle: ViewStyle = isHighlight
    ? {
        backgroundColor: `${colors.primary}0D`, // 5% opacity
        borderColor: `${colors.primary}4D`, // 30% opacity
      }
    : {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        ...shadows.sm,
      };

  const iconColor = isHighlight ? colors.primary : colors.textSecondary;

  return (
    <View
      style={[styles.container, containerStyle, style]}
      testID={testID}
      accessibilityRole="none"
    >
      {title && (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {icon && (
              <Icon
                source={icon}
                size={20}
                color={iconColor}
              />
            )}
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {title}
            </Text>
          </View>
        </View>
      )}
      <View style={title ? styles.content : undefined}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.bodyBold,
  },
  content: {
    // Content section when title is present
  },
});

export default InfoCard;
