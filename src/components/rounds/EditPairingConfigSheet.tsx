/**
 * EditPairingConfigSheet — edit the pairing source / style / metric on an
 * existing round, with an optional "Re-seed now" pass that regenerates
 * pairings (or sub-matches) from the current standings.
 *
 * Mounted from two places:
 *   1. RoundSettingsScreen — tap the PairingSourceSummary card.
 *   2. SubMatchesTab Groups action row — tap the "Edit pairings" button.
 *
 * Both call sites gate on `round.status === 'upcoming'` + organiser. The
 * sheet itself doesn't re-check those — caller is responsible.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon, Switch } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { roundKeys, pairingKeys } from '@/hooks/queryKeys';
import { reseedRoundPairings, updateRound } from '@/services/rounds';
import {
  regenerateScoringPairsForRound,
  type RegenerateScoringPairsTeam,
} from '@/services/scoringPairs/regenerateForRound';
import type {
  BracketSeedingStyle,
  PairingSource,
  QualifyingMetric,
} from '@/types/database/enums';
import type { TeamWithMembers } from '@/types/database.types';
import type { RoundPresetConfig } from '@/constants/roundPresets';

const STYLE_OPTIONS: readonly { value: BracketSeedingStyle; label: string }[] = [
  { value: 'standard', label: 'Standard (1 vs N, 2 vs N-1…)' },
  { value: 'adjacent', label: 'Adjacent (1 vs 2, 3 vs 4…)' },
];

const METRIC_OPTIONS: readonly { value: QualifyingMetric; label: string }[] = [
  { value: 'competition_points', label: 'Competition points' },
  { value: 'stableford_points', label: 'Stableford points' },
  { value: 'net_strokes', label: 'Net strokes' },
];

export interface EditPairingConfigSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  competitionId: string;
  /** Round number — needed by the standings fetcher to filter prior rounds. */
  roundNumber: number;
  /** Drives the split vs combined branch inside `reseedRoundPairings` and
   *  the cross-team cardinality. */
  presetConfig: Pick<RoundPresetConfig, 'round_format' | 'sub_match_size'>;
  /** Round-level tee time (HH:MM:SS or HH:MM). */
  teeTime: string | null;
  /** Round is a team round. Used by the scoring-pair regen branch. */
  isTeamRound: boolean;
  /** Required when `presetConfig.round_format === 'split'` (e.g. ryder_cup_singles). */
  teams?: TeamWithMembers[];
  /** Round players — passed to the scoring-pair regen helper as the autogen
   *  fallback input. Pass `[]` if there are no players yet (regen no-ops). */
  players: { id: string }[];
  /** Initial config from the round row. */
  initial: {
    source: PairingSource;
    style: BracketSeedingStyle | null;
    metric: QualifyingMetric | null;
  };
  /** Called after a successful save (whether or not re-seed ran). */
  onSaved?: () => void;
}

const DEFAULT_STYLE: BracketSeedingStyle = 'standard';
const DEFAULT_METRIC: QualifyingMetric = 'competition_points';

export function EditPairingConfigSheet({
  visible,
  onDismiss,
  roundId,
  competitionId,
  roundNumber,
  presetConfig,
  teeTime,
  isTeamRound,
  teams,
  players,
  initial,
  onSaved,
}: EditPairingConfigSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  // Form state — initialise from `initial` on open. Style/metric default to
  // sensible values when the round is currently `manual` (the toggle hasn't
  // been on yet).
  const [standingsOn, setStandingsOn] = useState(initial.source === 'current_standings');
  const [style, setStyle] = useState<BracketSeedingStyle>(initial.style ?? DEFAULT_STYLE);
  const [metric, setMetric] = useState<QualifyingMetric>(initial.metric ?? DEFAULT_METRIC);
  const [reseedAfterSave, setReseedAfterSave] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStandingsOn(initial.source === 'current_standings');
    setStyle(initial.style ?? DEFAULT_STYLE);
    setMetric(initial.metric ?? DEFAULT_METRIC);
    setReseedAfterSave(true);
    setError(null);
  }, [visible, initial.source, initial.style, initial.metric]);

  // True when the next config is meaningfully different from what's saved.
  const hasChanges = useMemo(() => {
    const nextSource: PairingSource = standingsOn ? 'current_standings' : 'manual';
    if (nextSource !== initial.source) return true;
    if (!standingsOn) return false; // both are manual — style/metric ignored
    return style !== initial.style || metric !== initial.metric;
  }, [standingsOn, style, metric, initial]);

  // The save action runs in three phases: persist row → optional re-seed →
  // optional scoring-pair regen. We surface the row error inline; re-seed
  // errors block the flow (the user explicitly opted in); regen errors are
  // logged and swallowed (matches the SubMatchesTab shuffle path).
  const { mutateAsync: persistRow, isPending: isSavingRow } = useMutation({
    mutationFn: async (next: {
      source: PairingSource;
      style: BracketSeedingStyle;
      metric: QualifyingMetric;
    }) => {
      const isStandings = next.source === 'current_standings';
      await updateRound(roundId, {
        pairing_source: next.source,
        pairing_style: isStandings ? next.style : null,
        pairing_metric: isStandings ? next.metric : null,
      });
    },
  });

  const [isReseeding, setIsReseeding] = useState(false);
  const isPending = isSavingRow || isReseeding;

  const teamsForRegen = useMemo<RegenerateScoringPairsTeam[]>(() => {
    if (!teams) return [];
    return teams.map((t) => ({
      name: t.name,
      players: (t.members ?? [])
        .filter((m) => m.player_id)
        .map((m) => ({
          id: m.player_id,
          name: m.player?.name ?? 'Unknown',
          handicap: m.player?.handicap ?? null,
        })),
    }));
  }, [teams]);

  const invalidatePairingCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
    queryClient.invalidateQueries({ queryKey: pairingKeys.list(roundId) });
    queryClient.invalidateQueries({ queryKey: ['subMatches', roundId] });
    queryClient.invalidateQueries({ queryKey: ['scoringPairs', roundId] });
  }, [queryClient, roundId]);

  const handleSave = useCallback(async () => {
    setError(null);

    const nextSource: PairingSource = standingsOn ? 'current_standings' : 'manual';
    const next = { source: nextSource, style, metric };

    // Nothing changed — close immediately. No write, no re-seed.
    if (!hasChanges) {
      onDismiss();
      return;
    }

    try {
      await persistRow(next);
    } catch (err) {
      console.error('[EditPairingConfigSheet] Failed to persist row', err);
      setError('Could not save. Please try again.');
      return;
    }

    // Re-seed only when the new state is standings-driven AND the user
    // kept the checkbox on. Switching OFF intentionally leaves existing
    // pairings in place — info pill below tells the user that.
    if (nextSource === 'current_standings' && reseedAfterSave) {
      setIsReseeding(true);
      try {
        await reseedRoundPairings({
          roundId,
          competitionId,
          roundNumber,
          presetConfig,
          pairingStyle: style,
          pairingMetric: metric,
          teeTime,
          teams,
        });
      } catch (err) {
        setIsReseeding(false);
        console.error('[EditPairingConfigSheet] Re-seed failed', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Could not regenerate pairings. The pairing config was saved.'
        );
        // The row update succeeded — invalidate so the read-only summary
        // refreshes with the new style/metric, then bail without dismissing.
        invalidatePairingCaches();
        return;
      }

      // Best-effort scoring-pair regen so markers align with new groupings.
      // Same non-blocking semantics as the SubMatchesTab Shuffle path.
      try {
        // Pass the fresh pairings via an empty array — the helper will
        // resolve them via the autogen fallback for individual rounds, and
        // the cross-team fallback for team rounds. (It doesn't refetch
        // pairings; that's by design — the caller is the post-write site.)
        await regenerateScoringPairsForRound({
          roundId,
          isTeamRound,
          teamsWithMembers: teamsForRegen,
          pairings: [],
          players,
          logTag: 'EditPairingConfigSheet',
        });
      } catch (err) {
        console.warn('[EditPairingConfigSheet] Scoring-pair regen failed', err);
      } finally {
        setIsReseeding(false);
      }
    }

    invalidatePairingCaches();
    onSaved?.();
    onDismiss();
  }, [
    standingsOn,
    style,
    metric,
    hasChanges,
    persistRow,
    reseedAfterSave,
    roundId,
    competitionId,
    roundNumber,
    presetConfig,
    teeTime,
    teams,
    isTeamRound,
    teamsForRegen,
    players,
    invalidatePairingCaches,
    onSaved,
    onDismiss,
  ]);

  const switchingOff =
    initial.source === 'current_standings' && !standingsOn;

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Pairing rules"
      height={0.85}
      useModal
      testID="edit-pairing-config-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle row */}
        <View
          style={[
            styles.toggleCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.toggleText}>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
              Auto-pair from current standings
            </Text>
            <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
              Pairings are generated from the cumulative individual leaderboard
              of completed prior rounds.
            </Text>
          </View>
          <Switch
            value={standingsOn}
            onValueChange={setStandingsOn}
            disabled={isPending}
            accessibilityLabel={
              standingsOn
                ? 'Disable standings-based pairing'
                : 'Enable standings-based pairing'
            }
            testID="edit-pairing-source-toggle"
          />
        </View>

        {standingsOn && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Pairing style
            </Text>
            <View style={styles.chipColumn}>
              {STYLE_OPTIONS.map((opt) => {
                const selected = style === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setStyle(opt.value)}
                    disabled={isPending}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${opt.label}${selected ? ' (selected)' : ''}`}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: selected ? colors.white : colors.textPrimary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text
              style={[
                styles.fieldLabel,
                { color: colors.textSecondary, marginTop: spacing.lg },
              ]}
            >
              Standings metric
            </Text>
            <View style={styles.chipColumn}>
              {METRIC_OPTIONS.map((opt) => {
                const selected = metric === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setMetric(opt.value)}
                    disabled={isPending}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${opt.label}${selected ? ' (selected)' : ''}`}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: selected ? colors.white : colors.textPrimary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Re-seed-after-save checkbox */}
            <TouchableOpacity
              style={[
                styles.reseedRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setReseedAfterSave((v) => !v)}
              disabled={isPending}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: reseedAfterSave }}
              accessibilityLabel="Regenerate pairings now using these settings"
              testID="edit-pairing-reseed-checkbox"
            >
              <Icon
                source={
                  reseedAfterSave
                    ? 'checkbox-marked'
                    : 'checkbox-blank-outline'
                }
                size={22}
                color={reseedAfterSave ? colors.primary : colors.textSecondary}
              />
              <View style={styles.reseedText}>
                <Text style={[styles.reseedLabel, { color: colors.textPrimary }]}>
                  {initial.source === 'current_standings'
                    ? 'Regenerate pairings now using these settings'
                    : 'Generate pairings now from current standings'}
                </Text>
                <Text style={[styles.reseedHelper, { color: colors.textSecondary }]}>
                  Existing pairings on this round will be replaced.
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {switchingOff && (
          <View
            style={[styles.infoBox, { backgroundColor: colors.infoLight }]}
          >
            <Icon source="information-outline" size={18} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.infoDark }]}>
              Existing pairings stay in place. Switching off only stops future
              standings-driven re-seeds.
            </Text>
          </View>
        )}

        {error && (
          <View
            style={[styles.errorBox, { backgroundColor: colors.errorLight }]}
          >
            <Icon source="alert-circle-outline" size={18} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.errorDark }]}>
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={onDismiss}
          style={[styles.button, styles.cancelButton, { borderColor: colors.gray300 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          disabled={isPending}
        >
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.button,
            { backgroundColor: isPending ? colors.gray300 : colors.primary },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          disabled={isPending}
          testID="edit-pairing-save"
        >
          <Text style={[styles.buttonLabel, { color: colors.white }]}>
            {isReseeding ? 'Re-seeding…' : isSavingRow ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

export default EditPairingConfigSheet;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.bodyBold,
  },
  toggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  fieldLabel: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipColumn: {
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipLabel: {
    ...typography.small,
    fontWeight: '600',
  },
  reseedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  reseedText: {
    flex: 1,
  },
  reseedLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  reseedHelper: {
    ...typography.caption,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorText: {
    ...typography.small,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});
