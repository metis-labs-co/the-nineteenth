/**
 * WolfGameSection - Displays Wolf game info on round details
 *
 * For scheduled/in-progress rounds:
 * - Shows pot configuration (per-point value)
 * - Shows scoring type (gross/net)
 * - Shows number of participants and Wolf order
 * - Shows Blind Wolf enabled status
 *
 * For completed rounds:
 * - Shows WolfResultsCard (hole-by-hole breakdown)
 * - Shows WolfStandingsCard (ranked standings)
 * - Shows WolfSettlementCard (who owes who - pot enabled only)
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { GolfBallLoader } from '@/components/common';
import { Pill } from '@/components/common/Pill';
import {
  WolfResultsCard,
  WolfStandingsCard,
  WolfSettlementCard,
  WOLF_COLOR,
} from '@/components/wolf';
import {
  useWolfGameByRound,
  useWolfHoleDecisions,
  useWolfStandings,
  useWolfPayouts,
  useFinalizeWolfGame,
} from '@/hooks/wolf';
import { formatWolfCurrency } from '@/utils/wolfCalculations';
import type { RoundStatus } from '@/types/database/enums';

// ============================================================================
// TYPES
// ============================================================================

export interface WolfGameSectionProps {
  /** Round ID to fetch Wolf data for */
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

export function WolfGameSection({
  roundId,
  roundStatus,
  cardBackground,
  onEditPress,
}: WolfGameSectionProps) {
  const colors = useThemeColors();

  // Card is only editable when round is upcoming (scheduled)
  const isEditable = roundStatus === 'upcoming' && !!onEditPress;

  // Fetch Wolf game for this round
  const { data: wolfGame, isLoading: isLoadingGame } = useWolfGameByRound(roundId);

  // Determine if we should show completed view
  const showCompletedView = roundStatus === 'completed' && !!wolfGame;

  // Fetch decisions for completed view
  const { data: decisions, isLoading: isLoadingDecisions } = useWolfHoleDecisions(
    showCompletedView ? wolfGame.id : undefined
  );

  // Fetch standings
  const { data: standings, isLoading: isLoadingStandings } = useWolfStandings(
    showCompletedView ? wolfGame.id : undefined
  );

  // Fetch payouts if round is completed
  const { data: payouts, isLoading: isLoadingPayouts, refetch: refetchPayouts } = useWolfPayouts(
    showCompletedView ? wolfGame.id : undefined
  );

  // Finalization mutation for auto-finalize
  const { mutateAsync: finalizeGame, isPending: isFinalizing } = useFinalizeWolfGame();

  // Track if we've attempted auto-finalize to prevent infinite loops
  const hasAttemptedFinalize = useRef(false);

  // Auto-finalize: If round is completed, Wolf game is active, and we have decisions but no payouts
  useEffect(() => {
    const completedDecisions = decisions?.filter((d) => d.calculated_at !== null) ?? [];
    const shouldAutoFinalize =
      showCompletedView &&
      wolfGame?.status === 'active' &&
      completedDecisions.length >= 18 &&
      (!payouts || payouts.length === 0) &&
      !isLoadingPayouts &&
      !isLoadingDecisions &&
      !isFinalizing &&
      !hasAttemptedFinalize.current;

    if (shouldAutoFinalize) {
      hasAttemptedFinalize.current = true;
      console.log('[WolfGameSection] Auto-finalizing Wolf game:', wolfGame.id);
      finalizeGame({ gameId: wolfGame.id })
        .then(() => {
          console.log('[WolfGameSection] Auto-finalize successful, refetching payouts');
          refetchPayouts();
        })
        .catch((error) => {
          console.error('[WolfGameSection] Auto-finalize failed:', error);
        });
    }
  }, [
    showCompletedView,
    wolfGame?.status,
    wolfGame?.id,
    decisions,
    payouts,
    isLoadingPayouts,
    isLoadingDecisions,
    isFinalizing,
    finalizeGame,
    refetchPayouts,
  ]);

  // Calculate display values
  const configSummary = useMemo(() => {
    if (!wolfGame) {
      return {
        scoringTypeLabel: '',
        blindWolfLabel: '',
        potValueLabel: '',
        participantCount: 0,
      };
    }

    return {
      scoringTypeLabel: wolfGame.scoring_type === 'gross' ? 'Gross' : 'Net',
      blindWolfLabel: wolfGame.blind_wolf_enabled ? 'Enabled' : 'Disabled',
      potValueLabel: wolfGame.pot_enabled && wolfGame.pot_value_per_point
        ? formatWolfCurrency(wolfGame.pot_value_per_point)
        : 'No Pot',
      participantCount: wolfGame.participants?.length ?? 0,
    };
  }, [wolfGame]);

  // Loading state
  const isLoading = isLoadingGame || (showCompletedView && (isLoadingDecisions || isLoadingStandings || isLoadingPayouts || isFinalizing));

  // Check if we should show unconfigured state
  const showUnconfiguredState = !isLoading && !wolfGame && roundStatus === 'upcoming' && !!onEditPress;

  // No Wolf game for this round and not showing unconfigured
  if (!isLoading && !wolfGame && !showUnconfiguredState) {
    return null;
  }

  // Wrap in TouchableOpacity if editable or unconfigured (both should be tappable)
  const isTappable = isEditable || showUnconfiguredState;
  const CardWrapper = isTappable ? TouchableOpacity : View;
  const cardWrapperProps = isTappable
    ? {
        onPress: onEditPress,
        activeOpacity: 0.7,
        accessibilityLabel: showUnconfiguredState ? 'Configure Wolf game' : 'Edit Wolf game',
        accessibilityRole: 'button' as const,
      }
    : {};

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Wolf Game
        </Text>
        {isEditable && (
          <Icon source="pencil" size={18} color={colors.textSecondary} />
        )}
      </View>

      {isLoading ? (
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor: colors.border }]}>
          <View style={styles.loadingContainer}>
            <GolfBallLoader size="sm" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading Wolf data...
            </Text>
          </View>
        </View>
      ) : showUnconfiguredState ? (
        // ============================================================
        // UNCONFIGURED - Show prompt to set up Wolf game
        // ============================================================
        <CardWrapper
          style={[styles.card, { backgroundColor: cardBackground, borderColor: colors.border }]}
          {...cardWrapperProps}
        >
          <View style={styles.unconfiguredContainer}>
            <View style={[styles.unconfiguredIcon, { backgroundColor: colors.gray100 }]}>
              <Icon source="dog-side" size={28} color={colors.gray400} />
            </View>
            <View style={styles.unconfiguredContent}>
              <Text style={[styles.unconfiguredTitle, { color: colors.textPrimary }]}>
                No Wolf Game
              </Text>
              <Text style={[styles.unconfiguredDescription, { color: colors.textSecondary }]}>
                Tap to add Wolf side-game to this round
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color={colors.gray400} />
          </View>
        </CardWrapper>
      ) : showCompletedView && wolfGame && decisions && standings ? (
        // ============================================================
        // COMPLETED ROUND - Show full results
        // ============================================================
        <View style={styles.completedContainer}>
          {/* Wolf Results Card - Hole-by-hole breakdown */}
          <WolfResultsCard
            wolfGame={wolfGame}
            decisions={decisions}
            testID="wolf-results-card"
          />

          {/* Wolf Standings Card */}
          <WolfStandingsCard
            standings={standings}
            potEnabled={wolfGame.pot_enabled}
            testID="wolf-standings-card"
          />

          {/* Wolf Settlement Card (only if pot enabled) */}
          {wolfGame.pot_enabled && payouts && payouts.length > 0 && wolfGame.pot_value_per_point && (
            <WolfSettlementCard
              payouts={payouts}
              potValue={wolfGame.pot_value_per_point}
              currency={wolfGame.currency}
              testID="wolf-settlement-card"
            />
          )}
        </View>
      ) : wolfGame ? (
        // ============================================================
        // SCHEDULED/IN-PROGRESS ROUND - Show config
        // ============================================================
        <CardWrapper
          style={[styles.card, { backgroundColor: cardBackground, borderColor: colors.border }]}
          {...cardWrapperProps}
        >
          {/* Status and config header */}
          <View style={styles.configRow}>
            <View style={styles.configLeft}>
              <View style={[styles.wolfIcon, { backgroundColor: `${WOLF_COLOR}20` }]}>
                <Icon source="dog-side" size={20} color={WOLF_COLOR} />
              </View>
              <View style={styles.configInfo}>
                <Text style={[styles.configTitle, { color: colors.textPrimary }]}>
                  Wolf Enabled
                </Text>
                <Text style={[styles.configSubtitle, { color: colors.textSecondary }]}>
                  {configSummary.participantCount} players competing
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
                  {configSummary.scoringTypeLabel}
                </Text>
              </View>
            </View>

            {/* Blind Wolf */}
            <View style={styles.configItem}>
              <View style={[styles.configItemIcon, { backgroundColor: colors.gray100 }]}>
                <Icon source="fire" size={18} color={colors.warning} />
              </View>
              <View style={styles.configItemText}>
                <Text style={[styles.configItemLabel, { color: colors.textSecondary }]}>
                  Blind Wolf
                </Text>
                <Text style={[styles.configItemValue, { color: colors.textPrimary }]}>
                  {configSummary.blindWolfLabel}
                </Text>
              </View>
            </View>

            {/* Pot Value */}
            <View style={styles.configItem}>
              <View style={[styles.configItemIcon, { backgroundColor: `${WOLF_COLOR}15` }]}>
                <Icon source="currency-usd" size={18} color={WOLF_COLOR} />
              </View>
              <View style={styles.configItemText}>
                <Text style={[styles.configItemLabel, { color: colors.textSecondary }]}>
                  Per Point
                </Text>
                <Text style={[styles.configItemValue, { color: WOLF_COLOR }]}>
                  {configSummary.potValueLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Wolf Order */}
          {wolfGame.participants && wolfGame.participants.length > 0 && (
            <>
              <View style={[styles.configDivider, { backgroundColor: colors.border }]} />
              <View style={styles.participantsSection}>
                <Text style={[styles.participantsTitle, { color: colors.textSecondary }]}>
                  WOLF ORDER
                </Text>
                <View style={styles.participantsList}>
                  {wolfGame.wolf_order.map((playerId, index) => {
                    const participant = wolfGame.participants.find((p) => p.id === playerId);
                    if (!participant) return null;
                    return (
                      <View
                        key={participant.id}
                        style={[
                          styles.participantChip,
                          { backgroundColor: colors.gray100 },
                        ]}
                      >
                        <Text style={[styles.participantOrder, { color: WOLF_COLOR }]}>
                          {index + 1}
                        </Text>
                        <Text style={[styles.participantName, { color: colors.textPrimary }]}>
                          {participant.name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </CardWrapper>
      ) : null}
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

  // Completed Container
  completedContainer: {
    gap: spacing.md,
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
  wolfIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Participants (Wolf Order)
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  participantOrder: {
    ...typography.captionBold,
  },
  participantName: {
    ...typography.small,
  },
});

export default WolfGameSection;
