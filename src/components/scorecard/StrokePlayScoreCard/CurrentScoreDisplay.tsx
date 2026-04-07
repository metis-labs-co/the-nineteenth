/**
 * CurrentScoreDisplay Component
 *
 * Shows the currently selected score with relative-to-par description,
 * pick up button, undo button, or "Tap a score above" prompt.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  formatRelativeToPar,
  formatParScoreDisplay,
  getParScoreLabel,
} from './scoreCardHelpers';

interface CurrentScoreDisplayProps {
  selectedScore: number | undefined;
  isPickedUp: boolean;
  currentRelativeToPar: number | null;
  scoreDescription: string | null;
  displayMode: 'stroke' | 'par';
  currentParScore: number | null;
  currentHolePar: number;
  disabled: boolean;
  onScoreSelect: (strokes: number) => void;
  onPickUp: () => void;
  getScoreColor: (relativeToPar: number | null) => string;
  getParScoreColor: (parScore: number | null) => string;
}

export const CurrentScoreDisplay = React.memo(function CurrentScoreDisplay({
  selectedScore,
  isPickedUp,
  currentRelativeToPar,
  scoreDescription,
  displayMode,
  currentParScore,
  currentHolePar,
  disabled,
  onScoreSelect,
  onPickUp,
  getScoreColor,
  getParScoreColor,
}: CurrentScoreDisplayProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.currentScoreContainer, { backgroundColor: colors.surface }]}>
      {isPickedUp ? (
        <View style={styles.currentScoreRow}>
          <Text style={[styles.currentScoreLabel, { color: colors.textSecondary }]}>
            Picked Up
          </Text>
          <TouchableOpacity
            style={[styles.undoButton, { borderColor: colors.border }]}
            onPress={() => onScoreSelect(currentHolePar)}
            disabled={disabled}
          >
            <Text style={[styles.undoButtonText, { color: colors.textSecondary }]}>
              Undo
            </Text>
          </TouchableOpacity>
        </View>
      ) : selectedScore ? (
        <View style={styles.currentScoreRow}>
          <Text style={[styles.currentScoreLabel, { color: colors.textSecondary }]}>
            Current:
          </Text>
          <View style={styles.currentScoreValue}>
            <Text
              style={[
                styles.currentScoreNumber,
                { color: displayMode === 'par' ? getParScoreColor(currentParScore) : getScoreColor(currentRelativeToPar) },
              ]}
            >
              {selectedScore}
            </Text>
            <Text style={[styles.currentScoreEquals, { color: colors.textSecondary }]}>
              =
            </Text>
            {displayMode === 'par' ? (
              <Text
                style={[
                  styles.currentScoreRelative,
                  { color: getParScoreColor(currentParScore) },
                ]}
              >
                {formatParScoreDisplay(currentParScore ?? 0)} ({getParScoreLabel(currentParScore)})
              </Text>
            ) : (
              <Text
                style={[
                  styles.currentScoreRelative,
                  { color: getScoreColor(currentRelativeToPar) },
                ]}
              >
                {formatRelativeToPar(currentRelativeToPar)} ({scoreDescription})
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.pickUpButton, { backgroundColor: colors.error + '20' }]}
            onPress={onPickUp}
            disabled={disabled}
          >
            <Text style={[styles.pickUpButtonText, { color: colors.error }]}>
              Pick Up
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.noScoreText, { color: colors.textSecondary }]}>
          Tap a score above
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  currentScoreContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  currentScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentScoreLabel: {
    ...typography.body,
  },
  currentScoreValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  currentScoreNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  currentScoreEquals: {
    ...typography.body,
  },
  currentScoreRelative: {
    ...typography.bodyBold,
  },
  pickUpButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  pickUpButtonText: {
    ...typography.smallBold,
  },
  undoButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  undoButtonText: {
    ...typography.smallBold,
  },
  noScoreText: {
    ...typography.body,
    textAlign: 'center',
  },
});
