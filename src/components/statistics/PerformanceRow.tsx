/**
 * PerformanceRow - Row displaying a performance metric with icon
 *
 * Used for best scores, birdie rates, and other achievement metrics.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// =====================================================
// TYPES
// =====================================================

export interface PerformanceRowProps {
  /** Icon name from MaterialCommunityIcons */
  icon: string;
  /** Icon color */
  iconColor: string;
  /** Label text above the value */
  label: string;
  /** Main value to display */
  value: string | number;
  /** Optional subtitle below the value */
  subtitle?: string;
  /** When set, the row is tappable (e.g. opens the round) and shows a chevron */
  onPress?: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const PerformanceRow = React.memo(function PerformanceRow({
  icon,
  iconColor,
  label,
  value,
  subtitle,
  onPress,
}: PerformanceRowProps) {
  const colors = useThemeColors();

  const content = (
    <>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.surfaceVariant },
        ]}
      >
        <Icon source={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.details}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {onPress && (
        <View style={styles.chevron}>
          <Icon source="chevron-right" size={20} color={colors.textTertiary} />
        </View>
      )}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={[label, value, subtitle].filter(Boolean).join(', ')}
    >
      {content}
    </TouchableOpacity>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  details: {
    flex: 1,
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: spacing.sm,
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...typography.h3,
    marginTop: 2,
  },
  subtitle: {
    ...typography.small,
    marginTop: 2,
  },
});

export default PerformanceRow;
