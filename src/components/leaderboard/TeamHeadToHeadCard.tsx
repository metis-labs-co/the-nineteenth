/**
 * TeamHeadToHeadCard - Ryder-cup style 2-team head-to-head scoreboard.
 *
 * Renders as a dark "cup" board (an always-dark feature surface, per the
 * redesign mock): centered team names with big accumulated-points totals, a
 * cup progress bar with a "first to N" marker, and an outcome pill. Tapping
 * the board expands a per-round breakdown (round label + course, both teams'
 * points, winning side highlighted in its team colour).
 *
 * The leader (higher totalPoints) is shown on the left; an exact tie keeps
 * input order. The progress bar + outcome "win/lead" state only render when
 * the caller supplies pointsAvailable / pointsToWin.
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, type DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native-paper';
import { Badge } from '@/components/common';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeamLeaderboardEntry } from './TeamLeaderboardTable';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
import { mergeHeadToHeadRounds } from './teamHeadToHead';
import { buildPositionalRoundNumbers } from './roundNumbering';
import { useOpenRound } from '@/navigation/openRound';

export interface TeamHeadToHeadCardProps {
  /** The two teams, in any order */
  entries: [TeamLeaderboardEntry, TeamLeaderboardEntry];
  /** teamId -> hex colour */
  teamColors: Map<string, string>;
  /** Current user ID for "You" badge highlighting */
  currentUserId?: string;
  /** Rounds used to compute positional round numbers + course names */
  rounds: RoundWithCourse[];
  /** Total points available across the competition (drives the progress bar). */
  pointsAvailable?: number;
  /** Points needed to win the cup (drives the bar marker + win/lead outcome). */
  pointsToWin?: number;
  /** Optional centered eyebrow on the board (e.g. "Overall"). */
  headlineLabel?: string;
  /** Competition ID, passed through when a breakdown round is opened */
  competitionId?: string;
  /** Test ID for testing */
  testID?: string;
}

/** Format a points total for display, rendering halves as ½ (e.g. 6.5 -> 6½). */
function formatPoints(value: number): string {
  const whole = Math.floor(value);
  const hasHalf = value - whole === 0.5;
  if (hasHalf) return whole === 0 ? '½' : `${whole}½`;
  return String(value);
}

export function TeamHeadToHeadCard({
  entries,
  teamColors,
  currentUserId,
  rounds,
  pointsAvailable,
  pointsToWin,
  headlineLabel,
  competitionId,
  testID,
}: TeamHeadToHeadCardProps) {
  const colors = useThemeColors();
  const openRound = useOpenRound();
  const [expanded, setExpanded] = useState(false);

  const [leader, other] = useMemo(
    () => [...entries].sort((a, b) => b.totalPoints - a.totalPoints),
    [entries]
  );
  const isTie = entries[0].totalPoints === entries[1].totalPoints;

  const leftColor = teamColors.get(leader.teamId) ?? colors.scoreboardLabel;
  const rightColor = teamColors.get(other.teamId) ?? colors.scoreboardLabel;

  const leaderHasCurrentUser = currentUserId
    ? leader.members.some((m) => m.playerId === currentUserId)
    : false;
  const otherHasCurrentUser = currentUserId
    ? other.members.some((m) => m.playerId === currentUserId)
    : false;

  const roundNumberByRoundId = useMemo(() => buildPositionalRoundNumbers(rounds), [rounds]);
  const roundRows = useMemo(
    () => mergeHeadToHeadRounds(leader.roundBreakdown, other.roundBreakdown, roundNumberByRoundId),
    [leader.roundBreakdown, other.roundBreakdown, roundNumberByRoundId]
  );

  // Progress bar geometry — each side fills from its edge by its share of the
  // total available points; the marker sits at the "first to N" threshold.
  const showBar = !!pointsAvailable && pointsAvailable > 0;
  const leftPct = (
    showBar ? `${Math.min(100, (leader.totalPoints / pointsAvailable!) * 100)}%` : '0%'
  ) as DimensionValue;
  const rightPct = (
    showBar ? `${Math.min(100, (other.totalPoints / pointsAvailable!) * 100)}%` : '0%'
  ) as DimensionValue;
  const markerPct = (
    showBar && pointsToWin ? `${Math.min(100, (pointsToWin / pointsAvailable!) * 100)}%` : null
  ) as DimensionValue | null;

  // Outcome: clinched ("win") once the leader reaches the win threshold; a
  // dead-level total is "All square"; otherwise the leader "leads".
  const clinched = pointsToWin != null && leader.totalPoints >= pointsToWin;
  const outcomeText = isTie
    ? 'All square'
    : `${leader.teamName} ${clinched ? 'win' : 'lead'}`;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${leader.teamName} ${formatPoints(leader.totalPoints)}, ${other.teamName} ${formatPoints(other.totalPoints)}. ${outcomeText}.`}
        testID={testID ? `${testID}-card` : undefined}
      >
        <LinearGradient
          colors={[colors.scoreboardGradientStart, colors.scoreboardGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.board}
        >
          {headlineLabel && (
            <Text style={[styles.headline, { color: colors.scoreboardLabel }]}>
              {headlineLabel.toUpperCase()}
            </Text>
          )}

          <View style={styles.scoreRow}>
            {/* Left column - leader */}
            <View style={styles.teamCol} testID={testID ? `${testID}-team-left` : undefined}>
              <View style={styles.teamNameRow}>
                <View style={[styles.dot, { backgroundColor: leftColor }]} />
                <Text style={[styles.teamName, { color: colors.white }]} numberOfLines={1}>
                  {leader.teamName}
                </Text>
                {leaderHasCurrentUser && <Badge label="You" variant="primary" size="sm" />}
              </View>
            </View>

            <View style={styles.scores}>
              <Text style={[styles.scoreNum, { color: colors.white }]}>
                {formatPoints(leader.totalPoints)}
              </Text>
              <Text style={[styles.scoreDash, { color: colors.scoreboardLabel }]}>–</Text>
              <Text style={[styles.scoreNum, { color: colors.white }]}>
                {formatPoints(other.totalPoints)}
              </Text>
            </View>

            {/* Right column - other team */}
            <View
              style={[styles.teamCol, styles.teamColRight]}
              testID={testID ? `${testID}-team-right` : undefined}
            >
              <View style={[styles.teamNameRow, styles.teamNameRowRight]}>
                {otherHasCurrentUser && <Badge label="You" variant="primary" size="sm" />}
                <Text style={[styles.teamName, styles.textRight, { color: colors.white }]} numberOfLines={1}>
                  {other.teamName}
                </Text>
                <View style={[styles.dot, { backgroundColor: rightColor }]} />
              </View>
            </View>
          </View>

          {showBar && (
            <View style={styles.barWrap}>
              <View style={[styles.barTrack, { backgroundColor: colors.scoreboardTrack }]}>
                <View style={[styles.barFillLeft, { width: leftPct, backgroundColor: leftColor }]} />
                <View style={[styles.barFillRight, { width: rightPct, backgroundColor: rightColor }]} />
              </View>
              {markerPct && (
                <View style={[styles.marker, { left: markerPct }]}>
                  <View style={[styles.markerLine, { backgroundColor: colors.scoreboardMarker }]} />
                  <Text style={[styles.markerLabel, { color: colors.scoreboardLabel }]}>
                    {formatPoints(pointsToWin!)} to win
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.outcomeRow}>
            <View style={[styles.outcomePill, { backgroundColor: colors.scoreboardTrack }]}>
              <Text style={[styles.outcomeText, { color: colors.white }]}>{outcomeText}</Text>
            </View>
          </View>

          <View style={styles.expandIconRow}>
            {expanded ? (
              <IconChevronUp size={18} color={colors.scoreboardLabel} />
            ) : (
              <IconChevronDown size={18} color={colors.scoreboardLabel} />
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {expanded && (
        <View
          style={[styles.breakdown, { backgroundColor: colors.surface }]}
          testID={testID ? `${testID}-breakdown` : undefined}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Round Breakdown</Text>

          {roundRows.length > 0 ? (
            roundRows.map((row, index) => {
              const leftWins = row.pointsLeft > row.pointsRight;
              const rightWins = row.pointsRight > row.pointsLeft;
              return (
                <TouchableOpacity
                  key={row.roundId}
                  style={[
                    styles.roundRow,
                    index < roundRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => openRound({ roundId: row.roundId, competitionId })}
                  disabled={!row.roundId}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.roundLabel}${row.courseName ? `, ${row.courseName}` : ''}: ${leader.teamName} ${formatPoints(row.pointsLeft)}, ${other.teamName} ${formatPoints(row.pointsRight)}. Opens round`}
                  testID={testID ? `${testID}-round-${row.roundId}` : undefined}
                >
                  <Text
                    style={[
                      styles.roundPoints,
                      { color: colors.textSecondary },
                      leftWins && [styles.roundPointsWinner, { color: leftColor }],
                    ]}
                  >
                    {formatPoints(row.pointsLeft)}
                  </Text>
                  <Text style={[styles.roundLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                    {row.roundLabel}
                    {row.courseName ? ` · ${row.courseName}` : ''}
                  </Text>
                  <Text
                    style={[
                      styles.roundPoints,
                      styles.textRight,
                      { color: colors.textSecondary },
                      rightWins && [styles.roundPointsWinner, { color: rightColor }],
                    ]}
                  >
                    {formatPoints(row.pointsRight)}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No rounds played yet</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  board: {
    padding: spacing.lg,
  },
  headline: {
    ...typography.captionBold,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCol: {
    flex: 1,
  },
  teamColRight: {
    alignItems: 'flex-end',
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamNameRowRight: {
    justifyContent: 'flex-end',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  teamName: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  textRight: {
    textAlign: 'right',
  },
  scores: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  scoreNum: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
  },
  scoreDash: {
    ...typography.h4,
  },
  barWrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  barTrack: {
    height: 9,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barFillLeft: {
    height: '100%',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  barFillRight: {
    height: '100%',
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  marker: {
    position: 'absolute',
    top: -3,
    alignItems: 'center',
  },
  markerLine: {
    width: 1,
    height: 15,
  },
  markerLabel: {
    ...typography.caption,
    fontSize: 9,
    marginTop: 2,
  },
  outcomeRow: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  outcomePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  outcomeText: {
    ...typography.smallBold,
  },
  expandIconRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  breakdown: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  roundLabel: {
    ...typography.smallBold,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  roundPoints: {
    ...typography.smallBold,
    minWidth: 32,
  },
  roundPointsWinner: {
    fontWeight: '800',
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
  },
});

export default TeamHeadToHeadCard;
