/**
 * ReviewActions - Submit, edit, cancel action buttons for scorecard review
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

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
          // Always solid — `colors.surface` can be translucent (or transparent
          // on image backdrops), which makes the Edit Scores label hard to
          // read against scorecard rows underneath.
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onEditScores}
        style={[
          styles.editButton,
          styles.buttonContent,
          // When the submit button is hidden, let the edit button fill the bar.
          !isAllComplete && styles.editButtonFull,
          { borderColor: colors.primaryLighter },
        ]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Edit scores"
        accessibilityHint="Go back to edit hole-by-hole scores"
      >
        <Text style={[styles.editButtonLabel, { color: colors.primaryDark }]}>Edit Scores</Text>
      </TouchableOpacity>
      {isAllComplete && (
        <TouchableOpacity
          onPress={onSubmit}
          disabled={isSubmitting}
          style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Submit all scores"
          accessibilityHint={
            isOnline
              ? 'Submit all scores to the server'
              : 'Save scores offline for later submission'
          }
        >
          <LinearGradient
            colors={[colors.primaryLight, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.submitGradient, styles.buttonContent]}
          >
            {isSubmitting && <ActivityIndicator size="small" color={colors.textOnColored} style={{ marginRight: spacing.sm }} />}
            <Text style={[styles.submitButtonLabel, { color: colors.textOnColored }]}>
              {isOnline ? 'Submit All Scores' : 'Save Offline'}
            </Text>
          </LinearGradient>
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  editButton: {
    flexGrow: 0,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderRadius: 14,
  },
  editButtonFull: {
    flexGrow: 1,
  },
  editButtonLabel: {
    ...typography.bodyBold,
  },
  submitButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
  },
  submitButtonLabel: {
    ...typography.bodyBold,
  },
  buttonContent: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
