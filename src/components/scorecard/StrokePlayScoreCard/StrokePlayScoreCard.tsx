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
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
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
import {
  SCORE_BUTTONS,
  formatRelativeToPar,
  formatParScoreDisplay,
  getParScoreLabel,
} from './scoreCardHelpers';

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

  const handlePlayerPress = useCallback(() => {
    if (onPlayerPress) {
      onPlayerPress(player.id);
    }
  }, [onPlayerPress, player.id]);

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
        >
          <View style={styles.playerNameRow}>
            {teeDotColor && (
              <View style={[styles.teeDot, { backgroundColor: teeDotColor }]} />
            )}
            <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {player.name}
            </Text>
          </View>
          <View style={styles.handicapRow}>
            <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>
              HC: {handicap}
            </Text>
            {strokesReceived > 0 && (
              <View style={[styles.shotsReceivedBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.shotsReceivedText, { color: colors.textOnColored }]}>
                  +{strokesReceived} shot{strokesReceived > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Running Totals */}
        <View style={styles.statsContainer}>
          {displayMode === 'par' ? (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {formatParScoreDisplay(runningParScore)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SCORE</Text>
            </View>
          ) : (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {runningGross > 0 ? formatRelativeToPar(runningGross - cumulativePar) : '-'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GROSS</Text>
            </View>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score relative to par label */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        Score Relative to Par (Par {currentHole.par})
      </Text>

      {/* Relative-to-Par Buttons */}
      <View style={styles.scoreButtonsContainer}>
        {SCORE_BUTTONS.map((button) => {
          const strokes = currentHole.par + button.relativeToPar;
          const isSelected = selectedScore === strokes && !isPickedUp;
          const buttonColor = colors[button.colorKey];

          return (
            <TouchableOpacity
              key={button.label}
              style={[
                styles.scoreButton,
                { borderColor: buttonColor },
                isSelected && { backgroundColor: buttonColor },
              ]}
              onPress={() => handleScoreButtonPress(button.relativeToPar)}
              disabled={disabled || strokes < 1}
              accessibilityLabel={`Score ${button.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.scoreButtonNumber,
                  { color: isSelected ? colors.textOnColored : buttonColor },
                ]}
              >
                {button.relativeToPar > 0 ? `+${button.relativeToPar}` : button.relativeToPar === 0 ? 'E' : button.relativeToPar}
              </Text>
              <Text
                style={[
                  styles.scoreButtonLabel,
                  { color: isSelected ? colors.textOnColored : buttonColor },
                ]}
              >
                {button.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* MORE button for extended scores */}
        <TouchableOpacity
          style={[
            styles.scoreButton,
            styles.moreButton,
            { borderColor: colors.textSecondary },
          ]}
          onPress={() => setShowExtendedPicker(true)}
          disabled={disabled}
          accessibilityLabel="More score options"
        >
          <Icon source="dots-horizontal" size={20} color={colors.textSecondary} />
          <Text style={[styles.scoreButtonLabel, { color: colors.textSecondary }]}>
            MORE
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current Score Display */}
      <View style={[styles.currentScoreContainer, { backgroundColor: colors.surface }]}>
        {isPickedUp ? (
          <View style={styles.currentScoreRow}>
            <Text style={[styles.currentScoreLabel, { color: colors.textSecondary }]}>
              Picked Up
            </Text>
            <TouchableOpacity
              style={[styles.undoButton, { borderColor: colors.border }]}
              onPress={() => onScoreSelect(currentHole.par)}
              disabled={disabled}
            >
              <Text style={[styles.undoButtonText, { color: colors.textSecondary }]}>
                Undo
              </Text>
            </TouchableOpacity>
          </View>
        ) : selectedScore ? (
          <View style={styles.currentScoreRow}>
            <Text style={[styles.currentScoreLabel, { color: colors.textSecondary }]}>
              Current:
            </Text>
            <View style={styles.currentScoreValue}>
              <Text
                style={[
                  styles.currentScoreNumber,
                  { color: displayMode === 'par' ? getParScoreColor(currentParScore) : getScoreColor(currentRelativeToPar) },
                ]}
              >
                {selectedScore}
              </Text>
              <Text style={[styles.currentScoreEquals, { color: colors.textSecondary }]}>
                =
              </Text>
              {displayMode === 'par' ? (
                <Text
                  style={[
                    styles.currentScoreRelative,
                    { color: getParScoreColor(currentParScore) },
                  ]}
                >
                  {formatParScoreDisplay(currentParScore ?? 0)} ({getParScoreLabel(currentParScore)})
                </Text>
              ) : (
                <Text
                  style={[
                    styles.currentScoreRelative,
                    { color: getScoreColor(currentRelativeToPar) },
                  ]}
                >
                  {formatRelativeToPar(currentRelativeToPar)} ({scoreDescription})
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.pickUpButton, { backgroundColor: colors.error + '20' }]}
              onPress={handlePickUp}
              disabled={disabled}
            >
              <Text style={[styles.pickUpButtonText, { color: colors.error }]}>
                Pick Up
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.noScoreText, { color: colors.textSecondary }]}>
            Tap a score above
          </Text>
        )}
      </View>

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
    flexShrink: 1,
  },
  handicapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  handicapLabel: {
    ...typography.body,
  },
  shotsReceivedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  shotsReceivedText: {
    ...typography.caption,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
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
  sectionLabel: {
    ...typography.small,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  scoreButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scoreButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    borderStyle: 'dashed',
  },
  scoreButtonNumber: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  scoreButtonLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  currentScoreContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  currentScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentScoreLabel: {
    ...typography.body,
  },
  currentScoreValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  currentScoreNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  currentScoreEquals: {
    ...typography.body,
  },
  currentScoreRelative: {
    ...typography.bodyBold,
  },
  pickUpButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  pickUpButtonText: {
    ...typography.smallBold,
  },
  undoButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  undoButtonText: {
    ...typography.smallBold,
  },
  noScoreText: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default StrokePlayScoreCard;
