/**
 * ContributionLeaderboard Component
 *
 * Shows leaderboards for scramble format contributions:
 * - Drives: Who contributed the most drives
 * - Approaches: Who contributed the most approach shots
 * - Putts: Who made the most putts
 *
 * For Shamble format:
 * - Best Drives: Who contributed the most drives
 * - Team Score Summary: Collective gross, net, and stableford totals
 */

import React, { useState } from 'react';
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
import { useThemeColors } from '@/context/ThemeContext';
import { EmptyState } from '@/components/common';
import type { Player, HoleScore, MultiBallHoleScore, Hole } from '@/types';
import { useContributionData } from './useContributionData';
import type { LeaderboardEntry } from './useContributionData';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ContributionLeaderboardProps {
  players: Player[];
  getTeamScore: (holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  totalHoles?: number;
  showOnlyDrives?: boolean;
  getPlayerScore?: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  holes?: Hole[];
}

export function ContributionLeaderboard({
  players,
  getTeamScore,
  totalHoles = 18,
  showOnlyDrives = false,
  getPlayerScore,
  holes,
}: ContributionLeaderboardProps) {
  const colors = useThemeColors();
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  const {
    hasContributions,
    driveLeaderboard,
    approachLeaderboard,
    puttLeaderboard,
    overallLeaderboard,
    driveLeaderboardWithHoles,
    teamScoreSummary,
    playerScoreSummaries,
    contributions,
  } = useContributionData({
    players,
    getTeamScore,
    totalHoles,
    showOnlyDrives,
    getPlayerScore,
    holes,
  });

  const togglePlayerExpanded = (playerId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const renderLeaderboardCard = (
    title: string,
    icon: string,
    iconColor: string,
    entries: LeaderboardEntry[]
  ) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <Icon source={icon} size={20} color={iconColor} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {entries.length > 0 ? (
        entries.map((entry, index) => (
          <View key={entry.playerId} style={styles.entryRow}>
            <View style={styles.entryRank}>
              <Text
                style={[
                  styles.rankText,
                  { color: index === 0 ? colors.primary : colors.textSecondary },
                ]}
              >
                {index + 1}
              </Text>
            </View>
            <View style={styles.entryInfo}>
              <Text style={[styles.entryName, { color: colors.textPrimary }]} numberOfLines={1}>
                {entry.playerName}
              </Text>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.gray200 },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: iconColor,
                      width: `${entry.percentage}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.entryCount}>
              <Text style={[styles.countText, { color: colors.textPrimary }]}>
                {entry.count}
              </Text>
              <Text style={[styles.percentText, { color: colors.textSecondary }]}>
                {entry.percentage.toFixed(0)}%
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No data yet
        </Text>
      )}
    </View>
  );

  // Render expandable drives card for shamble format
  const renderExpandableDrivesCard = () => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <Icon source="golf-tee" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Best Drives</Text>
      </View>
      {driveLeaderboardWithHoles.length > 0 ? (
        driveLeaderboardWithHoles.map((entry, index) => {
          const isExpanded = expandedPlayers.has(entry.playerId);
          const isFirst = index === 0;

          return (
            <View key={entry.playerId}>
              <TouchableOpacity
                style={styles.entryRow}
                onPress={() => togglePlayerExpanded(entry.playerId)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${entry.playerName}, ${entry.count} drives. Tap to ${isExpanded ? 'collapse' : 'expand'} and see hole numbers.`}
                accessibilityState={{ expanded: isExpanded }}
              >
                <View style={styles.entryRank}>
                  <Text
                    style={[
                      styles.rankText,
                      { color: isFirst ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {entry.playerName}
                  </Text>
                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: colors.gray200 },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${entry.percentage}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.entryCount}>
                  <Text style={[styles.countText, { color: colors.textPrimary }]}>
                    {entry.count}
                  </Text>
                  <Text style={[styles.percentText, { color: colors.textSecondary }]}>
                    {entry.percentage.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.expandIcon}>
                  <Icon
                    source={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded hole numbers */}
              {isExpanded && entry.holeNumbers.length > 0 && (
                <View style={[styles.expandedContent, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.holesUsedLabel, { color: colors.textSecondary }]}>
                    Holes used:
                  </Text>
                  <View style={styles.holeChipsContainer}>
                    {entry.holeNumbers.map((holeNum) => (
                      <View
                        key={holeNum}
                        style={[styles.holeChip, { backgroundColor: colors.primary + '20' }]}
                      >
                        <Text style={[styles.holeChipText, { color: colors.primary }]}>
                          {holeNum}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No drives recorded yet
        </Text>
      )}
    </View>
  );

  // Empty state when no contributions recorded
  // For shamble, check both drives AND team scores; for scramble, check all contributions
  const hasDrives = contributions.some((c) => c.drives > 0);
  const hasTeamScores = teamScoreSummary && teamScoreSummary.holesScored > 0;
  const isEmpty = showOnlyDrives ? (!hasDrives && !hasTeamScores) : !hasContributions;

  if (isEmpty) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <EmptyState
          title={showOnlyDrives ? "No Contributions Recorded" : "No Scores Recorded"}
          message={showOnlyDrives ? "Drive contributions will appear here as scores are entered." : "Contribution standings will appear here as scores are entered."}
          icon="chart-bar"
          compact
        />
      </View>
    );
  }

  // Format to-par display
  const formatToParTeam = (value: number): string => {
    if (value === 0) return 'E';
    return value > 0 ? `+${value}` : `${value}`;
  };

  // Get color for to-par (green for under, red for over, neutral for even)
  const getToParColorTeam = (value: number): string => {
    if (value < 0) return colors.success;
    if (value > 0) return colors.error;
    return colors.textSecondary;
  };

  // Render team score summary card for Shamble format
  const renderTeamScoreCard = () => {
    if (!teamScoreSummary) return null;

    const { grossTotal, netTotal, stablefordTotal, holesScored, toParNet } = teamScoreSummary;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Icon source="account-group" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Team Score</Text>
          {holesScored < totalHoles && (
            <Text style={[styles.holesLabel, { color: colors.textSecondary }]}>
              ({holesScored}/{totalHoles} holes)
            </Text>
          )}
        </View>

        {/* To Par Banner */}
        <View style={[styles.toParBanner, { backgroundColor: getToParColorTeam(toParNet) + '15' }]}>
          <Text style={[styles.toParValue, { color: getToParColorTeam(toParNet) }]}>
            {formatToParTeam(toParNet)}
          </Text>
          <Text style={[styles.toParLabel, { color: getToParColorTeam(toParNet) }]}>
            {toParNet < 0 ? 'under par' : toParNet > 0 ? 'over par' : 'even par'}
          </Text>
        </View>

        <View style={styles.teamScoreGrid}>
          {/* Gross Score */}
          <View style={[styles.teamScoreItem, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.teamScoreValue, { color: colors.textPrimary }]}>
              {grossTotal}
            </Text>
            <Text style={[styles.teamScoreLabel, { color: colors.textSecondary }]}>
              Gross
            </Text>
          </View>

          {/* Net Score */}
          <View style={[styles.teamScoreItem, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.teamScoreValue, { color: colors.textPrimary }]}>
              {netTotal}
            </Text>
            <Text style={[styles.teamScoreLabel, { color: colors.textSecondary }]}>
              Net
            </Text>
          </View>

          {/* Stableford Points */}
          <View style={[styles.teamScoreItem, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.teamScoreValue, { color: colors.primary }]}>
              {stablefordTotal}
            </Text>
            <Text style={[styles.teamScoreLabel, { color: colors.primary }]}>
              Points
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Format to-par display (shared helper)
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

  // Render player breakdown card for Shamble format
  const renderPlayerBreakdownCard = () => {
    if (playerScoreSummaries.length === 0) return null;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Icon source="account-multiple" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Player Scores</Text>
        </View>

        {/* Header Row */}
        <View style={styles.playerBreakdownHeader}>
          <Text style={[styles.playerBreakdownHeaderText, styles.playerNameCol, { color: colors.textSecondary }]}>
            Player
          </Text>
          <Text style={[styles.playerBreakdownHeaderText, styles.handicapCol, { color: colors.textSecondary }]}>
            Hcp
          </Text>
          <Text style={[styles.playerBreakdownHeaderText, styles.scoreCol, { color: colors.textSecondary }]}>
            Gross
          </Text>
          <Text style={[styles.playerBreakdownHeaderText, styles.scoreCol, { color: colors.textSecondary }]}>
            Net
          </Text>
          <Text style={[styles.playerBreakdownHeaderText, styles.toParCol, { color: colors.textSecondary }]}>
            To Par
          </Text>
        </View>

        {/* Player Rows */}
        {playerScoreSummaries.map((player, index) => (
          <View
            key={player.playerId}
            style={[
              styles.playerBreakdownRow,
              index === 0 && { backgroundColor: colors.success + '10' },
            ]}
          >
            <View style={styles.playerNameCol}>
              <Text style={[styles.playerBreakdownName, { color: colors.textPrimary }]} numberOfLines={1}>
                {player.playerName}
              </Text>
              {player.holesPlayed < totalHoles && (
                <Text style={[styles.playerHolesPlayed, { color: colors.textTertiary }]}>
                  {player.holesPlayed} holes
                </Text>
              )}
            </View>
            <Text style={[styles.playerBreakdownScore, styles.handicapCol, { color: colors.textSecondary }]}>
              {player.handicap}
            </Text>
            <Text style={[styles.playerBreakdownScore, styles.scoreCol, { color: colors.textPrimary }]}>
              {player.gross}
            </Text>
            <Text style={[styles.playerBreakdownScore, styles.scoreCol, { color: colors.textPrimary }]}>
              {player.net}
            </Text>
            <Text style={[styles.playerBreakdownToPar, styles.toParCol, { color: getToParColor(player.toPar) }]}>
              {formatToPar(player.toPar)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // For shamble, show team score summary, expandable drives leaderboard, and player breakdown
  if (showOnlyDrives) {
    return (
      <View style={styles.container}>
        {renderTeamScoreCard()}
        {renderExpandableDrivesCard()}
        {renderPlayerBreakdownCard()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Overall Contributions */}
      {renderLeaderboardCard(
        'Overall Contributions',
        'trophy',
        colors.warning,
        overallLeaderboard
      )}

      {/* Individual Categories */}
      <View style={styles.categoriesRow}>
        {renderLeaderboardCard('Drives', 'golf-tee', colors.primary, driveLeaderboard)}
      </View>
      <View style={styles.categoriesRow}>
        {renderLeaderboardCard('Approaches', 'flag', colors.success, approachLeaderboard)}
      </View>
      <View style={styles.categoriesRow}>
        {renderLeaderboardCard('Putts', 'circle-outline', colors.warning, puttLeaderboard)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.bodyBold,
  },
  holesLabel: {
    ...typography.small,
    marginLeft: 'auto',
  },
  teamScoreGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  teamScoreItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  teamScoreValue: {
    ...typography.h2,
  },
  teamScoreLabel: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  toParBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  toParValue: {
    ...typography.h2,
  },
  toParLabel: {
    ...typography.body,
  },
  playerBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: spacing.xs,
  },
  playerBreakdownHeaderText: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  playerBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
  },
  playerNameCol: {
    flex: 1,
  },
  handicapCol: {
    width: 36,
    textAlign: 'center',
  },
  scoreCol: {
    width: 44,
    textAlign: 'center',
  },
  toParCol: {
    width: 44,
    textAlign: 'right',
  },
  playerBreakdownName: {
    ...typography.body,
  },
  playerHolesPlayed: {
    ...typography.caption,
  },
  playerBreakdownScore: {
    ...typography.body,
  },
  playerBreakdownToPar: {
    ...typography.bodyBold,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  entryRank: {
    width: 24,
    alignItems: 'center',
  },
  rankText: {
    ...typography.bodyBold,
  },
  entryInfo: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  entryName: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  entryCount: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  countText: {
    ...typography.bodyBold,
  },
  percentText: {
    ...typography.caption,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  categoriesRow: {
    flex: 1,
  },
  // Expandable drives styles
  expandIcon: {
    width: 28,
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  expandedContent: {
    marginLeft: 24 + spacing.sm, // Align with entry content (rank width + margin)
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  holesUsedLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  holeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  holeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 32,
    alignItems: 'center',
  },
  holeChipText: {
    ...typography.smallBold,
  },
});

export default ContributionLeaderboard;
