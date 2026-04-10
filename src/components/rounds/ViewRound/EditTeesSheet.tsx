/**
 * EditTeesSheet
 *
 * Bottom sheet for correcting the tee each player used on a completed
 * round. When the round owner realises the wizard auto-selected the
 * wrong tee (or they meant to change it and forgot), opening this sheet
 * lets them pick the correct tee per player. Saving writes a per-player
 * override to `round_players.selected_tee` and triggers
 * `recalculateScorecardDifferential` so the stored handicap snapshot +
 * stableford points are rebuilt against the new tee.
 *
 * Used from RoundSettingsScreen.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { GolfBallLoader } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useUpdatePlayerTee } from '@/hooks/rounds/mutations';
import { getTeeColor } from '@/screens/rounds/CreateRoundBottomSheet/types';
import type { TeeBox } from '@/types/database/base';
import type { ScorecardWithPlayer, RoundPlayer } from '@/hooks/rounds/queries';

// ============================================================================
// PROPS
// ============================================================================

export interface EditTeesSheetProps {
  visible: boolean;
  onClose: () => void;
  roundId: string;
  competitionId?: string;
  /** All available tees for the course — from round.course.tees. */
  availableTees: TeeBox[];
  /** The scorecards for this round. We key edits by (scorecardId, playerId). */
  scorecards: ScorecardWithPlayer[];
  /** Round players (optional) — used for display names when a player has no scorecard yet. */
  roundPlayers?: RoundPlayer[];
  /** Current per-player tee overrides, keyed by playerId. */
  currentTees: Map<string, TeeBox | null>;
  /** Round's default tee (shown when a player has no override). */
  roundDefaultTee: TeeBox | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditTeesSheet({
  visible,
  onClose,
  roundId,
  competitionId,
  availableTees,
  scorecards,
  roundPlayers,
  currentTees,
  roundDefaultTee,
}: EditTeesSheetProps) {
  const colors = useThemeColors();
  const { mutateAsync: updatePlayerTee, isPending } = useUpdatePlayerTee();

  // Local per-player tee selections. Keyed by playerId. Initialized from
  // the current override (or round default) on first render / reopen.
  const initialSelections = useMemo(() => {
    const map = new Map<string, TeeBox | null>();
    for (const sc of scorecards) {
      const override = currentTees.get(sc.player_id);
      map.set(sc.player_id, override ?? roundDefaultTee);
    }
    return map;
  }, [scorecards, currentTees, roundDefaultTee]);

  const [selections, setSelections] = useState<Map<string, TeeBox | null>>(initialSelections);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset local state when the sheet is re-opened with new data.
  React.useEffect(() => {
    if (visible) {
      setSelections(initialSelections);
      setErrorMessage(null);
    }
  }, [visible, initialSelections]);

  const handlePickTee = useCallback((playerId: string, tee: TeeBox) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(playerId, tee);
      return next;
    });
  }, []);

  const hasChanges = useMemo(() => {
    for (const sc of scorecards) {
      const initial = initialSelections.get(sc.player_id);
      const current = selections.get(sc.player_id);
      if (initial?.tee_id !== current?.tee_id || initial?.name !== current?.name) {
        return true;
      }
    }
    return false;
  }, [scorecards, initialSelections, selections]);

  const handleSave = useCallback(async () => {
    setErrorMessage(null);

    // Only push mutations for scorecards whose tee actually changed.
    const changed = scorecards.filter((sc) => {
      const initial = initialSelections.get(sc.player_id);
      const current = selections.get(sc.player_id);
      return (
        initial?.tee_id !== current?.tee_id || initial?.name !== current?.name
      );
    });

    if (changed.length === 0) {
      onClose();
      return;
    }

    try {
      // Sequential to avoid hammering Supabase / getting rate-limited on the
      // server-side recalc. Small N (max a few players per round).
      for (const sc of changed) {
        const tee = selections.get(sc.player_id);
        if (!tee) continue;
        await updatePlayerTee({
          roundId,
          playerId: sc.player_id,
          scorecardId: sc.id,
          tee,
          competitionId,
        });
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update tees');
    }
  }, [scorecards, selections, initialSelections, roundId, competitionId, updatePlayerTee, onClose]);

  // Build display rows: one per scorecard + a friendly fallback name.
  const playerRows = useMemo(() => {
    return scorecards.map((sc) => {
      const playerName =
        sc.player?.name ??
        roundPlayers?.find((p) => p.id === sc.player_id)?.name ??
        'Unknown player';
      const selectedTee = selections.get(sc.player_id);
      return {
        scorecardId: sc.id,
        playerId: sc.player_id,
        playerName,
        selectedTee: selectedTee ?? null,
      };
    });
  }, [scorecards, roundPlayers, selections]);

  if (availableTees.length === 0) {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View style={styles.emptyContainer}>
          <Text style={[typography.h4, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            No tees available
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            This course doesn&apos;t have tee data. Add tees to the course first.
          </Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surfaceVariant, marginTop: spacing.lg }]}
            onPress={onClose}
          >
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={[typography.h3, styles.title, { color: colors.textPrimary }]}>Edit Tees</Text>
        <Text style={[typography.small, styles.subtitle, { color: colors.textSecondary }]}>
          Change the tee each player used. We&apos;ll recalculate their daily handicap and stableford points.
        </Text>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {playerRows.map((row) => (
            <View
              key={row.scorecardId}
              style={[styles.playerRow, { borderBottomColor: colors.border }]}
            >
              <Text
                style={[typography.bodyBold, styles.playerName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {row.playerName}
              </Text>
              <View style={styles.teePills}>
                {availableTees.map((tee) => {
                  const isSelected =
                    row.selectedTee?.tee_id === tee.tee_id ||
                    (row.selectedTee?.name === tee.name && !tee.tee_id);
                  const dotColor = getTeeColor(tee.color, colors.textSecondary);
                  return (
                    <TouchableOpacity
                      key={tee.tee_id ?? tee.name}
                      style={[
                        styles.teePill,
                        {
                          backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => handlePickTee(row.playerId, tee)}
                      activeOpacity={0.7}
                      disabled={isPending}
                      accessibilityRole="button"
                      accessibilityLabel={`${row.playerName} ${tee.name} tee`}
                      accessibilityState={{ selected: isSelected, disabled: isPending }}
                    >
                      <View
                        style={[styles.teeDot, { backgroundColor: dotColor, borderColor: colors.border }]}
                      />
                      <Text
                        style={[
                          styles.teePillText,
                          { color: isSelected ? colors.primary : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {tee.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {errorMessage && (
          <Text style={[typography.small, styles.error, { color: colors.error }]}>
            {errorMessage}
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
            onPress={onClose}
            disabled={isPending}
          >
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary },
              (!hasChanges || isPending) && styles.actionButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isPending}
          >
            {isPending ? (
              <GolfBallLoader size="sm" />
            ) : (
              <Text style={[typography.bodyBold, { color: colors.textOnColored }]}>
                Save & Recalculate
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    textAlign: 'left',
  },
  subtitle: {
    marginBottom: spacing.md,
  },
  scrollView: {
    maxHeight: 360,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  playerRow: {
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playerName: {
    marginBottom: spacing.sm,
  },
  teePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  teePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  teeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  teePillText: {
    ...typography.caption,
  },
  error: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  closeButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
});

export default EditTeesSheet;
