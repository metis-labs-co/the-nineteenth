/**
 * TeamLeaderboardTable - Display team standings with expandable rows
 *
 * Features:
 * - Sorted list of teams by points (descending)
 * - Columns: Position | Team Name | Avg HC | Points
 * - Expandable rows show players (names + handicap) and a per-round
 *   points breakdown so the user can see how the total was earned
 * - Highlight row if current user is a team member
 * - Trophy icon for 1st place
 * - Handle ties with 'T' suffix on position
 * - Loading and empty states
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Badge, EmptyState, LoadingSpinner, ScaledText } from '@/components/common';
import { IconTrophy, IconChevronDown, IconChevronUp, IconFlag } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Team member info */
export interface TeamMemberEntry {
  /** Player ID */
  playerId: string;
  /** Player display name */
  playerName: string;
  /** Player handicap */
  handicap: number;
}

/** Per-round points breakdown for a team */
export interface RoundBreakdownEntry {
  /** Round ID */
  roundId: string;
  /** Short round label (e.g., "R1") */
  roundLabel: string;
  /** Optional course/round subtitle (e.g., course name) */
  courseName?: string;
  /** Position the team finished in this round */
  position: number;
  /** Competition points earned this round */
  points: number;
}

/** Team leaderboard entry */
export interface TeamLeaderboardEntry {
  /** Unique team ID */
  teamId: string;
  /** Team display name */
  teamName: string;
  /** Average handicap of team members */
  avgHandicap: number;
  /** Total team points */
  totalPoints: number;
  /** Team members (used for the inline player list and current-user highlighting) */
  members: TeamMemberEntry[];
  /** Per-round points breakdown shown when the row is expanded */
  roundBreakdown?: RoundBreakdownEntry[];
}

export interface TeamLeaderboardTableProps {
  /** Team leaderboard entries to display */
  leaderboard: TeamLeaderboardEntry[];
  /** Current user ID for highlighting their team */
  currentUserId?: string;
  /** Whether the data is loading */
  isLoading?: boolean;
  /** Show tied indicator (T) next to position */
  showTiedIndicator?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Test ID for testing */
  testID?: string;
}

/** Extended entry with calculated position */
interface TeamEntryWithPosition extends TeamLeaderboardEntry {
  position: number;
  isTied: boolean;
  hasCurrentUser: boolean;
}

/**
 * Calculate positions with tie handling
 */
function calculatePositions(
  leaderboard: TeamLeaderboardEntry[],
  currentUserId?: string
): TeamEntryWithPosition[] {
  if (!leaderboard || leaderboard.length === 0) return [];

  // Sort by points descending
  const sorted = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);

  let currentPosition = 1;
  let lastPoints: number | null = null;

  return sorted.map((entry, index) => {
    if (lastPoints === null || entry.totalPoints !== lastPoints) {
      currentPosition = index + 1;
    }
    lastPoints = entry.totalPoints;

    // Check if tied (same points as previous or next entry)
    const isTied =
      (index > 0 && sorted[index - 1].totalPoints === entry.totalPoints) ||
      (index < sorted.length - 1 && sorted[index + 1].totalPoints === entry.totalPoints);

    // Check if current user is a member of this team
    const hasCurrentUser = currentUserId
      ? entry.members.some((member) => member.playerId === currentUserId)
      : false;

    return {
      ...entry,
      position: currentPosition,
      isTied,
      hasCurrentUser,
    };
  });
}

/**
 * Add an ordinal suffix to a position number (1 -> "1st", 2 -> "2nd", etc.)
 */
function ordinal(n: number): string {
  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (abs % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function TeamLeaderboardTable({
  leaderboard,
  currentUserId,
  isLoading = false,
  showTiedIndicator = true,
  emptyMessage = 'Team standings will appear here once scores are submitted.',
  testID,
}: TeamLeaderboardTableProps) {
  const colors = useThemeColors();
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Calculate positions with tie handling
  const leaderboardWithPositions = useMemo(
    () => calculatePositions(leaderboard, currentUserId),
    [leaderboard, currentUserId]
  );

  const toggleExpanded = (teamId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID={testID ? `${testID}-loading` : undefined}>
        <LoadingSpinner size="lg" message="Loading team standings..." />
      </View>
    );
  }

  // Empty state
  if (leaderboardWithPositions.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface }]} testID={testID ? `${testID}-empty` : undefined}>
        <EmptyState
          title="No team standings yet"
          message={emptyMessage}
          icon="chart-bar"
          compact
        />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]} testID={testID}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <ScaledText category="caption" style={[styles.tableHeaderCell, styles.positionCol, { color: colors.textSecondary }]}>
          #
        </ScaledText>
        <ScaledText category="caption" style={[styles.tableHeaderCell, styles.teamCol, { color: colors.textSecondary }]}>
          Team
        </ScaledText>
        <ScaledText category="caption" style={[styles.tableHeaderCell, styles.handicapCol, { color: colors.textSecondary }]}>
          Avg HC
        </ScaledText>
        <ScaledText category="caption" style={[styles.tableHeaderCell, styles.pointsCol, { color: colors.textSecondary }]}>
          Pts
        </ScaledText>
        <View style={styles.expandCol} />
      </View>

      {/* Table Rows */}
      {leaderboardWithPositions.map((entry) => {
        const isExpanded = expandedTeams.has(entry.teamId);
        const isFirstPlace = entry.position === 1;

        return (
          <View key={entry.teamId}>
            {/* Team Row */}
            <TouchableOpacity
              style={[
                styles.tableRow,
                { borderBottomColor: colors.border },
                entry.hasCurrentUser && [
                  styles.tableRowHighlighted,
                  { backgroundColor: withOpacity(colors.primaryLighter, 0.19) },
                ],
                isFirstPlace && [styles.tableRowFirst, { backgroundColor: withOpacity(colors.warningLight, 0.13) }],
              ]}
              onPress={() => toggleExpanded(entry.teamId)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${entry.teamName}, Position ${entry.position}${entry.isTied && showTiedIndicator ? ' tied' : ''}, Average handicap ${entry.avgHandicap.toFixed(1)}, ${entry.totalPoints} points. ${isExpanded ? 'Collapse' : 'Expand'} to see players and per-round points breakdown.`}
              accessibilityState={{ expanded: isExpanded }}
            >
              {/* Position */}
              <View style={[styles.tableCell, styles.positionCol]}>
                {isFirstPlace ? (
                  <IconTrophy size={20} color={colors.warning} />
                ) : (
                  <ScaledText
                    category="caption"
                    style={[
                      styles.positionText,
                      { color: colors.textSecondary },
                      entry.hasCurrentUser && { color: colors.primary },
                    ]}
                  >
                    {entry.position}
                    {entry.isTied && showTiedIndicator && (
                      <ScaledText category="caption" style={[styles.tiedIndicator, { color: colors.textDisabled }]}>T</ScaledText>
                    )}
                  </ScaledText>
                )}
              </View>

              {/* Team Name */}
              <View style={[styles.tableCell, styles.teamCol]}>
                <View style={styles.teamNameRow}>
                  <ScaledText
                    category="body"
                    style={[
                      styles.teamName,
                      { color: colors.textPrimary },
                      entry.hasCurrentUser && [styles.teamNameHighlighted, { color: colors.primary }],
                    ]}
                    numberOfLines={1}
                  >
                    {entry.teamName}
                  </ScaledText>
                  {entry.hasCurrentUser && <Badge label="You" variant="primary" size="sm" />}
                </View>
                <ScaledText category="caption" style={[styles.memberCount, { color: colors.textTertiary }]}>
                  {entry.members.length} member{entry.members.length !== 1 ? 's' : ''}
                </ScaledText>
              </View>

              {/* Average Handicap */}
              <View style={[styles.tableCell, styles.handicapCol]}>
                <ScaledText
                  category="caption"
                  style={[
                    styles.handicapText,
                    { color: colors.textSecondary },
                    entry.hasCurrentUser && { color: colors.primary },
                  ]}
                >
                  {entry.avgHandicap.toFixed(1)}
                </ScaledText>
              </View>

              {/* Points */}
              <View style={[styles.tableCell, styles.pointsCol]}>
                <ScaledText
                  category="caption"
                  style={[
                    styles.pointsText,
                    { color: colors.textPrimary },
                    entry.hasCurrentUser && { color: colors.primary },
                    isFirstPlace && [styles.pointsFirst, { color: colors.warningDark }],
                  ]}
                >
                  {entry.totalPoints}
                </ScaledText>
              </View>

              {/* Expand/Collapse Icon */}
              <View style={[styles.tableCell, styles.expandCol]}>
                {isExpanded ? (
                  <IconChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <IconChevronDown size={20} color={colors.textSecondary} />
                )}
              </View>
            </TouchableOpacity>

            {/* Expanded: Players + Per-round Points Breakdown */}
            {isExpanded && (
              <View
                style={[styles.expandedContainer, { backgroundColor: colors.surfaceVariant }]}
                testID={testID ? `${testID}-breakdown-${entry.teamId}` : undefined}
              >
                {/* Players inline list */}
                {entry.members.length > 0 && (
                  <View style={styles.playersLine}>
                    <ScaledText
                      category="caption"
                      style={[styles.playersLabel, { color: colors.textSecondary }]}
                    >
                      Players:
                    </ScaledText>
                    <ScaledText
                      category="caption"
                      style={[styles.playersList, { color: colors.textPrimary }]}
                    >
                      {entry.members
                        .map((m) =>
                          m.playerId === currentUserId
                            ? `You (${m.handicap})`
                            : `${m.playerName} (${m.handicap})`
                        )
                        .join(', ')}
                    </ScaledText>
                  </View>
                )}

                {/* Per-round breakdown */}
                {entry.roundBreakdown && entry.roundBreakdown.length > 0 ? (
                  <View style={styles.breakdownTable}>
                    {/* Breakdown header */}
                    <View style={[styles.breakdownHeader, { borderBottomColor: colors.border }]}>
                      <ScaledText
                        category="caption"
                        style={[styles.breakdownHeaderCell, styles.breakdownRoundCol, { color: colors.textSecondary }]}
                      >
                        Round
                      </ScaledText>
                      <ScaledText
                        category="caption"
                        style={[styles.breakdownHeaderCell, styles.breakdownPosCol, { color: colors.textSecondary }]}
                      >
                        Pos
                      </ScaledText>
                      <ScaledText
                        category="caption"
                        style={[styles.breakdownHeaderCell, styles.breakdownPtsCol, { color: colors.textSecondary }]}
                      >
                        Pts
                      </ScaledText>
                    </View>

                    {/* Breakdown rows */}
                    {entry.roundBreakdown.map((round, roundIndex) => (
                      <View
                        key={round.roundId}
                        style={[
                          styles.breakdownRow,
                          roundIndex < entry.roundBreakdown!.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          },
                        ]}
                        accessibilityRole="text"
                        accessibilityLabel={`${round.roundLabel}${round.courseName ? `, ${round.courseName}` : ''}, finished ${ordinal(round.position)}, ${round.points} points`}
                      >
                        <View style={[styles.breakdownCell, styles.breakdownRoundCol]}>
                          <View style={styles.roundLabelRow}>
                            <IconFlag size={14} color={colors.textTertiary} />
                            <ScaledText
                              category="caption"
                              style={[styles.roundLabel, { color: colors.textPrimary }]}
                            >
                              {round.roundLabel}
                            </ScaledText>
                          </View>
                          {round.courseName && (
                            <ScaledText
                              category="caption"
                              style={[styles.roundCourse, { color: colors.textTertiary }]}
                              numberOfLines={1}
                            >
                              {round.courseName}
                            </ScaledText>
                          )}
                        </View>

                        <View style={[styles.breakdownCell, styles.breakdownPosCol]}>
                          <ScaledText
                            category="caption"
                            style={[styles.breakdownPos, { color: colors.textSecondary }]}
                          >
                            {ordinal(round.position)}
                          </ScaledText>
                        </View>

                        <View style={[styles.breakdownCell, styles.breakdownPtsCol]}>
                          <ScaledText
                            category="caption"
                            style={[styles.breakdownPts, { color: colors.textPrimary }]}
                          >
                            {round.points}
                          </ScaledText>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.breakdownEmpty}>
                    <ScaledText
                      category="caption"
                      style={{ color: colors.textTertiary, textAlign: 'center' }}
                    >
                      No rounds played yet
                    </ScaledText>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Card
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },

  // Table Header
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },

  // Table Row
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 56,
  },
  tableRowHighlighted: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  tableRowFirst: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  tableCell: {
    justifyContent: 'center',
  },

  // Column widths (minWidth for text scaling flexibility)
  // textAlign applies to the Text headers; alignItems applies to the View row cells
  positionCol: {
    minWidth: 36,
    alignItems: 'center',
    textAlign: 'center',
  },
  teamCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  handicapCol: {
    minWidth: 50,
    alignItems: 'center',
    textAlign: 'center',
  },
  pointsCol: {
    minWidth: 44,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  expandCol: {
    width: 28,
    alignItems: 'center',
  },

  // Position
  positionText: {
    ...typography.bodyBold,
  },
  tiedIndicator: {
    ...typography.caption,
  },

  // Team
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  teamName: {
    ...typography.body,
    flexShrink: 1,
  },
  teamNameHighlighted: {
    ...typography.bodyBold,
  },
  memberCount: {
    ...typography.caption,
    marginTop: 2,
  },

  // Handicap
  handicapText: {
    ...typography.small,
  },

  // Points
  pointsText: {
    ...typography.h4,
  },
  pointsFirst: {
    // Color applied inline
  },

  // Expanded section
  expandedContainer: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  // Players inline list
  playersLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  playersLabel: {
    ...typography.captionBold,
  },
  playersList: {
    ...typography.caption,
    flexShrink: 1,
  },

  // Per-round breakdown table
  breakdownTable: {
    paddingHorizontal: spacing.sm,
  },
  breakdownHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  breakdownHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  breakdownCell: {
    justifyContent: 'center',
  },
  breakdownRoundCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  breakdownPosCol: {
    width: 56,
    alignItems: 'center',
    textAlign: 'center',
  },
  breakdownPtsCol: {
    width: 48,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  roundLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roundLabel: {
    ...typography.smallBold,
  },
  roundCourse: {
    ...typography.caption,
    marginTop: 2,
  },
  breakdownPos: {
    ...typography.small,
  },
  breakdownPts: {
    ...typography.smallBold,
  },
  breakdownEmpty: {
    paddingVertical: spacing.md,
  },

  // Loading state
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
});

export default TeamLeaderboardTable;
