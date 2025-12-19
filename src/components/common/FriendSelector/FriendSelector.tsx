/**
 * FriendSelector - Unified friend selection component
 *
 * Used across round creation (PartnersStep) and competition creation (AddPlayersStep).
 * Features:
 * - Selected players displayed as rounded pill chips
 * - Optional limit indicator with progress bar
 * - Search/filter friends
 * - Loading and empty states
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Icon } from 'react-native-paper';
import { IconUsers } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { SearchBar } from '@/components/common/SearchBar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LimitIndicator } from '@/components/subscription/LimitIndicator';
import { SelectedPlayerChip } from './SelectedPlayerChip';
import { FriendListItem } from './FriendListItem';
import type { FriendSelectorProps, SelectedPlayer } from './FriendSelector.types';
import type { Friend } from '@/types/database.types';

export const FriendSelector = memo(function FriendSelector({
  selectedPlayers,
  onSelectionChange,
  friends,
  friendsLoading = false,
  searchQuery,
  onSearchQueryChange,
  limits,
  limitIndicator,
  currentUser,
  emptyMessage = 'No friends yet',
  emptySearchMessage = 'No friends found',
  listTitle,
  selectedTitle = 'SELECTED',
  showReadyBadge = false,
  testID,
}: FriendSelectorProps) {
  const colors = useThemeColors();

  // Calculate effective max (default to Infinity if no limit)
  const effectiveMax = limits?.max ?? Infinity;
  const effectiveMin = limits?.min ?? 0;
  const warningThreshold = limitIndicator?.warningThreshold ?? 0.8;

  // Filter friends by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.toLowerCase();
    return friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  // Check if a friend is selected
  const isSelected = useCallback(
    (friendId: string) => selectedPlayers.some((p) => p.id === friendId),
    [selectedPlayers]
  );

  // Check if selection is at limit
  const isAtLimit = selectedPlayers.length >= effectiveMax;
  const isApproachingLimit =
    effectiveMax !== Infinity &&
    selectedPlayers.length >= effectiveMax * warningThreshold &&
    selectedPlayers.length < effectiveMax;

  // Check if minimum requirement is met
  const meetsMinimum = selectedPlayers.length >= effectiveMin;

  // Handle friend toggle
  const handleToggle = useCallback(
    (friend: Friend) => {
      const alreadySelected = selectedPlayers.some((p) => p.id === friend.id);

      if (alreadySelected) {
        // Don't allow removing current user if includeCurrentUser is set
        if (limits?.includeCurrentUser && friend.id === currentUser?.id) {
          return;
        }
        onSelectionChange(selectedPlayers.filter((p) => p.id !== friend.id));
      } else {
        // Don't add if at limit
        if (isAtLimit) return;

        const newPlayer: SelectedPlayer = {
          id: friend.id,
          name: friend.name,
          email: friend.email,
          handicap: friend.handicap,
          photo_url: friend.photo_url,
        };
        onSelectionChange([...selectedPlayers, newPlayer]);
      }
    },
    [selectedPlayers, onSelectionChange, limits?.includeCurrentUser, currentUser?.id, isAtLimit]
  );

  // Handle chip removal
  const handleRemove = useCallback(
    (playerId: string) => {
      // Don't allow removing current user if includeCurrentUser is set
      if (limits?.includeCurrentUser && playerId === currentUser?.id) {
        return;
      }
      onSelectionChange(selectedPlayers.filter((p) => p.id !== playerId));
    },
    [selectedPlayers, onSelectionChange, limits?.includeCurrentUser, currentUser?.id]
  );

  return (
    <View style={styles.container} testID={testID}>
      {/* Selected Players Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {selectedTitle}
          </Text>
          {showReadyBadge && meetsMinimum && !isAtLimit && (
            <View style={[styles.readyBadge, { backgroundColor: colors.successLight }]}>
              <Icon source="check-circle" size={16} color={colors.success} />
              <Text style={[styles.readyText, { color: colors.success }]}>Ready</Text>
            </View>
          )}
        </View>

        {/* Limit Indicator */}
        {limitIndicator?.show && effectiveMax !== Infinity && (
          <View style={styles.limitIndicatorContainer}>
            <LimitIndicator
              current={selectedPlayers.length}
              max={effectiveMax}
              label={limitIndicator.label || 'Selected'}
              showBar={limitIndicator.showBar}
            />
          </View>
        )}

        {/* Warning when approaching limit */}
        {isApproachingLimit && (
          <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
            <Icon source="alert-circle-outline" size={18} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              Approaching limit ({selectedPlayers.length}/{effectiveMax})
            </Text>
          </View>
        )}

        {/* Warning at limit */}
        {isAtLimit && effectiveMax !== Infinity && (
          <View style={[styles.warningBox, { backgroundColor: colors.errorLight }]}>
            <Icon source="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.warningText, { color: colors.error }]}>
              Limit reached. Upgrade to add more.
            </Text>
          </View>
        )}

        {/* Selected Players Chips */}
        <View style={[styles.selectedContainer, { backgroundColor: colors.surface }]}>
          {selectedPlayers.length === 0 ? (
            <Text style={[styles.emptySelection, { color: colors.textSecondary }]}>
              No players selected yet
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedScroll}
            >
              {selectedPlayers.map((player) => (
                <SelectedPlayerChip
                  key={player.id}
                  player={player}
                  isCurrentUser={currentUser?.id === player.id}
                  onRemove={() => handleRemove(player.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={onSearchQueryChange}
        placeholder="Search friends..."
        accessibilityLabel="Search friends"
        containerStyle={styles.searchContainer}
      />

      {/* Friends List */}
      <View style={styles.section}>
        {listTitle && (
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {listTitle}
          </Text>
        )}

        {friendsLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="lg" />
          </View>
        ) : filteredFriends.length > 0 ? (
          <View style={[styles.friendsContainer, { backgroundColor: colors.surface }]}>
            {filteredFriends.map((friend, index) => {
              const selected = isSelected(friend.id);
              const disabled = !selected && isAtLimit;

              return (
                <FriendListItem
                  key={friend.id}
                  friend={friend}
                  isSelected={selected}
                  isDisabled={disabled}
                  onToggle={() => handleToggle(friend)}
                  showDivider={index < filteredFriends.length - 1}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <IconUsers size={48} color={colors.gray300} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {searchQuery ? emptySearchMessage : emptyMessage}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery
                ? `No friends match "${searchQuery}"`
                : 'Add friends from the Friends tab'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.lg,
  },
  readyText: {
    ...typography.captionBold,
  },
  limitIndicatorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.small,
    flex: 1,
  },
  selectedContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  emptySelection: {
    ...typography.body,
    textAlign: 'center',
  },
  selectedScroll: {
    gap: spacing.sm,
  },
  searchContainer: {
    marginTop: spacing.md,
  },
  friendsContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.bodyBold,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
