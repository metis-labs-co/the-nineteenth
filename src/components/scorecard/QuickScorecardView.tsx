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
import { withOpacity } from '@/constants/colors';
import { useThemeColors, useIsDark, type ColorPalette } from '@/context/ThemeContext';
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
  const isDark = useIsDark();
  const scrollViewRef = useRef<ScrollView>(null);

  // Selected-hole highlight: a light primary tint reads well in light mode, but
  // primaryLighter is a bright lime in dark mode that washes out near-white. In
  // dark mode use a darker tinted green instead — the bright primary border and
  // text still mark the hole as selected.
  const selectedHoleBackground = isDark ? withOpacity(colors.primary, 0.22) : colors.primaryLighter;

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

    // Cell ring/text color from the existing score→color mapping (unchanged);
    // the cell background is a light tint of the same category color.
    const scoreColor = isPickedUp
      ? colors.textDisabled
      : getScoreColor(displayScore, hole.par, colors);
    const ringColor = allComplete
      ? colors.success
      : isCurrent
        ? colors.primary
        : displayScore
          ? scoreColor
          : colors.border;
    const cellBackground = isCurrent
      ? selectedHoleBackground
      : displayScore
        ? withOpacity(scoreColor, 0.14)
        : 'transparent';

    return (
      <TouchableOpacity
        key={holeNumber}
        style={styles.holeButton}
        activeOpacity={0.7}
        onPress={() => onHolePress(holeNumber)}
        accessibilityLabel={`Hole ${displayHoleNumber(holeNumber, startHole)}, ${completedCount} of ${players.length} players scored${allComplete ? ', all complete' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isCurrent }}
      >
        <Text
          style={[
            styles.holeNumber,
            { color: isCurrent ? colors.primary : colors.textTertiary },
          ]}
        >
          {displayHoleNumber(holeNumber, startHole)}
        </Text>
        <View
          style={[
            styles.holeCell,
            { backgroundColor: cellBackground, borderColor: ringColor },
          ]}
        >
          {displayScore ? (
            <Text style={[styles.holeScore, { color: scoreColor }]}>
              {isPickedUp ? 'P' : displayScore}
            </Text>
          ) : (
            <Text style={[styles.holePar, { color: colors.textDisabled }]}>
              P{hole.par}
            </Text>
          )}
        </View>
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
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textTertiary }]}>Quick View</Text>
        <Text style={[styles.subtitle, { color: colors.primary }]}>Tap to jump to hole</Text>
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
    borderRadius: borderRadius.xl,
    borderWidth: 1,
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
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
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
  // NOTE: keep holeButton width (48) and holesRow gap (spacing.xs) in lockstep
  // with the auto-scroll `buttonWidth` constant in the effect above.
  holeButton: {
    width: 48,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: spacing.xs,
  },
  holeNumber: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 3,
  },
  holeCell: {
    alignSelf: 'stretch',
    height: 32,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeScore: {
    fontSize: 14,
    fontWeight: '800',
  },
  holePar: {
    ...typography.caption,
    fontSize: 11,
  },
  completeIndicator: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  playerDotsContainer: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
    height: 6,
  },
  playerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default QuickScorecardView;
