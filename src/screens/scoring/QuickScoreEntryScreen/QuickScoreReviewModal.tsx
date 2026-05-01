/**
 * QuickScoreReviewModal - Summary modal before saving quick-entered scores
 */

import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';

interface QuickScoreReviewModalProps {
  visible: boolean;
  playerName: string;
  courseName: string;
  totalGross: number;
  totalNet: number;
  totalPoints: number;
  holesEntered: number;
  totalHoles: number;
  handicapDifferential?: number | null;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const QuickScoreReviewModal = React.memo(function QuickScoreReviewModal({
  visible,
  playerName,
  courseName,
  totalGross,
  totalNet,
  totalPoints,
  holesEntered,
  totalHoles,
  handicapDifferential,
  isSaving,
  onConfirm,
  onCancel,
}: QuickScoreReviewModalProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surfaceElevated }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Review Scores</Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {playerName} · {courseName}
          </Text>

          <View style={[styles.statsGrid, { borderColor: colors.border }]}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gross Score</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalGross}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Net Score</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalNet}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Stableford Points</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalPoints}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Holes Entered</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{holesEntered}/{totalHoles}</Text>
            </View>
            {handicapDifferential != null && (
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>HC Differential</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{handicapDifferential.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {holesEntered < totalHoles && (
            <Text style={[styles.warning, { color: colors.warning }]}>
              {totalHoles - holesEntered} holes have no score entered. The scorecard will be saved as-is.
            </Text>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onCancel}
              disabled={isSaving}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }]}
              onPress={onConfirm}
              disabled={isSaving}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>
                {isSaving ? 'Saving...' : 'Confirm & Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    ...typography.body,
  },
  statValue: {
    ...typography.bodyBold,
  },
  warning: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    ...typography.bodyBold,
  },
});

export default QuickScoreReviewModal;
