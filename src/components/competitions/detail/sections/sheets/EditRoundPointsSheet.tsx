/**
 * EditRoundPointsSheet
 *
 * Organiser-facing editor for per-round win/tie/loss points. Supports both
 * `pair_points` (split/sub-match rounds) and `team_points` (combined rounds).
 *
 * The feature gate (organiser + advanced_round_rules) lives in
 * PointsConfigSection — this sheet is always functional when rendered.
 *
 * Bonus points (Task 8) are NOT included here.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { ROUND_TEMPLATES } from '@/constants/roundTemplates';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useUpdateRoundRules } from '@/hooks/rounds';
import type { Round } from '@/types/database.types';
import type {
  RoundRulesOverride,
  WinTieLossPoints,
} from '@/types/database/roundRules.types';

export interface EditRoundPointsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  round: Round;
  competitionId: string;
}

type PointsKey = 'pair_points' | 'team_points';

function clampNum(raw: string): number {
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 2) / 2; // allow halves (0.5)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EditRoundPointsSheet({
  visible,
  onDismiss,
  round,
  competitionId,
}: EditRoundPointsSheetProps) {
  const colors = useThemeColors();
  const { mutate, isPending } = useUpdateRoundRules();

  const override = (round.rules_override ?? {}) as RoundRulesOverride;
  const pointsKey: PointsKey = override.pair_points ? 'pair_points' : 'team_points';

  const defaultPoints: WinTieLossPoints =
    pointsKey === 'pair_points'
      ? { win: 1, tie: 0.5, loss: 0 }
      : { win: 2, tie: 1, loss: 0 };

  const currentPoints: WinTieLossPoints = override[pointsKey] ?? defaultPoints;

  const [win, setWin] = useState(String(currentPoints.win));
  const [tie, setTie] = useState(String(currentPoints.tie));
  const [loss, setLoss] = useState(String(currentPoints.loss));

  // Reset fields when sheet re-opens (new round or re-open after dismiss)
  useEffect(() => {
    if (visible) {
      const pts = (round.rules_override as RoundRulesOverride | null)?.[pointsKey] ?? defaultPoints;
      setWin(String(pts.win));
      setTie(String(pts.tie));
      setLoss(String(pts.loss));
    }
    // only re-run when visibility or round identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, round.id]);

  const winLabel = pointsKey === 'pair_points' ? 'Win (per match)' : 'Win (to team)';

  // The template baseline for "Reset to standard" — only shown when the round
  // has a template_id and that template defines the relevant points block.
  const templatePoints = useMemo<WinTieLossPoints | undefined>(() => {
    if (!override.template_id) return undefined;
    const t = ROUND_TEMPLATES[override.template_id];
    return t?.override[pointsKey];
  }, [override.template_id, pointsKey]);

  const handleVoid = () => {
    setWin('0');
    setTie('0');
    setLoss('0');
  };

  const handleResetStandard = () => {
    if (!templatePoints) return;
    setWin(String(templatePoints.win));
    setTie(String(templatePoints.tie));
    setLoss(String(templatePoints.loss));
  };

  const handleSave = () => {
    const points: WinTieLossPoints = {
      win: clampNum(win),
      tie: clampNum(tie),
      loss: clampNum(loss),
    };
    // Preserve all other override fields; only replace the points block.
    const next: RoundRulesOverride = { ...override, [pointsKey]: points };
    mutate(
      { roundId: round.id, competitionId, rulesOverride: next },
      { onSuccess: onDismiss }
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Edit Round Points"
      height={0.6}
      useModal
      testID="edit-round-points-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {/* Three numeric fields: Win / Tie / Loss */}
        <View style={styles.fieldsRow}>
          <PointField label={winLabel} value={win} onChange={setWin} disabled={isPending} />
          <PointField label="Tie" value={tie} onChange={setTie} disabled={isPending} />
          <PointField label="Loss" value={loss} onChange={setLoss} disabled={isPending} />
        </View>

        {/* Void points (side bet) */}
        <TouchableOpacity
          onPress={handleVoid}
          disabled={isPending}
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Void points for this round"
          accessibilityHint="Sets win, tie, and loss points to zero"
          activeOpacity={0.7}
        >
          <Icon source="cancel" size={18} color={colors.textSecondary} />
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            Void points (side bet)
          </Text>
        </TouchableOpacity>

        {/* Reset to standard — only when a template baseline exists */}
        {templatePoints && (
          <TouchableOpacity
            onPress={handleResetStandard}
            disabled={isPending}
            style={styles.linkBtn}
            accessibilityRole="button"
            accessibilityLabel="Reset round points to standard"
            activeOpacity={0.7}
          >
            <Text style={[typography.small, { color: colors.primary }]}>
              Reset to standard
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer: Cancel + Save */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={onDismiss}
          disabled={isPending}
          style={[styles.footerBtn, styles.cancelBtn, { borderColor: colors.gray300 }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[
            styles.footerBtn,
            { backgroundColor: colors.primary, opacity: isPending ? 0.6 : 1 },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Save round points"
        >
          <Text style={[styles.btnLabel, { color: colors.white }]}>
            {isPending ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single labeled numeric input
// ---------------------------------------------------------------------------

interface PointFieldProps {
  label: string;
  value: string;
  onChange: (s: string) => void;
  disabled: boolean;
}

function PointField({ label, value, onChange, disabled }: PointFieldProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            backgroundColor: colors.surfaceVariant,
          },
        ]}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        maxLength={6}
        selectTextOnFocus
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: {
    padding: spacing.lg,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    textAlign: 'center',
    ...typography.bodyBold,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  linkBtn: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  btnLabel: {
    ...typography.bodyBold,
  },
});
