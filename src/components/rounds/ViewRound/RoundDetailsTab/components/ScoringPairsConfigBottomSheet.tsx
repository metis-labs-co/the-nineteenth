/**
 * ScoringPairsConfigBottomSheet - Configure scoring pairs settings
 *
 * A bottom sheet for configuring scoring pairs from the round details view.
 * Allows toggling scoring pairs on/off and shuffling assignments.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/common/BottomSheet';
import { GolfBallLoader } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { supabase } from '@/services/supabase/client';
import { roundKeys } from '@/hooks/queryKeys';
import { useScoringPairs, useShuffleScoringPairs } from '@/hooks/useScoringPairs';

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

  // Handle shuffle
  const handleShuffle = useCallback(() => {
    if (!competitionId) return;
    shufflePairs(
      { roundId, competitionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['scoringPairs', roundId] });
        },
      }
    );
  }, [roundId, competitionId, shufflePairs, queryClient]);

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
      height={0.5}
      title="Scoring Pairs"
      showCloseButton
      testID="scoring-pairs-config-bottom-sheet"
    >
      <View style={styles.content}>
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
                        Current pairs:
                      </Text>
                      <Text style={[styles.pairsInfoValue, { color: colors.textPrimary }]}>
                        {scoringPairs?.length || 0} assigned
                      </Text>
                    </View>

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
      </View>
    </BottomSheet>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
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
    ...typography.body,
  },
  pairsInfoValue: {
    ...typography.bodyBold,
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
