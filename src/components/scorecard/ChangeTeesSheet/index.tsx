/**
 * ChangeTeesSheet — mid-round per-player tee switch from the score-entry
 * screen. Owner/organizer only (gating handled by the caller). Persists the
 * override to the DB via useSwitchPlayerTee and updates the live store via
 * setPlayerTee so net/Stableford and the header tee dot update immediately.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { GolfBallLoader, PlayerTeeRow } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useSwitchPlayerTee } from '@/hooks/rounds/mutations';
import { useScorecardStore } from '@/store/scorecardStore';
import type { TeeBox } from '@/types/database/base';
import type { Player } from '@/types';

export interface ChangeTeesSheetProps {
  visible: boolean;
  onClose: () => void;
  roundId: string;
  competitionId?: string;
  /** Players in the scoring group. */
  players: Player[];
  /** All selectable tees for the course. */
  availableTees: TeeBox[];
}

export function ChangeTeesSheet({
  visible,
  onClose,
  roundId,
  competitionId,
  players,
  availableTees,
}: ChangeTeesSheetProps) {
  const colors = useThemeColors();
  const { mutateAsync: switchTee, isPending } = useSwitchPlayerTee();
  const getPlayerTee = useScorecardStore((s) => s.getPlayerTee);
  const setPlayerTee = useScorecardStore((s) => s.setPlayerTee);
  const groupScorecards = useScorecardStore((s) => s.groupScorecards);

  const initialSelections = useMemo(() => {
    const map = new Map<string, TeeBox | null>();
    for (const p of players) {
      map.set(p.id, getPlayerTee(p.id));
    }
    return map;
  }, [players, getPlayerTee]);

  const [selections, setSelections] = useState<Map<string, TeeBox | null>>(initialSelections);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelections(initialSelections);
      setErrorMessage(null);
    }
  }, [visible, initialSelections]);

  const handlePick = useCallback((playerId: string, tee: TeeBox) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(playerId, tee);
      return next;
    });
  }, []);

  const changed = useMemo(
    () =>
      players.filter((p) => {
        const initial = initialSelections.get(p.id);
        const current = selections.get(p.id);
        return initial?.tee_id !== current?.tee_id || initial?.name !== current?.name;
      }),
    [players, initialSelections, selections]
  );

  const handleSave = useCallback(async () => {
    setErrorMessage(null);
    if (changed.length === 0) {
      onClose();
      return;
    }
    try {
      for (const player of changed) {
        const tee = selections.get(player.id);
        if (!tee) continue;
        // The store holds a synthetic scorecard id until scores sync; only
        // pass a real id (with gross) so the server recalc has something to
        // recompute. Otherwise the live store snapshot drives the submit.
        const sc = groupScorecards.get(player.id);
        const hasGross = (sc?.totalGross ?? 0) > 0;
        const realScorecardId =
          sc && !sc.id.startsWith('scorecard-') && hasGross ? sc.id : undefined;

        await switchTee({
          roundId,
          competitionId: competitionId && competitionId !== 'standalone' ? competitionId : undefined,
          playerId: player.id,
          tee,
          scorecardId: realScorecardId,
        });
        await setPlayerTee(player.id, tee);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update tees');
    }
  }, [changed, selections, groupScorecards, switchTee, setPlayerTee, roundId, competitionId, onClose]);

  if (availableTees.length === 0) {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View style={styles.emptyContainer}>
          <Text style={[typography.h4, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            No tees available
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            This course doesn&apos;t have tee data.
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
        <Text style={[typography.h3, { color: colors.textPrimary }]}>Change Tees</Text>
        <Text style={[typography.small, styles.subtitle, { color: colors.textSecondary }]}>
          Pick the tee each player is using. Scores update straight away.
        </Text>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {players.map((player) => (
            <PlayerTeeRow
              key={player.id}
              playerName={player.name}
              availableTees={availableTees}
              selectedTee={selections.get(player.id) ?? null}
              onPick={(tee) => handlePick(player.id, tee)}
              disabled={isPending}
            />
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
              (changed.length === 0 || isPending) && styles.actionButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={changed.length === 0 || isPending}
          >
            {isPending ? (
              <GolfBallLoader size="sm" />
            ) : (
              <Text style={[typography.bodyBold, { color: colors.textOnColored }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
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

export default ChangeTeesSheet;
