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
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import { STABLEFORD_POINTS } from '@/constants/scoring';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';

import { QuickActionButton } from './QuickActionButton';
import { ScoreInputStepper } from './ScoreInputStepper';
import { StatsRow } from './StatsRow';
import { usePlayerScoreCardLogic } from './usePlayerScoreCardLogic';
import { LogShotInline } from '@/components/scorecard/ShotLogging';

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
  /** Tee color dot to show before the player name when players have different tees */
  teeDotColor?: string;
  /** Callback when "Add Additional Stats" button is pressed (handled at screen level) */
  onDetailedStatsPress?: () => void;
  /** Playing handicap (daily if Social+, raw otherwise). Falls back to player.handicap */
  playingHandicap?: number;
  /** Rounded daily handicap value (null if not applied) */
  dailyHandicap?: number | null;
  /** Raw decimal base handicap value (profile HC or social index) */
  baseHandicap?: number;
  /** Label for base value: 'HC' (profile) or 'SHC' (social handicap) */
  baseLabel?: string;
  /** Render the FIR/GIR/Putts row collapsed by default (used for 3+ player rounds) */
  collapseStatsByDefault?: boolean;
  /** Team name shown beneath the player's name on team rounds */
  teamName?: string;
  /**
   * Round ID — when provided, renders an inline "Log Shot" button next to
   * "Add Additional Stats" for shot-tracking-eligible rounds. The inline
   * button self-gates on tier/settings, so passing this is harmless when
   * the user isn't eligible.
   */
  roundId?: string;
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
  teeDotColor,
  onDetailedStatsPress,
  playingHandicap,
  dailyHandicap,
  baseHandicap,
  baseLabel,
  collapseStatsByDefault = false,
  teamName,
  roundId,
}: PlayerScoreCardProps) {
  const colors = useThemeColors();
  const handicap = playingHandicap ?? player.handicap ?? 0;
  const statsVisibility = useStatsVisibilityWithTier();
  const { showPutts, showFairwayHit, showGreenInRegulation } = statsVisibility;

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
    handleShotIncrement,
    handleShotDecrement,
    handleParSelect,
    handleFairwayToggle,
    handleGIRToggle,
    handlePuttsDecrement,
    handlePuttsIncrement,
    handleDetailedStatsUpdate,
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
    <View
      style={[
        styles.card,
        isOwnScore === true
          ? { backgroundColor: colors.primaryBackground, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
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
          <View style={styles.playerNameRow}>
            {teeDotColor && (
              <View style={[styles.teeDot, { backgroundColor: teeDotColor }]} />
            )}
            <ScaledText category="body" style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {player.name}
            </ScaledText>
          </View>
          {teamName && (
            <ScaledText category="caption" style={[styles.teamName, { color: colors.textSecondary }]} numberOfLines={1}>
              {teamName}
            </ScaledText>
          )}
          <ScaledText category="caption" style={[styles.handicapLabel, { color: colors.textSecondary }]}>
            {dailyHandicap != null
              ? `DHC: ${dailyHandicap} / ${baseLabel ?? 'HC'}: ${baseHandicap ?? handicap}`
              : `HC: ${handicap}`}
          </ScaledText>
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
            <ScaledText category="critical" style={[styles.statValue, { color: colors.primary }]}>
              {runningTotalPoints !== undefined ? runningTotalPoints + stablefordPoints : stablefordPoints}
            </ScaledText>
            <ScaledText category="caption" style={[styles.statLabel, { color: colors.textSecondary }]}>PTS</ScaledText>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

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
          activePalette="bogey"
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

      {/* Points Preview - Show net-to-par label for current score */}
      {showPointsPreview && selectedScore && !isPickedUp && (
        <View style={styles.pointsPreviewContainer}>
          <ScaledText
            category="caption"
            style={[
              styles.pointsPreviewLabel,
              { color: getPointsColor(stablefordPoints, colors) },
            ]}
          >
            {getPointsDescription(stablefordPoints)}
          </ScaledText>
        </View>
      )}

      {/* Stats Row - Conditional based on settings */}
      {showStatsRow && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
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
            score={singleBallScore}
            hasAnyDetailedStats={statsVisibility.hasAnyDetailedStats}
            onDetailedStatsPress={onDetailedStatsPress}
            showFairwayMissDirection={statsVisibility.showFairwayMissDirection}
            showGreenMissDirection={statsVisibility.showGreenMissDirection}
            showBunkerShots={statsVisibility.showBunkerShots}
            showHazards={statsVisibility.showHazards}
            defaultCollapsed={collapseStatsByDefault}
            actionAccessory={
              roundId ? (
                <LogShotInline
                  roundId={roundId}
                  holeNumber={currentHole.number}
                  disabled={disabled}
                  onShotLogged={handleShotIncrement}
                  onShotUndone={handleShotDecrement}
                />
              ) : undefined
            }
          />
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginBottom: 13,
    ...shadows.sm,
  },
  scoringLabelContainer: {
    marginBottom: 3,
  },
  scoringLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    lineHeight: 12,
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
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  teeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  playerName: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  handicapLabel: {
    ...typography.body,
    fontSize: 12,
    lineHeight: 16,
  },
  teamName: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 3,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pointsPreviewContainer: {
    alignItems: 'center',
    marginTop: 11,
  },
  pointsPreviewLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});

export default PlayerScoreCard;
