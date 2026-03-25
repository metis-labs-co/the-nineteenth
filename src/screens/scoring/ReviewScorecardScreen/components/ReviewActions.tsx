/**
 * ReviewActions - Submit, edit, cancel action buttons for scorecard review
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface ReviewActionsProps {
  isOnline: boolean;
  isSubmitting: boolean;
  onEditScores: () => void;
  onSubmit: () => void;
  /** Whether all holes have been scored - shows submit button when true */
  isAllComplete?: boolean;
}

export function ReviewActions({
  isOnline,
  isSubmitting,
  onEditScores,
  onSubmit,
  isAllComplete = false,
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
      <TouchableOpacity
        onPress={onEditScores}
        style={[styles.editButton, styles.buttonContent, { borderColor: colors.gray400 }]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Edit scores"
        accessibilityHint="Go back to edit hole-by-hole scores"
      >
        <Text style={[styles.editButtonLabel, { color: colors.textPrimary }]}>Edit Scores</Text>
      </TouchableOpacity>
      {isAllComplete && (
        <TouchableOpacity
          onPress={onSubmit}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            styles.buttonContent,
            { backgroundColor: colors.success },
            isSubmitting && { opacity: 0.6 },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Submit all scores"
          accessibilityHint={
            isOnline
              ? 'Submit all scores to the server'
              : 'Save scores offline for later submission'
          }
        >
          {isSubmitting && <ActivityIndicator size="small" color={colors.textInverse} style={{ marginRight: spacing.sm }} />}
          <Text style={[styles.submitButtonLabel, { color: colors.textInverse }]}>
            {isOnline ? 'Submit All Scores' : 'Save Offline'}
          </Text>
        </TouchableOpacity>
      )}
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
    borderRadius: borderRadius.lg,
  },
  editButtonLabel: {
    ...typography.bodyBold,
  },
  submitButton: {
    flex: 2,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
  },
  submitButtonLabel: {
    ...typography.bodyBold,
  },
  buttonContent: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
