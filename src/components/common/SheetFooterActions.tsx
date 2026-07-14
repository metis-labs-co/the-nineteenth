import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';

export interface SheetFooterActionsProps {
  /** Cancel/dismiss handler. */
  onCancel: () => void;
  /** Save/confirm handler. */
  onSave: () => void;
  /** Whether a save is in flight — disables both buttons and shows the saving label. */
  saving?: boolean;
  cancelLabel?: string;
  saveLabel?: string;
  savingLabel?: string;
  testID?: string;
}

/**
 * The Cancel / Save footer shared by the competition- and round-detail edit
 * sheets: a top-bordered row with an outlined Cancel button and a filled Save
 * button that flips to a "Saving…" label while a mutation is pending.
 */
export function SheetFooterActions({
  onCancel,
  onSave,
  saving = false,
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  savingLabel = 'Saving…',
  testID,
}: SheetFooterActionsProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]} testID={testID}>
      <TouchableOpacity
        onPress={onCancel}
        style={[styles.button, styles.cancelButton, { borderColor: colors.gray300 }]}
        activeOpacity={0.7}
        accessibilityRole="button"
        disabled={saving}
        testID={testID ? `${testID}-cancel` : undefined}
      >
        <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>
          {cancelLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSave}
        style={[styles.button, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        disabled={saving}
        testID={testID ? `${testID}-save` : undefined}
      >
        <Text style={[styles.buttonLabel, { color: colors.white }]}>
          {saving ? savingLabel : saveLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});

export default SheetFooterActions;
