/**
 * EditPrizePoolBottomSheet - Unified prize pool editor for both targets
 *
 * Hosts a `PrizePoolDualConfig` (Individual / Team tabs) and runs
 * independent create/update/delete mutations per side on save. Used by
 * the competition settings screen as the single editor surface.
 *
 * Features:
 * - Per-side drafts with dirty tracking (Save enabled if either changed)
 * - Per-side lock state (a locked side renders read-only and is skipped on save)
 * - Premium feature gating (delegated to `PrizePoolSection`)
 * - `initialTab` lets callers deep-link to either tab
 * - `teamModeAllowed` disables the team tab when the competition isn't fixed-teams
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useConfirmationDialog } from '@/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { BottomSheet, ConfirmationDialog, FormSection, LoadingSpinner } from '@/components/common';
import { PrizePoolDualConfig, type PoolTabKey } from './PrizePoolDualConfig';
import type { PrizePoolConfig } from './PrizePoolSection';
import {
  useCompetitionPrizePools,
  useCreatePrizePool,
  useUpdatePrizePool,
  useDeletePrizePool,
} from '@/hooks/prizePool';
import { useAuth } from '@/hooks/useAuth';
import type { CompetitionPrizePool, PoolTargetType } from '@/types';
import {
  PrizePoolFormConfig,
  PrizePoolEditState,
  DEFAULT_PRIZE_POOL_CONFIG,
} from '@/screens/competitions/CompetitionSettingsScreen/types';

// ============================================================================
// Types
// ============================================================================

export interface EditPrizePoolBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  competitionId: string;
  /** Number of competition players (per-player funding math + individual placement cap) */
  playerCount: number;
  /** Number of teams (team placement cap) */
  teamCount: number;
  /** Number of rounds — passed through */
  roundCount: number;
  /** Lock signal: any round started */
  hasStartedRound: boolean;
  /** False when team_mode !== 'fixed' — disables the Team tab */
  teamModeAllowed: boolean;
  /** Tab to land on first */
  initialTab?: PoolTabKey;
  /** Refetch trigger after a successful save */
  onSuccess?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function poolToConfig(pool: CompetitionPrizePool | null): PrizePoolFormConfig {
  if (!pool) return DEFAULT_PRIZE_POOL_CONFIG;
  return {
    enabled: true,
    fundingType: pool.funding_type,
    fundingAmount: pool.funding_amount,
    placements: DEFAULT_PRIZE_POOL_CONFIG.placements,
  };
}

function configsAreEqual(a: PrizePoolFormConfig, b: PrizePoolFormConfig): boolean {
  if (
    a.enabled !== b.enabled ||
    a.fundingType !== b.fundingType ||
    a.fundingAmount !== b.fundingAmount ||
    a.placements.length !== b.placements.length
  ) {
    return false;
  }
  return a.placements.every(
    (p, i) =>
      p.position === b.placements[i].position && p.percent === b.placements[i].percent
  );
}

function buildEditState(
  pool: CompetitionPrizePool | null,
  hasStartedRound: boolean
): PrizePoolEditState {
  const hasExistingPool = !!pool;
  const isLocked = hasExistingPool && (pool?.is_locked || hasStartedRound);
  const lockedReason = isLocked
    ? pool?.is_locked
      ? 'Prize pool is locked because a round has started'
      : 'Cannot modify prize pool after a round has started'
    : null;
  return {
    hasExistingPool,
    isLocked,
    lockedReason,
    poolId: pool?.id ?? null,
  };
}

function buildDisplayPool(
  config: PrizePoolFormConfig,
  pool: CompetitionPrizePool | null,
  competitionId: string,
  participantCount: number,
  targetType: PoolTargetType,
  userId: string | undefined
): CompetitionPrizePool | null {
  if (!config.enabled && !pool) return null;
  const totalPoolAmount =
    config.fundingType === 'per_player'
      ? config.fundingAmount * participantCount
      : config.fundingAmount;

  if (pool) {
    return {
      ...pool,
      funding_type: config.fundingType,
      funding_amount: config.fundingAmount,
      total_pool_amount: totalPoolAmount,
    };
  }

  return {
    id: '',
    competition_id: competitionId,
    target_type: targetType,
    funding_type: config.fundingType,
    funding_amount: config.fundingAmount,
    currency: 'AUD',
    total_pool_amount: totalPoolAmount,
    is_locked: false,
    locked_at: null,
    status: 'draft',
    created_by: userId ?? '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ============================================================================
// Component
// ============================================================================

export function EditPrizePoolBottomSheet({
  visible,
  onClose,
  competitionId,
  playerCount,
  teamCount,
  roundCount,
  hasStartedRound,
  teamModeAllowed,
  initialTab = 'individual',
  onSuccess,
}: EditPrizePoolBottomSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Fetch both pools in one query
  const {
    data: pools,
    isLoading: isLoadingPools,
    refetch: refetchPools,
  } = useCompetitionPrizePools(visible ? competitionId : undefined);

  const individualPool = pools?.individual ?? null;
  const teamPool = pools?.team ?? null;

  const createPoolMutation = useCreatePrizePool();
  const updatePoolMutation = useUpdatePrizePool();
  const deletePoolMutation = useDeletePrizePool();

  // Per-side drafts and snapshots
  const [individualDraft, setIndividualDraft] = useState<PrizePoolFormConfig>(
    DEFAULT_PRIZE_POOL_CONFIG
  );
  const [teamDraft, setTeamDraft] = useState<PrizePoolFormConfig>(
    DEFAULT_PRIZE_POOL_CONFIG
  );
  const [initialIndividual, setInitialIndividual] = useState<PrizePoolFormConfig>(
    DEFAULT_PRIZE_POOL_CONFIG
  );
  const [initialTeam, setInitialTeam] = useState<PrizePoolFormConfig>(
    DEFAULT_PRIZE_POOL_CONFIG
  );

  // Sync drafts when the sheet opens / pool data lands
  useEffect(() => {
    if (visible) {
      const i = poolToConfig(individualPool);
      const t = poolToConfig(teamPool);
      setIndividualDraft(i);
      setInitialIndividual(i);
      setTeamDraft(t);
      setInitialTeam(t);
    }
  }, [individualPool, teamPool, visible]);

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setIndividualDraft(DEFAULT_PRIZE_POOL_CONFIG);
      setInitialIndividual(DEFAULT_PRIZE_POOL_CONFIG);
      setTeamDraft(DEFAULT_PRIZE_POOL_CONFIG);
      setInitialTeam(DEFAULT_PRIZE_POOL_CONFIG);
    }
  }, [visible]);

  const individualEditState = useMemo(
    () => buildEditState(individualPool, hasStartedRound),
    [individualPool, hasStartedRound]
  );
  const teamEditState = useMemo(
    () => buildEditState(teamPool, hasStartedRound),
    [teamPool, hasStartedRound]
  );

  const isDirty =
    !configsAreEqual(individualDraft, initialIndividual) ||
    !configsAreEqual(teamDraft, initialTeam);

  const isSubmitting =
    createPoolMutation.isPending ||
    updatePoolMutation.isPending ||
    deletePoolMutation.isPending;

  // Map PrizePoolSection's onPoolChange (PrizePoolConfig | null) into the local draft shape
  const handleIndividualChange = useCallback((next: PrizePoolConfig | null) => {
    if (next === null) {
      setIndividualDraft((prev) => ({ ...prev, enabled: false }));
    } else {
      setIndividualDraft({
        enabled: true,
        fundingType: next.fundingType,
        fundingAmount: next.fundingAmount,
        placements: next.placements,
      });
    }
  }, []);

  const handleTeamChange = useCallback((next: PrizePoolConfig | null) => {
    if (next === null) {
      setTeamDraft((prev) => ({ ...prev, enabled: false }));
    } else {
      setTeamDraft({
        enabled: true,
        fundingType: next.fundingType,
        fundingAmount: next.fundingAmount,
        placements: next.placements,
      });
    }
  }, []);

  const handleUpgradePress = useCallback(() => {
    onClose();
    (navigation as { navigate: (screen: string) => void }).navigate('Subscription');
  }, [navigation, onClose]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      showDialog({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to leave?',
        confirmLabel: 'Leave',
        cancelLabel: 'Cancel',
        confirmVariant: 'destructive',
        onConfirm: () => {
          dismissDialog();
          onClose();
        },
      });
    } else {
      onClose();
    }
  }, [isDirty, onClose, showDialog, dismissDialog]);

  // Save one side. Returns null on no-op, or an error message string on failure.
  const saveSide = useCallback(
    async (
      target: PoolTargetType,
      draft: PrizePoolFormConfig,
      initial: PrizePoolFormConfig,
      editState: PrizePoolEditState,
      participantCount: number
    ): Promise<string | null> => {
      if (configsAreEqual(draft, initial)) return null;
      if (editState.isLocked) return null; // skip locked sides silently
      if (!user?.id) return 'You must be logged in';

      try {
        if (draft.enabled && !editState.hasExistingPool) {
          await createPoolMutation.mutateAsync({
            competition_id: competitionId,
            target_type: target,
            funding_type: draft.fundingType,
            funding_amount: draft.fundingAmount,
            placements: draft.placements,
            created_by: user.id,
            player_count: participantCount,
          });
        } else if (draft.enabled && editState.hasExistingPool && editState.poolId) {
          await updatePoolMutation.mutateAsync({
            poolId: editState.poolId,
            updates: {
              funding_type: draft.fundingType,
              funding_amount: draft.fundingAmount,
              placements: draft.placements,
            },
            player_count: participantCount,
          });
        } else if (!draft.enabled && editState.hasExistingPool && editState.poolId) {
          await deletePoolMutation.mutateAsync({
            poolId: editState.poolId,
            competitionId,
          });
        }
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : `Failed to save ${target} pool`;
      }
    },
    [
      user?.id,
      competitionId,
      createPoolMutation,
      updatePoolMutation,
      deletePoolMutation,
    ]
  );

  const handleSave = useCallback(async () => {
    if (!user?.id) {
      showAlert('Error', 'You must be logged in to save prize pool');
      return;
    }

    const individualError = await saveSide(
      'individual',
      individualDraft,
      initialIndividual,
      individualEditState,
      playerCount
    );
    const teamError = teamModeAllowed
      ? await saveSide('team', teamDraft, initialTeam, teamEditState, teamCount)
      : null;

    await refetchPools();

    if (individualError || teamError) {
      const messages = [
        individualError && `Individual: ${individualError}`,
        teamError && `Team: ${teamError}`,
      ]
        .filter(Boolean)
        .join('\n');
      showAlert('Save partially failed', messages);
      return;
    }

    onSuccess?.();
    onClose();
  }, [
    user?.id,
    saveSide,
    individualDraft,
    initialIndividual,
    individualEditState,
    playerCount,
    teamModeAllowed,
    teamDraft,
    initialTeam,
    teamEditState,
    teamCount,
    refetchPools,
    onSuccess,
    onClose,
    showAlert,
  ]);

  // Display pools (used for PrizePoolSection's `pool` prop — affects placement cap math)
  const displayIndividualPool = useMemo(
    () =>
      buildDisplayPool(
        individualDraft,
        individualPool,
        competitionId,
        playerCount,
        'individual',
        user?.id
      ),
    [individualDraft, individualPool, competitionId, playerCount, user?.id]
  );
  const displayTeamPool = useMemo(
    () =>
      buildDisplayPool(
        teamDraft,
        teamPool,
        competitionId,
        teamCount,
        'team',
        user?.id
      ),
    [teamDraft, teamPool, competitionId, teamCount, user?.id]
  );

  const hasAnyExisting =
    individualEditState.hasExistingPool || teamEditState.hasExistingPool;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      height="full"
      title={hasAnyExisting ? 'Edit Prize Pools' : 'Add Prize Pool'}
      showHandle={false}
      safeAreaTop
      showCloseButton
      enableSwipeToDismiss={!isDirty}
      closeOnBackdropPress={!isDirty}
      testID="edit-prize-pool-bottom-sheet"
    >
      {isLoadingPools ? (
        <LoadingSpinner size="lg" message="Loading prize pools..." />
      ) : (
        <>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Distribute prizes to top finishers. Configure either pool independently.
            </Text>

            <FormSection>
              <PrizePoolDualConfig
                playerCount={playerCount}
                teamCount={teamCount}
                roundCount={roundCount}
                teamModeAllowed={teamModeAllowed}
                initialTab={initialTab}
                individualPool={displayIndividualPool}
                teamPool={displayTeamPool}
                individualEditState={individualEditState}
                teamEditState={teamEditState}
                onIndividualChange={handleIndividualChange}
                onTeamChange={handleTeamChange}
                onUpgradePress={handleUpgradePress}
              />
            </FormSection>

            {(individualEditState.isLocked || teamEditState.isLocked) && (
              <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {individualEditState.lockedReason ?? teamEditState.lockedReason}
                </Text>
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.footerButton,
                styles.secondaryButton,
                { borderColor: colors.border },
              ]}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.footerButton,
                styles.primaryButton,
                { backgroundColor: colors.primary },
                (!isDirty || isSubmitting) && styles.disabledButton,
              ]}
              disabled={!isDirty || isSubmitting}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>
                  {hasAnyExisting ? 'Save Changes' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});

export default EditPrizePoolBottomSheet;
