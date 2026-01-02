/**
 * ScoringPairFormationInline - Compact inline scoring pair formation for practice rounds
 *
 * A simplified version of ScoringPairFormationUI designed for bottom sheet context.
 * Features:
 * - Auto-generates pairs from provided players
 * - Compact list view showing who scores whom
 * - Regenerate button to shuffle pairs
 * - No save button (handled by parent component)
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { PlayerAvatar } from '@/components/common';
import {
  IconRefresh,
  IconArrowRight,
  IconRotateClockwise,
  IconArrowsExchange,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { autoGenerateScoringPairs } from '@/utils/scoringPairs';
import type { ScoringPairCreateInput, AutoPairResult } from '@/types';

// =====================================================
// TYPES
// =====================================================

export interface InlinePlayer {
  id: string;
  name: string;
  handicap?: number;
  photo_url?: string | null;
}

export interface ScoringPairFormationInlineProps {
  /**
   * List of players to generate pairs from (includes current user + selected partners)
   */
  players: InlinePlayer[];

  /**
   * Current scoring pairs
   */
  pairs: ScoringPairCreateInput[];

  /**
   * Callback when pairs change
   */
  onPairsChange: (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => void;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get initials for avatar fallback
 * Note: Not currently used - PlayerAvatar component handles initials internally
 */
const _getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Get first name from full name
 */
const getFirstName = (name: string): string => {
  return name.split(' ')[0] || name;
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ScoringPairFormationInline({
  players,
  pairs,
  onPairsChange,
  testID,
}: ScoringPairFormationInlineProps) {
  const colors = useThemeColors();

  // Determine pairing type based on player count
  const pairingType: 'reciprocal' | 'circular' = players.length % 2 === 0 ? 'reciprocal' : 'circular';

  // Auto-generate pairs on mount if none exist and we have enough players
  useEffect(() => {
    if (pairs.length === 0 && players.length >= 2) {
      generatePairs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generatePairs and pairs.length intentionally excluded to only run on player count changes
  }, [players.length]);

  // Generate/regenerate pairs
  const generatePairs = useCallback(() => {
    if (players.length < 2) return;

    try {
      const result: AutoPairResult = autoGenerateScoringPairs(
        players.map((p) => ({ id: p.id }))
      );
      onPairsChange(result.pairs, result.type);
    } catch (error) {
      console.error('Failed to generate scoring pairs:', error);
    }
  }, [players, onPairsChange]);

  // Build display pairs with player details
  const displayPairs = useMemo(() => {
    return pairs.map((pair) => {
      const scorer = players.find((p) => p.id === pair.scorerId);
      const player = players.find((p) => p.id === pair.playerId);
      return {
        ...pair,
        scorer,
        player,
      };
    });
  }, [pairs, players]);

  // For reciprocal pairs, group them so we show A↔B once instead of A→B and B→A
  const groupedPairs = useMemo(() => {
    if (pairingType !== 'reciprocal') {
      return displayPairs;
    }

    // Group reciprocal pairs
    const seen = new Set<string>();
    const grouped: typeof displayPairs = [];

    for (const pair of displayPairs) {
      const key = [pair.scorerId, pair.playerId].sort().join('-');
      if (!seen.has(key)) {
        seen.add(key);
        grouped.push(pair);
      }
    }

    return grouped;
  }, [displayPairs, pairingType]);

  // Not enough players
  if (players.length < 2) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray100 }]} testID={testID}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Add at least one playing partner to configure scoring pairs
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray100 }]} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {pairingType === 'circular' ? (
            <IconRotateClockwise size={18} color={colors.info} />
          ) : (
            <IconArrowsExchange size={18} color={colors.primary} />
          )}
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {pairingType === 'circular' ? 'Circular Chain' : 'Reciprocal Pairs'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.regenerateButton, { backgroundColor: colors.surface }]}
          onPress={generatePairs}
          accessibilityLabel="Regenerate scoring pairs"
          accessibilityRole="button"
        >
          <IconRefresh size={16} color={colors.primary} />
          <Text style={[styles.regenerateText, { color: colors.primary }]}>Shuffle</Text>
        </TouchableOpacity>
      </View>

      {/* Pairs List */}
      <View style={styles.pairsList}>
        {groupedPairs.map((pair, index) => (
          <View
            key={`${pair.scorerId}-${pair.playerId}`}
            style={[
              styles.pairRow,
              { backgroundColor: colors.surface },
              index === groupedPairs.length - 1 && styles.pairRowLast,
            ]}
          >
            {/* Scorer */}
            <View style={styles.playerChip}>
              <PlayerAvatar
                photoUrl={pair.scorer?.photo_url}
                name={pair.scorer?.name}
                size={28}
              />
              <Text
                style={[styles.playerName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {getFirstName(pair.scorer?.name || 'Unknown')}
              </Text>
            </View>

            {/* Arrow */}
            <View style={styles.arrowContainer}>
              {pairingType === 'reciprocal' ? (
                <IconArrowsExchange size={16} color={colors.textTertiary} />
              ) : (
                <IconArrowRight size={16} color={colors.textTertiary} />
              )}
            </View>

            {/* Player being scored */}
            <View style={styles.playerChip}>
              <PlayerAvatar
                photoUrl={pair.player?.photo_url}
                name={pair.player?.name}
                size={28}
              />
              <Text
                style={[styles.playerName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {getFirstName(pair.player?.name || 'Unknown')}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Help text */}
      <Text style={[styles.helpText, { color: colors.textTertiary }]}>
        {pairingType === 'circular'
          ? 'Each player scores one person and is scored by another'
          : 'Partners score each other\'s cards'}
      </Text>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.smallBold,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  regenerateText: {
    ...typography.caption,
    fontWeight: '600',
  },
  pairsList: {
    gap: spacing.sm,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  pairRowLast: {
    marginBottom: 0,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  playerName: {
    ...typography.small,
    fontWeight: '500',
    flex: 1,
  },
  arrowContainer: {
    paddingHorizontal: spacing.sm,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.small,
    textAlign: 'center',
  },
  helpText: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default ScoringPairFormationInline;
