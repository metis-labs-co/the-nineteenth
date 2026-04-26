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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { EmptyState } from '@/components/common';
import type { Player, HoleScore, MultiBallHoleScore, Hole } from '@/types';
import { useContributionData } from './useContributionData';
import { LeaderboardCard } from './LeaderboardCard';
import { ExpandableDrivesCard } from './ExpandableDrivesCard';
import { TeamScoreCard } from './TeamScoreCard';
import { PlayerBreakdownCard } from './PlayerBreakdownCard';

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

  // For shamble, show team score summary, expandable drives leaderboard, and player breakdown
  if (showOnlyDrives) {
    return (
      <View style={styles.container}>
        {teamScoreSummary && (
          <TeamScoreCard summary={teamScoreSummary} totalHoles={totalHoles} />
        )}
        <ExpandableDrivesCard
          entries={driveLeaderboardWithHoles}
          expandedPlayers={expandedPlayers}
          onToggleExpand={togglePlayerExpanded}
        />
        <PlayerBreakdownCard players={playerScoreSummaries} totalHoles={totalHoles} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Overall Contributions */}
      <LeaderboardCard
        title="Overall Contributions"
        icon="trophy"
        iconColor={colors.warning}
        entries={overallLeaderboard}
      />

      {/* Individual Categories */}
      <View style={styles.categoriesRow}>
        <LeaderboardCard title="Tee Shots" icon="golf-tee" iconColor={colors.primary} entries={driveLeaderboard} />
      </View>
      <View style={styles.categoriesRow}>
        <LeaderboardCard title="Approaches" icon="flag" iconColor={colors.success} entries={approachLeaderboard} />
      </View>
      <View style={styles.categoriesRow}>
        <LeaderboardCard title="Putts" icon="circle-outline" iconColor={colors.warning} entries={puttLeaderboard} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  emptyContainer: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  categoriesRow: {
    flex: 1,
  },
});

export default ContributionLeaderboard;
