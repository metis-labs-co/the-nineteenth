/**
 * PerformanceRow - Row displaying a performance metric with icon
 *
 * Used for best scores, birdie rates, and other achievement metrics.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
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
}: PerformanceRowProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.row}>
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
    </View>
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
