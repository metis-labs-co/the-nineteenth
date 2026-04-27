/**
 * InProgressRoundLeaderboard
 *
 * Live leaderboard for a round that hasn't been submitted yet, computed
 * directly from `scorecards` + `round_players` instead of the `round_results`
 * table (which is only populated by `finalizeRoundResults` on submit).
 *
 * Used by the Competition Detail → Leaderboard tab so organisers see a
 * live picture during the round, rather than the "No scores yet" empty
 * state that the round_results-driven RoundLeaderboard returns until
 * submission.
 *
 * Game type coverage:
 *   - stableford → StablefordLeaderboardFull
 *   - stroke     → StrokePlayLeaderboardFull
 *   - par        → ParLeaderboardFull
 *
 * Other formats (match-play, scramble, shamble, best-ball, team rounds)
 * still rely on round_results / RoundLeaderboard. The Leaderboard tab
 * call site falls back to that component when the format isn't handled
 * here.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useRoundDetails, useRoundScorecards, useRoundPlayers } from '@/hooks/useRoundDetails';
import { StablefordLeaderboardFull } from '@/components/scorecard/StablefordLeaderboardFull';
import { StrokePlayLeaderboardFull } from '@/components/scorecard/StrokePlayLeaderboardFull';
import { ParLeaderboardFull } from '@/components/scorecard/ParLeaderboardFull';
import type { GameType, Hole, HoleScore, MultiBallHoleScore, Player } from '@/types';

export interface InProgressRoundLeaderboardProps {
  roundId: string;
  gameType: GameType;
  /** Round number for the header (1-indexed) */
  roundNumber: number;
  /** Optional course name for the header */
  courseName?: string;
  currentUserId?: string;
  testID?: string;
}

/**
 * Game types this component knows how to render live. Other formats fall
 * back to the round_results-based RoundLeaderboard at the call site.
 */
export const IN_PROGRESS_SUPPORTED_GAME_TYPES: ReadonlySet<GameType> = new Set<GameType>([
  'stableford',
  'stroke',
  'par',
]);

/**
 * Pulsing red "LIVE" pill — same shape as a TV broadcast indicator. The dot
 * fades in/out continuously while the pill itself pulses subtly so it reads
 * as "active" even when nothing on the leaderboard is changing.
 */
const LivePill = React.memo(function LivePill() {
  const colors = useThemeColors();
  const dotOpacity = useRef(new Animated.Value(1)).current;
  const pillScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const pillLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pillScale, {
          toValue: 1.06,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pillScale, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    dotLoop.start();
    pillLoop.start();

    return () => {
      dotLoop.stop();
      pillLoop.stop();
    };
  }, [dotOpacity, pillScale]);

  return (
    <Animated.View
      style={[
        styles.livePill,
        { backgroundColor: colors.errorLight, transform: [{ scale: pillScale }] },
      ]}
    >
      <Animated.View
        style={[styles.liveDot, { backgroundColor: colors.error, opacity: dotOpacity }]}
      />
      <Text style={[typography.caption, { color: colors.error, fontWeight: '700' }]}>LIVE</Text>
    </Animated.View>
  );
});

export const InProgressRoundLeaderboard = React.memo(function InProgressRoundLeaderboard({
  roundId,
  gameType,
  roundNumber,
  courseName,
  currentUserId,
  testID,
}: InProgressRoundLeaderboardProps) {
  const colors = useThemeColors();

  const { data: round } = useRoundDetails(roundId);
  const { data: scorecards } = useRoundScorecards(roundId);
  const { data: roundPlayers } = useRoundPlayers(roundId);

  const holes: Hole[] = useMemo(() => {
    return (round?.course?.holes as Hole[] | undefined) ?? [];
  }, [round?.course?.holes]);

  // Use round_players as the canonical roster — same approach as the View Round
  // screen — so every participant appears even before their scorecard has been
  // pushed to Supabase. Fall back to scorecards-only if round_players hasn't
  // loaded yet.
  const players: Player[] = useMemo(() => {
    const scorecardByPlayerId = new Map<string, NonNullable<typeof scorecards>[number]>();
    for (const sc of scorecards ?? []) {
      scorecardByPlayerId.set(sc.player_id, sc);
    }

    if (roundPlayers && roundPlayers.length > 0) {
      return roundPlayers.map((p) => {
        const sc = scorecardByPlayerId.get(p.id);
        return {
          id: p.id,
          name: sc?.player?.name || p.name,
          handicap: sc?.player?.handicap ?? p.handicap ?? 0,
          email: sc?.player?.email || p.email || '',
        };
      });
    }

    return (scorecards ?? []).map((sc) => ({
      id: sc.player_id,
      name: sc.player?.name || 'Unknown',
      handicap: sc.player?.handicap ?? 0,
      email: sc.player?.email || '',
    }));
  }, [scorecards, roundPlayers]);

  const getPlayerScore = useCallback(
    (playerId: string, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
      const scorecard = scorecards?.find((sc) => sc.player_id === playerId);
      return scorecard?.scores?.[String(holeNumber)];
    },
    [scorecards],
  );

  const renderLeaderboard = () => {
    if (gameType === 'stableford') {
      return (
        <StablefordLeaderboardFull
          players={players}
          holes={holes}
          getPlayerScore={getPlayerScore}
          currentUserId={currentUserId}
          testID={testID ? `${testID}-stableford` : undefined}
        />
      );
    }
    if (gameType === 'par') {
      return (
        <ParLeaderboardFull
          players={players}
          holes={holes}
          getPlayerScore={getPlayerScore}
          currentUserId={currentUserId}
          testID={testID ? `${testID}-par` : undefined}
        />
      );
    }
    return (
      <StrokePlayLeaderboardFull
        players={players}
        holes={holes}
        getPlayerScore={getPlayerScore}
        currentUserId={currentUserId}
        testID={testID ? `${testID}-stroke` : undefined}
      />
    );
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Lightweight header — the format-specific Full leaderboards have their
          own internal "Leaderboard (thru N)" header so we just need the round
          identifier here. */}
      <View style={styles.header}>
        <Icon source="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={[typography.bodyBold, styles.headerText, { color: colors.textPrimary }]}>
          {`Round ${roundNumber}`}
          {courseName ? <Text style={{ color: colors.textSecondary }}> · {courseName}</Text> : null}
        </Text>
        <LivePill />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {renderLeaderboard()}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

export default InProgressRoundLeaderboard;
