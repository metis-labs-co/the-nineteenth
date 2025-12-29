/**
 * ReviewActions - Submit, edit, cancel action buttons for scorecard review
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface ReviewActionsProps {
  isOnline: boolean;
  isSubmitting: boolean;
  onEditScores: () => void;
  onSubmit: () => void;
}

export function ReviewActions({
  isOnline,
  isSubmitting,
  onEditScores,
  onSubmit,
}: ReviewActionsProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.actionBar,
        {
          paddingBottom: insets.bottom + spacing.md,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <Button
        mode="outlined"
        onPress={onEditScores}
        style={[styles.editButton, { borderColor: colors.gray400 }]}
        contentStyle={styles.buttonContent}
        labelStyle={[styles.editButtonLabel, { color: colors.textPrimary }]}
        accessibilityLabel="Edit scores"
        accessibilityHint="Go back to edit hole-by-hole scores"
      >
        Edit Scores
      </Button>
      <Button
        mode="contained"
        onPress={onSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={[styles.submitButton, { backgroundColor: colors.success }]}
        contentStyle={styles.buttonContent}
        labelStyle={[styles.submitButtonLabel, { color: colors.textInverse }]}
        accessibilityLabel="Submit all scores"
        accessibilityHint={
          isOnline
            ? 'Submit all scores to the server'
            : 'Save scores offline for later submission'
        }
      >
        {isOnline ? 'Submit All Scores' : 'Save Offline'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  editButton: {
    flex: 1,
    borderWidth: 2,
  },
  editButtonLabel: {
    ...typography.bodyBold,
  },
  submitButton: {
    flex: 2,
  },
  submitButtonLabel: {
    ...typography.bodyBold,
  },
  buttonContent: {
    minHeight: 48,
  },
});
