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
  ActivityIndicator,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
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
  /** Partner's display name */
  partnerName: string;
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
      const localResolution = locallyResolved.get(item.id);
      const isResolved = item.status === 'resolved' || !!localResolution;
      const isCurrentlyResolving = resolvingId === item.id;
      const resolvedScore = item.resolved_score ?? localResolution?.score;
      const resolvedBy = item.resolved_by ?? localResolution?.resolvedBy;
      const resolvedBySelf = resolvedBy === currentUserId;
      const resolvedByPartner = resolvedBy && !resolvedBySelf;
      const playerName = getPlayerName(item);

      return (
        <View
          style={[styles.mismatchRow, { borderColor: colors.border }]}
          accessibilityRole="none"
          accessibilityLabel={`Hole ${item.hole_number} score mismatch${playerName ? ` for ${playerName}` : ''}`}
        >
          {/* Hole info */}
          <View style={styles.mismatchHeader}>
            <View style={[styles.holeBadge, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.holeBadgeText, { color: colors.warning }]}>
                {item.hole_number}
              </Text>
            </View>
            <View style={styles.holeInfo}>
              <Text style={[styles.holeLabel, { color: colors.textPrimary }]}>
                Hole {item.hole_number}
              </Text>
              {playerName ? (
                <Text style={[styles.playerName, { color: colors.textSecondary }]}>
                  {playerName}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Resolution buttons or status */}
          {isResolved ? (
            <View
              style={[styles.resolvedContainer, { backgroundColor: colors.success + '15' }]}
            >
              <Icon source="check-circle" size={20} color={colors.success} />
              <Text style={[styles.resolvedText, { color: colors.success }]}>
                Resolved: {resolvedScore}
                {resolvedByPartner ? ` by ${partnerName}` : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              {/* Your score button */}
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  styles.scoreButtonPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => handleResolve(item, item.self_score)}
                disabled={!isOnline || isCurrentlyResolving || !!resolvingId}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Accept your score of ${item.self_score}`}
                accessibilityState={{ disabled: !isOnline || isCurrentlyResolving }}
              >
                {isCurrentlyResolving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Text style={[styles.scoreButtonLabel, { color: colors.white }]}>
                      Your Score
                    </Text>
                    <Text style={[styles.scoreValue, { color: colors.white }]}>
                      {item.self_score}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Partner's score button */}
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  styles.scoreButtonOutline,
                  { borderColor: colors.primary },
                ]}
                onPress={() => handleResolve(item, item.partner_score)}
                disabled={!isOnline || isCurrentlyResolving || !!resolvingId}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Accept ${partnerName}'s score of ${item.partner_score}`}
                accessibilityState={{ disabled: !isOnline || isCurrentlyResolving }}
              >
                <Text style={[styles.scoreButtonLabel, { color: colors.primary }]}>
                  {partnerName}
                </Text>
                <Text style={[styles.scoreValue, { color: colors.primary }]}>
                  {item.partner_score}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [
      colors,
      resolvingId,
      currentUserId,
      partnerName,
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
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalTitleContainer}>
              <View
                style={[styles.warningIconContainer, { backgroundColor: colors.warning + '20' }]}
              >
                <Icon source="alert-circle" size={24} color={colors.warning} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Resolve Score Differences
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  You and {partnerName} recorded different scores
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.gray200 }]}
              onPress={handleClose}
              disabled={!allResolved}
              activeOpacity={0.7}
              accessibilityLabel="Close"
              accessibilityRole="button"
              accessibilityState={{ disabled: !allResolved }}
            >
              <Icon
                source="close"
                size={20}
                color={allResolved ? colors.textPrimary : colors.textDisabled}
              />
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
            <View style={styles.progressContent}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {resolvedCount} of {totalCount} resolved
              </Text>
              {allResolved && (
                <View style={styles.allResolvedBadge}>
                  <Icon source="check" size={14} color={colors.success} />
                  <Text style={[styles.allResolvedText, { color: colors.success }]}>
                    All done!
                  </Text>
                </View>
              )}
            </View>
            {/* Progress bar visual */}
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: allResolved ? colors.success : colors.primary,
                    width: totalCount > 0 ? `${(resolvedCount / totalCount) * 100}%` : '0%',
                  },
                ]}
              />
            </View>
          </View>

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
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.doneButton,
                {
                  backgroundColor: allResolved ? colors.primary : colors.surfaceVariant,
                },
              ]}
              onPress={handleClose}
              disabled={!allResolved}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Done"
              accessibilityState={{ disabled: !allResolved }}
            >
              {isResolving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text
                  style={[
                    styles.doneButtonText,
                    { color: allResolved ? colors.white : colors.textDisabled },
                  ]}
                >
                  Done
                </Text>
              )}
            </TouchableOpacity>
            {!allResolved && (
              <Text style={[styles.footerHint, { color: colors.textSecondary }]}>
                Resolve all differences to continue
              </Text>
            )}
          </View>
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

  // Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  warningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h4,
  },
  modalSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Progress
  progressBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  progressContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressText: {
    ...typography.small,
  },
  allResolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  allResolvedText: {
    ...typography.smallBold,
  },
  progressTrack: {
    height: 4,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
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

  // Mismatch Row
  mismatchRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  mismatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  holeBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeBadgeText: {
    ...typography.h4,
    fontWeight: '700',
  },
  holeInfo: {
    flex: 1,
  },
  holeLabel: {
    ...typography.bodyBold,
  },
  playerName: {
    ...typography.small,
    marginTop: 2,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 64,
  },
  scoreButtonPrimary: {
    // Background set dynamically
  },
  scoreButtonOutline: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  scoreButtonLabel: {
    ...typography.small,
    marginBottom: 2,
  },
  scoreValue: {
    ...typography.h3,
    fontWeight: '700',
  },

  // Resolved state
  resolvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  resolvedText: {
    ...typography.body,
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

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  doneButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  doneButtonText: {
    ...typography.bodyBold,
  },
  footerHint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default MismatchResolutionModal;
