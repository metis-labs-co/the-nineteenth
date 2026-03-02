/**
 * PlayerScoreCard Component
 *
 * Displays a player's scoring interface for a single hole.
 * Features:
 * - Player name and handicap display
 * - Shots received and Stableford points indicators
 * - Pick Up quick action for when player gives up the hole
 * - Plus/Minus stepper for score entry
 * - Par quick action button
 * - Points preview showing what the current score will earn
 * - Optional stats row (FIR, GIR, Putts) based on settings
 * - Large touch targets for on-course use
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';
import { ScaledText } from '@/components/common/ScaledText';
import { useStatsVisibility } from '@/store/settingsStore';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import { STABLEFORD_POINTS } from '@/constants/scoring';

import { QuickActionButton } from './QuickActionButton';
import { ScoreInputStepper } from './ScoreInputStepper';
import { StatsRow } from './StatsRow';
import { usePlayerScoreCardLogic } from './usePlayerScoreCardLogic';

/**
 * Get the description label for Stableford points
 */
function getPointsDescription(points: number): string {
  switch (points) {
    case STABLEFORD_POINTS.ALBATROSS_OR_BETTER:
      return 'Albatross+';
    case STABLEFORD_POINTS.EAGLE:
      return 'Eagle';
    case STABLEFORD_POINTS.BIRDIE:
      return 'Birdie';
    case STABLEFORD_POINTS.PAR:
      return 'Par';
    case STABLEFORD_POINTS.BOGEY:
      return 'Bogey';
    default:
      return 'Double+';
  }
}

/**
 * Get the color for Stableford points based on performance
 */
function getPointsColor(points: number, colors: ColorPalette): string {
  switch (points) {
    case STABLEFORD_POINTS.ALBATROSS_OR_BETTER:
    case STABLEFORD_POINTS.EAGLE:
      return colors.eagle;
    case STABLEFORD_POINTS.BIRDIE:
      return colors.birdie;
    case STABLEFORD_POINTS.PAR:
      return colors.par;
    case STABLEFORD_POINTS.BOGEY:
      return colors.bogey;
    default:
      return colors.doubleBogey;
  }
}

interface PlayerScoreCardProps {
  player: Player;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  onStatsUpdate?: (updates: Partial<HoleScore>) => void;
  onPlayerPress?: (playerId: string) => void;
  disabled?: boolean;
  /** Running total Stableford points for the player (through previous holes) */
  runningTotalPoints?: number;
  /** Whether to show points preview below score controls (default true for Stableford) */
  showPointsPreview?: boolean;
  /** Whether this is the current user's own score (for visual distinction in scoring pairs) */
  isOwnScore?: boolean;
}

export const PlayerScoreCard = React.memo(function PlayerScoreCard({
  player,
  currentHole,
  currentScore,
  onScoreSelect,
  onStatsUpdate,
  onPlayerPress,
  disabled = false,
  runningTotalPoints,
  showPointsPreview = true,
  isOwnScore,
}: PlayerScoreCardProps) {
  const colors = useThemeColors();
  const handicap = player.handicap ?? 0;
  const { showPutts, showFairwayHit, showGreenInRegulation } = useStatsVisibility();

  // FIR only applies to par 4s and 5s
  const showFIR = showFairwayHit && currentHole.par >= 4;

  // Check if any stats are enabled
  const showStatsRow = showPutts || showFIR || showGreenInRegulation;

  // Narrow to single-ball score for accessing stats
  const singleBallScore = currentScore && isSingleBallScore(currentScore) ? currentScore : undefined;

  // Use the extracted logic hook
  const {
    selectedScore,
    isPickedUp,
    strokesOnHole,
    stablefordPoints,
    handlePickUp,
    handleDecrement,
    handleIncrement,
    handleParSelect,
    handleFairwayToggle,
    handleGIRToggle,
    handlePuttsDecrement,
    handlePuttsIncrement,
  } = usePlayerScoreCardLogic({
    handicap,
    currentHole,
    currentScore,
    onScoreSelect,
    onStatsUpdate,
    disabled,
  });

  const handlePlayerPress = useCallback(() => {
    if (onPlayerPress) {
      onPlayerPress(player.id);
    }
  }, [onPlayerPress, player.id]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceVariant }]}>
      {/* Scoring Label - shows "Your Score" or "Partner's Score" when scoring pairs enabled */}
      {isOwnScore !== undefined && (
        <View style={styles.scoringLabelContainer}>
          <ScaledText
            category="caption"
            style={[
              styles.scoringLabel,
              { color: isOwnScore ? colors.primary : colors.textSecondary }
            ]}
          >
            {isOwnScore ? 'Your Score' : "Partner's Score"}
          </ScaledText>
        </View>
      )}

      {/* Player Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.playerInfo,
            onPlayerPress && styles.playerInfoTappable,
          ]}
          onPress={handlePlayerPress}
          disabled={!onPlayerPress}
          activeOpacity={0.7}
          accessibilityLabel={`View ${player.name}'s scorecard`}
          accessibilityRole="button"
          accessibilityHint="Opens the player's detailed scorecard"
        >
          <ScaledText category="body" style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {player.name}
          </ScaledText>
          <ScaledText category="caption" style={[styles.handicapLabel, { color: colors.textSecondary }]}>HC: {handicap}</ScaledText>
        </TouchableOpacity>

        {/* Stats Display */}
        <View style={styles.statsContainer}>
          {/* Shots received on this hole */}
          <View style={styles.statItem}>
            <ScaledText category="critical" style={[styles.statValue, { color: colors.textPrimary }]}>{strokesOnHole > 0 ? `+${strokesOnHole}` : '-'}</ScaledText>
            <ScaledText category="caption" style={[styles.statLabel, { color: colors.textSecondary }]}>SHOTS</ScaledText>
          </View>
          {/* Running total or current hole points */}
          <View style={styles.statItem}>
            <ScaledText category="critical" style={[styles.statValue, { color: colors.textPrimary }]}>
              {runningTotalPoints !== undefined ? runningTotalPoints + stablefordPoints : stablefordPoints}
            </ScaledText>
            <ScaledText category="caption" style={[styles.statLabel, { color: colors.textSecondary }]}>PTS</ScaledText>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score Controls */}
      <View style={styles.controlsContainer}>
        {/* Pick Up Button */}
        <QuickActionButton
          label="PICK UP"
          value="P"
          isActive={isPickedUp}
          onPress={handlePickUp}
          disabled={disabled}
          accessibilityLabel="Pick up ball"
          accessibilityHint="Marks that you picked up your ball on this hole"
        />

        {/* Score Stepper */}
        <ScoreInputStepper
          score={selectedScore}
          isPickedUp={isPickedUp}
          onDecrement={handleDecrement}
          onIncrement={handleIncrement}
          disabled={disabled}
        />

        {/* Par Button */}
        <QuickActionButton
          label="PAR"
          value={currentHole.par}
          isActive={selectedScore === currentHole.par}
          onPress={handleParSelect}
          disabled={disabled}
          accessibilityLabel={`Score par ${currentHole.par}`}
          accessibilityHint={`Sets your score to par which is ${currentHole.par}`}
        />
      </View>

      {/* Points Preview - Show what points the current score would earn */}
      {showPointsPreview && selectedScore && !isPickedUp && (
        <View style={styles.pointsPreviewContainer}>
          <ScaledText category="body" style={[styles.pointsPreviewLabel, { color: colors.textSecondary }]}>
            Points for this score:{' '}
          </ScaledText>
          <ScaledText
            category="body"
            style={[
              styles.pointsPreviewValue,
              { color: getPointsColor(stablefordPoints, colors) },
            ]}
          >
            {stablefordPoints} ({getPointsDescription(stablefordPoints)})
          </ScaledText>
        </View>
      )}

      {/* Stats Row - Conditional based on settings */}
      {showStatsRow && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatsRow
            showFIR={showFIR}
            showGIR={showGreenInRegulation}
            showPutts={showPutts}
            fairwayHit={singleBallScore?.fairwayHit}
            greenInRegulation={singleBallScore?.greenInRegulation}
            putts={singleBallScore?.putts}
            onFairwayToggle={handleFairwayToggle}
            onGIRToggle={handleGIRToggle}
            onPuttsDecrement={handlePuttsDecrement}
            onPuttsIncrement={handlePuttsIncrement}
            disabled={disabled}
          />
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  scoringLabelContainer: {
    marginBottom: spacing.sm,
  },
  scoringLabel: {
    ...typography.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  playerInfoTappable: {
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginLeft: -spacing.xs,
    marginTop: -spacing.xs,
  },
  playerName: {
    ...typography.h3,
    marginBottom: spacing.xs,
    flexShrink: 1,
  },
  handicapLabel: {
    ...typography.body,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  statLabel: {
    ...typography.small,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pointsPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointsPreviewLabel: {
    ...typography.body,
  },
  pointsPreviewValue: {
    ...typography.bodyBold,
  },
});

export default PlayerScoreCard;
