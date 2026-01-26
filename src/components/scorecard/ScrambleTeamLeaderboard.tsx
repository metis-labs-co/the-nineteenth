/**
 * ScrambleTeamLeaderboard Component
 *
 * Shows team standings for scramble format with:
 * - Position ranking sorted by net score
 * - Gross total strokes
 * - Net total strokes
 * - To par (+/- format)
 * - Expandable rows showing team members
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TeamConfig {
  id: string;
  name: string;
  memberIds: string[];
}

interface ScrambleTeamLeaderboardProps {
  /** Team configurations */
  teams: TeamConfig[];
  /** All players (to look up team member details) */
  players: Player[];
  /** Hole data with par values */
  holes: Hole[];
  /** Function to get team score for a specific team and hole */
  getTeamScore: (teamIndex: number, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  /** Current user ID for highlighting */
  currentUserId?: string;
  /** Test ID for testing */
  testID?: string;
}

interface TeamScoreData {
  teamId: string;
  teamName: string;
  teamIndex: number;
  members: Player[];
  teamHandicap: number;
  gross: number;
  net: number;
  toPar: number;
  holesCompleted: number;
  position: number;
  isTied: boolean;
  hasCurrentUser: boolean;
}

/** Calculate scramble team handicap: 25% of sum of all handicaps */
function calculateScrambleTeamHandicap(members: Player[]): number {
  if (members.length === 0) return 0;
  const sum = members.reduce((acc, p) => acc + (p.handicap ?? 0), 0);
  return Math.round((sum * 0.25) * 10) / 10;
}

/** Calculate handicap strokes for a hole based on team handicap and stroke index */
function getHandicapStrokesForHole(teamHandicap: number, strokeIndex: number): number {
  if (teamHandicap <= 0) return 0;
  const fullStrokes = Math.floor(teamHandicap);
  const extraStrokes = teamHandicap >= 18 ? fullStrokes - 18 : 0;

  if (extraStrokes > 0) {
    // 2 strokes on holes with stroke index <= extra strokes
    return strokeIndex <= extraStrokes ? 2 : (strokeIndex <= fullStrokes ? 1 : 0);
  }
  // Standard: get stroke if handicap >= stroke index
  return fullStrokes >= strokeIndex ? 1 : 0;
}

export function ScrambleTeamLeaderboard({
  teams,
  players,
  holes,
  getTeamScore,
  currentUserId,
  testID,
}: ScrambleTeamLeaderboardProps) {
  const colors = useThemeColors();
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Calculate scores for each team
  const teamScores: TeamScoreData[] = useMemo(() => {
    if (teams.length === 0 || holes.length === 0) return [];

    const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

    const scores = teams.map((team, teamIndex) => {
      // Get team members
      const members = team.memberIds
        .map((id) => players.find((p) => p.id === id))
        .filter((p): p is Player => p !== undefined);

      // Calculate team handicap
      const teamHandicap = calculateScrambleTeamHandicap(members);

      // Calculate gross and net scores
      let gross = 0;
      let handicapStrokes = 0;
      let holesCompleted = 0;

      for (let holeNum = 1; holeNum <= holes.length; holeNum++) {
        const score = getTeamScore(teamIndex, holeNum);
        if (!score || !isSingleBallScore(score) || !score.strokes) continue;

        holesCompleted++;
        gross += score.strokes;

        // Get stroke index for this hole
        const holeData = holes.find((h) => h.number === holeNum);
        const strokeIndex = holeData?.strokeIndex ?? holeNum;
        handicapStrokes += getHandicapStrokesForHole(teamHandicap, strokeIndex);
      }

      const net = gross - handicapStrokes;
      const toPar = holesCompleted > 0 ? net - totalPar : 0;

      // Check if current user is a member
      const hasCurrentUser = currentUserId
        ? members.some((m) => m.id === currentUserId)
        : false;

      return {
        teamId: team.id,
        teamName: team.name,
        teamIndex,
        members,
        teamHandicap,
        gross,
        net,
        toPar,
        holesCompleted,
        position: 0,
        isTied: false,
        hasCurrentUser,
      };
    });

    // Sort by net score (ascending - lower is better)
    scores.sort((a, b) => {
      // Teams with no scores go to the end
      if (a.holesCompleted === 0 && b.holesCompleted === 0) return 0;
      if (a.holesCompleted === 0) return 1;
      if (b.holesCompleted === 0) return -1;
      return a.net - b.net;
    });

    // Assign positions with tie handling
    let currentPosition = 1;
    let lastNet: number | null = null;

    scores.forEach((team, index) => {
      if (team.holesCompleted === 0) {
        team.position = scores.length;
        return;
      }

      if (lastNet === null || team.net !== lastNet) {
        currentPosition = index + 1;
      }
      team.position = currentPosition;
      lastNet = team.net;

      // Check if tied
      const prevHasScores = index > 0 && scores[index - 1].holesCompleted > 0;
      const nextHasScores = index < scores.length - 1 && scores[index + 1].holesCompleted > 0;
      team.isTied =
        (prevHasScores && scores[index - 1].net === team.net) ||
        (nextHasScores && scores[index + 1].net === team.net);
    });

    return scores;
  }, [teams, players, holes, getTeamScore, currentUserId]);

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

  // Format to-par display
  const formatToPar = (value: number): string => {
    if (value === 0) return 'E';
    return value > 0 ? `+${value}` : `${value}`;
  };

  // Get color for to-par
  const getToParColor = (value: number): string => {
    if (value < 0) return colors.success;
    if (value > 0) return colors.error;
    return colors.textSecondary;
  };

  // Empty state
  if (teamScores.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.surface }]}
        testID={testID ? `${testID}-empty` : undefined}
      >
        <Icon source="trophy-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No Team Scores Yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Team standings will appear here as scores are entered.
        </Text>
      </View>
    );
  }

  // Check if any teams have scores
  const hasAnyScores = teamScores.some((t) => t.holesCompleted > 0);
  if (!hasAnyScores) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.surface }]}
        testID={testID ? `${testID}-empty` : undefined}
      >
        <Icon source="trophy-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No Scores Entered
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Team standings will appear here once scores are entered.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <Icon source="trophy" size={20} color={colors.warning} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Team Leaderboard
        </Text>
      </View>

      {/* Table Header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerCell, styles.positionCol, { color: colors.textSecondary }]}>
          #
        </Text>
        <Text style={[styles.headerCell, styles.teamCol, { color: colors.textSecondary }]}>
          Team
        </Text>
        <Text style={[styles.headerCell, styles.scoreCol, { color: colors.textSecondary }]}>
          Gross
        </Text>
        <Text style={[styles.headerCell, styles.scoreCol, { color: colors.textSecondary }]}>
          Net
        </Text>
        <Text style={[styles.headerCell, styles.toParCol, { color: colors.textSecondary }]}>
          To Par
        </Text>
        <View style={styles.expandCol} />
      </View>

      {/* Team Rows */}
      {teamScores.map((team) => {
        const isExpanded = expandedTeams.has(team.teamId);
        const isFirstPlace = team.position === 1 && team.holesCompleted > 0;

        return (
          <View key={team.teamId}>
            <TouchableOpacity
              style={[
                styles.tableRow,
                { borderBottomColor: colors.border },
                team.hasCurrentUser && [
                  styles.highlightedRow,
                  { backgroundColor: withOpacity(colors.primaryLighter, 0.19) },
                ],
                isFirstPlace && [
                  styles.firstPlaceRow,
                  { backgroundColor: withOpacity(colors.warningLight, 0.13) },
                ],
              ]}
              onPress={() => toggleExpanded(team.teamId)}
              activeOpacity={0.7}
            >
              {/* Position */}
              <View style={[styles.cell, styles.positionCol]}>
                {isFirstPlace ? (
                  <Icon source="trophy" size={20} color={colors.warning} />
                ) : (
                  <Text
                    style={[
                      styles.positionText,
                      { color: colors.textSecondary },
                      team.hasCurrentUser && { color: colors.primary },
                    ]}
                  >
                    {team.holesCompleted > 0 ? team.position : '-'}
                    {team.isTied && (
                      <Text style={[styles.tiedText, { color: colors.textDisabled }]}>T</Text>
                    )}
                  </Text>
                )}
              </View>

              {/* Team Name */}
              <View style={[styles.cell, styles.teamCol]}>
                <Text
                  style={[
                    styles.teamName,
                    { color: colors.textPrimary },
                    team.hasCurrentUser && { color: colors.primary, fontWeight: '600' },
                  ]}
                  numberOfLines={1}
                >
                  {team.teamName}
                </Text>
                {team.holesCompleted < holes.length && team.holesCompleted > 0 && (
                  <Text style={[styles.holesText, { color: colors.textTertiary }]}>
                    {team.holesCompleted} holes
                  </Text>
                )}
              </View>

              {/* Gross */}
              <View style={[styles.cell, styles.scoreCol]}>
                <Text
                  style={[
                    styles.scoreText,
                    { color: colors.textSecondary },
                    team.hasCurrentUser && { color: colors.primary },
                  ]}
                >
                  {team.holesCompleted > 0 ? team.gross : '-'}
                </Text>
              </View>

              {/* Net */}
              <View style={[styles.cell, styles.scoreCol]}>
                <Text
                  style={[
                    styles.scoreText,
                    { color: colors.textPrimary },
                    team.hasCurrentUser && { color: colors.primary },
                  ]}
                >
                  {team.holesCompleted > 0 ? team.net : '-'}
                </Text>
              </View>

              {/* To Par */}
              <View style={[styles.cell, styles.toParCol]}>
                <Text
                  style={[
                    styles.toParText,
                    { color: team.holesCompleted > 0 ? getToParColor(team.toPar) : colors.textTertiary },
                  ]}
                >
                  {team.holesCompleted > 0 ? formatToPar(team.toPar) : '-'}
                </Text>
              </View>

              {/* Expand Icon */}
              <View style={[styles.cell, styles.expandCol]}>
                <Icon
                  source={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>

            {/* Expanded Team Members */}
            {isExpanded && (
              <View style={[styles.membersContainer, { backgroundColor: colors.surfaceVariant }]}>
                <View style={styles.membersHeader}>
                  <Text style={[styles.membersLabel, { color: colors.textSecondary }]}>
                    Team Members
                  </Text>
                  <Text style={[styles.handicapLabel, { color: colors.textTertiary }]}>
                    Team HC: {team.teamHandicap.toFixed(1)}
                  </Text>
                </View>
                {team.members.map((member, idx) => {
                  const isCurrentUser = member.id === currentUserId;
                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.memberRow,
                        idx < team.members.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <Icon source="account" size={16} color={colors.textTertiary} />
                      <Text
                        style={[
                          styles.memberName,
                          { color: colors.textPrimary },
                          isCurrentUser && { color: colors.primary, fontWeight: '600' },
                        ]}
                        numberOfLines={1}
                      >
                        {isCurrentUser ? 'You' : member.name}
                      </Text>
                      <Text style={[styles.memberHandicap, { color: colors.textSecondary }]}>
                        HC: {member.handicap ?? 0}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.bodyBold,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  highlightedRow: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  firstPlaceRow: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  cell: {
    justifyContent: 'center',
  },
  positionCol: {
    width: 32,
    alignItems: 'center',
  },
  teamCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  scoreCol: {
    width: 48,
    alignItems: 'center',
  },
  toParCol: {
    width: 48,
    alignItems: 'center',
  },
  expandCol: {
    width: 28,
    alignItems: 'center',
  },
  positionText: {
    ...typography.bodyBold,
  },
  tiedText: {
    ...typography.caption,
  },
  teamName: {
    ...typography.body,
  },
  holesText: {
    ...typography.caption,
    marginTop: 2,
  },
  scoreText: {
    ...typography.body,
  },
  toParText: {
    ...typography.bodyBold,
  },
  membersContainer: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  membersLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  handicapLabel: {
    ...typography.caption,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
  },
  memberName: {
    flex: 1,
    ...typography.small,
  },
  memberHandicap: {
    ...typography.caption,
  },
  emptyContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default ScrambleTeamLeaderboard;
