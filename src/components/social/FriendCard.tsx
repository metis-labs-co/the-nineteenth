// src/components/social/FriendCard.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { PlayerCard } from '@/components/social/PlayerCard';
import type { Friend } from '@/types/database.types';

/**
 * Props for the FriendCard component
 */
export interface FriendCardProps {
  /**
   * Friend data to display
   */
  friend: Friend;
  /**
   * Callback when the card is pressed
   */
  onPress: () => void;
  /**
   * Callback when remove/cancel button is pressed
   */
  onRemove: () => void;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * FriendCard - Displays a friend card in a list
 *
 * Built on top of PlayerCard, adds friend-specific functionality:
 * - Pending badge for pending friend requests
 * - Remove/cancel action button
 *
 * @example
 * ```tsx
 * <FriendCard
 *   friend={{
 *     id: '1',
 *     name: 'John Smith',
 *     email: 'john@example.com',
 *     handicap: 12,
 *     photo_url: null,
 *     friendship_id: 'f1',
 *     friendship_status: 'accepted',
 *   }}
 *   onPress={() => navigation.navigate('PlayerDetail', { id: '1' })}
 *   onRemove={() => removeFriend('f1')}
 * />
 * ```
 */
export const FriendCard = React.memo(function FriendCard({
  friend,
  onPress,
  onRemove,
  testID,
}: FriendCardProps) {
  const colors = useThemeColors();
  const isPending = friend.friendship_status === 'pending';

  // Build badge config for pending status
  const badge = isPending
    ? {
        label: 'Pending',
        backgroundColor: colors.warningLight,
        textColor: colors.warningDark,
      }
    : undefined;

  // Remove/cancel button as right action
  const rightAction = (
    <TouchableOpacity
      style={styles.removeButton}
      onPress={onRemove}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={
        isPending
          ? `Cancel request to ${friend.name}`
          : `Remove ${friend.name} from friends`
      }
    >
      <Icon
        source={isPending ? 'close' : 'account-remove'}
        size={20}
        color={colors.error}
      />
    </TouchableOpacity>
  );

  return (
    <PlayerCard
      player={{
        id: friend.id,
        name: friend.name,
        email: friend.email,
        handicap: friend.handicap,
        photo_url: friend.photo_url,
      }}
      onPress={onPress}
      badge={badge}
      rightAction={rightAction}
      handicapColor={colors.primary}
      testID={testID}
    />
  );
});

const styles = StyleSheet.create({
  removeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FriendCard;
