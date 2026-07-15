/**
 * QuickScoreReviewModal - Summary modal before saving quick-entered scores
 */

import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
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

          <View style={[styles.statsGrid, { backgroundColor: colors.surfaceVariant }]}>
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
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalPoints}</Text>
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
              style={[styles.button, styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={onCancel}
              disabled={isSaving}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { opacity: isSaving ? 0.6 : 1 }]}
              onPress={onConfirm}
              disabled={isSaving}
            >
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmGradient}
              >
                <Text style={[styles.buttonText, { color: colors.white }]}>
                  {isSaving ? 'Saving...' : 'Confirm & Save'}
                </Text>
              </LinearGradient>
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
    fontWeight: '800',
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.small,
    fontSize: 12.5,
    marginBottom: spacing.md,
  },
  statsGrid: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    ...typography.small,
    fontSize: 13,
  },
  statValue: {
    ...typography.bodyBold,
    fontSize: 15,
    fontWeight: '700',
  },
  warning: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cancelButton: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  buttonText: {
    ...typography.bodyBold,
    fontSize: 15,
  },
});

export default QuickScoreReviewModal;
