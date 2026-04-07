/**
 * FriendSelector - Unified friend selection component
 *
 * Used across round creation (PartnersStep) and competition creation (AddPlayersStep).
 * Features:
 * - Selected players displayed as rounded pill chips
 * - Optional limit indicator with progress bar
 * - Search/filter friends and placeholder players
 * - Loading and empty states
 * - Placeholder (guest) players support with "Add Guest" button
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { SelectedPlayersSection } from './SelectedPlayersSection';
import { SearchRow } from './SearchRow';
import { PlayerListContent } from './PlayerListContent';
import type { FriendSelectorProps, SelectedPlayer } from './FriendSelector.types';
import type { Friend, PlaceholderPlayerWithStats } from '@/types/database.types';

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
  showPendingBadge = false,
  onAddFriendPress,
  addFriendLabel = 'Add Friend',
  testID,
  // Placeholder player props
  placeholderPlayers,
  onAddPlaceholderPress,
  addPlaceholderLabel = 'Add Guest',
  disableInternalScroll = false,
  // Daily handicap props
  selectedTee,
  coursePar,
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

  // Filter placeholder players by search query
  const filteredPlaceholders = useMemo(() => {
    if (!placeholderPlayers || placeholderPlayers.length === 0) return [];
    if (!searchQuery.trim()) return placeholderPlayers;
    const query = searchQuery.toLowerCase();
    return placeholderPlayers.filter((placeholder) =>
      placeholder.name.toLowerCase().includes(query)
    );
  }, [placeholderPlayers, searchQuery]);

  // Check if a placeholder is selected
  const isPlaceholderSelected = useCallback(
    (placeholderId: string) => selectedPlayers.some((p) => p.id === placeholderId),
    [selectedPlayers]
  );

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

  // Handle placeholder toggle
  const handlePlaceholderToggle = useCallback(
    (placeholder: PlaceholderPlayerWithStats) => {
      const alreadySelected = selectedPlayers.some((p) => p.id === placeholder.id);

      if (alreadySelected) {
        onSelectionChange(selectedPlayers.filter((p) => p.id !== placeholder.id));
      } else {
        // Don't add if at limit
        if (isAtLimit) return;

        const newPlayer: SelectedPlayer = {
          id: placeholder.id,
          name: placeholder.name,
          email: placeholder.email,
          handicap: placeholder.handicap,
          is_placeholder: true,
        };
        onSelectionChange([...selectedPlayers, newPlayer]);
      }
    },
    [selectedPlayers, onSelectionChange, isAtLimit]
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

  // Shared list content props
  const listContentProps = {
    friendsLoading,
    filteredFriends,
    filteredPlaceholders,
    isSelected,
    isPlaceholderSelected,
    isAtLimit,
    onFriendToggle: handleToggle,
    onPlaceholderToggle: handlePlaceholderToggle,
    showPendingBadge,
    searchQuery,
    emptyMessage,
    emptySearchMessage,
    onAddFriendPress,
    addFriendLabel,
    selectedTee,
    coursePar,
  };

  return (
    <View style={disableInternalScroll ? styles.containerNoScroll : styles.container} testID={testID}>
      {/* Selected Players Section */}
      <SelectedPlayersSection
        selectedPlayers={selectedPlayers}
        selectedTitle={selectedTitle}
        showReadyBadge={showReadyBadge}
        meetsMinimum={meetsMinimum}
        isAtLimit={isAtLimit}
        isApproachingLimit={isApproachingLimit}
        effectiveMax={effectiveMax}
        limitIndicator={limitIndicator}
        currentUser={currentUser}
        onRemove={handleRemove}
      />

      {/* Search Bar with Add Friend / Add Guest Buttons */}
      <SearchRow
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        hasPlaceholders={!!placeholderPlayers}
        onAddPlaceholderPress={onAddPlaceholderPress}
        addPlaceholderLabel={addPlaceholderLabel}
        onAddFriendPress={onAddFriendPress}
        addFriendLabel={addFriendLabel}
      />

      {/* Players List - Guests section followed by Friends section */}
      <View style={disableInternalScroll ? styles.listSectionNoScroll : styles.listSection}>
        {listTitle && (
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {listTitle}
          </Text>
        )}

        {disableInternalScroll ? (
          // Render list content directly without ScrollView when parent handles scrolling
          <View style={styles.listScrollContent}>
            <PlayerListContent {...listContentProps} />
          </View>
        ) : (
          // Default: render with internal ScrollView
          <ScrollView
            style={styles.listScrollView}
            contentContainerStyle={styles.listScrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <PlayerListContent {...listContentProps} />
          </ScrollView>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerNoScroll: {
    // When parent handles scrolling, don't use flex: 1
  },
  listSection: {
    flex: 1,
    marginTop: spacing.md,
  },
  listSectionNoScroll: {
    marginTop: spacing.md,
  },
  listScrollView: {
    flex: 1,
  },
  listScrollContent: {
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
});
