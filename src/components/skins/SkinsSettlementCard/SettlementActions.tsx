/**
 * SettlementActions - Action buttons for the settlement card (settle + share)
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, skinsColor } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface SettlementActionsProps {
  /** Callback when share button is pressed */
  onShare: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SettlementActions = React.memo(function SettlementActions({
  onShare,
}: SettlementActionsProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.actions}>
      {/* Mark as Settled - Disabled for now (future feature) */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          styles.settledButton,
          { borderColor: colors.border, opacity: 0.5 },
        ]}
        disabled
        accessibilityLabel="Mark as settled (coming soon)"
        accessibilityHint="This feature is not yet available"
      >
        <Icon source="check" size={20} color={colors.textSecondary} />
        <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
          Mark as Settled
        </Text>
      </TouchableOpacity>

      {/* Share Results */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          styles.shareButton,
          { backgroundColor: skinsColor },
        ]}
        onPress={onShare}
        accessibilityLabel="Share results"
        accessibilityHint="Share the skins game results with others"
        accessibilityRole="button"
      >
        <Icon source="share-variant" size={20} color="#fff" />
        <Text style={[styles.actionButtonText, { color: '#fff' }]}>
          Share Results
        </Text>
      </TouchableOpacity>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: 48,
  },
  settledButton: {
    borderWidth: 1,
  },
  shareButton: {
    // Background color applied inline
  },
  actionButtonText: {
    ...typography.bodyBold,
  },
});
