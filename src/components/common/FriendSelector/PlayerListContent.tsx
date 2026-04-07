/**
 * PlayerListContent - Renders the guests and friends list sections
 *
 * Displays filtered guest players and friends with their respective section
 * headers, handling loading and empty states. Used by both the ScrollView
 * and flat rendering modes of FriendSelector.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { FriendListItem } from './FriendListItem';
import { PlaceholderListItem } from './PlaceholderListItem';
import { EmptyState } from './EmptyState';
import type { Friend, PlaceholderPlayerWithStats, TeeBox } from '@/types/database.types';

// ============================================================================
// TYPES
// ============================================================================

export interface PlayerListContentProps {
  /** Whether friends are loading */
  friendsLoading: boolean;
  /** Filtered friends to display */
  filteredFriends: Friend[];
  /** Filtered placeholder players to display */
  filteredPlaceholders: PlaceholderPlayerWithStats[];
  /** Check if a friend is selected */
  isSelected: (friendId: string) => boolean;
  /** Check if a placeholder is selected */
  isPlaceholderSelected: (placeholderId: string) => boolean;
  /** Whether selection is at limit */
  isAtLimit: boolean;
  /** Toggle a friend selection */
  onFriendToggle: (friend: Friend) => void;
  /** Toggle a placeholder selection */
  onPlaceholderToggle: (placeholder: PlaceholderPlayerWithStats) => void;
  /** Whether to show "Pending" badge */
  showPendingBadge: boolean;
  /** Current search query */
  searchQuery: string;
  /** Empty state message when no friends */
  emptyMessage: string;
  /** Empty state message when search returns no results */
  emptySearchMessage: string;
  /** Callback when "Add Friend" button is pressed */
  onAddFriendPress?: () => void;
  /** Label for add friend button */
  addFriendLabel: string;
  /** Selected tee for daily handicap calculation */
  selectedTee?: TeeBox | null;
  /** Course par for daily handicap calculation */
  coursePar?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PlayerListContent = React.memo(function PlayerListContent({
  friendsLoading,
  filteredFriends,
  filteredPlaceholders,
  isSelected,
  isPlaceholderSelected,
  isAtLimit,
  onFriendToggle,
  onPlaceholderToggle,
  showPendingBadge,
  searchQuery,
  emptyMessage,
  emptySearchMessage,
  onAddFriendPress,
  addFriendLabel,
  selectedTee,
  coursePar,
}: PlayerListContentProps) {
  const colors = useThemeColors();

  if (friendsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="lg" />
      </View>
    );
  }

  if (filteredPlaceholders.length > 0 || filteredFriends.length > 0) {
    return (
      <>
        {/* GUESTS Section */}
        {filteredPlaceholders.length > 0 && (
          <>
            <Text style={[styles.listSectionTitle, { color: colors.textSecondary }]}>
              GUESTS
            </Text>
            <View style={[styles.friendsContainer, { backgroundColor: colors.surface }]}>
              {filteredPlaceholders.map((placeholder, index) => {
                const selected = isPlaceholderSelected(placeholder.id);
                const disabled = !selected && isAtLimit;

                return (
                  <PlaceholderListItem
                    key={placeholder.id}
                    placeholder={placeholder}
                    isSelected={selected}
                    isDisabled={disabled}
                    onToggle={() => onPlaceholderToggle(placeholder)}
                    showDivider={index < filteredPlaceholders.length - 1}
                    selectedTee={selectedTee}
                    coursePar={coursePar}
                  />
                );
              })}
            </View>
          </>
        )}

        {/* FRIENDS Section */}
        {filteredFriends.length > 0 && (
          <>
            {filteredPlaceholders.length > 0 && (
              <Text style={[styles.listSectionTitle, { color: colors.textSecondary }]}>
                FRIENDS
              </Text>
            )}
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
                    onToggle={() => onFriendToggle(friend)}
                    showDivider={index < filteredFriends.length - 1}
                    showPendingBadge={showPendingBadge}
                    selectedTee={selectedTee}
                    coursePar={coursePar}
                  />
                );
              })}
            </View>
          </>
        )}
      </>
    );
  }

  return (
    <EmptyState
      searchQuery={searchQuery}
      emptyMessage={emptyMessage}
      emptySearchMessage={emptySearchMessage}
      onAddFriendPress={onAddFriendPress}
      addFriendLabel={addFriendLabel}
    />
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  listSectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  friendsContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});
