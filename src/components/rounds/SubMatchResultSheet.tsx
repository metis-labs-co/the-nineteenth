/**
 * SubMatchResultSheet
 *
 * Organiser-only entry for a manual sub-match result: pick the winner (Team A /
 * Halved / Team B) and, for a winner, the margin as holes-up & holes-to-play
 * (e.g. "6 & 5"). Calls onSubmit with values ready for useUpdateSubMatchResult.
 */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common/GolfBallLoader';
import { SystemModalTheme } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { formatMatchMargin } from '@/utils/matchMargin';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export interface ManualSubMatchResult {
  result: 'a-wins' | 'b-wins' | 'halved';
  finalDifferential: number | null;
  finalHolesRemaining: number | null;
}

/** Pure mapper from the form's winner + margin to the persisted result shape. */
export function buildManualResult(
  winner: 'a' | 'b' | 'halved',
  holesUp: number,
  holesRemaining: number
): ManualSubMatchResult {
  if (winner === 'halved') {
    return { result: 'halved', finalDifferential: null, finalHolesRemaining: null };
  }
  return {
    result: winner === 'a' ? 'a-wins' : 'b-wins',
    finalDifferential: holesUp,
    finalHolesRemaining: holesRemaining > 0 ? holesRemaining : null,
  };
}

export interface SubMatchResultSheetProps {
  visible: boolean;
  teamALabel: string;
  teamBLabel: string;
  loading?: boolean;
  onSubmit: (result: ManualSubMatchResult) => void;
  onCancel: () => void;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

interface StepperProps {
  label: string;
  value: number;
  set: (n: number) => void;
  min: number;
  max: number;
  colors: ReturnType<typeof useThemeColors>;
}

function Stepper({ label, value, set, min, max, colors }: StepperProps) {
  return (
    <View style={styles.stepperRow}>
      <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => set(clamp(value - 1, min, max))}
          accessibilityRole="button" accessibilityLabel={`Decrease ${label}`}
        >
          <Icon source="minus" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{value}</Text>
        <TouchableOpacity
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => set(clamp(value + 1, min, max))}
          accessibilityRole="button" accessibilityLabel={`Increase ${label}`}
        >
          <Icon source="plus" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SubMatchResultSheet({
  visible,
  teamALabel,
  teamBLabel,
  loading = false,
  onSubmit,
  onCancel,
}: SubMatchResultSheetProps) {
  const colors = useThemeColors();
  const [winner, setWinner] = useState<'a' | 'b' | 'halved'>('a');
  const [holesUp, setHolesUp] = useState(1);
  const [holesRemaining, setHolesRemaining] = useState(0);

  const preview = useMemo(() => {
    if (winner === 'halved') return 'Halved (A/S)';
    const side = winner === 'a' ? teamALabel : teamBLabel;
    return `${side} — ${formatMatchMargin(holesUp, holesRemaining, false)}`;
  }, [winner, holesUp, holesRemaining, teamALabel, teamBLabel]);

  const options: { key: 'a' | 'halved' | 'b'; label: string }[] = [
    { key: 'a', label: teamALabel },
    { key: 'halved', label: 'Halved' },
    { key: 'b', label: teamBLabel },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <SystemModalTheme>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surfaceElevated }, shadows.lg]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Set match result</Text>

              <View style={styles.winnerRow}>
                {options.map((o) => {
                  const active = winner === o.key;
                  return (
                    <TouchableOpacity
                      key={o.key}
                      style={[
                        styles.winnerBtn,
                        { borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primaryLighter : 'transparent' },
                      ]}
                      onPress={() => setWinner(o.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`Winner ${o.label}`}
                    >
                      <Text style={[styles.winnerText, { color: active ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {winner !== 'halved' && (
                <>
                  <Stepper label="Holes up" value={holesUp} set={setHolesUp} min={1} max={17} colors={colors} />
                  <Stepper label="Holes to play" value={holesRemaining} set={setHolesRemaining} min={0} max={17} colors={colors} />
                </>
              )}

              <Text style={[styles.preview, { color: colors.textSecondary }]}>{preview}</Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.borderStrong }]}
                  onPress={onCancel} disabled={loading}
                  accessibilityRole="button" accessibilityLabel="Cancel"
                >
                  <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                  onPress={() => onSubmit(buildManualResult(winner, holesUp, holesRemaining))}
                  disabled={loading}
                  accessibilityRole="button" accessibilityLabel="Save result"
                >
                  {loading ? <GolfBallLoader size="sm" /> : (
                    <Text style={[styles.buttonText, { color: colors.textOnColored }]}>Save result</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      </SystemModalTheme>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  container: { width: '100%', maxWidth: 380, borderRadius: borderRadius.xl, padding: spacing.xl },
  title: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  winnerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  winnerBtn: { flex: 1, height: 44, borderRadius: borderRadius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  winnerText: { ...typography.smallBold },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  stepperLabel: { ...typography.body },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: { width: 40, height: 40, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { ...typography.bodyBold, minWidth: 24, textAlign: 'center' },
  preview: { ...typography.body, textAlign: 'center', marginVertical: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  button: { flex: 1, height: 48, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { ...typography.bodyBold },
});
