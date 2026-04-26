/**
 * MismatchResolutionModal - Modal for resolving score mismatches
 *
 * Displays a list of holes where the user and their partner recorded different scores.
 * Users can tap to select which score to use (first-write-wins for resolution).
 * Must be online to resolve mismatches.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { ModalHeader } from './ModalHeader';
import { ProgressBar } from './ProgressBar';
import { MismatchItem } from './MismatchItem';
import { ModalFooter } from './ModalFooter';
import type { ScoreMismatch } from '@/services/scoreMismatch';

// ============================================================================
// TYPES
// ============================================================================

export interface MismatchResolutionModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** List of mismatches to resolve */
  mismatches: ScoreMismatch[];
  /** Current user's ID for tracking who resolved */
  currentUserId: string;
  /** Partner's display name (used for legacy 2-way pairs mismatches) */
  partnerName: string;
  /** Map of scorer_id → display name. Used to label N-way (multi-scorer) entries. */
  playerNamesById?: Record<string, string>;
  /**
   * Called when user selects a score for resolution
   * Returns { alreadyResolved: true } if partner already resolved this mismatch
   */
  onResolve: (
    mismatchId: string,
    score: number,
    roundId: string,
    playerId: string,
    holeNumber: number
  ) => Promise<{ alreadyResolved: boolean; resolvedBy?: string }>;
  /** Called when modal should close */
  onClose: () => void;
  /** Whether the device is online (required for resolution) */
  isOnline: boolean;
  /** Whether a resolution is currently in progress */
  isResolving?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MismatchResolutionModal({
  visible,
  mismatches,
  currentUserId,
  partnerName,
  playerNamesById,
  onResolve,
  onClose,
  isOnline,
  isResolving = false,
}: MismatchResolutionModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Track which mismatch is currently being resolved (for loading state)
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  // Track locally resolved mismatches (optimistic UI before query refetch)
  const [locallyResolved, setLocallyResolved] = useState<
    Map<string, { score: number; resolvedBy: string }>
  >(new Map());

  // Calculate progress
  const resolvedCount = useMemo(() => {
    return mismatches.filter(
      (m) => m.status === 'resolved' || locallyResolved.has(m.id)
    ).length;
  }, [mismatches, locallyResolved]);

  const totalCount = mismatches.length;
  const allResolved = totalCount > 0 && resolvedCount === totalCount;

  // Handle resolution
  const handleResolve = useCallback(
    async (mismatch: ScoreMismatch, score: number) => {
      if (!isOnline || resolvingId) return;

      setResolvingId(mismatch.id);
      try {
        const result = await onResolve(
          mismatch.id,
          score,
          mismatch.round_id,
          mismatch.player_id,
          mismatch.hole_number
        );

        if (result.alreadyResolved) {
          // Partner already resolved - update local state to show their resolution
          setLocallyResolved((prev) => {
            const next = new Map(prev);
            next.set(mismatch.id, {
              score: score, // We don't know the actual score, but it's resolved
              resolvedBy: result.resolvedBy ?? partnerName,
            });
            return next;
          });
        } else {
          // Successfully resolved - update local state optimistically
          setLocallyResolved((prev) => {
            const next = new Map(prev);
            next.set(mismatch.id, { score, resolvedBy: currentUserId });
            return next;
          });
        }
      } catch (error) {
        console.error('[MismatchResolutionModal] Failed to resolve:', error);
      } finally {
        setResolvingId(null);
      }
    },
    [isOnline, resolvingId, onResolve, currentUserId, partnerName]
  );

  // Reset local state when modal closes
  const handleClose = useCallback(() => {
    if (allResolved) {
      setLocallyResolved(new Map());
      onClose();
    }
  }, [allResolved, onClose]);

  // Get player name for display
  const getPlayerName = useCallback(
    (mismatch: ScoreMismatch): string => {
      if (mismatch.player?.name) {
        return mismatch.player.name;
      }
      // If player data not available, show hole number only
      return '';
    },
    []
  );

  // Render a single mismatch item
  const renderMismatchItem = useCallback(
    ({ item }: { item: ScoreMismatch }) => {
      return (
        <MismatchItem
          item={item}
          isCurrentlyResolving={resolvingId === item.id}
          isAnyResolving={!!resolvingId}
          isOnline={isOnline}
          partnerName={partnerName}
          currentUserId={currentUserId}
          localResolution={locallyResolved.get(item.id)}
          playerName={getPlayerName(item)}
          playerNamesById={playerNamesById}
          onResolve={handleResolve}
        />
      );
    },
    [
      resolvingId,
      currentUserId,
      partnerName,
      playerNamesById,
      isOnline,
      locallyResolved,
      handleResolve,
      getPlayerName,
    ]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={allResolved ? handleClose : undefined}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        {/* Backdrop (only closes if all resolved) */}
        <TouchableOpacity
          style={styles.backdropPressable}
          onPress={allResolved ? handleClose : undefined}
          activeOpacity={1}
          disabled={!allResolved}
          accessibilityLabel={allResolved ? 'Close modal' : undefined}
          accessibilityRole={allResolved ? 'button' : 'none'}
        />

        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          {/* Header */}
          <ModalHeader
            partnerName={partnerName}
            allResolved={allResolved}
            onClose={handleClose}
          />

          {/* Progress */}
          <ProgressBar
            resolvedCount={resolvedCount}
            totalCount={totalCount}
            allResolved={allResolved}
          />

          {/* Offline Warning */}
          {!isOnline && (
            <View style={[styles.warningBanner, { backgroundColor: colors.warning + '15' }]}>
              <Icon source="wifi-off" size={20} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                You must be online to resolve score differences
              </Text>
            </View>
          )}

          {/* Mismatch List */}
          <FlatList
            data={mismatches}
            keyExtractor={(item) => item.id}
            renderItem={renderMismatchItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon source="check-circle" size={48} color={colors.success} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No score differences to resolve
                </Text>
              </View>
            }
          />

          {/* Footer */}
          <ModalFooter
            allResolved={allResolved}
            isResolving={isResolving}
            onClose={handleClose}
          />
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    ...shadows.lg,
  },

  // Warning
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.small,
    flex: 1,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default MismatchResolutionModal;
