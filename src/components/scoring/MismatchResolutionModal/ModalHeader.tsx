/**
 * ModalHeader - Header section of the MismatchResolutionModal
 *
 * Displays the warning icon, title, subtitle, and close button.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface ModalHeaderProps {
  /** Partner's display name */
  partnerName: string;
  /** Whether all mismatches are resolved (enables close) */
  allResolved: boolean;
  /** Called when close button is pressed */
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ModalHeader = React.memo(function ModalHeader({
  partnerName,
  allResolved,
  onClose,
}: ModalHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
      <View style={styles.modalTitleContainer}>
        <View
          style={[styles.warningIconContainer, { backgroundColor: colors.warning + '20' }]}
        >
          <Icon source="alert-circle" size={24} color={colors.warning} />
        </View>
        <View>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            Resolve Score Differences
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            You and {partnerName} recorded different scores
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: colors.gray200 }]}
        onPress={onClose}
        disabled={!allResolved}
        activeOpacity={0.7}
        accessibilityLabel="Close"
        accessibilityRole="button"
        accessibilityState={{ disabled: !allResolved }}
      >
        <Icon
          source="close"
          size={20}
          color={allResolved ? colors.textPrimary : colors.textDisabled}
        />
      </TouchableOpacity>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  warningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h4,
  },
  modalSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
