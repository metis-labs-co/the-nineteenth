/**
 * LeaderboardPodium - Top-3 podium display for competition leaderboards
 *
 * Purely presentational. Renders the top three entries (2nd left, 1st centre
 * raised with gold accent + crown, 3rd right) above the full leaderboard
 * table. The podium only renders when there are at least three entries and
 * the top three placings are unambiguous (no ties within the top three, and
 * third place is not tied with fourth) — otherwise it renders nothing and
 * the table alone communicates standings.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconCrown } from '@tabler/icons-react-native';
import { Badge, ScaledText } from '@/components/common';
import { spacing, borderRadius, shadows, typography, medalColors } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';
import { getInitials } from '@/utils/displayHelpers';
import type { LeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';

export interface LeaderboardPodiumProps {
  /** Leaderboard entries (any order — sorted by totalPoints internally) */
  entries: LeaderboardEntry[];
  /** Current user ID for the YOU pill highlight */
  currentUserId?: string;
  /** Test ID for testing */
  testID?: string;
}

interface PodiumSlot {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
}

const ORDINALS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

/** Per-rank visual spec (design: polished.html LEADERBOARD podium) */
const RANK_SPEC = {
  1: { avatar: 62, bar: 70, medal: medalColors.gold },
  2: { avatar: 54, bar: 52, medal: medalColors.silver },
  3: { avatar: 54, bar: 40, medal: medalColors.bronze },
} as const;

/**
 * Resolve the top three podium slots, or null when the podium should be
 * skipped (<3 entries, or ties make the top-3 placings ambiguous).
 */
function resolvePodium(entries: LeaderboardEntry[]): PodiumSlot[] | null {
  if (!entries || entries.length < 3) return null;

  const sorted = [...entries].sort((a, b) => b.totalPoints - a.totalPoints);
  const [first, second, third, fourth] = sorted;

  const isAmbiguous =
    first.totalPoints === second.totalPoints ||
    second.totalPoints === third.totalPoints ||
    (fourth !== undefined && third.totalPoints === fourth.totalPoints);

  if (isAmbiguous) return null;

  return [
    { entry: first, rank: 1 },
    { entry: second, rank: 2 },
    { entry: third, rank: 3 },
  ];
}

export function LeaderboardPodium({ entries, currentUserId, testID }: LeaderboardPodiumProps) {
  const colors = useThemeColors();

  const podium = useMemo(() => resolvePodium(entries), [entries]);

  if (!podium) return null;

  // Visual arrangement: 2nd left, 1st centre (raised), 3rd right
  const arranged = [podium[1], podium[0], podium[2]];

  return (
    <View style={styles.container} testID={testID}>
      {arranged.map(({ entry, rank }) => {
        const spec = RANK_SPEC[rank];
        const isCurrentUser = !!currentUserId && entry.playerId === currentUserId;
        const isFirst = rank === 1;

        return (
          <View
            key={entry.playerId}
            style={styles.slot}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${ORDINALS[rank]} place: ${entry.playerName}, ${entry.totalPoints} points${isCurrentUser ? ', you' : ''}`}
            testID={testID ? `${testID}-rank-${rank}` : undefined}
          >
            {isFirst && (
              <View style={styles.crown}>
                <IconCrown size={22} color={medalColors.gold} />
              </View>
            )}

            {/* Initials circle */}
            <View
              style={[
                styles.avatar,
                {
                  width: spec.avatar,
                  height: spec.avatar,
                  borderRadius: spec.avatar / 2,
                  backgroundColor: spec.medal,
                  borderColor: isFirst ? medalColors.gold : withOpacity(spec.medal, 0.5),
                },
              ]}
            >
              <ScaledText category="body" style={[styles.initials, { color: colors.white }]}>
                {getInitials(entry.playerName)}
              </ScaledText>
            </View>

            {/* Name */}
            <ScaledText
              category="caption"
              style={[styles.name, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {entry.playerName}
            </ScaledText>

            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Badge label="You" variant="primary" size="sm" />
              </View>
            )}

            {/* Points */}
            <ScaledText category="caption" style={[styles.points, { color: colors.primary }]}>
              {entry.totalPoints} pts
            </ScaledText>

            {/* Podium bar with rank number */}
            <View
              style={[
                styles.bar,
                {
                  height: spec.bar,
                  backgroundColor: withOpacity(spec.medal, 0.18),
                },
              ]}
            >
              <ScaledText category="body" style={[styles.rankText, { color: spec.medal }]}>
                {rank}
              </ScaledText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  slot: {
    flex: 1,
    maxWidth: 104,
    flexDirection: 'column',
    alignItems: 'center',
  },
  crown: {
    marginBottom: spacing.xs,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    ...shadows.md,
  },
  initials: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  name: {
    ...typography.captionBold,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  youBadge: {
    marginTop: 2,
  },
  points: {
    ...typography.captionBold,
    marginTop: 2,
  },
  bar: {
    width: '100%',
    marginTop: spacing.sm,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  rankText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});

export default LeaderboardPodium;
