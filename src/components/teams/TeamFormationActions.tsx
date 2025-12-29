// src/components/teams/TeamFormationActions.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { IconRefresh, IconCheck, IconAlertCircle } from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  layout,
  type ColorPalette,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface TeamFormationActionsProps {
  hasChanges: boolean;
  canSave: boolean;
  allPlayersAssigned: boolean;
  teamsExist: boolean;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * TeamFormationActions - Action bar for team formation
 *
 * Displays:
 * - Validation warning when not all players assigned
 * - Reset/Cancel button (shows Reset if changes, Cancel otherwise)
 * - Save Teams button (disabled until valid)
 */
export const TeamFormationActions = React.memo(function TeamFormationActions({
  hasChanges,
  canSave,
  allPlayersAssigned,
  teamsExist,
  onReset,
  onCancel,
  onSave,
}: TeamFormationActionsProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const showValidationWarning = teamsExist && !allPlayersAssigned;

  return (
    <>
      {/* Validation Warning */}
      {showValidationWarning && (
        <View style={styles.validationWarning}>
          <IconAlertCircle size={16} color={colors.warning} />
          <Text style={styles.validationText}>
            Not all players are assigned to teams
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={hasChanges ? onReset : onCancel}
          accessibilityRole="button"
          accessibilityLabel={hasChanges ? 'Reset changes' : 'Cancel'}
        >
          {hasChanges && <IconRefresh size={18} color={colors.textSecondary} />}
          <Text style={styles.resetButtonText}>
            {hasChanges ? 'Reset' : 'Cancel'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.buttonDisabled]}
          onPress={onSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save teams"
          accessibilityHint={!canSave ? 'All players must be assigned to save' : undefined}
        >
          <IconCheck size={20} color={colors.textInverse} />
          <Text style={styles.saveButtonText}>Save Teams</Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    validationWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.warning}15`,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    validationText: {
      ...typography.small,
      color: colors.warning,
    },
    actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing.md,
      paddingBottom: spacing.xxl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.md,
      backgroundColor: colors.surface,
    },
    resetButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      minHeight: layout.buttonHeight,
    },
    resetButtonText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    saveButton: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      gap: spacing.sm,
      minHeight: layout.buttonHeight,
      ...shadows.sm,
    },
    saveButtonText: {
      ...typography.bodyBold,
      color: colors.textInverse,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });

export default TeamFormationActions;
