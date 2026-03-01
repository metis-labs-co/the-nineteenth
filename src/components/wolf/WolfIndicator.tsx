/**
 * WolfIndicator - Small indicator for scorecard header showing Wolf game is active
 *
 * Displays a dog icon (🐺) with current Wolf information when Wolf game is active.
 * On press, shows a popover with Wolf game summary including standings.
 *
 * @example
 * ```tsx
 * // In scorecard header
 * <View style={styles.headerRight}>
 *   <SkinsIndicator roundId={roundId} />
 *   <WolfIndicator roundId={roundId} onPress={handleWolfPress} />
 *   <SyncIndicator />
 * </View>
 *
 * // Basic usage - just indicator with popover
 * <WolfIndicator roundId={roundId} />
 * ```
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { spacing, borderRadius, typography, shadows, wolfColor } from '@/constants/theme';
import { useWolfGameByRound, useWolfStandings, useWolfHoleDecisions } from '@/hooks/wolf';
import { determineWolfForHole } from '@/utils/wolfCalculations';
import type { WolfHoleDecision, WolfGameWithParticipants } from '@/types/database/wolf.types';

// ============================================================================
// TYPES
// ============================================================================

export interface WolfIndicatorProps {
  /** Round UUID to check for active Wolf game */
  roundId: string;
  /** Current hole number (1-18) */
  currentHole?: number;
  /** Optional callback when indicator is pressed (overrides default popover) */
  onPress?: () => void;
  /** Size of the icon */
  size?: 'sm' | 'md';
  /** Variant - 'default' has background, 'minimal' has no background (for header use) */
  variant?: 'default' | 'minimal';
  /** Test ID for testing */
  testID?: string;
}

/**
 * Get description of Wolf's decision for display
 */
function getDecisionDescription(decision: WolfHoleDecision | null | undefined): string | null {
  if (!decision) return null;
  if (!decision.decided_at) return null;

  if (decision.is_blind_wolf) {
    return 'Blind 🔥';
  }
  if (!decision.partner_id) {
    return 'Lone Wolf';
  }
  return null; // Partner selected - will use partner name
}

/**
 * Get Wolf's partner name from participants
 */
function getPartnerName(
  decision: WolfHoleDecision | null | undefined,
  participants: { id: string; name: string }[]
): string | null {
  if (!decision?.partner_id) return null;
  const partner = participants.find((p) => p.id === decision.partner_id);
  return partner?.name ?? 'Unknown';
}

/**
 * Get result description for a completed hole
 */
function getResultDescription(decision: WolfHoleDecision | null | undefined): string | null {
  if (!decision?.calculated_at) return null;

  if (decision.is_tie) {
    return 'Tie - pushed';
  }
  if (decision.wolf_team_won === true) {
    return 'Wolf wins!';
  }
  if (decision.wolf_team_won === false) {
    return 'Pack wins!';
  }
  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WolfIndicator = React.memo(function WolfIndicator({
  roundId,
  currentHole,
  onPress,
  size = 'md',
  variant = 'default',
  testID,
}: WolfIndicatorProps) {
  const colors = useThemeColors();
  const [showPopover, setShowPopover] = useState(false);

  // Check if Wolf game is active for this round
  const {
    data: wolfGame,
    isLoading: isGameLoading,
    error: gameError,
  } = useWolfGameByRound(roundId);

  // Get all hole decisions for summary
  const {
    data: decisions,
    isLoading: isDecisionsLoading,
    refetch: refetchDecisions,
  } = useWolfHoleDecisions(wolfGame?.id);

  // Get standings for the popover
  const {
    data: standings,
    isLoading: isStandingsLoading,
    refetch: refetchStandings,
  } = useWolfStandings(wolfGame?.id);

  // Determine current Wolf for this hole
  const currentWolf = useMemo(() => {
    if (!wolfGame?.wolf_order || !currentHole) return null;
    const wolfId = determineWolfForHole(wolfGame.wolf_order, currentHole);
    const wolfPlayer = wolfGame.participants.find((p) => p.id === wolfId);
    return wolfPlayer ?? null;
  }, [wolfGame, currentHole]);

  // Get current hole's decision
  const currentDecision = useMemo(() => {
    if (!decisions || !currentHole) return null;
    return decisions.find((d) => d.hole_number === currentHole) ?? null;
  }, [decisions, currentHole]);

  // Count holes with decisions made
  const holesDecided = useMemo(() => {
    if (!decisions) return 0;
    return decisions.filter((d) => d.decided_at !== null).length;
  }, [decisions]);

  // Count holes completed (with results calculated)
  const holesCompleted = useMemo(() => {
    if (!decisions) return 0;
    return decisions.filter((d) => d.calculated_at !== null).length;
  }, [decisions]);

  // Get current leader
  const currentLeader = useMemo(() => {
    if (!standings || standings.length === 0) return null;
    // Standings are already sorted by points descending
    const leader = standings[0];
    return leader.total_points > 0 ? leader : null;
  }, [standings]);

  // Handle press
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      setShowPopover(true);
    }
  }, [onPress]);

  // Close popover
  const handleClosePopover = useCallback(() => {
    setShowPopover(false);
  }, []);

  // Refetch data when popover opens
  useEffect(() => {
    if (!showPopover || !wolfGame?.id) return;

    // Refetch immediately when popover opens
    refetchDecisions();
    refetchStandings();

    // Poll every 3 seconds while popover is open
    const intervalId = setInterval(() => {
      refetchDecisions();
      refetchStandings();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [showPopover, wolfGame?.id, refetchDecisions, refetchStandings]);

  // Don't render if no active Wolf game
  if (!wolfGame && !isGameLoading) {
    return null;
  }

  // Icon and container sizes
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
        <ActivityIndicator size="small" color={wolfColor} />
      </View>
    );
  }

  // Decision/result info for badge
  const decisionDescription = getDecisionDescription(currentDecision);
  const partnerName = getPartnerName(currentDecision, wolfGame?.participants ?? []);
  const resultDescription = getResultDescription(currentDecision);
  const hasDecision = !!currentDecision?.decided_at;
  const isLoneOrBlind = currentDecision?.is_blind_wolf || !currentDecision?.partner_id;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            backgroundColor: variant === 'default' ? `${wolfColor}15` : 'transparent',
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Wolf game active${currentWolf ? `, ${currentWolf.name} is Wolf` : ''}`}
        accessibilityHint="Tap to view Wolf game summary"
        testID={testID}
      >
        <Icon source="dog-side" size={iconSize} color={wolfColor} />

        {/* Badge showing decision status or leader */}
        {(hasDecision && isLoneOrBlind) && (
          <View
            style={[
              styles.badge,
              { backgroundColor: currentDecision?.is_blind_wolf ? colors.warning : wolfColor },
            ]}
          >
            <Text style={styles.badgeText}>
              {currentDecision?.is_blind_wolf ? '🔥' : 'L'}
            </Text>
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
              <Icon source="dog-side" size={24} color={wolfColor} />
              <Text style={[styles.popoverTitle, { color: colors.textPrimary }]}>
                Wolf Game
              </Text>
            </View>

            {isDecisionsLoading || isStandingsLoading ? (
              <View style={styles.popoverLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : wolfGame ? (
              <View style={styles.popoverContent}>
                {/* Scoring Type */}
                <View style={styles.popoverRow}>
                  <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                    Scoring
                  </Text>
                  <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                    {wolfGame.scoring_type === 'gross' ? 'Gross' : 'Net'}
                  </Text>
                </View>

                {/* Blind Wolf */}
                <View style={styles.popoverRow}>
                  <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                    Blind Wolf
                  </Text>
                  <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                    {wolfGame.blind_wolf_enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>

                {/* Pot Info (if enabled) */}
                {wolfGame.pot_enabled && wolfGame.pot_value_per_point && (
                  <View style={styles.popoverRow}>
                    <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                      Pot
                    </Text>
                    <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                      ${wolfGame.pot_value_per_point.toFixed(2)}/point
                    </Text>
                  </View>
                )}

                {/* Progress */}
                <View style={styles.popoverRow}>
                  <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                    Progress
                  </Text>
                  <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                    {holesCompleted}/18 holes
                  </Text>
                </View>

                {/* Current Wolf (if on a hole) */}
                {currentWolf && currentHole && (
                  <View
                    style={[
                      styles.currentWolfRow,
                      { backgroundColor: `${wolfColor}15` },
                    ]}
                  >
                    <Icon source="dog-side" size={16} color={wolfColor} />
                    <Text style={[styles.currentWolfText, { color: wolfColor }]}>
                      Hole {currentHole}: {currentWolf.name} is Wolf
                      {hasDecision && (
                        <>
                          {' - '}
                          {decisionDescription ?? `+ ${partnerName}`}
                        </>
                      )}
                    </Text>
                  </View>
                )}

                {/* Last Result (if available) */}
                {resultDescription && currentDecision && (
                  <View
                    style={[
                      styles.resultRow,
                      {
                        backgroundColor:
                          currentDecision.is_tie
                            ? `${colors.gray500}10`
                            : currentDecision.wolf_team_won
                              ? `${colors.success}10`
                              : `${colors.error}10`,
                      },
                    ]}
                  >
                    <Icon
                      source={currentDecision.is_tie ? 'equal' : 'trophy'}
                      size={16}
                      color={
                        currentDecision.is_tie
                          ? colors.gray500
                          : currentDecision.wolf_team_won
                            ? colors.success
                            : colors.error
                      }
                    />
                    <Text
                      style={[
                        styles.resultText,
                        {
                          color: currentDecision.is_tie
                            ? colors.gray500
                            : currentDecision.wolf_team_won
                              ? colors.success
                              : colors.error,
                        },
                      ]}
                    >
                      {resultDescription}
                    </Text>
                  </View>
                )}

                {/* Standings */}
                {standings && standings.length > 0 && (
                  <>
                    <Divider style={styles.divider} />
                    <View style={styles.standingsSection}>
                      <Text style={[styles.standingsTitle, { color: colors.textPrimary }]}>
                        Standings
                      </Text>
                      <ScrollView style={styles.standingsList} nestedScrollEnabled>
                        {standings.map((entry, index) => (
                          <View key={entry.player_id} style={styles.standingRow}>
                            <View style={styles.standingLeft}>
                              <Text
                                style={[
                                  styles.standingRank,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                              </Text>
                              <Text
                                style={[styles.standingName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {entry.name}
                              </Text>
                            </View>
                            <View style={styles.standingRight}>
                              <Text
                                style={[
                                  styles.standingPoints,
                                  {
                                    color: entry.total_points > 0 ? colors.textPrimary : colors.textSecondary,
                                  },
                                ]}
                              >
                                {entry.total_points} pts
                              </Text>
                              {wolfGame.pot_enabled && entry.net_result !== undefined && (
                                <Text
                                  style={[
                                    styles.standingNet,
                                    {
                                      color: entry.net_result > 0
                                        ? colors.success
                                        : entry.net_result < 0
                                          ? colors.error
                                          : colors.textSecondary,
                                    },
                                  ]}
                                >
                                  {entry.net_result >= 0 ? '+' : ''}${entry.net_result.toFixed(2)}
                                </Text>
                              )}
                            </View>
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
  popoverLoading: {
    padding: spacing.xl,
    alignItems: 'center',
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
  currentWolfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  currentWolfText: {
    ...typography.smallBold,
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  resultText: {
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
  standingsSection: {
    marginTop: spacing.sm,
  },
  standingsTitle: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  standingsList: {
    maxHeight: 150,
  },
  standingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  standingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  standingRank: {
    ...typography.small,
    minWidth: 24,
  },
  standingName: {
    ...typography.small,
    flex: 1,
  },
  standingRight: {
    alignItems: 'flex-end',
  },
  standingPoints: {
    ...typography.smallBold,
  },
  standingNet: {
    ...typography.caption,
  },
});

export default WolfIndicator;
