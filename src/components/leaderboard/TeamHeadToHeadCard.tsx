/**
 * TeamHeadToHeadCard - Ryder-cup style 2-team head-to-head scoreboard
 *
 * Features:
 * - Two-column layout: team colour accent, name, "You" badge, member names,
 *   avg handicap, and a big accumulated-points number per side
 * - Leader (higher totalPoints) shown in the left column with a trophy;
 *   an exact tie keeps input order and shows no trophy
 * - Tap the card to expand a per-round breakdown (round label + course,
 *   both teams' points, winning side highlighted in its team colour)
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Badge, ScaledText } from '@/components/common';
import { IconTrophy, IconChevronDown, IconChevronUp } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeamLeaderboardEntry } from './TeamLeaderboardTable';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
import { mergeHeadToHeadRounds } from './teamHeadToHead';
import { buildPositionalRoundNumbers } from './roundNumbering';

export interface TeamHeadToHeadCardProps {
  /** The two teams, in any order */
  entries: [TeamLeaderboardEntry, TeamLeaderboardEntry];
  /** teamId -> hex colour */
  teamColors: Map<string, string>;
  /** Current user ID for "You" badge highlighting */
  currentUserId?: string;
  /** Rounds used to compute positional round numbers + course names */
  rounds: RoundWithCourse[];
  /** Test ID for testing */
  testID?: string;
}

export function TeamHeadToHeadCard({
  entries,
  teamColors,
  currentUserId,
  rounds,
  testID,
}: TeamHeadToHeadCardProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  const [leader, other] = useMemo(
    () => [...entries].sort((a, b) => b.totalPoints - a.totalPoints),
    [entries]
  );
  const isTie = entries[0].totalPoints === entries[1].totalPoints;

  const leftColor = teamColors.get(leader.teamId) ?? colors.textSecondary;
  const rightColor = teamColors.get(other.teamId) ?? colors.textSecondary;

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

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      testID={testID ? `${testID}-card` : undefined}
    >
      <View style={styles.scoreboardRow}>
        {/* Left column - leader */}
        <View style={styles.teamCol} testID={testID ? `${testID}-team-left` : undefined}>
          <View style={styles.teamHeaderRow}>
            <View style={[styles.dot, { backgroundColor: leftColor }]} />
            <ScaledText
              category="body"
              style={[styles.teamName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {leader.teamName}
            </ScaledText>
            {leaderHasCurrentUser && <Badge label="You" variant="primary" size="sm" />}
          </View>
          <ScaledText
            category="caption"
            style={[styles.memberNames, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {leader.members.map((m) => m.playerName).join(', ')}
          </ScaledText>
          <ScaledText category="caption" style={[styles.handicap, { color: colors.textSecondary }]}>
            HC {leader.avgHandicap.toFixed(1)}
          </ScaledText>

          <View style={styles.pointsRow}>
            {!isTie && <IconTrophy size={20} color={colors.warning} style={styles.trophy} />}
            <ScaledText
              category="body"
              style={[
                styles.points,
                { color: colors.textPrimary },
                !isTie && [styles.pointsLeader, { color: leftColor }],
              ]}
            >
              {leader.totalPoints}
            </ScaledText>
          </View>
        </View>

        <ScaledText category="body" style={[styles.dash, { color: colors.textSecondary }]}>
          –
        </ScaledText>

        {/* Right column - other team */}
        <View style={[styles.teamCol, styles.teamColRight]} testID={testID ? `${testID}-team-right` : undefined}>
          <View style={[styles.teamHeaderRow, styles.teamHeaderRowRight]}>
            {otherHasCurrentUser && <Badge label="You" variant="primary" size="sm" />}
            <ScaledText
              category="body"
              style={[styles.teamName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {other.teamName}
            </ScaledText>
            <View style={[styles.dot, { backgroundColor: rightColor }]} />
          </View>
          <ScaledText
            category="caption"
            style={[styles.memberNames, styles.textRight, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {other.members.map((m) => m.playerName).join(', ')}
          </ScaledText>
          <ScaledText
            category="caption"
            style={[styles.handicap, styles.textRight, { color: colors.textSecondary }]}
          >
            HC {other.avgHandicap.toFixed(1)}
          </ScaledText>

          <View style={[styles.pointsRow, styles.pointsRowRight]}>
            <ScaledText category="body" style={[styles.points, { color: colors.textPrimary }]}>
              {other.totalPoints}
            </ScaledText>
          </View>
        </View>
      </View>

      <View style={styles.expandIconRow}>
        {expanded ? (
          <IconChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <IconChevronDown size={20} color={colors.textSecondary} />
        )}
      </View>

      {expanded && (
        <View
          style={[styles.expandedContainer, { backgroundColor: colors.surfaceVariant }]}
          testID={testID ? `${testID}-breakdown` : undefined}
        >
          <ScaledText category="caption" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Round Breakdown
          </ScaledText>

          {roundRows.length > 0 ? (
            roundRows.map((row, index) => {
              const leftWins = row.pointsLeft > row.pointsRight;
              const rightWins = row.pointsRight > row.pointsLeft;
              return (
                <View
                  key={row.roundId}
                  style={[
                    styles.roundRow,
                    index < roundRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  testID={testID ? `${testID}-round-${row.roundId}` : undefined}
                >
                  <ScaledText
                    category="caption"
                    style={[
                      styles.roundPoints,
                      { color: colors.textSecondary },
                      leftWins && [styles.roundPointsWinner, { color: leftColor }],
                    ]}
                  >
                    {row.pointsLeft}
                  </ScaledText>
                  <ScaledText
                    category="caption"
                    style={[styles.roundLabel, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {row.roundLabel}
                    {row.courseName ? ` · ${row.courseName}` : ''}
                  </ScaledText>
                  <ScaledText
                    category="caption"
                    style={[
                      styles.roundPoints,
                      styles.textRight,
                      { color: colors.textSecondary },
                      rightWins && [styles.roundPointsWinner, { color: rightColor }],
                    ]}
                  >
                    {row.pointsRight}
                  </ScaledText>
                </View>
              );
            })
          ) : (
            <ScaledText
              category="caption"
              style={{ color: colors.textTertiary, textAlign: 'center' }}
            >
              No rounds played yet
            </ScaledText>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCol: {
    flex: 1,
  },
  teamColRight: {
    alignItems: 'flex-end',
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamHeaderRowRight: {
    justifyContent: 'flex-end',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  teamName: {
    ...typography.h4,
    flexShrink: 1,
  },
  memberNames: {
    ...typography.caption,
    marginTop: 2,
  },
  handicap: {
    ...typography.caption,
    marginTop: 2,
  },
  textRight: {
    textAlign: 'right',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  pointsRowRight: {
    justifyContent: 'flex-end',
  },
  trophy: {
    // Icon size/color set inline
  },
  points: {
    ...typography.h1,
  },
  pointsLeader: {
    fontWeight: '800',
  },
  dash: {
    ...typography.h3,
    marginHorizontal: spacing.md,
  },
  expandIconRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  expandedContainer: {
    marginHorizontal: -spacing.lg,
    marginTop: spacing.md,
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
});

export default TeamHeadToHeadCard;
