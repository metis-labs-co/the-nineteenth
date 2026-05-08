/**
 * Shared list of every shot logged on a round, grouped by hole and (when
 * multiple players have logged) by player. Used on the Shots tab of both
 * the Review Scorecard screen and the View Round screen.
 *
 * Distances are computed client-side from the existing GPS coordinates via
 * `computeShotDistances`. Per-shot tee anchor uses the round's hole coords.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { AddShotHolePickerSheet } from './AddShotHolePickerSheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography, shadows } from '@/constants/theme';
import { useShotLogByRound } from '@/hooks/shots';
import { useHoleCoordinates } from '@/hooks/useHoleCoordinates';
import { useSettingsStore } from '@/store/settingsStore';
import { useTeeOverrideStore } from '@/store/teeOverrideStore';
import {
  computeShotDistances,
  resolveTeeAnchor,
  type ShotWithDistance,
} from '@/utils/shotDistances';
import { useCustomHoleTeesByCourse } from '@/hooks/customTees';
import { metersToYards } from '@/utils/gpsCalculations';
import { clubLabel } from '@/constants/clubs';
import type { ShotLogEntry } from '@/types/database/shotLog.types';
import type { RootStackParamList } from '@/navigation/types';

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
  /** Round status — drives the "Add shot" button visibility per the cap rules. */
  roundStatus?: 'upcoming' | 'in-progress' | 'completed';
  /**
   * Strokes scored per hole for the *current user*. Holes appearing here
   * with `strokes > 0` but with no logged shots render a placeholder
   * section with an "Add shot" affordance. For completed rounds, also
   * gates the "Add shot" button: hidden once shots logged ≥ strokes.
   */
  holeStrokeCounts?: Record<number, number>;
  /**
   * Total holes for the round. Used by the bottom hole picker to list all
   * holes (including ones with no shots and no strokes yet) when the round
   * is in progress. Defaults to 18 when not provided.
   */
  totalHoles?: number;
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
  roundStatus,
  holeStrokeCounts,
  totalHoles = 18,
}: ShotLogListProps) {
  const colors = useThemeColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const teeOverrides = useTeeOverrideStore((s) => s.byRoundHole);
  const { data: shots = [], isLoading } = useShotLogByRound(roundId);
  const [holePickerVisible, setHolePickerVisible] = useState(false);

  const handleViewHoleOnMap = useCallback(
    (holeNumber: number) => {
      if (!courseId) return;
      navigation.navigate('HoleMap', {
        courseId,
        holeNumber,
        roundId,
        mode: 'review',
      });
    },
    [courseId, navigation, roundId]
  );

  const handleAddShotForHole = useCallback(
    (holeNumber: number) => {
      if (!courseId) return;
      navigation.navigate('HoleMap', {
        courseId,
        holeNumber,
        roundId,
        mode: 'log-shot',
        strokesScoredAtNav: holeStrokeCounts?.[holeNumber] ?? null,
        roundStatus: roundStatus ?? 'in-progress',
      });
    },
    [courseId, navigation, roundId, holeStrokeCounts, roundStatus]
  );
  const { coordinatesByHole, isLoading: coordsLoading } = useHoleCoordinates(
    courseId ?? '',
    { enabled: !!courseId }
  );
  const { data: customTeesByHole = {} } = useCustomHoleTeesByCourse(courseId, {
    enabled: !!courseId,
  });

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
    const byHole = new Map<number, Map<string, ShotLogEntry[]>>();
    for (const s of shots) {
      const holeMap = byHole.get(s.hole_number) ?? new Map();
      const playerShots = holeMap.get(s.player_id) ?? [];
      playerShots.push(s);
      holeMap.set(s.player_id, playerShots);
      byHole.set(s.hole_number, holeMap);
    }

    // Union of (holes with shots) ∪ (holes where the current user has
    // strokes scored). Holes with strokes-but-no-shots render with a
    // placeholder body so the user can backfill from the same surface.
    const holeNumbers = new Set<number>(byHole.keys());
    if (holeStrokeCounts) {
      for (const [k, v] of Object.entries(holeStrokeCounts)) {
        if (v > 0) holeNumbers.add(Number(k));
      }
    }
    if (holeNumbers.size === 0) return [];

    const holes: HoleGroup[] = [];
    for (const holeNumber of Array.from(holeNumbers).sort((a, b) => a - b)) {
      const holeMap = byHole.get(holeNumber);
      const set = coordinatesByHole?.[holeNumber];
      const override = teeOverrides[`${roundId}::${holeNumber}`] ?? null;
      // Build the same coords array shape the resolver expects, prefer the
      // custom tee when the override matches one, otherwise fall back to
      // the standard back/front pick.
      const holeCoords = [set?.tee_back, set?.tee_front].filter(
        (c): c is NonNullable<typeof c> => !!c
      );
      const tee = resolveTeeAnchor(
        override,
        customTeesByHole[holeNumber] ?? [],
        holeCoords
      );
      const perPlayer = holeMap
        ? Array.from(holeMap.entries()).map(([playerId, playerShots]) => ({
            playerId,
            shots: computeShotDistances(playerShots, tee),
          }))
        : [];
      holes.push({ holeNumber, perPlayer });
    }
    return holes;
  }, [
    shots,
    coordinatesByHole,
    customTeesByHole,
    teeOverrides,
    roundId,
    holeStrokeCounts,
  ]);

  const showPlayerHeaders = useMemo(() => {
    const playerIds = new Set(shots.map((s) => s.player_id));
    return playerIds.size > 1;
  }, [shots]);

  /** Current user's logged shots count per hole — for cap visibility on
   *  the "+ Add shot" affordance. */
  const userShotsByHole = useMemo(() => {
    const map: Record<number, number> = {};
    if (!currentPlayerId) return map;
    for (const s of shots) {
      if (s.player_id === currentPlayerId) {
        map[s.hole_number] = (map[s.hole_number] ?? 0) + 1;
      }
    }
    return map;
  }, [shots, currentPlayerId]);

  /** Whether the "Add shot" button should render for the given hole.
   *  Hidden when: courseId is null, round upcoming, completed-round at cap. */
  const canAddShotForHole = useCallback(
    (holeNumber: number): boolean => {
      if (!courseId) return false;
      if (roundStatus === 'upcoming') return false;
      const n = userShotsByHole[holeNumber] ?? 0;
      const s = holeStrokeCounts?.[holeNumber];
      if (roundStatus === 'completed' && s != null && n >= s) return false;
      return true;
    },
    [courseId, roundStatus, userShotsByHole, holeStrokeCounts]
  );

  if (isLoading || coordsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  /** Whether the bottom hole picker entry should be rendered.
   *  Only useful while in progress — completed rounds can't add shots
   *  to holes that have no strokes scored. */
  const showHolePickerEntry = !!courseId && roundStatus === 'in-progress';

  if (grouped.length === 0 && !showHolePickerEntry) {
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
      {grouped.length === 0 && showHolePickerEntry && (
        <View style={[styles.center, styles.emptyHoleBlockTop]}>
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, textAlign: 'center' },
            ]}
          >
            No shots have been logged for this round yet.
          </Text>
        </View>
      )}

      {grouped.map((hole) => (
        <View key={hole.holeNumber} style={styles.holeBlock}>
          <View style={styles.holeHeaderRow}>
            <Text style={[typography.h4, { color: colors.textPrimary }]}>
              Hole {hole.holeNumber}
            </Text>
            <View style={styles.holeHeaderActions}>
              {canAddShotForHole(hole.holeNumber) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Log shot for hole ${hole.holeNumber}`}
                  accessibilityHint="Opens the map to place a new shot for this hole"
                  hitSlop={8}
                  onPress={() => handleAddShotForHole(hole.holeNumber)}
                  style={({ pressed }) => [
                    styles.holeMapIconButton,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Icon source="plus-circle-outline" size={22} color={colors.primary} />
                </Pressable>
              )}
              {courseId && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View shots for hole ${hole.holeNumber} on map`}
                  accessibilityHint="Opens the hole map showing every shot on this hole"
                  hitSlop={8}
                  onPress={() => handleViewHoleOnMap(hole.holeNumber)}
                  style={({ pressed }) => [
                    styles.holeMapIconButton,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Icon source="map-outline" size={22} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          {hole.perPlayer.length === 0 && (
            <View
              style={[
                styles.shotGroup,
                shadows.sm,
                styles.emptyHoleBlock,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, textAlign: 'center' },
                ]}
              >
                No shots logged for this hole yet.
              </Text>
            </View>
          )}

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

      {showHolePickerEntry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log shot for another hole"
          accessibilityHint="Opens a picker to choose any hole and log a shot there"
          onPress={() => setHolePickerVisible(true)}
          style={({ pressed }) => [
            styles.addAnotherHoleButton,
            {
              borderColor: colors.primary,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Icon source="plus-circle-outline" size={20} color={colors.primary} />
          <Text style={[typography.bodyBold, { color: colors.primary }]}>
            Log shot for another hole
          </Text>
        </Pressable>
      )}
    </>
  );

  const picker = showHolePickerEntry ? (
    <AddShotHolePickerSheet
      visible={holePickerVisible}
      onClose={() => setHolePickerVisible(false)}
      totalHoles={totalHoles}
      shotsByHole={userShotsByHole}
      strokesByHole={holeStrokeCounts}
      onSelect={(holeNumber) => {
        setHolePickerVisible(false);
        handleAddShotForHole(holeNumber);
      }}
    />
  ) : null;

  if (noScroll) {
    // Caller already provides horizontal padding via its own scroll
    // container; only contribute vertical spacing here so the content
    // isn't double-inset.
    return (
      <>
        <View style={[styles.contentNoScroll, { paddingBottom: bottomInset + spacing.xxxl }]}>
          {body}
        </View>
        {picker}
      </>
    );
  }

  return (
    <>
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
      {picker}
    </>
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
  holeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  holeMapIconButton: {
    padding: spacing.xs,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyHoleBlock: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyHoleBlockTop: {
    paddingBottom: spacing.lg,
  },
  addAnotherHoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    minHeight: 48,
    marginTop: spacing.sm,
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
