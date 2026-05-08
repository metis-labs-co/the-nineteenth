/**
 * QuickScorecardView Component
 *
 * Horizontal scrolling view showing all 18 holes with status indicators.
 * Allows quick navigation to any hole.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';
import { displayHoleNumber } from '@/utils/holeTransformers';
import type { Hole, HoleScore, MultiBallHoleScore, Player } from '@/types';
import { isSingleBallScore } from '@/types/database';
import { PICKUP_SCORE } from '@/constants/scoring';

// Helper to get strokes from a score that might be single or multi-ball
const getStrokes = (score: HoleScore | MultiBallHoleScore | undefined): number | undefined => {
  if (!score) return undefined;
  return isSingleBallScore(score) ? score.strokes : score.balls?.[0]?.strokes;
};

interface QuickScorecardViewProps {
  holes: Hole[];
  currentHole: number;
  players: Player[];
  getPlayerHoleScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  isHoleComplete: (holeNumber: number) => boolean;
  onHolePress: (holeNumber: number) => void;
  /** Display offset for combo / cross-nine courses (default 1). */
  startHole?: number;
  /** Callback when horizontal scrolling state changes (for disabling parent swipe gestures) */
  onScrollingChange?: (isScrolling: boolean) => void;
}

export const QuickScorecardView = React.memo(function QuickScorecardView({
  holes,
  currentHole,
  players,
  getPlayerHoleScore,
  isHoleComplete,
  onHolePress,
  startHole = 1,
  onScrollingChange,
}: QuickScorecardViewProps) {
  const colors = useThemeColors();
  const scrollViewRef = useRef<ScrollView>(null);

  // Notify parent when user is interacting with this component
  // Using touch events instead of scroll events because they fire BEFORE
  // the parent's PanResponder can capture the gesture
  const handleTouchStart = useCallback(() => {
    onScrollingChange?.(true);
  }, [onScrollingChange]);

  const handleTouchEnd = useCallback(() => {
    onScrollingChange?.(false);
  }, [onScrollingChange]);

  // Scroll to current hole when it changes
  useEffect(() => {
    // Calculate scroll position (each button is 48px + 8px margin)
    const buttonWidth = 48 + 8;
    const scrollPosition = (currentHole - 1) * buttonWidth - 100; // Center in view

    scrollViewRef.current?.scrollTo({
      x: Math.max(0, scrollPosition),
      animated: true,
    });
  }, [currentHole]);

  const getScoreColor = (score: number | undefined, par: number, colors: ColorPalette) => {
    if (!score) return colors.textDisabled;
    const diff = score - par;
    if (diff <= -2) return colors.eagle;
    if (diff === -1) return colors.birdie;
    if (diff === 0) return colors.par;
    if (diff === 1) return colors.bogey;
    return colors.doubleBogey;
  };

  const renderHoleButton = (holeNumber: number) => {
    const hole = holes.find((h) => h.number === holeNumber);
    if (!hole) return null;

    const allComplete = isHoleComplete(holeNumber);
    const isCurrent = holeNumber === currentHole;

    // Get scores for all players
    const playerScores = players.map((player) => {
      const score = getPlayerHoleScore(player.id, holeNumber);
      return {
        playerId: player.id,
        score,
        strokes: getStrokes(score),
      };
    });

    // Find first player with a score to display as representative
    const firstScoredPlayer = playerScores.find((ps) => ps.strokes);
    const displayScore = firstScoredPlayer?.strokes;
    const isPickedUp = displayScore === PICKUP_SCORE;

    // Count completed scores
    const completedCount = playerScores.filter((ps) => ps.strokes).length;

    return (
      <TouchableOpacity
        key={holeNumber}
        style={[
          styles.holeButton,
          {
            backgroundColor: isCurrent ? colors.primaryLighter : colors.surface,
            borderColor: allComplete ? colors.success : (isCurrent ? colors.primary : colors.border),
          },
        ]}
        activeOpacity={0.7}
        onPress={() => onHolePress(holeNumber)}
        accessibilityLabel={`Hole ${displayHoleNumber(holeNumber, startHole)}, ${completedCount} of ${players.length} players scored${allComplete ? ', all complete' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isCurrent }}
      >
        <Text
          style={[
            styles.holeNumber,
            { color: isCurrent ? colors.primary : colors.textSecondary },
          ]}
        >
          {displayHoleNumber(holeNumber, startHole)}
        </Text>
        {displayScore ? (
          <Text
            style={[
              styles.holeScore,
              { color: isPickedUp ? colors.textDisabled : getScoreColor(displayScore, hole.par, colors) },
            ]}
          >
            {isPickedUp ? 'P' : displayScore}
          </Text>
        ) : (
          <Text style={[styles.holePar, { color: colors.textDisabled }]}>
            P{hole.par}
          </Text>
        )}
        {/* Player completion dots */}
        {players.length > 1 && (
          <View style={styles.playerDotsContainer}>
            {playerScores.map((ps) => (
              <View
                key={ps.playerId}
                style={[
                  styles.playerDot,
                  { backgroundColor: ps.strokes ? colors.success : colors.textDisabled },
                ]}
              />
            ))}
          </View>
        )}
        {allComplete && (
          <View style={[styles.completeIndicator, { backgroundColor: colors.success }]} />
        )}
      </TouchableOpacity>
    );
  };

  // Split the round's actual holes into front and back nine. For back-9
  // rounds frontNine is empty; for front-9 rounds backNine is empty.
  const frontNine = holes.filter((h) => h.number <= 9).map((h) => h.number);
  const backNine = holes.filter((h) => h.number > 9).map((h) => h.number);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceVariant }]}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Quick View</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tap to jump to hole</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Front Nine — hidden on back-9 rounds where the round only plays 10–18. */}
        {frontNine.length > 0 && (
          <View style={styles.nineSection}>
            <Text style={[styles.nineLabel, { color: colors.textSecondary }]}>Front</Text>
            <View style={styles.holesRow}>
              {frontNine.map(renderHoleButton)}
            </View>
          </View>
        )}

        {/* Divider — only when both halves render. */}
        {frontNine.length > 0 && backNine.length > 0 && (
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        )}

        {/* Back Nine — hidden on front-9 rounds. */}
        {backNine.length > 0 && (
          <View style={styles.nineSection}>
            <Text style={[styles.nineLabel, { color: colors.textSecondary }]}>Back</Text>
            <View style={styles.holesRow}>
              {backNine.map(renderHoleButton)}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.smallBold,
  },
  subtitle: {
    ...typography.caption,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nineSection: {
    gap: spacing.xs,
  },
  nineLabel: {
    ...typography.caption,
    fontWeight: '600',
    paddingLeft: spacing.xs,
  },
  holesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  divider: {
    width: 1,
    marginHorizontal: spacing.md,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  holeButton: {
    width: 48,
    height: 64,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
    paddingBottom: spacing.xs,
  },
  holeNumber: {
    ...typography.caption,
    fontWeight: '600',
  },
  holeScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  holePar: {
    ...typography.caption,
  },
  completeIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playerDotsContainer: {
    flexDirection: 'row',
    gap: 3,
    position: 'absolute',
    bottom: 4,
  },
  playerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default QuickScorecardView;
