/**
 * QuickScorecardView Component
 *
 * Horizontal scrolling view showing all 18 holes with status indicators.
 * Allows quick navigation to any hole.
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';
import type { Hole, HoleScore, Player } from '@/types';

// Pick up score - represents player giving up on the hole (no points in Stableford)
const PICKUP_SCORE = 10;

interface QuickScorecardViewProps {
  holes: Hole[];
  currentHole: number;
  players: Player[];
  getPlayerHoleScore: (playerId: string, holeNumber: number) => HoleScore | undefined;
  isHoleComplete: (holeNumber: number) => boolean;
  onHolePress: (holeNumber: number) => void;
}

export const QuickScorecardView = React.memo(function QuickScorecardView({
  holes,
  currentHole,
  players,
  getPlayerHoleScore,
  isHoleComplete,
  onHolePress,
}: QuickScorecardViewProps) {
  const colors = useThemeColors();
  const scrollViewRef = useRef<ScrollView>(null);

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
    if (!score) return colors.gray400;
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
    const playerScores = players.map((player) => ({
      playerId: player.id,
      score: getPlayerHoleScore(player.id, holeNumber),
    }));

    // Find first player with a score to display as representative
    const firstScoredPlayer = playerScores.find((ps) => ps.score?.strokes);
    const displayScore = firstScoredPlayer?.score?.strokes;
    const isPickedUp = displayScore === PICKUP_SCORE;

    // Count completed scores
    const completedCount = playerScores.filter((ps) => ps.score?.strokes).length;

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
        accessibilityLabel={`Hole ${holeNumber}, ${completedCount} of ${players.length} players scored${allComplete ? ', all complete' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isCurrent }}
      >
        <Text
          style={[
            styles.holeNumber,
            { color: isCurrent ? colors.primary : colors.textSecondary },
          ]}
        >
          {holeNumber}
        </Text>
        {displayScore ? (
          <Text
            style={[
              styles.holeScore,
              { color: isPickedUp ? colors.gray400 : getScoreColor(displayScore, hole.par, colors) },
            ]}
          >
            {isPickedUp ? 'P' : displayScore}
          </Text>
        ) : (
          <Text style={[styles.holePar, { color: colors.gray400 }]}>
            P{hole.par}
          </Text>
        )}
        {/* Player completion dots */}
        {players.length > 1 && (
          <View style={styles.playerDotsContainer}>
            {playerScores.map((ps, index) => (
              <View
                key={ps.playerId}
                style={[
                  styles.playerDot,
                  { backgroundColor: ps.score?.strokes ? colors.success : colors.gray300 },
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

  // Split into front and back nine
  const frontNine = Array.from({ length: 9 }, (_, i) => i + 1);
  const backNine = Array.from({ length: 9 }, (_, i) => i + 10);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
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
        {/* Front Nine */}
        <View style={styles.nineSection}>
          <Text style={[styles.nineLabel, { color: colors.textSecondary }]}>Front</Text>
          <View style={styles.holesRow}>
            {frontNine.map(renderHoleButton)}
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.gray300 }]} />

        {/* Back Nine */}
        <View style={styles.nineSection}>
          <Text style={[styles.nineLabel, { color: colors.textSecondary }]}>Back</Text>
          <View style={styles.holesRow}>
            {backNine.map(renderHoleButton)}
          </View>
        </View>
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
