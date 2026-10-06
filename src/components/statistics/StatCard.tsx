/**
 * StatCard - Reusable statistics card component
 *
 * Displays a single statistic with optional icon and subtitle.
 * Used across MyStatisticsScreen and PlayerDetailScreen.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';

// =====================================================
// TYPES
// =====================================================

export interface StatCardProps {
  /** Stat title/label */
  title: string;
  /** Stat value to display */
  value: string | number;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional icon name from MaterialCommunityIcons */
  icon?: string;
  /** Optional icon color (defaults to primary) */
  iconColor?: string;
  /** Optional tap handler. When provided, the card becomes a button. */
  onPress?: () => void;
  /** Optional accessibility hint describing what happens on tap. */
  accessibilityHint?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const StatCard = React.memo(function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  onPress,
  accessibilityHint,
}: StatCardProps) {
  const colors = useThemeColors();
  const resolvedIconColor = iconColor || colors.primary;
  const isPressable = typeof onPress === 'function';

  // Build accessibility label for screen readers
  const accessibilityLabel = subtitle
    ? `${title}: ${value}, ${subtitle}`
    : `${title}: ${value}`;

  const cardInner = (
    <>
      {icon && (
        <View
          style={[styles.iconContainer, { backgroundColor: withOpacity(resolvedIconColor, 0.08) }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon source={icon} size={22} color={resolvedIconColor} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
        )}
      </View>
    </>
  );

  if (isPressable) {
    return (
      <View style={styles.wrapper}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.surface },
            shadows.sm,
            pressed && styles.cardPressed,
          ]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
        >
          {cardInner}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
      >
        {cardInner}
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  wrapper: {
    width: '50%',
    padding: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
  },
  cardPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  value: {
    ...typography.h2,
    lineHeight: 28,
  },
  title: {
    ...typography.small,
    marginTop: 2,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 1,
  },
});

export default StatCard;
