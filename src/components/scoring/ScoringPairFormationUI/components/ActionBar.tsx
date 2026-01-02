/**
 * ActionBar - Bottom action bar with save/cancel/reset buttons
 *
 * Provides save and cancel/reset actions for the pairing UI.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { IconCheck, IconRefresh } from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  layout,
  type ColorPalette,
} from '@/constants/theme';

interface ActionBarProps {
  hasChanges: boolean;
  canSave: boolean;
  onSave: () => void;
  onReset: () => void;
  onCancel: () => void;
  colors: ColorPalette;
}

export const ActionBar = React.memo(function ActionBar({
  hasChanges,
  canSave,
  onSave,
  onReset,
  onCancel,
  colors,
}: ActionBarProps) {
  const handleSecondaryAction = hasChanges ? onReset : onCancel;
  const secondaryLabel = hasChanges ? 'Reset' : 'Cancel';

  return (
    <View
      style={[
        styles.container,
        {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.resetButton, { borderColor: colors.border }]}
        onPress={handleSecondaryAction}
        accessibilityRole="button"
        accessibilityLabel={secondaryLabel}
      >
        {hasChanges && <IconRefresh size={18} color={colors.textSecondary} />}
        <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
          {secondaryLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: colors.primary },
          !canSave && styles.buttonDisabled,
        ]}
        onPress={onSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityLabel="Save scoring pairs"
        accessibilityHint={!canSave ? 'All players must be covered to save' : undefined}
      >
        <IconCheck size={20} color={colors.textInverse} />
        <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
          Save Pairs
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: layout.buttonHeight,
  },
  resetButtonText: {
    ...typography.bodyBold,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: layout.buttonHeight,
    ...shadows.sm,
  },
  saveButtonText: {
    ...typography.bodyBold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ActionBar;
