/**
 * SkinsGameSection - Displays skins game info on round details
 *
 * For scheduled/in-progress rounds:
 * - Shows pot configuration (per hole/total value)
 * - Shows scoring type (gross/net)
 * - Shows number of participants
 *
 * For completed rounds:
 * - Shows player winnings summary
 * - Winner with most winnings at top
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows, skinsColor } from '@/constants/theme';
import { GolfBallLoader } from '@/components/common';
import { Pill } from '@/components/common/Pill';
import { useSkinsGamesByRound, useSkinsPayouts, useSkinsResults, useFinalizeSkinsGame } from '@/hooks/useSkins';
import { calculateHoleValue, calculateTotalPot, formatCurrency, formatNetResult } from '@/utils/skinsCalculations';
import type { RoundStatus } from '@/types/database/enums';

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsGameSectionProps {
  /** Round ID to fetch skins data for */
  roundId: string;
  /** Current status of the round */
  roundStatus: RoundStatus;
  /** Background color for cards */
  cardBackground: string;
  /** Callback when edit is pressed (only works when round is upcoming) */
  onEditPress?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SkinsGameSection({
  roundId,
  roundStatus,
  cardBackground,
  onEditPress,
}: SkinsGameSectionProps) {
  const colors = useThemeColors();

  // Card is only editable when round is upcoming (scheduled)
  const isEditable = roundStatus === 'upcoming' && !!onEditPress;

  // Fetch skins games for this round
  const { data: skinsGames, isLoading: isLoadingGames } = useSkinsGamesByRound(roundId);

  // Get the active or completed skins game (there should only be one per round)
  const skinsGame = useMemo(() => {
    if (!skinsGames || skinsGames.length === 0) return null;
    // Prefer completed, then active, then the first one
    return (
      skinsGames.find((g) => g.status === 'completed') ||
      skinsGames.find((g) => g.status === 'active') ||
      skinsGames[0]
    );
  }, [skinsGames]);

  // Determine if we should show payouts view (round is completed)
  const showPayoutsView = roundStatus === 'completed' && !!skinsGame;

  // Fetch payouts if round is completed (even if skins game status is still 'active')
  const { data: payouts, isLoading: isLoadingPayouts, refetch: refetchPayouts } = useSkinsPayouts(
    showPayoutsView ? skinsGame.id : undefined
  );

  // Fetch skins results to check if hole data was recorded
  const { data: skinsResults, isLoading: isLoadingResults } = useSkinsResults(
    showPayoutsView ? skinsGame.id : undefined
  );

  // Finalization mutation for auto-finalize
  const { mutateAsync: finalizeGame, isPending: isFinalizing } = useFinalizeSkinsGame();

  // Track if we've attempted auto-finalize to prevent infinite loops
  const hasAttemptedFinalize = useRef(false);

  // Auto-finalize: If round is completed, skins game is active, and we have results but no payouts
  useEffect(() => {
    const shouldAutoFinalize =
      showPayoutsView &&
      skinsGame?.status === 'active' &&
      skinsResults &&
      skinsResults.length > 0 &&
      (!payouts || payouts.length === 0) &&
      !isLoadingPayouts &&
      !isLoadingResults &&
      !isFinalizing &&
      !hasAttemptedFinalize.current;

    if (shouldAutoFinalize) {
      hasAttemptedFinalize.current = true;
      finalizeGame({ gameId: skinsGame.id })
        .then(() => {
          refetchPayouts();
        })
        .catch(() => {
          // Auto-finalize failed silently
        });
    }
  }, [
    showPayoutsView,
    skinsGame?.status,
    skinsGame?.id,
    skinsResults,
    payouts,
    isLoadingPayouts,
    isLoadingResults,
    isFinalizing,
    finalizeGame,
    refetchPayouts,
  ]);

  // Calculate display values
  const { perHoleValue, totalPot, scoringTypeLabel, potTypeLabel } = useMemo(() => {
    if (!skinsGame) {
      return {
        perHoleValue: 0,
        totalPot: 0,
        scoringTypeLabel: '',
        potTypeLabel: '',
      };
    }

    return {
      perHoleValue: calculateHoleValue(skinsGame.pot_type, skinsGame.pot_value),
      totalPot: calculateTotalPot(skinsGame.pot_type, skinsGame.pot_value),
      scoringTypeLabel: skinsGame.scoring_type === 'gross' ? 'Gross' : 'Net',
      potTypeLabel: skinsGame.pot_type === 'per_hole' ? 'Per Hole' : 'Total Pot',
    };
  }, [skinsGame]);

  // Sort payouts by winnings (descending)
  const sortedPayouts = useMemo(() => {
    if (!payouts) return [];
    return [...payouts].sort((a, b) => b.total_winnings - a.total_winnings);
  }, [payouts]);

  // Loading state - include results loading and finalization
  const isLoading = isLoadingGames || (showPayoutsView && (isLoadingPayouts || isLoadingResults || isFinalizing));

  // Check if we should show unconfigured state
  const showUnconfiguredState = !isLoading && !skinsGame && roundStatus === 'upcoming' && !!onEditPress;

  // No skins game for this round and not showing unconfigured
  if (!isLoading && !skinsGame && !showUnconfiguredState) {
    return null;
  }

  // Get color for net result
  const getNetResultColor = (value: number): string => {
    if (value > 0) return colors.success;
    if (value < 0) return colors.error;
    return colors.textSecondary;
  };

  // Wrap in TouchableOpacity if editable or unconfigured (both should be tappable)
  const isTappable = isEditable || showUnconfiguredState;
  const CardWrapper = isTappable ? TouchableOpacity : View;
  const cardWrapperProps = isTappable
    ? {
        onPress: onEditPress,
        activeOpacity: 0.7,
        accessibilityLabel: showUnconfiguredState ? 'Configure skins game' : 'Edit skins game',
        accessibilityRole: 'button' as const,
      }
    : {};

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Skins Game
        </Text>
        {isEditable && (
          <Icon source="pencil" size={18} color={colors.textSecondary} />
        )}
      </View>

      <CardWrapper
        style={[styles.card, { backgroundColor: cardBackground, borderColor: colors.border }]}
        {...cardWrapperProps}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <GolfBallLoader size="sm" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading skins data...
            </Text>
          </View>
        ) : showUnconfiguredState ? (
          // ============================================================
          // UNCONFIGURED - Show prompt to set up skins game
          // ============================================================
          <View style={styles.unconfiguredContainer}>
            <View style={[styles.unconfiguredIcon, { backgroundColor: colors.gray100 }]}>
              <Icon source="dice-multiple-outline" size={28} color={colors.gray400} />
            </View>
            <View style={styles.unconfiguredContent}>
              <Text style={[styles.unconfiguredTitle, { color: colors.textPrimary }]}>
                No Skins Game
              </Text>
              <Text style={[styles.unconfiguredDescription, { color: colors.textSecondary }]}>
                Tap to add a skins side-bet to this round
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color={colors.gray400} />
          </View>
        ) : showPayoutsView ? (
          // ============================================================
          // COMPLETED ROUND - Show player winnings
          // ============================================================
          <>
            {/* Header with config summary */}
            <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.skinsIcon, { backgroundColor: `${skinsColor}20` }]}>
                  <Icon source="cash-multiple" size={20} color={skinsColor} />
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    Completed
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                    {formatCurrency(perHoleValue)}/hole | {scoringTypeLabel}
                  </Text>
                </View>
              </View>
              <View style={[styles.totalPotBadge, { backgroundColor: `${skinsColor}15` }]}>
                <Text style={[styles.totalPotLabel, { color: skinsColor }]}>
                  Total
                </Text>
                <Text style={[styles.totalPotValue, { color: skinsColor }]}>
                  {formatCurrency(totalPot)}
                </Text>
              </View>
            </View>

            {/* Player Winnings Table */}
            <View style={styles.payoutsSection}>
              <Text style={[styles.payoutsSectionTitle, { color: colors.textSecondary }]}>
                PLAYER WINNINGS
              </Text>

              {sortedPayouts.length > 0 ? (
                <View style={[styles.payoutsTable, { borderColor: colors.border }]}>
                  {/* Table Header */}
                  <View style={[styles.payoutsHeader, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.payoutsHeaderCell, styles.playerColumn, { color: colors.textSecondary }]}>
                      Player
                    </Text>
                    <Text style={[styles.payoutsHeaderCell, styles.holesColumn, { color: colors.textSecondary }]}>
                      Holes
                    </Text>
                    <Text style={[styles.payoutsHeaderCell, styles.wonColumn, { color: colors.textSecondary }]}>
                      Won
                    </Text>
                    <Text style={[styles.payoutsHeaderCell, styles.netColumn, { color: colors.textSecondary }]}>
                      Net
                    </Text>
                  </View>

                  {/* Table Rows */}
                  {sortedPayouts.map((payout, index) => (
                    <View
                      key={payout.player_id}
                      style={[
                        styles.payoutsRow,
                        {
                          backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
                          borderBottomColor: colors.border,
                        },
                        index === sortedPayouts.length - 1 && styles.lastRow,
                      ]}
                    >
                      <View style={styles.playerColumn}>
                        {index === 0 && payout.total_winnings > 0 && (
                          <View style={styles.winnerIcon}>
                            <Icon source="trophy" size={14} color={skinsColor} />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.playerName,
                            { color: colors.textPrimary },
                            index === 0 && payout.total_winnings > 0 && styles.winnerName,
                          ]}
                          numberOfLines={1}
                        >
                          {payout.player?.name ?? 'Unknown'}
                        </Text>
                      </View>
                      <Text style={[styles.payoutsCell, styles.holesColumn, { color: colors.textSecondary }]}>
                        {payout.holes_won}
                      </Text>
                      <Text style={[styles.payoutsCell, styles.wonColumn, { color: colors.textPrimary }]}>
                        {formatCurrency(payout.total_winnings)}
                      </Text>
                      <Text
                        style={[
                          styles.payoutsCell,
                          styles.netColumn,
                          styles.netValue,
                          { color: getNetResultColor(payout.net_result) },
                        ]}
                      >
                        {formatNetResult(payout.net_result)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyPayouts}>
                  <Icon
                    source={skinsResults && skinsResults.length > 0 ? 'clock-outline' : 'alert-circle-outline'}
                    size={24}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.emptyPayoutsText, { color: colors.textSecondary }]}>
                    {skinsResults && skinsResults.length > 0
                      ? 'Calculating payouts...'
                      : 'No hole results recorded during scoring'}
                  </Text>
                  {(!skinsResults || skinsResults.length === 0) && (
                    <Text style={[styles.emptyPayoutsHint, { color: colors.textTertiary }]}>
                      Skins results are calculated when all players have scored each hole
                    </Text>
                  )}
                </View>
              )}
            </View>
          </>
        ) : (
          // ============================================================
          // SCHEDULED/IN-PROGRESS ROUND - Show config
          // ============================================================
          <>
            {/* Status and config header */}
            <View style={styles.configRow}>
              <View style={styles.configLeft}>
                <View style={[styles.skinsIcon, { backgroundColor: `${skinsColor}20` }]}>
                  <Icon source="dice-multiple" size={20} color={skinsColor} />
                </View>
                <View style={styles.configInfo}>
                  <Text style={[styles.configTitle, { color: colors.textPrimary }]}>
                    Skins Enabled
                  </Text>
                  <Text style={[styles.configSubtitle, { color: colors.textSecondary }]}>
                    {skinsGame?.participants.length || 0} players competing
                  </Text>
                </View>
              </View>
              <Pill
                label={roundStatus === 'in-progress' ? 'In Progress' : 'Scheduled'}
                variant={roundStatus === 'in-progress' ? 'success' : 'primary'}
                size="sm"
              />
            </View>

            {/* Config Details */}
            <View style={[styles.configDivider, { backgroundColor: colors.border }]} />

            <View style={styles.configDetails}>
              {/* Per Hole Value */}
              <View style={styles.configItem}>
                <View style={[styles.configItemIcon, { backgroundColor: colors.gray100 }]}>
                  <Icon source="currency-usd" size={18} color={colors.primary} />
                </View>
                <View style={styles.configItemText}>
                  <Text style={[styles.configItemLabel, { color: colors.textSecondary }]}>
                    {potTypeLabel}
                  </Text>
                  <Text style={[styles.configItemValue, { color: colors.textPrimary }]}>
                    {formatCurrency(skinsGame?.pot_value || 0)}
                  </Text>
                </View>
              </View>

              {/* Scoring Type */}
              <View style={styles.configItem}>
                <View style={[styles.configItemIcon, { backgroundColor: colors.gray100 }]}>
                  <Icon source="golf" size={18} color={colors.primary} />
                </View>
                <View style={styles.configItemText}>
                  <Text style={[styles.configItemLabel, { color: colors.textSecondary }]}>
                    Scoring
                  </Text>
                  <Text style={[styles.configItemValue, { color: colors.textPrimary }]}>
                    {scoringTypeLabel}
                  </Text>
                </View>
              </View>

              {/* Total Pot */}
              <View style={styles.configItem}>
                <View style={[styles.configItemIcon, { backgroundColor: `${skinsColor}15` }]}>
                  <Icon source="sigma" size={18} color={skinsColor} />
                </View>
                <View style={styles.configItemText}>
                  <Text style={[styles.configItemLabel, { color: colors.textSecondary }]}>
                    Total Pot
                  </Text>
                  <Text style={[styles.configItemValue, { color: skinsColor }]}>
                    {formatCurrency(totalPot)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Participants */}
            {skinsGame?.participants && skinsGame.participants.length > 0 && (
              <>
                <View style={[styles.configDivider, { backgroundColor: colors.border }]} />
                <View style={styles.participantsSection}>
                  <Text style={[styles.participantsTitle, { color: colors.textSecondary }]}>
                    PARTICIPANTS
                  </Text>
                  <View style={styles.participantsList}>
                    {skinsGame.participants.map((participant, index) => (
                      <View
                        key={participant.id}
                        style={[
                          styles.participantChip,
                          { backgroundColor: colors.gray100 },
                        ]}
                      >
                        <Text style={[styles.participantName, { color: colors.textPrimary }]}>
                          {participant.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </CardWrapper>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Section
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },

  // Card
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },

  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },

  // Unconfigured State
  unconfiguredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  unconfiguredIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unconfiguredContent: {
    flex: 1,
  },
  unconfiguredTitle: {
    ...typography.bodyBold,
  },
  unconfiguredDescription: {
    ...typography.small,
    marginTop: 2,
  },

  // Header Row (completed state)
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skinsIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.bodyBold,
  },
  headerSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  totalPotBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  totalPotLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  totalPotValue: {
    ...typography.h4,
    marginTop: 2,
  },

  // Payouts Section
  payoutsSection: {
    padding: spacing.md,
    gap: spacing.md,
  },
  payoutsSectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payoutsTable: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  payoutsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  payoutsHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  payoutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  payoutsCell: {
    ...typography.small,
  },

  // Column widths
  playerColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  holesColumn: {
    width: 50,
    textAlign: 'center',
  },
  wonColumn: {
    width: 60,
    textAlign: 'right',
  },
  netColumn: {
    width: 70,
    textAlign: 'right',
  },
  playerName: {
    ...typography.small,
    flex: 1,
  },
  winnerIcon: {
    marginRight: spacing.xs,
  },
  winnerName: {
    fontWeight: '600',
  },
  netValue: {
    fontWeight: '600',
  },
  emptyPayouts: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyPayoutsText: {
    ...typography.body,
    textAlign: 'center',
  },
  emptyPayoutsHint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Config Row (scheduled/in-progress state)
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  configLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  configInfo: {
    flex: 1,
  },
  configTitle: {
    ...typography.bodyBold,
  },
  configSubtitle: {
    ...typography.small,
    marginTop: 2,
  },

  // Config Details
  configDivider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  configDetails: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  configItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  configItemIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configItemText: {
    flex: 1,
  },
  configItemLabel: {
    ...typography.caption,
  },
  configItemValue: {
    ...typography.smallBold,
    marginTop: 1,
  },

  // Participants
  participantsSection: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  participantsTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  participantChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  participantName: {
    ...typography.small,
  },
});

export default SkinsGameSection;
