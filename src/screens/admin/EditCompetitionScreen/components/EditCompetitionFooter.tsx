/**
 * EditCompetitionFooter - Save and cancel buttons
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface EditCompetitionFooterProps {
  onCancel: () => void;
  onSave: () => void;
  isDisabled: boolean;
  isSaving: boolean;
}

export function EditCompetitionFooter({
  onCancel,
  onSave,
  isDisabled,
  isSaving,
}: EditCompetitionFooterProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: insets.bottom + spacing.md,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onCancel}
        style={[styles.cancelButton, { borderColor: colors.border }]}
        accessibilityLabel="Cancel"
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSave}
        disabled={isDisabled}
        style={[
          styles.saveButton,
          { backgroundColor: isDisabled ? colors.gray200 : colors.primary },
        ]}
        accessibilityLabel="Save changes"
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.textOnColored} />
        ) : (
          <Text
            style={[
              styles.buttonText,
              { color: isDisabled ? colors.textDisabled : colors.textOnColored },
            ]}
          >
            Save Changes
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    flex: 2,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
