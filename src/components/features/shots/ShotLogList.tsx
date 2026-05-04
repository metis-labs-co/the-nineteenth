/**
 * Shared list of every shot logged on a round, grouped by hole and (when
 * multiple players have logged) by player. Used on the Shots tab of both
 * the Review Scorecard screen and the View Round screen.
 *
 * Distances are computed client-side from the existing GPS coordinates via
 * `computeShotDistances`. Per-shot tee anchor uses the round's hole coords.
 */

import React, { useMemo, useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography, shadows } from '@/constants/theme';
import { useShotLogByRound } from '@/hooks/shots';
import { useHoleCoordinates } from '@/hooks/useHoleCoordinates';
import { useSettingsStore } from '@/store/settingsStore';
import { computeShotDistances, type ShotWithDistance } from '@/utils/shotDistances';
import { metersToYards } from '@/utils/gpsCalculations';
import { clubLabel } from '@/constants/clubs';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

interface ShotLogListProps {
  roundId: string;
  /** Course id from the round — needed to look up tee coordinates for distance derivation. */
  courseId: string | null;
  /** Map player_id → display name. When omitted or empty, player labels fall back to player_id prefix. */
  playerNameMap?: Record<string, string>;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  bottomInset?: number;
  /**
   * When true, render content as a plain View (caller already provides a
   * scroll surface). When false (default), render an internal ScrollView
   * with optional refresh control.
   */
  noScroll?: boolean;
  /**
   * When provided, an inline delete (×) icon renders on each shot row.
   * The caller is responsible for confirming and performing the delete.
   */
  onDeleteShot?: (shot: ShotLogEntry) => void;
  /**
   * When provided, the club label on each shot row is tappable. The caller
   * is responsible for opening a picker and persisting the new club.
   * Only shots logged by the current user can be edited (RLS).
   */
  onChangeClubForShot?: (shot: ShotLogEntry) => void;
  /**
   * Player id of the viewing user. Used to gate edit/delete affordances so
   * other players' shots aren't shown as editable.
   */
  currentPlayerId?: string;
}

interface HoleGroup {
  holeNumber: number;
  perPlayer: { playerId: string; shots: ShotWithDistance[] }[];
}

export function ShotLogList({
  roundId,
  courseId,
  playerNameMap,
  isRefreshing,
  onRefresh,
  bottomInset = 0,
  noScroll = false,
  onDeleteShot,
  onChangeClubForShot,
  currentPlayerId,
}: ShotLogListProps) {
  const colors = useThemeColors();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const { data: shots = [], isLoading } = useShotLogByRound(roundId);
  const { coordinatesByHole, isLoading: coordsLoading } = useHoleCoordinates(
    courseId ?? '',
    { enabled: !!courseId }
  );

  const formatDistance = useCallback(
    (meters: number | null) => {
      if (meters == null) return '—';
      if (distanceUnit === 'yards') {
        return `${Math.round(metersToYards(meters))} yds`;
      }
      return `${Math.round(meters)} m`;
    },
    [distanceUnit]
  );

  const grouped: HoleGroup[] = useMemo(() => {
    if (shots.length === 0) return [];
    const byHole = new Map<number, Map<string, ShotLogEntry[]>>();
    for (const s of shots) {
      const holeMap = byHole.get(s.hole_number) ?? new Map();
      const playerShots = holeMap.get(s.player_id) ?? [];
      playerShots.push(s);
      holeMap.set(s.player_id, playerShots);
      byHole.set(s.hole_number, holeMap);
    }

    const holes: HoleGroup[] = [];
    for (const holeNumber of Array.from(byHole.keys()).sort((a, b) => a - b)) {
      const holeMap = byHole.get(holeNumber)!;
      const set = coordinatesByHole?.[holeNumber];
      const tee = set?.tee_back ?? set?.tee_front ?? null;
      const perPlayer = Array.from(holeMap.entries()).map(([playerId, playerShots]) => ({
        playerId,
        shots: computeShotDistances(playerShots, tee),
      }));
      holes.push({ holeNumber, perPlayer });
    }
    return holes;
  }, [shots, coordinatesByHole]);

  const showPlayerHeaders = useMemo(() => {
    const playerIds = new Set(shots.map((s) => s.player_id));
    return playerIds.size > 1;
  }, [shots]);

  if (isLoading || coordsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (grouped.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          No shots have been logged for this round.
        </Text>
      </View>
    );
  }

  const body = (
    <>
      {grouped.map((hole) => (
        <View key={hole.holeNumber} style={styles.holeBlock}>
          <Text style={[typography.h4, { color: colors.textPrimary }]}>
            Hole {hole.holeNumber}
          </Text>

          {hole.perPlayer.map((group, groupIdx) => (
            <View key={group.playerId} style={[styles.playerBlock, groupIdx > 0 && { marginTop: spacing.sm }]}>
              {showPlayerHeaders && (
                <Text
                  style={[
                    typography.caption,
                    styles.playerHeader,
                    { color: colors.textSecondary },
                  ]}
                >
                  {playerNameMap?.[group.playerId] ?? group.playerId.slice(0, 8)}
                </Text>
              )}
              <View style={[styles.shotGroup, shadows.sm, { backgroundColor: colors.surface }]}>
                {group.shots.map((shot, shotIdx) => {
                  // Edit/delete are only valid for the viewer's own shots —
                  // the shot_log RLS policies reject other players' rows.
                  const isOwnShot = !currentPlayerId || group.playerId === currentPlayerId;
                  const canEditClub = isOwnShot && !!onChangeClubForShot;
                  const canDelete = isOwnShot && !!onDeleteShot;
                  return (
                    <View
                      key={shot.id}
                      style={[
                        styles.shotRow,
                        shotIdx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.shotLeft}>
                        <View
                          style={[
                            styles.sequenceBadge,
                            { backgroundColor: colors.primaryLighter },
                          ]}
                        >
                          <Text
                            style={[
                              typography.caption,
                              { color: colors.primary, fontWeight: '700' },
                            ]}
                          >
                            {shot.sequence}
                          </Text>
                        </View>
                        {canEditClub ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit club for shot ${shot.sequence}`}
                            onPress={() => onChangeClubForShot?.(shot)}
                            hitSlop={8}
                            style={styles.clubLabelPressable}
                          >
                            <Text
                              style={[typography.body, { color: colors.primary }]}
                            >
                              {clubLabel(shot.club_used)}
                            </Text>
                          </Pressable>
                        ) : (
                          <Text
                            style={[typography.body, { color: colors.textPrimary }]}
                          >
                            {clubLabel(shot.club_used)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.shotRight}>
                        <Text
                          style={[
                            typography.body,
                            { color: colors.textPrimary, fontWeight: '600' },
                          ]}
                        >
                          {formatDistance(shot.distanceMeters)}
                        </Text>
                        {canDelete && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Delete shot ${shot.sequence}`}
                            onPress={() => onDeleteShot?.(shot)}
                            hitSlop={8}
                            style={styles.deleteButton}
                          >
                            <Icon source="close" size={18} color={colors.textTertiary} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ))}
    </>
  );

  if (noScroll) {
    // Caller already provides horizontal padding via its own scroll
    // container; only contribute vertical spacing here so the content
    // isn't double-inset.
    return (
      <View style={[styles.contentNoScroll, { paddingBottom: bottomInset + spacing.xxxl }]}>
        {body}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + spacing.xxxl }]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  contentNoScroll: {
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  holeBlock: {
    gap: spacing.sm,
  },
  playerBlock: {
    gap: spacing.xs,
  },
  playerHeader: {
    fontWeight: '700',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.xs,
  },
  shotGroup: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  shotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  shotRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clubLabelPressable: {
    paddingVertical: spacing.xs,
  },
  deleteButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
