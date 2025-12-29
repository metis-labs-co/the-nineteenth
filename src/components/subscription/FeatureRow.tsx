/**
 * FeatureRow Component
 *
 * Single feature comparison row for subscription tier features.
 * Displays a checkmark icon with feature text.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureRowProps {
  /** Feature text to display */
  feature: string;
  /** Whether the feature is included (shows checkmark) */
  included?: boolean;
  /** Custom icon (defaults to check-circle) */
  icon?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FeatureRow({ feature, included = true, icon = 'check-circle' }: FeatureRowProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Icon
        source={included ? icon : 'close-circle'}
        size={20}
        color={included ? colors.success : colors.textSecondary}
      />
      <Text
        style={[
          styles.text,
          { color: included ? colors.textSecondary : colors.textSecondary },
          !included && styles.notIncluded,
        ]}
      >
        {feature}
      </Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    ...typography.body,
    flex: 1,
  },
  notIncluded: {
    opacity: 0.6,
  },
});

export default FeatureRow;
