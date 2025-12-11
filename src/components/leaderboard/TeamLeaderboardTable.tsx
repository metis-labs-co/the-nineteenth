/**
 * TeamLeaderboardTable - Display team standings with expandable rows
 *
 * Features:
 * - Sorted list of teams by points (descending)
 * - Columns: Position | Team Name | Avg HC | Points
 * - Expandable rows to show team members with individual stats
 * - Highlight row if current user is a team member
 * - Trophy icon for 1st place
 * - Handle ties with 'T' suffix on position
 * - Loading and empty states
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { IconTrophy, IconChartBar, IconChevronDown, IconChevronUp, IconUser } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Team member with individual stats */
export interface TeamMemberEntry {
  /** Player ID */
  playerId: string;
  /** Player display name */
  playerName: string;
  /** Player handicap */
  handicap: number;
  /** Individual points contributed */
  points: number;
  /** Number of rounds played */
  roundsPlayed?: number;
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
  /** Team members with individual stats */
  members: TeamMemberEntry[];
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
  /** Hide individual member points (e.g., for scramble format where individual scores don't apply) */
  hideMemberPoints?: boolean;
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

export function TeamLeaderboardTable({
  leaderboard,
  currentUserId,
  isLoading = false,
  showTiedIndicator = true,
  emptyMessage = 'Team standings will appear here once scores are submitted.',
  hideMemberPoints = false,
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading team standings...
        </Text>
      </View>
    );
  }

  // Empty state
  if (leaderboardWithPositions.length === 0) {
    return (
      <Surface
        style={[styles.emptyCard, { backgroundColor: colors.surface }]}
        elevation={1}
        testID={testID ? `${testID}-empty` : undefined}
      >
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray200 }]}>
            <IconChartBar size={48} color={colors.gray400} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No team standings yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{emptyMessage}</Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1} testID={testID}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.gray200 }]}>
        <Text style={[styles.tableHeaderCell, styles.positionCol, { color: colors.textSecondary }]}>
          #
        </Text>
        <Text style={[styles.tableHeaderCell, styles.teamCol, { color: colors.textSecondary }]}>
          Team
        </Text>
        <Text style={[styles.tableHeaderCell, styles.handicapCol, { color: colors.textSecondary }]}>
          Avg HC
        </Text>
        <Text style={[styles.tableHeaderCell, styles.pointsCol, { color: colors.textSecondary }]}>
          Pts
        </Text>
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
                { borderBottomColor: colors.gray100 },
                entry.hasCurrentUser && [
                  styles.tableRowHighlighted,
                  { backgroundColor: colors.primaryLighter + '30' },
                ],
                isFirstPlace && [styles.tableRowFirst, { backgroundColor: colors.warningLight + '20' }],
              ]}
              onPress={() => toggleExpanded(entry.teamId)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${entry.teamName}, Position ${entry.position}${entry.isTied && showTiedIndicator ? ' tied' : ''}, Average handicap ${entry.avgHandicap.toFixed(1)}, ${entry.totalPoints} points. ${isExpanded ? 'Collapse' : 'Expand'} to see team members.`}
              accessibilityState={{ expanded: isExpanded }}
            >
              {/* Position */}
              <View style={[styles.tableCell, styles.positionCol]}>
                {isFirstPlace ? (
                  <IconTrophy size={20} color={colors.warning} />
                ) : (
                  <Text
                    style={[
                      styles.positionText,
                      { color: colors.textSecondary },
                      entry.hasCurrentUser && { color: colors.primary },
                    ]}
                  >
                    {entry.position}
                    {entry.isTied && showTiedIndicator && (
                      <Text style={[styles.tiedIndicator, { color: colors.textDisabled }]}>T</Text>
                    )}
                  </Text>
                )}
              </View>

              {/* Team Name */}
              <View style={[styles.tableCell, styles.teamCol]}>
                <Text
                  style={[
                    styles.teamName,
                    { color: colors.textPrimary },
                    entry.hasCurrentUser && [styles.teamNameHighlighted, { color: colors.primary }],
                  ]}
                  numberOfLines={1}
                >
                  {entry.teamName}
                </Text>
                <Text style={[styles.memberCount, { color: colors.textTertiary }]}>
                  {entry.members.length} member{entry.members.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Average Handicap */}
              <View style={[styles.tableCell, styles.handicapCol]}>
                <Text
                  style={[
                    styles.handicapText,
                    { color: colors.textSecondary },
                    entry.hasCurrentUser && { color: colors.primary },
                  ]}
                >
                  {entry.avgHandicap.toFixed(1)}
                </Text>
              </View>

              {/* Points */}
              <View style={[styles.tableCell, styles.pointsCol]}>
                <Text
                  style={[
                    styles.pointsText,
                    { color: colors.textPrimary },
                    entry.hasCurrentUser && { color: colors.primary },
                    isFirstPlace && [styles.pointsFirst, { color: colors.warningDark }],
                  ]}
                >
                  {entry.totalPoints}
                </Text>
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

            {/* Expanded Team Members */}
            {isExpanded && (
              <View style={[styles.membersContainer, { backgroundColor: colors.gray50 }]}>
                {entry.members.map((member, memberIndex) => {
                  const isCurrentUserMember = member.playerId === currentUserId;

                  return (
                    <View
                      key={member.playerId}
                      style={[
                        styles.memberRow,
                        memberIndex < entry.members.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.gray200,
                        },
                      ]}
                      accessibilityRole="text"
                      accessibilityLabel={`${isCurrentUserMember ? 'You' : member.playerName}, Handicap ${member.handicap}${!hideMemberPoints ? `, ${member.points} points` : ''}`}
                    >
                      {/* Member Icon */}
                      <View style={styles.memberIconCol}>
                        <IconUser size={16} color={colors.textTertiary} />
                      </View>

                      {/* Member Name */}
                      <View style={[styles.memberNameCol, hideMemberPoints && styles.memberNameColExpanded]}>
                        <Text
                          style={[
                            styles.memberName,
                            { color: colors.textPrimary },
                            isCurrentUserMember && { color: colors.primary, fontWeight: '600' },
                          ]}
                          numberOfLines={1}
                        >
                          {isCurrentUserMember ? 'You' : member.playerName}
                        </Text>
                      </View>

                      {/* Member Handicap */}
                      <View style={styles.memberHandicapCol}>
                        <Text style={[styles.memberStat, { color: colors.textSecondary }]}>
                          HC: {member.handicap}
                        </Text>
                      </View>

                      {/* Member Points - hidden for scramble format */}
                      {!hideMemberPoints && (
                        <View style={styles.memberPointsCol}>
                          <Text
                            style={[
                              styles.memberPoints,
                              { color: colors.textPrimary },
                              isCurrentUserMember && { color: colors.primary },
                            ]}
                          >
                            {member.points} pts
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </Surface>
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

  // Column widths
  positionCol: {
    width: 36,
    alignItems: 'center',
  },
  teamCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  handicapCol: {
    width: 50,
    alignItems: 'center',
  },
  pointsCol: {
    width: 44,
    alignItems: 'flex-end',
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
  teamName: {
    ...typography.body,
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

  // Expanded Members
  membersContainer: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xl,
  },
  memberIconCol: {
    width: 24,
    alignItems: 'center',
  },
  memberNameCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  memberNameColExpanded: {
    flex: 2, // Take more space when points column is hidden
  },
  memberName: {
    ...typography.small,
  },
  memberHandicapCol: {
    width: 60,
    alignItems: 'center',
  },
  memberStat: {
    ...typography.caption,
  },
  memberPointsCol: {
    width: 60,
    alignItems: 'flex-end',
  },
  memberPoints: {
    ...typography.smallBold,
  },

  // Loading state
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default TeamLeaderboardTable;
