/**
 * RoundPlayersTab - Players tab for ViewRoundScreen
 *
 * Displays player list with:
 * - Player info (name, handicap)
 * - Stableford points
 * - Progress bar showing holes completed
 * - Score breakdown (eagles, birdies, pars, bogeys)
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { ProgressBar } from '@/components/common/ProgressBar';
import { EmptyState } from '@/components/common/EmptyState';
import type { ScorecardWithPlayer, CourseWithVenue } from '@/hooks/useRoundDetails';

// =====================================================
// TYPES
// =====================================================

interface RoundPlayersTabProps {
  scorecards: ScorecardWithPlayer[];
  holes: CourseWithVenue['holes'] | null;
}

interface PlayerScoreStats {
  holesCompleted: number;
  totalHoles: number;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doublePlus: number;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function calculatePlayerStats(
  scores: Record<string, { strokes: number }> | null,
  holes: CourseWithVenue['holes'] | null
): PlayerScoreStats {
  const totalHoles = holes?.length || 18;
  const stats: PlayerScoreStats = {
    holesCompleted: 0,
    totalHoles,
    eagles: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doublePlus: 0,
  };

  if (!scores || !holes) return stats;

  // Create par lookup map
  const parMap = new Map<number, number>();
  holes.forEach((hole) => {
    parMap.set(hole.number, hole.par);
  });

  // Calculate stats for each scored hole
  Object.entries(scores).forEach(([holeNum, holeScore]) => {
    if (holeScore?.strokes > 0) {
      stats.holesCompleted++;
      const par = parMap.get(parseInt(holeNum, 10)) || 4;
      const diff = holeScore.strokes - par;

      if (diff <= -2) stats.eagles++;
      else if (diff === -1) stats.birdies++;
      else if (diff === 0) stats.pars++;
      else if (diff === 1) stats.bogeys++;
      else stats.doublePlus++;
    }
  });

  return stats;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface ScoreBadgeProps {
  count: number;
  label: string;
  backgroundColor: string;
  colors: ReturnType<typeof useThemeColors>;
}

const ScoreBadge = React.memo(function ScoreBadge({
  count,
  label,
  backgroundColor,
  colors,
}: ScoreBadgeProps) {
  return (
    <View style={[styles.scoreBadge, { backgroundColor }]}>
      <Text style={[styles.scoreBadgeText, { color: colors.textPrimary }]}>{count}</Text>
      <Text style={[styles.scoreBadgeLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
});

interface PlayerCardProps {
  scorecard: ScorecardWithPlayer;
  holes: CourseWithVenue['holes'] | null;
  totalHoles: number;
  isLast: boolean;
  colors: ReturnType<typeof useThemeColors>;
}

const PlayerCard = React.memo(function PlayerCard({
  scorecard,
  holes,
  totalHoles,
  isLast,
  colors,
}: PlayerCardProps) {
  const player = scorecard.player;
  const stats = useMemo(
    () => calculatePlayerStats(scorecard.scores, holes),
    [scorecard.scores, holes]
  );

  return (
    <View>
      <View style={styles.playerRow}>
        {/* Header with avatar, name, and points */}
        <View style={styles.playerHeader}>
          <View style={[styles.playerAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.playerAvatarText, { color: colors.textInverse }]}>
              {(player?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.playerDetails}>
            <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {player?.name || 'Unknown Player'}
            </Text>
            <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
              HC: {player?.handicap ?? 'N/A'}
            </Text>
          </View>
          <View style={styles.playerPoints}>
            <Text style={[styles.playerPointsValue, { color: colors.primary }]}>
              {scorecard.total_points || 0}
            </Text>
            <Text style={[styles.playerPointsLabel, { color: colors.textSecondary }]}>pts</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <ProgressBar
            value={stats.holesCompleted}
            max={totalHoles}
            label={`${stats.holesCompleted}/${totalHoles} holes`}
            size="sm"
            fillColor={colors.primary}
          />
        </View>

        {/* Score breakdown */}
        {stats.holesCompleted > 0 ? (
          <View style={styles.scoreBreakdown}>
            {stats.eagles > 0 && (
              <ScoreBadge
                count={stats.eagles}
                label="Eagle"
                backgroundColor={colors.eagleBackground}
                colors={colors}
              />
            )}
            <ScoreBadge
              count={stats.birdies}
              label="Birdie"
              backgroundColor={colors.birdieBackground}
              colors={colors}
            />
            <ScoreBadge
              count={stats.pars}
              label="Par"
              backgroundColor={colors.parBackground}
              colors={colors}
            />
            <ScoreBadge
              count={stats.bogeys}
              label="Bogey"
              backgroundColor={colors.bogeyBackground}
              colors={colors}
            />
            {stats.doublePlus > 0 && (
              <ScoreBadge
                count={stats.doublePlus}
                label="2+"
                backgroundColor={colors.doubleBogeyBackground}
                colors={colors}
              />
            )}
          </View>
        ) : (
          <Text style={[styles.notStartedText, { color: colors.textDisabled }]}>Not started</Text>
        )}
      </View>
      {!isLast && (
        <Divider style={[styles.playerDivider, { backgroundColor: colors.gray100 }]} />
      )}
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const RoundPlayersTab = React.memo(function RoundPlayersTab({
  scorecards,
  holes,
}: RoundPlayersTabProps) {
  const colors = useThemeColors();
  const totalHoles = holes?.length || 18;

  if (scorecards.length === 0) {
    return (
      <EmptyState
        icon="account-group-outline"
        title="No players yet"
        message="Players will appear here once they join this round."
        compact
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {scorecards.length} {scorecards.length === 1 ? 'Player' : 'Players'}
        </Text>

        <View style={[styles.playersCard, { backgroundColor: colors.surface }]}>
          {scorecards.map((scorecard, index) => (
            <PlayerCard
              key={scorecard.id}
              scorecard={scorecard}
              holes={holes}
              totalHoles={totalHoles}
              isLast={index === scorecards.length - 1}
              colors={colors}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const AVATAR_SIZE = 44;
const AVATAR_LEFT_OFFSET = AVATAR_SIZE + spacing.md;

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },

  // Players Card
  playersCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  playerRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerAvatarText: {
    ...typography.bodyBold,
    fontSize: 18,
  },
  playerDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  playerName: {
    ...typography.bodyBold,
  },
  playerHandicap: {
    ...typography.small,
    marginTop: 2,
  },
  playerPoints: {
    alignItems: 'flex-end',
  },
  playerPointsValue: {
    ...typography.h3,
  },
  playerPointsLabel: {
    ...typography.caption,
  },
  playerDivider: {
    marginHorizontal: spacing.lg,
  },

  // Progress
  progressContainer: {
    marginTop: spacing.sm,
    marginLeft: AVATAR_LEFT_OFFSET,
  },

  // Score Breakdown
  scoreBreakdown: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    marginLeft: AVATAR_LEFT_OFFSET,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  scoreBadgeText: {
    ...typography.captionBold,
  },
  scoreBadgeLabel: {
    ...typography.caption,
  },
  notStartedText: {
    ...typography.small,
    marginTop: spacing.sm,
    marginLeft: AVATAR_LEFT_OFFSET,
    fontStyle: 'italic',
  },
});

export default RoundPlayersTab;
