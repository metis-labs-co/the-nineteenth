/**
 * EndRoundEarlySheet — confirmation for ending a social round early.
 *
 * Presentational: the plan (finishing hole, removed scores) comes from
 * planEndRoundEarly and the one-line result from describeEndRoundEarlyResult,
 * both supplied by useEndRoundEarly. Ending is final — there is no Resume.
 *
 * Renders inline via BottomSheet (no RN <Modal>; `useModal` defaults to
 * false) like ChangeTeesSheet, so it stays in the screen's own theme and
 * needs no SystemModalTheme wrap.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { displayHoleNumber } from '@/utils/holeTransformers';
import type { EndRoundEarlyPlan } from '@/utils/endRoundEarly';

export interface EndRoundEarlySheetProps {
  visible: boolean;
  plan: EndRoundEarlyPlan | null;
  /** e.g. "Dave wins 2 UP", "Halved A/S", "Sam leads on 31 pts" */
  resultPreview: string | null;
  /** Display offset for combo courses (default 1); copy uses displayHoleNumber. */
  startHole?: number;
  loading?: boolean;
  /**
   * The round's handicap_source isn't 'none' (R22): warn that ending early
   * turns it into a practice round, in place of the generic handicap line.
   */
  handicapRound?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const GENERIC_HANDICAP_NOTICE = "This round won't count towards your handicap index.";
const HANDICAP_ROUND_NOTICE =
  "This is a handicap round. Ending it early makes it a practice round, and it won't count towards your handicap index.";

export function EndRoundEarlySheet({
  visible,
  plan,
  resultPreview,
  startHole = 1,
  loading = false,
  handicapRound = false,
  onConfirm,
  onCancel,
}: EndRoundEarlySheetProps) {
  const colors = useThemeColors();

  if (!plan) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onCancel}
      dismissible={!loading}
      height={0.6}
      title="End round early"
      testID="end-round-early-sheet"
    >
      <View style={styles.container}>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={[styles.question, { color: colors.textPrimary }]}>
            {`End round after hole ${displayHoleNumber(plan.lastHoleNumber, startHole)}?`}
          </Text>

          {resultPreview ? (
            <View style={[styles.resultRow, { backgroundColor: colors.surfaceVariant }]}>
              <Icon source="trophy-outline" size={20} color={colors.primary} />
              <Text style={[styles.resultText, { color: colors.textPrimary }]}>{resultPreview}</Text>
            </View>
          ) : null}

          {plan.removedScores.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                These scores will be removed:
              </Text>
              {plan.removedScores.map((removed) => (
                <Text
                  key={`${removed.playerId}-${removed.holeNumber}`}
                  style={[styles.removedRow, { color: colors.textPrimary }]}
                >
                  {`${removed.playerName} – hole ${displayHoleNumber(removed.holeNumber, startHole)}`}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.noticeRow}>
            <Icon
              source="alert-circle-outline"
              size={18}
              color={handicapRound ? colors.warning : colors.textSecondary}
            />
            <Text
              style={[
                styles.noticeText,
                { color: handicapRound ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {handicapRound ? HANDICAP_ROUND_NOTICE : GENERIC_HANDICAP_NOTICE}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.keepButton,
              { borderColor: colors.border, backgroundColor: colors.surfaceVariant },
              loading && styles.buttonDisabled,
            ]}
            onPress={onCancel}
            disabled={loading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Keep playing"
            accessibilityState={{ disabled: loading }}
            testID="end-round-early-cancel"
          >
            <Text style={[styles.buttonLabel, { color: colors.textPrimary }]}>Keep playing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.error }, loading && styles.buttonDisabled]}
            onPress={onConfirm}
            disabled={loading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="End round"
            accessibilityState={{ disabled: loading, busy: loading }}
            testID="end-round-early-confirm"
          >
            <Text style={[styles.buttonLabel, { color: colors.white }]}>
              {loading ? 'Ending…' : 'End round'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  question: {
    ...typography.bodyBold,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  resultText: {
    ...typography.bodyBold,
    flex: 1,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    ...typography.small,
  },
  removedRow: {
    ...typography.body,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noticeText: {
    ...typography.small,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButton: {
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});

export default EndRoundEarlySheet;
