/**
 * ScoringPairsConfigBottomSheet - Configure scoring pairs settings
 *
 * A bottom sheet for configuring scoring pairs from the round details view.
 * Allows toggling scoring pairs on/off and shuffling assignments.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/common/BottomSheet';
import { GolfBallLoader, PlayerAvatar } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { supabase } from '@/services/supabase/client';
import { roundKeys } from '@/hooks/queryKeys';
import { useScoringPairs, useShuffleScoringPairs } from '@/hooks/useScoringPairs';
import type { ScoringPairWithPlayers } from '@/types/database.types';

// ============================================================================
// PROPS
// ============================================================================

export interface ScoringPairsConfigBottomSheetProps {
  /** Whether the bottom sheet is visible */
  visible: boolean;
  /** Callback when sheet is dismissed */
  onDismiss: () => void;
  /** Round ID */
  roundId: string;
  /** Competition ID (for shuffling) */
  competitionId?: string;
  /** Current scoring pairs required value */
  scoringPairsRequired: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScoringPairsConfigBottomSheet({
  visible,
  onDismiss,
  roundId,
  competitionId,
  scoringPairsRequired: initialValue,
}: ScoringPairsConfigBottomSheetProps) {
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const queryClient = useQueryClient();

  // Local state for toggle
  const [scoringPairsRequired, setScoringPairsRequired] = useState(initialValue);

  // Fetch current scoring pairs
  const { data: scoringPairs, isLoading: isLoadingPairs } = useScoringPairs(roundId);

  // Update scoring pairs required mutation
  const { mutate: updateScoringPairs, isPending: isUpdating } = useMutation({
    mutationFn: async (value: boolean) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error } = await (supabase as any)
        .from('rounds')
        .update({ scoring_pairs_required: value })
        .eq('id', roundId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
    },
  });

  // Shuffle scoring pairs mutation
  const { mutate: shufflePairs, isPending: isShuffling } = useShuffleScoringPairs();

  // Handle toggle change
  const handleToggle = useCallback(
    (value: boolean) => {
      setScoringPairsRequired(value);
      updateScoringPairs(value);
    },
    [updateScoringPairs]
  );

  // Handle shuffle — the mutation hook handles cache invalidation on its own
  const handleShuffle = useCallback(() => {
    if (!competitionId) return;
    shufflePairs({ roundId, competitionId });
  }, [roundId, competitionId, shufflePairs]);

  // Group pairs for display: show reciprocal pairs once (A↔B) or full circular chain (A→B→C→A)
  const displayPairs = useMemo((): {
    pairs: ScoringPairWithPlayers[];
    type: 'reciprocal' | 'circular';
  } => {
    if (!scoringPairs || scoringPairs.length === 0) {
      return { pairs: [], type: 'circular' };
    }

    const pairMap = new Map<string, ScoringPairWithPlayers>();
    for (const pair of scoringPairs) {
      pairMap.set(`${pair.scorer_id}-${pair.player_id}`, pair);
    }

    const isReciprocal = scoringPairs.every((pair) =>
      pairMap.has(`${pair.player_id}-${pair.scorer_id}`)
    );

    if (isReciprocal) {
      const seen = new Set<string>();
      const grouped: ScoringPairWithPlayers[] = [];
      for (const pair of scoringPairs) {
        const key = [pair.scorer_id, pair.player_id].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          grouped.push(pair);
        }
      }
      return { pairs: grouped, type: 'reciprocal' };
    }

    return { pairs: scoringPairs, type: 'circular' };
  }, [scoringPairs]);

  // Reset local state when sheet opens
  React.useEffect(() => {
    if (visible) {
      setScoringPairsRequired(initialValue);
    }
  }, [visible, initialValue]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      height={0.75}
      title="Scoring Pairs"
      showCloseButton
      testID="scoring-pairs-config-bottom-sheet"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isPremium ? (
          <>
            {/* Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleContent}>
                <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLighter }]}>
                  <Icon source="account-switch" size={24} color={colors.primary} />
                </View>
                <View style={styles.toggleTextContainer}>
                  <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                    Require Scoring Pairs
                  </Text>
                  <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                    Specify which players score each other
                  </Text>
                </View>
              </View>
              <Switch
                value={scoringPairsRequired}
                onValueChange={handleToggle}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={scoringPairsRequired ? colors.primary : colors.surfaceVariant}
                disabled={isUpdating}
              />
            </View>

            {/* Current Pairs Info */}
            {scoringPairsRequired && (
              <>
                <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

                {isLoadingPairs ? (
                  <View style={styles.loadingContainer}>
                    <GolfBallLoader size="sm" />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                      Loading pairs...
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.pairsInfoRow}>
                      <Text style={[styles.pairsInfoLabel, { color: colors.textSecondary }]}>
                        {displayPairs.type === 'reciprocal' ? 'Reciprocal pairs' : 'Circular chain'}
                      </Text>
                      <Text style={[styles.pairsInfoValue, { color: colors.textPrimary }]}>
                        {displayPairs.pairs.length}{' '}
                        {displayPairs.pairs.length === 1 ? 'pair' : 'pairs'}
                      </Text>
                    </View>

                    {/* Pair list */}
                    {displayPairs.pairs.length > 0 ? (
                      <View style={styles.pairList}>
                        {displayPairs.pairs.map((pair) => (
                          <View
                            key={pair.id}
                            style={[styles.pairRow, { backgroundColor: colors.gray50 }]}
                          >
                            <View style={styles.pairPlayer}>
                              <PlayerAvatar
                                photoUrl={pair.scorer?.photo_url}
                                name={pair.scorer?.name}
                                size={32}
                              />
                              <Text
                                style={[styles.pairName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {pair.scorer?.name || 'Unknown'}
                              </Text>
                            </View>
                            <View style={styles.pairArrow}>
                              <Icon
                                source={
                                  displayPairs.type === 'reciprocal'
                                    ? 'swap-horizontal'
                                    : 'arrow-right'
                                }
                                size={18}
                                color={colors.textTertiary}
                              />
                            </View>
                            <View style={styles.pairPlayer}>
                              <PlayerAvatar
                                photoUrl={pair.player?.photo_url}
                                name={pair.player?.name}
                                size={32}
                              />
                              <Text
                                style={[styles.pairName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {pair.player?.name || 'Unknown'}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.pairsEmpty}>
                        <Icon source="account-question" size={24} color={colors.gray400} />
                        <Text
                          style={[styles.pairsEmptyText, { color: colors.textSecondary }]}
                        >
                          No scoring pairs assigned yet
                        </Text>
                      </View>
                    )}

                    {/* Shuffle Button */}
                    {competitionId && (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.shuffleButton,
                            { borderColor: colors.border },
                            isShuffling && styles.shuffleButtonDisabled,
                          ]}
                          onPress={handleShuffle}
                          disabled={isShuffling}
                          activeOpacity={0.7}
                        >
                          <Icon
                            source="shuffle-variant"
                            size={20}
                            color={isShuffling ? colors.textDisabled : colors.primary}
                          />
                          <Text
                            style={[
                              styles.shuffleButtonText,
                              { color: isShuffling ? colors.textDisabled : colors.primary },
                            ]}
                          >
                            {isShuffling ? 'Shuffling...' : 'Shuffle Scoring Pairs'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.shuffleHint, { color: colors.textSecondary }]}>
                          Clear existing pairs and generate new random assignments
                        </Text>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          // Locked for non-premium
          <View style={styles.lockedContainer}>
            <View style={[styles.lockedIconContainer, { backgroundColor: colors.gray200 }]}>
              <Icon source="lock" size={32} color={colors.gray500} />
            </View>
            <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>
              Premium Feature
            </Text>
            <Text style={[styles.lockedDescription, { color: colors.textSecondary }]}>
              Upgrade to Premium to assign designated markers for scoring.
            </Text>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  toggleIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.bodyBold,
  },
  toggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  divider: {
    marginVertical: spacing.lg,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  pairsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pairsInfoLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  pairsInfoValue: {
    ...typography.caption,
  },
  pairList: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  pairPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  pairName: {
    ...typography.small,
    fontWeight: '500',
    flex: 1,
  },
  pairArrow: {
    paddingHorizontal: spacing.sm,
  },
  pairsEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pairsEmptyText: {
    ...typography.small,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  shuffleButtonDisabled: {
    opacity: 0.6,
  },
  shuffleButtonText: {
    ...typography.bodyBold,
  },
  shuffleHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  lockedContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  lockedIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  lockedTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  lockedDescription: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default ScoringPairsConfigBottomSheet;
