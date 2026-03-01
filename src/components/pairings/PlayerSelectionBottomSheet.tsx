/**
 * PlayerSelectionBottomSheet - Select players to add to a group
 *
 * Features:
 * - Searchable player list
 * - Shows name, handicap, avatar
 * - Already-assigned players are dimmed
 * - Multi-select support
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { BottomSheet } from '@/components/common';
import { PlayerAvatar } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { PairingPlayer } from '@/types';

export interface PlayerSelectionBottomSheetProps {
  /**
   * Whether the bottom sheet is visible
   */
  visible: boolean;
  /**
   * Callback to close the bottom sheet
   */
  onClose: () => void;
  /**
   * All available players
   */
  players: PairingPlayer[];
  /**
   * Player IDs that are already assigned to groups
   */
  assignedPlayerIds: Set<string>;
  /**
   * Callback when players are selected
   */
  onSelectPlayers: (playerIds: string[]) => void;
  /**
   * Maximum players that can be selected
   */
  maxSelect?: number;
  /**
   * Title for the bottom sheet
   */
  title?: string;
  /**
   * Whether to show loading state
   */
  loading?: boolean;
}

export const PlayerSelectionBottomSheet = React.memo(
  function PlayerSelectionBottomSheet({
    visible,
    onClose,
    players,
    assignedPlayerIds,
    onSelectPlayers,
    maxSelect = 4,
    title = 'Select Players',
    loading = false,
  }: PlayerSelectionBottomSheetProps) {
    const colors = useThemeColors();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filter players by search query
    const filteredPlayers = useMemo(() => {
      if (!searchQuery.trim()) return players;
      const query = searchQuery.toLowerCase();
      return players.filter((player) =>
        player.name.toLowerCase().includes(query)
      );
    }, [players, searchQuery]);

    // Separate available and unavailable players
    const { availablePlayers, unavailablePlayers } = useMemo(() => {
      const available: PairingPlayer[] = [];
      const unavailable: PairingPlayer[] = [];
      filteredPlayers.forEach((player) => {
        if (assignedPlayerIds.has(player.id)) {
          unavailable.push(player);
        } else {
          available.push(player);
        }
      });
      return { availablePlayers: available, unavailablePlayers: unavailable };
    }, [filteredPlayers, assignedPlayerIds]);

    const handleTogglePlayer = useCallback(
      (playerId: string) => {
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(playerId)) {
            newSet.delete(playerId);
          } else if (newSet.size < maxSelect) {
            newSet.add(playerId);
          }
          return newSet;
        });
      },
      [maxSelect]
    );

    const handleConfirm = useCallback(() => {
      onSelectPlayers(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSearchQuery('');
      onClose();
    }, [selectedIds, onSelectPlayers, onClose]);

    const handleClose = useCallback(() => {
      setSelectedIds(new Set());
      setSearchQuery('');
      onClose();
    }, [onClose]);

    const renderPlayerItem = useCallback(
      ({ item: player }: { item: PairingPlayer }) => {
        const isAssigned = assignedPlayerIds.has(player.id);
        const isSelected = selectedIds.has(player.id);
        const canSelect = !isAssigned && (isSelected || selectedIds.size < maxSelect);

        return (
          <TouchableOpacity
            style={[
              styles.playerItem,
              { borderBottomColor: colors.border },
              isAssigned && styles.playerItemDisabled,
              isSelected && { backgroundColor: colors.primaryBackground },
            ]}
            onPress={() => !isAssigned && handleTogglePlayer(player.id)}
            disabled={isAssigned || (!isSelected && !canSelect)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: isSelected,
              disabled: isAssigned,
            }}
            accessibilityLabel={`${player.name}${isAssigned ? ' (already assigned)' : ''}`}
          >
            <PlayerAvatar
              photoUrl={player.photoUrl}
              name={player.name}
              size={44}
            />
            <View style={[styles.playerInfo, isAssigned && { opacity: 0.5 }]}>
              <Text
                style={[styles.playerName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {player.name}
              </Text>
              <View style={styles.playerMeta}>
                {player.handicap !== null && player.handicap !== undefined && (
                  <View
                    style={[
                      styles.handicapBadge,
                      { backgroundColor: colors.primaryBackground },
                    ]}
                  >
                    <Text
                      style={[styles.handicapText, { color: colors.primary }]}
                    >
                      HC: {player.handicap}
                    </Text>
                  </View>
                )}
                {isAssigned && (
                  <Text
                    style={[styles.assignedText, { color: colors.textSecondary }]}
                  >
                    Already in a group
                  </Text>
                )}
              </View>
            </View>
            {!isAssigned && (
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                  },
                ]}
              >
                {isSelected && (
                  <Icon source="check" size={16} color={colors.white} />
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      },
      [colors, assignedPlayerIds, selectedIds, maxSelect, handleTogglePlayer]
    );

    const ListHeader = useMemo(
      () => (
        <View style={styles.listHeader}>
          {availablePlayers.length > 0 && (
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Available Players ({availablePlayers.length})
            </Text>
          )}
        </View>
      ),
      [availablePlayers.length, colors.textSecondary]
    );

    const ListFooter = useMemo(
      () =>
        unavailablePlayers.length > 0 ? (
          <View style={styles.listFooter}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Already Assigned ({unavailablePlayers.length})
            </Text>
            {unavailablePlayers.map((player) => (
              <View
                key={player.id}
                style={[
                  styles.playerItem,
                  styles.playerItemDisabled,
                  { borderBottomColor: colors.border },
                ]}
              >
                <PlayerAvatar
                  photoUrl={player.photoUrl}
                  name={player.name}
                  size={44}
                />
                <View style={[styles.playerInfo, { opacity: 0.5 }]}>
                  <Text
                    style={[styles.playerName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null,
      [unavailablePlayers, colors]
    );

    const EmptyState = useMemo(
      () => (
        <View style={styles.emptyState}>
          <Icon
            source="account-search-outline"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery
              ? 'No players match your search'
              : 'No players available'}
          </Text>
        </View>
      ),
      [searchQuery, colors.textSecondary]
    );

    return (
      <BottomSheet
        visible={visible}
        onClose={handleClose}
        height={0.75}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Icon source="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon source="magnify" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search players..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon source="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Selection Count */}
          {selectedIds.size > 0 && (
            <View
              style={[
                styles.selectionBanner,
                { backgroundColor: colors.primaryBackground },
              ]}
            >
              <Text style={[styles.selectionText, { color: colors.primary }]}>
                {selectedIds.size} player{selectedIds.size !== 1 ? 's' : ''} selected
                {maxSelect < Infinity && ` (max ${maxSelect})`}
              </Text>
            </View>
          )}

          {/* Player List */}
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading players...
              </Text>
            </View>
          ) : (
            <FlatList
              data={availablePlayers}
              renderItem={renderPlayerItem}
              keyExtractor={(player) => player.id}
              ListHeaderComponent={availablePlayers.length > 0 ? ListHeader : null}
              ListFooterComponent={ListFooter}
              ListEmptyComponent={EmptyState}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Confirm Button */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor:
                    selectedIds.size > 0 ? colors.primary : colors.border,
                },
              ]}
              onPress={handleConfirm}
              disabled={selectedIds.size === 0}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Add ${selectedIds.size} player${selectedIds.size !== 1 ? 's' : ''}`}
            >
              <Icon
                source="check"
                size={20}
                color={selectedIds.size > 0 ? colors.white : colors.textSecondary}
              />
              <Text
                style={[
                  styles.confirmButtonText,
                  {
                    color:
                      selectedIds.size > 0 ? colors.white : colors.textSecondary,
                  },
                ]}
              >
                Add {selectedIds.size > 0 ? selectedIds.size : ''} Player
                {selectedIds.size !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    padding: 0,
  },
  selectionBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  selectionText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listFooter: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playerItemDisabled: {
    opacity: 0.6,
  },
  playerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  playerName: {
    ...typography.body,
    fontWeight: '500',
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  handicapBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  handicapText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  assignedText: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    ...shadows.sm,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  confirmButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});

export default PlayerSelectionBottomSheet;
