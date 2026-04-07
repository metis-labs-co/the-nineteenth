/**
 * ModalFooter - Footer section of the MismatchResolutionModal
 *
 * Contains the "Done" button and hint text when not all mismatches are resolved.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface ModalFooterProps {
  /** Whether all mismatches are resolved */
  allResolved: boolean;
  /** Whether a resolution is currently in progress */
  isResolving: boolean;
  /** Called when done button is pressed */
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ModalFooter = React.memo(function ModalFooter({
  allResolved,
  isResolving,
  onClose,
}: ModalFooterProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[
          styles.doneButton,
          {
            backgroundColor: allResolved ? colors.primary : colors.surfaceVariant,
          },
        ]}
        onPress={onClose}
        disabled={!allResolved}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Done"
        accessibilityState={{ disabled: !allResolved }}
      >
        {isResolving ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text
            style={[
              styles.doneButtonText,
              { color: allResolved ? colors.white : colors.textDisabled },
            ]}
          >
            Done
          </Text>
        )}
      </TouchableOpacity>
      {!allResolved && (
        <Text style={[styles.footerHint, { color: colors.textSecondary }]}>
          Resolve all differences to continue
        </Text>
      )}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  doneButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  doneButtonText: {
    ...typography.bodyBold,
  },
  footerHint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
