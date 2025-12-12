/**
 * SearchResultCard - Displays a player search result with add friend action
 *
 * Shows player info (avatar, name, email, handicap) with appropriate status
 * or action button based on friendship state.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, Icon } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { PlayerSearchResult } from '@/types/database.types';

/**
 * Props for the SearchResultCard component
 */
export interface SearchResultCardProps {
  /**
   * Player search result data to display
   */
  player: PlayerSearchResult;
  /**
   * Callback when add friend button is pressed
   */
  onAddFriend: () => void;
  /**
   * Whether the add friend action is in progress
   */
  isAdding?: boolean;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * SearchResultCard - Displays a player search result
 *
 * Shows different states based on friendship status:
 * - "Friends" badge if already friends
 * - "Request Sent" badge if request pending (sent by current user)
 * - "Respond" badge if request pending (sent by other user)
 * - Add friend button if no relationship exists
 *
 * @example
 * ```tsx
 * <SearchResultCard
 *   player={{
 *     id: 'user-1',
 *     name: 'John Smith',
 *     email: 'john@example.com',
 *     handicap: 12,
 *     photo_url: null,
 *     is_friend: false,
 *     has_pending_request: false,
 *   }}
 *   onAddFriend={() => addFriend('user-1')}
 *   isAdding={false}
 * />
 * ```
 */
export const SearchResultCard = React.memo(function SearchResultCard({
  player,
  onAddFriend,
  isAdding = false,
  testID,
}: SearchResultCardProps) {
  const colors = useThemeColors();

  const getStatusText = (): string | null => {
    if (player.is_friend) return 'Friends';
    if (player.has_pending_request) {
      return player.request_direction === 'sent' ? 'Request Sent' : 'Respond';
    }
    return null;
  };

  const statusText = getStatusText();
  const canAdd = !player.is_friend && !player.has_pending_request;

  return (
    <View style={styles.container} testID={testID}>
      {player.photo_url ? (
        <Avatar.Image
          size={48}
          source={{ uri: player.photo_url }}
          style={{ backgroundColor: colors.primary }}
        />
      ) : (
        <Avatar.Icon
          size={48}
          icon="account"
          style={{ backgroundColor: colors.primary }}
        />
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
          {player.email}
        </Text>
        {player.handicap !== null && player.handicap !== undefined && (
          <Text style={[styles.handicap, { color: colors.primary }]}>
            HC: {player.handicap}
          </Text>
        )}
      </View>
      {statusText ? (
        <View style={[styles.statusBadge, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.statusBadgeText, { color: colors.textSecondary }]}>
            {statusText}
          </Text>
        </View>
      ) : canAdd ? (
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: colors.primary },
            isAdding && styles.addButtonDisabled,
          ]}
          onPress={onAddFriend}
          disabled={isAdding}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Add ${player.name} as friend`}
        >
          {isAdding ? (
            <GolfBallLoader size="sm" />
          ) : (
            <Icon source="account-plus" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    ...typography.bodyBold,
  },
  email: {
    ...typography.caption,
  },
  handicap: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    ...typography.caption,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
});

export default SearchResultCard;
