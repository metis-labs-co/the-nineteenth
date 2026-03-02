/**
 * EditPrizePoolBottomSheet - Dedicated bottom sheet for prize pool configuration
 *
 * Allows organizers to create, edit, or delete a competition's prize pool
 * separately from the main competition edit flow.
 *
 * Features:
 * - Create new prize pool (funding type, amount, allocations)
 * - Edit existing prize pool configuration
 * - Delete prize pool (when not locked)
 * - Premium feature gating
 * - Lock status handling (pool locked when round starts)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useConfirmationDialog } from '@/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { BottomSheet, ConfirmationDialog, FormSection, LoadingSpinner } from '@/components/common';
import { PrizePoolSection, type PrizePoolConfig } from './PrizePoolSection';
import {
  useCompetitionPrizePool,
  useCreatePrizePool,
  useUpdatePrizePool,
  useDeletePrizePool,
} from '@/hooks/usePrizePool';
import { useAuth } from '@/hooks/useAuth';
import type { CompetitionPrizePool } from '@/types';
import {
  PrizePoolFormConfig,
  PrizePoolEditState,
  DEFAULT_PRIZE_POOL_CONFIG,
} from '@/screens/admin/EditCompetitionScreen/types';

// ============================================================================
// Types
// ============================================================================

export interface EditPrizePoolBottomSheetProps {
  /** Whether the bottom sheet is visible */
  visible: boolean;
  /** Callback when the sheet is closed */
  onClose: () => void;
  /** Competition ID */
  competitionId: string;
  /** Number of players in the competition (for per-player calculations) */
  playerCount: number;
  /** Number of rounds (for auto-split calculations) */
  roundCount: number;
  /** Whether any round has started (for lock status) */
  hasStartedRound: boolean;
  /** Callback when prize pool is successfully saved */
  onSuccess?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a prize pool database record to form config
 */
function poolToConfig(pool: CompetitionPrizePool | null | undefined): PrizePoolFormConfig {
  if (!pool) return DEFAULT_PRIZE_POOL_CONFIG;

  return {
    enabled: true,
    fundingType: pool.funding_type,
    fundingAmount: pool.funding_amount,
    skinsAllocationPercent: pool.skins_allocation_percent,
    winnerAllocationPercent: pool.winner_allocation_percent,
    otherAllocationPercent: pool.other_allocation_percent,
    autoSplitSkins: pool.auto_split_skins,
  };
}

/**
 * Checks if two prize pool configs are equal
 */
function configsAreEqual(
  a: PrizePoolFormConfig,
  b: PrizePoolFormConfig
): boolean {
  return (
    a.enabled === b.enabled &&
    a.fundingType === b.fundingType &&
    a.fundingAmount === b.fundingAmount &&
    a.skinsAllocationPercent === b.skinsAllocationPercent &&
    a.winnerAllocationPercent === b.winnerAllocationPercent &&
    a.otherAllocationPercent === b.otherAllocationPercent &&
    a.autoSplitSkins === b.autoSplitSkins
  );
}

// ============================================================================
// Component
// ============================================================================

export function EditPrizePoolBottomSheet({
  visible,
  onClose,
  competitionId,
  playerCount,
  roundCount,
  hasStartedRound,
  onSuccess,
}: EditPrizePoolBottomSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  // Dialog state
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Fetch existing prize pool
  const {
    data: prizePool,
    isLoading: isLoadingPool,
    refetch: refetchPool,
  } = useCompetitionPrizePool(visible ? competitionId : undefined);

  // Mutations
  const createPoolMutation = useCreatePrizePool();
  const updatePoolMutation = useUpdatePrizePool();
  const deletePoolMutation = useDeletePrizePool();

  // Form state
  const [config, setConfig] = useState<PrizePoolFormConfig>(DEFAULT_PRIZE_POOL_CONFIG);
  const [initialConfig, setInitialConfig] = useState<PrizePoolFormConfig>(DEFAULT_PRIZE_POOL_CONFIG);

  // Edit state
  const editState = useMemo<PrizePoolEditState>(() => {
    const hasExistingPool = !!prizePool;
    const isLocked = hasExistingPool && (prizePool?.is_locked || hasStartedRound);
    const lockedReason = isLocked
      ? prizePool?.is_locked
        ? 'Prize pool is locked because a round has started'
        : 'Cannot modify prize pool after a round has started'
      : null;

    return {
      hasExistingPool,
      isLocked,
      lockedReason,
      poolId: prizePool?.id ?? null,
    };
  }, [prizePool, hasStartedRound]);

  // Derived state
  const isDirty = !configsAreEqual(config, initialConfig);
  const isSubmitting =
    createPoolMutation.isPending ||
    updatePoolMutation.isPending ||
    deletePoolMutation.isPending;

  // Initialize form when pool data loads
  useEffect(() => {
    if (visible) {
      const poolConfig = poolToConfig(prizePool);
      setConfig(poolConfig);
      setInitialConfig(poolConfig);
    }
  }, [prizePool, visible]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!visible) {
      setConfig(DEFAULT_PRIZE_POOL_CONFIG);
      setInitialConfig(DEFAULT_PRIZE_POOL_CONFIG);
    }
  }, [visible]);

  // Handle config change from PrizePoolSection
  const handleConfigChange = useCallback((newConfig: PrizePoolConfig | null) => {
    if (newConfig === null) {
      // Pool was disabled
      setConfig({ ...config, enabled: false });
    } else {
      // Pool config changed
      setConfig({
        enabled: true,
        fundingType: newConfig.fundingType,
        fundingAmount: newConfig.fundingAmount,
        skinsAllocationPercent: newConfig.skinsAllocationPercent,
        winnerAllocationPercent: newConfig.winnerAllocationPercent,
        otherAllocationPercent: newConfig.otherAllocationPercent,
        autoSplitSkins: newConfig.autoSplitSkins,
      });
    }
  }, [config]);

  // Handle upgrade press for non-premium users
  const handleUpgradePress = useCallback(() => {
    onClose();
    (navigation as { navigate: (screen: string) => void }).navigate('Subscription');
  }, [navigation, onClose]);

  // Handle close with unsaved changes check
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

  // Handle save
  const handleSave = useCallback(async () => {
    if (!user?.id) {
      showAlert('Error', 'You must be logged in to save prize pool');
      return;
    }

    try {
      const { hasExistingPool, poolId, isLocked } = editState;
      const poolEnabled = config.enabled;

      // Don't allow changes to locked pool
      if (isLocked) {
        showAlert('Error', 'Prize pool is locked and cannot be modified');
        return;
      }

      // Scenario 1: Create new pool
      if (poolEnabled && !hasExistingPool) {
        await createPoolMutation.mutateAsync({
          competition_id: competitionId,
          funding_type: config.fundingType,
          funding_amount: config.fundingAmount,
          skins_allocation_percent: config.skinsAllocationPercent,
          winner_allocation_percent: config.winnerAllocationPercent,
          other_allocation_percent: config.otherAllocationPercent,
          auto_split_skins: config.autoSplitSkins,
          created_by: user.id,
          player_count: playerCount,
        });
      }
      // Scenario 2: Update existing pool
      else if (poolEnabled && hasExistingPool && poolId) {
        await updatePoolMutation.mutateAsync({
          poolId,
          updates: {
            funding_type: config.fundingType,
            funding_amount: config.fundingAmount,
            skins_allocation_percent: config.skinsAllocationPercent,
            winner_allocation_percent: config.winnerAllocationPercent,
            other_allocation_percent: config.otherAllocationPercent,
            auto_split_skins: config.autoSplitSkins,
          },
          player_count: playerCount,
        });
      }
      // Scenario 3: Delete pool (user disabled it)
      else if (!poolEnabled && hasExistingPool && poolId) {
        await deletePoolMutation.mutateAsync({
          poolId,
          competitionId,
        });
      }

      // Refresh and close
      await refetchPool();
      onSuccess?.();
      onClose();
    } catch (error) {
      showAlert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save prize pool'
      );
    }
  }, [
    user?.id,
    editState,
    config,
    competitionId,
    playerCount,
    createPoolMutation,
    updatePoolMutation,
    deletePoolMutation,
    refetchPool,
    onSuccess,
    onClose,
    showAlert,
  ]);

  // Build pool object for PrizePoolSection
  const displayPool = useMemo<CompetitionPrizePool | null>(() => {
    if (!config.enabled && !editState.hasExistingPool) return null;

    // Use actual pool if exists, otherwise create display object
    if (prizePool) {
      return {
        ...prizePool,
        funding_type: config.fundingType,
        funding_amount: config.fundingAmount,
        total_pool_amount:
          config.fundingType === 'per_player'
            ? config.fundingAmount * playerCount
            : config.fundingAmount,
        skins_allocation_percent: config.skinsAllocationPercent,
        winner_allocation_percent: config.winnerAllocationPercent,
        other_allocation_percent: config.otherAllocationPercent,
        auto_split_skins: config.autoSplitSkins,
      };
    }

    // Creating new pool - return display object
    const totalPoolAmount =
      config.fundingType === 'per_player'
        ? config.fundingAmount * playerCount
        : config.fundingAmount;

    return {
      id: '',
      competition_id: competitionId,
      funding_type: config.fundingType,
      funding_amount: config.fundingAmount,
      currency: 'AUD',
      total_pool_amount: totalPoolAmount,
      skins_allocation_percent: config.skinsAllocationPercent,
      winner_allocation_percent: config.winnerAllocationPercent,
      other_allocation_percent: config.otherAllocationPercent,
      skins_budget: (totalPoolAmount * config.skinsAllocationPercent) / 100,
      winner_budget: (totalPoolAmount * config.winnerAllocationPercent) / 100,
      other_budget: (totalPoolAmount * config.otherAllocationPercent) / 100,
      auto_split_skins: config.autoSplitSkins,
      skins_pot_per_round: null,
      is_locked: false,
      locked_at: null,
      status: 'draft',
      created_by: user?.id ?? '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [config, prizePool, editState.hasExistingPool, competitionId, playerCount, user?.id]);

  // Convert edit state to component format
  const componentEditState = useMemo(
    () => ({
      hasExistingPool: editState.hasExistingPool,
      isLocked: editState.isLocked,
      lockedReason: editState.lockedReason,
    }),
    [editState]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      height="full"
      title={editState.hasExistingPool ? 'Edit Prize Pool' : 'Add Prize Pool'}
      showHandle={false}
      safeAreaTop
      showCloseButton
      enableSwipeToDismiss={!isDirty}
      closeOnBackdropPress={!isDirty}
      testID="edit-prize-pool-bottom-sheet"
    >
      {isLoadingPool ? (
        <LoadingSpinner size="lg" message="Loading prize pool..." />
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
            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Configure the prize pool for your competition. Allocate funds for skins games, winner prizes, and other rewards.
            </Text>

            {/* Prize Pool Form */}
            <FormSection>
              <PrizePoolSection
                pool={displayPool}
                playerCount={playerCount}
                roundCount={roundCount}
                onPoolChange={handleConfigChange}
                onUpgradePress={handleUpgradePress}
                editState={componentEditState}
              />
            </FormSection>

            {/* Info Box */}
            {editState.isLocked && (
              <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {editState.lockedReason}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { backgroundColor: colors.surface, borderTopColor: colors.border },
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
                (!isDirty || isSubmitting || editState.isLocked) && styles.disabledButton,
              ]}
              disabled={!isDirty || isSubmitting || editState.isLocked}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>
                  {editState.hasExistingPool ? 'Save Changes' : 'Create Pool'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Confirmation/Error Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </BottomSheet>
  );
}

// ============================================================================
// Styles
// ============================================================================

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
  primaryButton: {
    // backgroundColor set inline
  },
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
