/**
 * StrokePlayLeaderboard Component
 *
 * Displays a mini leaderboard showing running standings during stroke play.
 * Features:
 * - Calculate gross and net totals through current hole
 * - Sort players by gross or net score
 * - Show position, name, gross score, net score in parentheses
 * - Highlight current user row
 * - Collapsible (default collapsed, tap to expand)
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import { calculateNetScore } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface StrokePlayLeaderboardProps {
  /** List of players in the round */
  players: Player[];
  /** Function to get a player's score for a specific hole */
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  /** Current hole number being played */
  currentHole: number;
  /** All holes in the course */
  holes: Hole[];
  /** Current user's ID for highlighting */
  currentUserId?: string;
  /** Sort by gross or net score (default: net) */
  sortBy?: 'gross' | 'net';
  /** Whether to start expanded (default: false) */
  defaultExpanded?: boolean;
}

interface LeaderboardRow {
  playerId: string;
  playerName: string;
  position: number;
  gross: number;
  grossRelativeToPar: number;
  net: number;
  netRelativeToPar: number;
  holesCompleted: number;
  isCurrentUser: boolean;
}

export const StrokePlayLeaderboard = React.memo(function StrokePlayLeaderboard({
  players,
  getPlayerScore,
  currentHole,
  holes,
  currentUserId,
  sortBy = 'net',
  defaultExpanded = false,
}: StrokePlayLeaderboardProps) {
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate totals and standings for all players
  const leaderboardData = useMemo((): LeaderboardRow[] => {
    const playerScores = players.map((player) => {
      let gross = 0;
      let net = 0;
      let coursePar = 0;
      let holesCompleted = 0;

      // Calculate through current hole (or all completed holes)
      for (let holeNum = 1; holeNum <= currentHole; holeNum++) {
        const hole = holes.find((h) => h.number === holeNum);
        if (!hole) continue;

        const score = getPlayerScore(player.id, holeNum);
        if (!score) continue;

        // Handle single ball score only
        if (!isSingleBallScore(score)) continue;

        // Skip picked up holes for gross calculation but count them
        if (score.strokes === PICKUP_SCORE) {
          // For picked up holes, use double par as penalty
          const penaltyStrokes = hole.par * 2;
          gross += penaltyStrokes;
          net += calculateNetScore(penaltyStrokes, player.handicap ?? 0, hole);
          coursePar += hole.par;
          holesCompleted++;
          continue;
        }

        gross += score.strokes;
        net += calculateNetScore(score.strokes, player.handicap ?? 0, hole);
        coursePar += hole.par;
        holesCompleted++;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        position: 0, // Will be calculated after sorting
        gross,
        grossRelativeToPar: gross - coursePar,
        net,
        netRelativeToPar: net - coursePar,
        holesCompleted,
        isCurrentUser: player.id === currentUserId,
      };
    });

    // Sort by the selected metric
    playerScores.sort((a, b) => {
      const aValue = sortBy === 'gross' ? a.grossRelativeToPar : a.netRelativeToPar;
      const bValue = sortBy === 'gross' ? b.grossRelativeToPar : b.netRelativeToPar;
      return aValue - bValue;
    });

    // Assign positions (handling ties)
    let currentPosition = 1;
    for (let i = 0; i < playerScores.length; i++) {
      if (i > 0) {
        const prevValue = sortBy === 'gross'
          ? playerScores[i - 1].grossRelativeToPar
          : playerScores[i - 1].netRelativeToPar;
        const currValue = sortBy === 'gross'
          ? playerScores[i].grossRelativeToPar
          : playerScores[i].netRelativeToPar;

        if (currValue !== prevValue) {
          currentPosition = i + 1;
        }
      }
      playerScores[i].position = currentPosition;
    }

    return playerScores;
  }, [players, getPlayerScore, currentHole, holes, currentUserId, sortBy]);

  // Get thru hole count for header
  const thruHole = useMemo(() => {
    // Find the highest hole with at least one score
    let maxHole = 0;
    for (const player of players) {
      for (let holeNum = currentHole; holeNum >= 1; holeNum--) {
        const score = getPlayerScore(player.id, holeNum);
        if (score && isSingleBallScore(score)) {
          maxHole = Math.max(maxHole, holeNum);
          break;
        }
      }
    }
    return maxHole;
  }, [players, getPlayerScore, currentHole]);

  // Format relative to par display
  const formatRelativeToPar = (value: number) => {
    if (value === 0) return 'E';
    return value > 0 ? `+${value}` : `${value}`;
  };

  // Toggle expanded state with animation
  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  // Don't render if no players or no completed holes
  if (players.length === 0 || thruHole === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceVariant }]}>
      {/* Header - Always visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Leaderboard through ${thruHole} holes. ${isExpanded ? 'Tap to collapse' : 'Tap to expand'}`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerLeft}>
          <Icon
            source="trophy-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Leaderboard
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            (thru {thruHole})
          </Text>
        </View>
        <Icon
          source={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Sort indicator */}
          <Text style={[styles.sortIndicator, { color: colors.textSecondary }]}>
            Sorted by {sortBy === 'gross' ? 'Gross' : 'Net'}
          </Text>

          {/* Leaderboard rows */}
          {leaderboardData.map((row) => (
            <View
              key={row.playerId}
              style={[
                styles.row,
                row.isCurrentUser && [styles.currentUserRow, { backgroundColor: colors.primary + '15' }],
              ]}
            >
              {/* Position */}
              <View style={styles.positionContainer}>
                <Text
                  style={[
                    styles.position,
                    { color: row.isCurrentUser ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {row.position}.
                </Text>
              </View>

              {/* Player name */}
              <View style={styles.nameContainer}>
                <Text
                  style={[
                    styles.playerName,
                    { color: row.isCurrentUser ? colors.primary : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {row.playerName}
                </Text>
              </View>

              {/* Scores */}
              <View style={styles.scoresContainer}>
                {/* Gross score */}
                <Text
                  style={[
                    styles.grossScore,
                    { color: sortBy === 'gross' ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {formatRelativeToPar(row.grossRelativeToPar)}
                </Text>

                {/* Net score in parentheses */}
                <Text
                  style={[
                    styles.netScore,
                    { color: sortBy === 'net' ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  (Net: {formatRelativeToPar(row.netRelativeToPar)})
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.bodyBold,
  },
  headerSubtitle: {
    ...typography.small,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sortIndicator: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  currentUserRow: {
    marginHorizontal: -spacing.sm,
  },
  positionContainer: {
    width: 28,
  },
  position: {
    ...typography.bodyBold,
  },
  nameContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  playerName: {
    ...typography.body,
  },
  scoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grossScore: {
    ...typography.bodyBold,
    minWidth: 32,
    textAlign: 'right',
  },
  netScore: {
    ...typography.small,
    minWidth: 64,
  },
});

export default StrokePlayLeaderboard;
