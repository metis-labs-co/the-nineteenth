/**
 * SkinsIndicator - Small indicator for scorecard header showing skins is active
 *
 * Displays a dice icon with badge showing carryover holes when skins game is active.
 * On press, shows a tooltip/alert with quick summary of the skins game status.
 *
 * @example
 * ```tsx
 * // In scorecard header
 * <View style={styles.headerRight}>
 *   <SkinsIndicator roundId={roundId} onPress={handleSkinsPress} />
 *   <SyncIndicator />
 * </View>
 *
 * // Basic usage - just indicator
 * <SkinsIndicator roundId={roundId} />
 * ```
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Text, Icon, ActivityIndicator, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, skinsColor } from '@/constants/theme';
import { useActiveSkinsGameForRound, useSkinsSummary } from '@/hooks/useSkins';
import type {
  SkinsResultWithWinner,
  SkinsParticipant,
  SkinsTeamParticipant,
  SkinsResult,
} from '@/types/database/skins.types';

// ============================================================================
// TYPES
// ============================================================================

interface ParticipantTotal {
  id: string;
  name: string;
  holesWon: number;
  totalWinnings: number;
  /** For team skins, number of members for display */
  memberCount?: number;
}

/**
 * Calculate player totals from skins results (individual skins)
 */
function calculatePlayerTotals(
  results: SkinsResultWithWinner[],
  participants: SkinsParticipant[]
): ParticipantTotal[] {
  // Initialize totals for all participants
  const totalsMap = new Map<string, ParticipantTotal>();
  participants.forEach((p) => {
    totalsMap.set(p.id, {
      id: p.id,
      name: p.name,
      holesWon: 0,
      totalWinnings: 0,
    });
  });

  // Accumulate winnings from results
  results.forEach((result) => {
    if (!result.is_carryover && result.winner_id && result.payout_amount > 0) {
      const playerTotal = totalsMap.get(result.winner_id);
      if (playerTotal) {
        playerTotal.holesWon += 1;
        playerTotal.totalWinnings += result.payout_amount;
      }
    }
  });

  // Convert to array and sort by total winnings descending
  return Array.from(totalsMap.values()).sort((a, b) => b.totalWinnings - a.totalWinnings);
}

/**
 * Calculate team totals from skins results (team skins)
 */
function calculateTeamTotals(
  results: SkinsResult[],
  teams: SkinsTeamParticipant[]
): ParticipantTotal[] {
  // Initialize totals for all teams
  const totalsMap = new Map<string, ParticipantTotal>();
  teams.forEach((t) => {
    totalsMap.set(t.id, {
      id: t.id,
      name: t.name,
      holesWon: 0,
      totalWinnings: 0,
      memberCount: t.members?.length ?? 0,
    });
  });

  // Accumulate winnings from results
  results.forEach((result) => {
    if (!result.is_carryover && result.team_winner_id && result.payout_amount > 0) {
      const teamTotal = totalsMap.get(result.team_winner_id);
      if (teamTotal) {
        teamTotal.holesWon += 1;
        teamTotal.totalWinnings += result.payout_amount;
      }
    }
  });

  // Convert to array and sort by total winnings descending
  return Array.from(totalsMap.values()).sort((a, b) => b.totalWinnings - a.totalWinnings);
}

export interface SkinsIndicatorProps {
  /** Round UUID to check for active skins game */
  roundId: string;
  /** Optional callback when indicator is pressed */
  onPress?: () => void;
  /** Size of the icon */
  size?: 'sm' | 'md';
  /** Variant - 'default' has background, 'minimal' has no background (for header use) */
  variant?: 'default' | 'minimal';
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SkinsIndicator = React.memo(function SkinsIndicator({
  roundId,
  onPress,
  size = 'md',
  variant = 'default',
  testID,
}: SkinsIndicatorProps) {
  const colors = useThemeColors();
  const [showPopover, setShowPopover] = useState(false);

  // Check if skins game is active for this round
  const { data: skinsGame, isLoading: isGameLoading, error: gameError } = useActiveSkinsGameForRound(roundId);

  // Get summary data for the popover
  const { data: summary, isLoading: isSummaryLoading } = useSkinsSummary(skinsGame?.id);

  // DEBUG: Log skins indicator state
  console.log('[SkinsIndicator] Debug:', {
    roundId,
    isGameLoading,
    skinsGame: skinsGame ? { id: skinsGame.id, status: skinsGame.status } : null,
    gameError: gameError?.message ?? null,
    willRender: !!(skinsGame || isGameLoading),
  });

  // Calculate carryover holes count
  // NOTE: Must be called before any early returns to satisfy React's rules of hooks
  const carryoverHoles = useMemo(() => {
    if (!summary?.results) return 0;
    // Count consecutive carryover holes from the end
    let count = 0;
    for (let i = summary.results.length - 1; i >= 0; i--) {
      if (summary.results[i].is_carryover) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [summary?.results]);

  // Detect if this is a team skins game
  const isTeamSkins = useMemo(() => {
    return summary?.game?.is_team_skins ?? false;
  }, [summary?.game?.is_team_skins]);

  // Get last winner info (works for both individual and team skins)
  // NOTE: Must be called before any early returns to satisfy React's rules of hooks
  const lastWinner = useMemo(() => {
    if (!summary?.results) return null;
    // Find the last non-carryover result (last actual winner)
    for (let i = summary.results.length - 1; i >= 0; i--) {
      const result = summary.results[i];
      if (!result.is_carryover) {
        // Check for team winner first (team skins)
        if (result.team_winner_id && (summary.game as { teams?: SkinsTeamParticipant[] })?.teams) {
          const winningTeam = (summary.game as { teams?: SkinsTeamParticipant[] }).teams?.find(
            (t: SkinsTeamParticipant) => t.id === result.team_winner_id
          );
          if (winningTeam) {
            return {
              name: winningTeam.name,
              hole: result.hole_number,
              amount: result.payout_amount,
              isTeam: true,
            };
          }
        }
        // Individual winner
        if (result.winner) {
          return {
            name: result.winner.name,
            hole: result.hole_number,
            amount: result.payout_amount,
            isTeam: false,
          };
        }
      }
    }
    return null;
  }, [summary?.results, summary?.game]);

  // Calculate participant totals for display (handles both individual and team skins)
  // NOTE: Must be called before any early returns to satisfy React's rules of hooks
  const participantTotals = useMemo(() => {
    if (!summary?.results) return [];

    // Team skins - calculate team totals
    if (isTeamSkins && (summary.game as { teams?: SkinsTeamParticipant[] })?.teams) {
      return calculateTeamTotals(
        summary.results as SkinsResult[],
        (summary.game as { teams?: SkinsTeamParticipant[] }).teams ?? []
      );
    }

    // Individual skins - calculate player totals
    if (summary.game?.participants) {
      return calculatePlayerTotals(summary.results, summary.game.participants);
    }

    return [];
  }, [summary?.results, summary?.game, isTeamSkins]);

  // Handle press
  // NOTE: Must be called before any early returns to satisfy React's rules of hooks
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      setShowPopover(true);
    }
  }, [onPress]);

  // Close popover
  // NOTE: Must be called before any early returns to satisfy React's rules of hooks
  const handleClosePopover = useCallback(() => {
    setShowPopover(false);
  }, []);

  // Don't render if no active skins game
  if (!skinsGame && !isGameLoading) {
    return null;
  }

  // Icon and container sizes
  // sm: 32x32 container, 18px icon (for header use)
  // md: 40x40 container, 24px icon (for standalone/card use)
  const iconSize = size === 'sm' ? 18 : 24;
  const containerSize = size === 'sm' ? 32 : 40;

  // Show loading state
  if (isGameLoading) {
    return (
      <View
        style={[
          styles.container,
          { width: containerSize, height: containerSize },
        ]}
        testID={testID}
      >
        <ActivityIndicator size="small" color={skinsColor} />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            backgroundColor: variant === 'default' ? `${skinsColor}15` : 'transparent',
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Skins game active${carryoverHoles > 0 ? `, ${carryoverHoles} holes carried over` : ''}`}
        accessibilityHint="Tap to view skins game summary"
        testID={testID}
      >
        <Icon source="dice-multiple" size={iconSize} color={skinsColor} />

        {/* Carryover Badge */}
        {carryoverHoles > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.error },
            ]}
          >
            <Text style={styles.badgeText}>{carryoverHoles}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Summary Popover */}
      <Modal
        visible={showPopover}
        transparent
        animationType="fade"
        onRequestClose={handleClosePopover}
      >
        <Pressable
          style={styles.popoverBackdrop}
          onPress={handleClosePopover}
        >
          <Pressable
            style={[
              styles.popoverContainer,
              { backgroundColor: colors.surface },
              shadows.lg,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.popoverHeader}>
              <Icon source="dice-multiple" size={24} color={skinsColor} />
              <Text style={[styles.popoverTitle, { color: colors.textPrimary }]}>
                Skins Game
              </Text>
            </View>

            {isSummaryLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : summary ? (
              <View style={styles.popoverContent}>
                {/* Pot Info */}
                <View style={styles.popoverRow}>
                  <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                    Pot
                  </Text>
                  <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                    ${summary.per_hole_value.toFixed(2)}/hole
                  </Text>
                </View>

                {/* Scoring Type */}
                <View style={styles.popoverRow}>
                  <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                    Scoring
                  </Text>
                  <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                    {summary.game.scoring_type === 'gross' ? 'Gross' : 'Net'}
                  </Text>
                </View>

                {/* Progress */}
                <View style={styles.popoverRow}>
                  <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                    Progress
                  </Text>
                  <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                    {summary.holes_completed}/18 holes
                  </Text>
                </View>

                {/* Carryover */}
                {summary.current_carryover > 0 && (
                  <View
                    style={[
                      styles.carryoverRow,
                      { backgroundColor: `${skinsColor}15` },
                    ]}
                  >
                    <Icon source="arrow-right-circle" size={16} color={skinsColor} />
                    <Text style={[styles.carryoverText, { color: skinsColor }]}>
                      ${summary.current_carryover.toFixed(2)} carryover ({carryoverHoles} hole{carryoverHoles !== 1 ? 's' : ''})
                    </Text>
                  </View>
                )}

                {/* Last Winner */}
                {lastWinner && (
                  <View
                    style={[
                      styles.lastWinnerRow,
                      { backgroundColor: `${colors.success}10` },
                    ]}
                  >
                    <Icon source="trophy" size={16} color={colors.success} />
                    <Text style={[styles.lastWinnerText, { color: colors.success }]}>
                      {lastWinner.name} won ${lastWinner.amount.toFixed(2)} (Hole {lastWinner.hole})
                    </Text>
                  </View>
                )}

                {/* Participant Totals (Players or Teams) */}
                {participantTotals.length > 0 && (
                  <>
                    <Divider style={styles.divider} />
                    <View style={styles.playerTotalsSection}>
                      <Text style={[styles.playerTotalsTitle, { color: colors.textPrimary }]}>
                        {isTeamSkins ? 'Team Totals' : 'Running Totals'}
                      </Text>
                      <ScrollView style={styles.playerTotalsList} nestedScrollEnabled>
                        {participantTotals.map((participant) => (
                          <View key={participant.id} style={styles.playerTotalRow}>
                            <View style={styles.playerTotalLeft}>
                              <Text
                                style={[styles.playerTotalName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {participant.name}
                              </Text>
                              <View style={styles.participantMeta}>
                                {participant.holesWon > 0 && (
                                  <Text style={[styles.playerTotalHoles, { color: colors.textSecondary }]}>
                                    {participant.holesWon} skin{participant.holesWon !== 1 ? 's' : ''}
                                  </Text>
                                )}
                                {isTeamSkins && participant.memberCount && participant.totalWinnings > 0 && (
                                  <Text style={[styles.perMemberAmount, { color: colors.textSecondary }]}>
                                    (${(participant.totalWinnings / participant.memberCount).toFixed(2)}/ea)
                                  </Text>
                                )}
                              </View>
                            </View>
                            <Text
                              style={[
                                styles.playerTotalAmount,
                                {
                                  color: participant.totalWinnings > 0 ? colors.success : colors.textSecondary,
                                },
                              ]}
                            >
                              ${participant.totalWinnings.toFixed(2)}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </>
                )}
              </View>
            ) : (
              <Text style={[styles.popoverEmpty, { color: colors.textSecondary }]}>
                No data available
              </Text>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { borderTopColor: colors.border }]}
              onPress={handleClosePopover}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...typography.captionBold,
    color: '#fff',
    fontSize: 10,
  },
  popoverBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popoverContainer: {
    width: '80%',
    maxWidth: 300,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  popoverTitle: {
    ...typography.h4,
  },
  popoverContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  popoverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popoverLabel: {
    ...typography.small,
  },
  popoverValue: {
    ...typography.smallBold,
  },
  carryoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  carryoverText: {
    ...typography.smallBold,
  },
  lastWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  lastWinnerText: {
    ...typography.small,
    flex: 1,
  },
  popoverEmpty: {
    ...typography.body,
    textAlign: 'center',
    padding: spacing.lg,
  },
  closeButton: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  closeButtonText: {
    ...typography.bodyBold,
  },
  divider: {
    marginTop: spacing.sm,
  },
  playerTotalsSection: {
    marginTop: spacing.sm,
  },
  playerTotalsTitle: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  playerTotalsList: {
    maxHeight: 150,
  },
  playerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  playerTotalLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  playerTotalName: {
    ...typography.small,
  },
  playerTotalHoles: {
    ...typography.caption,
  },
  playerTotalAmount: {
    ...typography.smallBold,
    minWidth: 60,
    textAlign: 'right',
  },
  participantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  perMemberAmount: {
    ...typography.caption,
    fontStyle: 'italic',
  },
});

export default SkinsIndicator;
