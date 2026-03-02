/**
 * PairingsSection - Display and manage player groupings for a round
 *
 * Features:
 * - View player groups with tee times
 * - Auto-generate pairings using snake draft
 * - Edit groups manually
 * - Delete and regenerate
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  TeeTimeConfigCard,
  PlayerGroupCard,
  PlayerSelectionBottomSheet,
  AutoGeneratePreviewModal,
} from '@/components/pairings';
import {
  usePairings,
  useAutoGeneratePairings,
  useReplacePairings,
  useDeleteAllPairings,
} from '@/hooks/usePairings';
import {
  generateSnakeDraftPairings,
  addPlayerToGroup,
  removePlayerFromGroups,
  recalculateTeeTimes,
} from '@/utils';
import type {
  PairingGroup,
  PairingPlayer,
  TeeTimeSlotConfig,
  GeneratePairingsResult,
} from '@/types';
import { DEFAULT_TEE_TIME_CONFIG, toPairingPlayer } from '@/types';
import type { Player } from '@/types';

export interface PairingsSectionProps {
  /**
   * Round ID for fetching/saving pairings
   */
  roundId: string;
  /**
   * Competition players available for grouping
   */
  players: Player[];
  /**
   * Round's default tee time (if set)
   */
  defaultTeeTime?: string | null;
  /**
   * Whether the current user can edit pairings
   */
  canEdit?: boolean;
  /**
   * Callback when pairings are successfully saved
   */
  onSaved?: () => void;
}

export const PairingsSection = React.memo(function PairingsSection({
  roundId,
  players,
  defaultTeeTime,
  canEdit = false,
  onSaved,
}: PairingsSectionProps) {
  const colors = useThemeColors();

  // State
  const [teeTimeConfig, setTeeTimeConfig] = useState<TeeTimeSlotConfig>(() => ({
    ...DEFAULT_TEE_TIME_CONFIG,
    startTime: defaultTeeTime?.substring(0, 5) || DEFAULT_TEE_TIME_CONFIG.startTime,
  }));
  const [pendingGroups, setPendingGroups] = useState<PairingGroup[] | null>(null);
  const [previewGroups, setPreviewGroups] = useState<PairingGroup[]>([]);
  const [previewResult, setPreviewResult] = useState<GeneratePairingsResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  // Queries and mutations
  const { data: existingPairings, isLoading, refetch } = usePairings(roundId);
  const { mutate: _autoGenerate, isPending: isGenerating } = useAutoGeneratePairings();
  const { mutate: replacePairings, isPending: isSaving } = useReplacePairings();
  const { mutate: deleteAll, isPending: isDeleting } = useDeleteAllPairings();

  // Convert players to PairingPlayer format
  const pairingPlayers = useMemo(
    () => players.map((p) => toPairingPlayer(p)),
    [players]
  );

  // Create player lookup map
  const playerLookup = useMemo(() => {
    const map = new Map<string, PairingPlayer>();
    pairingPlayers.forEach((p) => map.set(p.id, p));
    return map;
  }, [pairingPlayers]);

  // Get assigned player IDs from current groups
  const assignedPlayerIds = useMemo(() => {
    const groups = pendingGroups || existingPairings?.map((p) => ({
      id: p.id,
      playerIds: p.playerIds,
      teeTime: p.teeTime,
      slotIndex: p.slotIndex,
    })) || [];
    const ids = new Set<string>();
    groups.forEach((g) => g.playerIds.forEach((id) => ids.add(id)));
    return ids;
  }, [pendingGroups, existingPairings]);

  // Check if we have unsaved changes
  const hasChanges = pendingGroups !== null;
  const isProcessing = isGenerating || isSaving || isDeleting;

  // Handle auto-generate
  const handleAutoGenerate = useCallback(() => {
    const result = generateSnakeDraftPairings({
      players: pairingPlayers,
      groupSize: 4,
      startTime: teeTimeConfig.startTime,
      intervalMinutes: teeTimeConfig.intervalMinutes,
    });

    setPreviewGroups(result.groups);
    setPreviewResult(result);
    setShowPreview(true);
  }, [pairingPlayers, teeTimeConfig]);

  // Handle regenerate in preview
  const handleRegenerate = useCallback(() => {
    const result = generateSnakeDraftPairings({
      players: pairingPlayers,
      groupSize: 4,
      startTime: teeTimeConfig.startTime,
      intervalMinutes: teeTimeConfig.intervalMinutes,
    });

    setPreviewGroups(result.groups);
    setPreviewResult(result);
  }, [pairingPlayers, teeTimeConfig]);

  // Handle confirm preview
  const handleConfirmPreview = useCallback(() => {
    setShowPreview(false);
    setPendingGroups(previewGroups);
  }, [previewGroups]);

  // Handle edit manually from preview
  const handleEditManually = useCallback(() => {
    setShowPreview(false);
    setPendingGroups(previewGroups);
  }, [previewGroups]);

  // Handle tee time config change
  const handleTeeTimeConfigChange = useCallback((config: TeeTimeSlotConfig) => {
    setTeeTimeConfig(config);
    if (pendingGroups) {
      const updated = recalculateTeeTimes(
        pendingGroups,
        config.startTime,
        config.intervalMinutes
      );
      setPendingGroups(updated);
    }
  }, [pendingGroups]);

  // Handle add player to group
  const handleAddPlayerToGroup = useCallback((groupIndex: number) => {
    setSelectedGroupIndex(groupIndex);
    setShowPlayerSelection(true);
  }, []);

  // Handle player selection
  const handlePlayersSelected = useCallback((playerIds: string[]) => {
    if (selectedGroupIndex === null) return;

    const currentGroups = pendingGroups || existingPairings?.map((p) => ({
      id: p.id,
      playerIds: p.playerIds,
      teeTime: p.teeTime,
      slotIndex: p.slotIndex,
    })) || [];

    let updatedGroups = [...currentGroups];
    playerIds.forEach((playerId) => {
      updatedGroups = addPlayerToGroup(updatedGroups, playerId, selectedGroupIndex);
    });

    setPendingGroups(updatedGroups);
    setShowPlayerSelection(false);
    setSelectedGroupIndex(null);
  }, [selectedGroupIndex, pendingGroups, existingPairings]);

  // Handle remove player from group
  const handleRemovePlayer = useCallback((playerId: string) => {
    const currentGroups = pendingGroups || existingPairings?.map((p) => ({
      id: p.id,
      playerIds: p.playerIds,
      teeTime: p.teeTime,
      slotIndex: p.slotIndex,
    })) || [];

    const updatedGroups = removePlayerFromGroups(currentGroups, playerId);
    setPendingGroups(updatedGroups);
  }, [pendingGroups, existingPairings]);

  // Handle save changes
  const handleSave = useCallback(() => {
    if (!pendingGroups || pendingGroups.length === 0) return;

    // Validate all groups have at least 2 players
    const invalidGroups = pendingGroups.filter((g) => g.playerIds.length < 2);
    if (invalidGroups.length > 0) {
      Alert.alert(
        'Invalid Groups',
        'All groups must have at least 2 players. Please add more players or remove empty groups.'
      );
      return;
    }

    replacePairings(
      { roundId, groups: pendingGroups },
      {
        onSuccess: () => {
          setPendingGroups(null);
          refetch();
          onSaved?.();
        },
        onError: (error) => {
          Alert.alert('Error', error.message || 'Failed to save groups');
        },
      }
    );
  }, [pendingGroups, roundId, replacePairings, refetch, onSaved]);

  // Handle cancel changes
  const handleCancel = useCallback(() => {
    setPendingGroups(null);
  }, []);

  // Handle delete all pairings
  const handleDeleteAll = useCallback(() => {
    setShowDeleteAllDialog(true);
  }, []);

  const confirmDeleteAll = useCallback(() => {
    setShowDeleteAllDialog(false);
    deleteAll(
      { roundId },
      {
        onSuccess: () => {
          setPendingGroups(null);
          refetch();
        },
        onError: (error) => {
          Alert.alert('Error', error.message || 'Failed to delete groups');
        },
      }
    );
  }, [roundId, deleteAll, refetch]);

  // Get display groups (pending or existing)
  const displayGroups = useMemo(() => {
    if (pendingGroups) return pendingGroups;
    return existingPairings?.map((p) => ({
      id: p.id,
      playerIds: p.playerIds,
      teeTime: p.teeTime,
      slotIndex: p.slotIndex,
    })) || [];
  }, [pendingGroups, existingPairings]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <LoadingSpinner size="lg" />
      </View>
    );
  }

  // Empty state with auto-generate option
  if (displayGroups.length === 0 && !hasChanges) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Icon source="account-group" size={24} color={colors.primary} />
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>
            Player Groups
          </Text>
        </View>

        <View style={styles.emptyState}>
          <Icon
            source="account-multiple-plus-outline"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No groups assigned
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {players.length < 2
              ? 'Add at least 2 players to the competition to create groups'
              : 'Create player groups with tee times for this round'}
          </Text>

          {canEdit && players.length >= 2 && (
            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: colors.primary }]}
              onPress={handleAutoGenerate}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Icon source="auto-fix" size={20} color={colors.white} />
              <Text style={[styles.generateButtonText, { color: colors.white }]}>
                Auto-Generate Groups
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Preview Modal */}
        <AutoGeneratePreviewModal
          visible={showPreview}
          onClose={() => setShowPreview(false)}
          groups={previewGroups}
          result={previewResult}
          playerLookup={playerLookup}
          onRegenerate={handleRegenerate}
          onConfirm={handleConfirmPreview}
          onEditManually={handleEditManually}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Icon source="account-group" size={24} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>
          Player Groups
        </Text>
        {hasChanges && (
          <View
            style={[styles.unsavedBadge, { backgroundColor: colors.warningBackground }]}
          >
            <Text style={[styles.unsavedText, { color: colors.warning }]}>
              Unsaved
            </Text>
          </View>
        )}
      </View>

      {/* Tee Time Config (when editing) */}
      {canEdit && hasChanges && (
        <View style={styles.configSection}>
          <TeeTimeConfigCard
            config={teeTimeConfig}
            onChange={handleTeeTimeConfigChange}
            playerCount={players.length}
            disabled={isProcessing}
          />
        </View>
      )}

      {/* Groups */}
      <View style={styles.groupsContainer}>
        {displayGroups.map((group, index) => {
          const groupPlayers = group.playerIds
            .map((id) => playerLookup.get(id))
            .filter(Boolean) as PairingPlayer[];

          return (
            <PlayerGroupCard
              key={group.id || `group-${index}`}
              groupNumber={index + 1}
              teeTime={group.teeTime}
              players={groupPlayers}
              editable={canEdit && hasChanges}
              onAddPlayer={() => handleAddPlayerToGroup(index)}
              onRemovePlayer={handleRemovePlayer}
            />
          );
        })}
      </View>

      {/* Actions */}
      {canEdit && (
        <View style={styles.actions}>
          {hasChanges ? (
            // Save/Cancel when editing
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleCancel}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: isProcessing ? colors.gray300 : colors.primary },
                ]}
                onPress={handleSave}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Icon source="check" size={20} color={colors.white} />
                    <Text style={[styles.saveButtonText, { color: colors.white }]}>
                      Save Groups
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Regenerate/Delete when viewing
            <View style={styles.viewActions}>
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.border }]}
                onPress={handleAutoGenerate}
                disabled={isProcessing || players.length < 2}
                activeOpacity={0.7}
              >
                <Icon source="refresh" size={18} color={colors.textSecondary} />
                <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                  Regenerate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.error }]}
                onPress={handleDeleteAll}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <Icon source="delete-outline" size={18} color={colors.error} />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>
                  Delete All
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Player Selection Bottom Sheet */}
      <PlayerSelectionBottomSheet
        visible={showPlayerSelection}
        onClose={() => {
          setShowPlayerSelection(false);
          setSelectedGroupIndex(null);
        }}
        players={pairingPlayers}
        assignedPlayerIds={assignedPlayerIds}
        onSelectPlayers={handlePlayersSelected}
        maxSelect={4 - (selectedGroupIndex !== null && displayGroups[selectedGroupIndex]
          ? displayGroups[selectedGroupIndex].playerIds.length
          : 0)}
        title={`Add to Group ${selectedGroupIndex !== null ? selectedGroupIndex + 1 : ''}`}
      />

      {/* Preview Modal */}
      <AutoGeneratePreviewModal
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        groups={previewGroups}
        result={previewResult}
        playerLookup={playerLookup}
        onRegenerate={handleRegenerate}
        onConfirm={handleConfirmPreview}
        onEditManually={handleEditManually}
        regenerating={isGenerating}
      />

      <ConfirmationDialog
        visible={showDeleteAllDialog}
        title="Delete All Groups"
        message="Are you sure you want to remove all player groups?"
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteAllDialog(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    ...typography.h4,
    flex: 1,
  },
  unsavedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  unsavedText: {
    ...typography.caption,
    fontWeight: '600',
  },
  configSection: {
    marginBottom: spacing.md,
  },
  groupsContainer: {
    gap: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  generateButtonText: {
    ...typography.bodyBold,
  },
  actions: {
    marginTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  viewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveButtonText: {
    ...typography.bodyBold,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionButtonText: {
    ...typography.body,
    fontWeight: '500',
    fontSize: 14,
  },
});

export default PairingsSection;
