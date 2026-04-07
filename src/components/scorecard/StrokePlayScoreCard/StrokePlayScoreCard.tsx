/**
 * StrokePlayScoreCard Component
 *
 * Displays a player's scoring interface optimized for Stroke Play format.
 * Features:
 * - Relative-to-par quick buttons (Eagle through Triple Bogey)
 * - "MORE" button for worse scores (opens extended input)
 * - Running gross and net totals in header
 * - Score color coding based on relative to par
 * - Shots received indicator
 * - Optional FIR/GIR toggles
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import {
  getStrokesOnHole,
  calculateNetScore,
  getScoreDescription,
  calculateParScore,
} from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';

import { StatsRow } from '../PlayerScoreCard/StatsRow';
import { ExtendedScorePickerModal } from './ExtendedScorePickerModal';
import { PlayerHeader } from './PlayerHeader';
import { ScoreButtons } from './ScoreButtons';
import { CurrentScoreDisplay } from './CurrentScoreDisplay';

interface StrokePlayScoreCardProps {
  player: Player;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  onStatsUpdate?: (updates: Partial<HoleScore>) => void;
  onPlayerPress?: (playerId: string) => void;
  runningGross?: number;
  /** Cumulative par for completed holes (used to calculate relative-to-par display) */
  cumulativePar?: number;
  disabled?: boolean;
  /** Whether this is the current user's own score (for visual distinction in scoring pairs) */
  isOwnScore?: boolean;
  /** Display mode: 'stroke' shows gross/net, 'par' shows par score */
  displayMode?: 'stroke' | 'par';
  /** Running par score (only used when displayMode='par') */
  runningParScore?: number;
  /** Tee color dot to show before the player name when players have different tees */
  teeDotColor?: string;
  /** Callback when "Add Additional Stats" button is pressed (handled at screen level) */
  onDetailedStatsPress?: () => void;
}

export const StrokePlayScoreCard = React.memo(function StrokePlayScoreCard({
  player,
  currentHole,
  currentScore,
  onScoreSelect,
  onStatsUpdate,
  onPlayerPress,
  runningGross = 0,
  cumulativePar = 0,
  disabled = false,
  isOwnScore,
  displayMode = 'stroke',
  runningParScore = 0,
  teeDotColor,
  onDetailedStatsPress,
}: StrokePlayScoreCardProps) {
  const colors = useThemeColors();
  const handicap = player.handicap ?? 0;
  const statsVisibility = useStatsVisibilityWithTier();
  const { showPutts, showFairwayHit, showGreenInRegulation } = statsVisibility;
  const [showExtendedPicker, setShowExtendedPicker] = useState(false);

  // FIR only applies to par 4s and 5s
  const showFIR = showFairwayHit && currentHole.par >= 4;
  const showStatsRow = showPutts || showFIR || showGreenInRegulation;

  // Narrow to single-ball score
  const singleBallScore = currentScore && isSingleBallScore(currentScore) ? currentScore : undefined;
  const selectedScore = singleBallScore?.strokes;
  const isPickedUp = selectedScore === PICKUP_SCORE;

  // Calculate strokes received on this hole
  const strokesReceived = useMemo(
    () => getStrokesOnHole(handicap, currentHole),
    [handicap, currentHole]
  );

  // Calculate current relative to par (net)
  const currentRelativeToPar = useMemo(() => {
    if (!selectedScore || isPickedUp) return null;
    const netScore = calculateNetScore(selectedScore, handicap, currentHole);
    return netScore - currentHole.par;
  }, [selectedScore, handicap, currentHole, isPickedUp]);

  // Get score description for display
  const scoreDescription = useMemo(() => {
    if (!selectedScore || isPickedUp) return null;
    // Use net score for description
    const netScore = calculateNetScore(selectedScore, handicap, currentHole);
    return getScoreDescription(netScore, currentHole.par);
  }, [selectedScore, handicap, currentHole, isPickedUp]);

  // Get color for current score
  const getScoreColor = useCallback(
    (relativeToPar: number | null) => {
      if (relativeToPar === null) return colors.textSecondary;
      if (relativeToPar <= -2) return colors.eagle;
      if (relativeToPar === -1) return colors.birdie;
      if (relativeToPar === 0) return colors.par;
      if (relativeToPar === 1) return colors.bogey;
      return colors.doubleBogey;
    },
    [colors]
  );

  const getParScoreColor = useCallback(
    (parScore: number | null): string => {
      if (parScore === null) return colors.textSecondary;
      if (parScore === 1) return colors.success;
      if (parScore === 0) return colors.par;
      return colors.error;
    },
    [colors]
  );

  // Calculate par game score for current hole
  const currentParScore = useMemo(() => {
    if (displayMode !== 'par' || !selectedScore || isPickedUp) return null;
    return calculateParScore(selectedScore, currentHole.par, strokesReceived);
  }, [displayMode, selectedScore, currentHole.par, strokesReceived, isPickedUp]);

  // Handle score button press
  const handleScoreButtonPress = useCallback(
    (relativeToPar: number) => {
      if (!disabled) {
        const strokes = currentHole.par + relativeToPar;
        // Ensure minimum score of 1
        onScoreSelect(Math.max(1, strokes));
      }
    },
    [disabled, currentHole.par, onScoreSelect]
  );

  // Handle pick up
  const handlePickUp = useCallback(() => {
    if (!disabled) {
      onScoreSelect(PICKUP_SCORE);
    }
  }, [disabled, onScoreSelect]);

  // Stats handlers
  const handleFairwayToggle = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const newValue = singleBallScore?.fairwayHit !== true;
      onStatsUpdate({ fairwayHit: newValue });
    }
  }, [disabled, onStatsUpdate, singleBallScore?.fairwayHit]);

  const handleGIRToggle = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const newValue = singleBallScore?.greenInRegulation !== true;
      onStatsUpdate({ greenInRegulation: newValue });
    }
  }, [disabled, onStatsUpdate, singleBallScore?.greenInRegulation]);

  const handlePuttsDecrement = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const currentPutts = singleBallScore?.putts ?? 0;
      if (currentPutts > 0) {
        onStatsUpdate({ putts: currentPutts - 1 });
      }
    }
  }, [disabled, onStatsUpdate, singleBallScore?.putts]);

  const handlePuttsIncrement = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const currentPutts = singleBallScore?.putts ?? 0;
      if (currentPutts < 6) {
        onStatsUpdate({ putts: currentPutts + 1 });
      }
    }
  }, [disabled, onStatsUpdate, singleBallScore?.putts]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceVariant }]}>
      {/* Scoring Label - shows "Your Score" or "Partner's Score" when scoring pairs enabled */}
      {isOwnScore !== undefined && (
        <View style={styles.scoringLabelContainer}>
          <Text style={[
            styles.scoringLabel,
            { color: isOwnScore ? colors.primary : colors.textSecondary }
          ]}>
            {isOwnScore ? 'Your Score' : "Partner's Score"}
          </Text>
        </View>
      )}

      {/* Player Header */}
      <PlayerHeader
        playerName={player.name}
        playerId={player.id}
        handicap={handicap}
        strokesReceived={strokesReceived}
        runningGross={runningGross}
        cumulativePar={cumulativePar}
        displayMode={displayMode}
        runningParScore={runningParScore}
        teeDotColor={teeDotColor}
        onPlayerPress={onPlayerPress}
      />

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score Buttons */}
      <ScoreButtons
        currentHolePar={currentHole.par}
        selectedScore={selectedScore}
        isPickedUp={isPickedUp}
        disabled={disabled}
        onScoreButtonPress={handleScoreButtonPress}
        onMorePress={() => setShowExtendedPicker(true)}
      />

      {/* Current Score Display */}
      <CurrentScoreDisplay
        selectedScore={selectedScore}
        isPickedUp={isPickedUp}
        currentRelativeToPar={currentRelativeToPar}
        scoreDescription={scoreDescription}
        displayMode={displayMode}
        currentParScore={currentParScore}
        currentHolePar={currentHole.par}
        disabled={disabled}
        onScoreSelect={onScoreSelect}
        onPickUp={handlePickUp}
        getScoreColor={getScoreColor}
        getParScoreColor={getParScoreColor}
      />

      {/* Stats Row */}
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
            score={singleBallScore}
            hasAnyDetailedStats={statsVisibility.hasAnyDetailedStats}
            onDetailedStatsPress={onDetailedStatsPress}
            showFairwayMissDirection={statsVisibility.showFairwayMissDirection}
            showGreenMissDirection={statsVisibility.showGreenMissDirection}
            showBunkerShots={statsVisibility.showBunkerShots}
            showHazards={statsVisibility.showHazards}
          />
        </>
      )}

      {/* Extended Score Picker Modal */}
      <ExtendedScorePickerModal
        visible={showExtendedPicker}
        onClose={() => setShowExtendedPicker(false)}
        onSelectScore={onScoreSelect}
        currentHolePar={currentHole.par}
        selectedScore={selectedScore}
        getScoreColor={getScoreColor}
        disabled={disabled}
      />
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
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
});

export default StrokePlayScoreCard;
