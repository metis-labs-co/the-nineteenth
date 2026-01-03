// src/components/social/FriendCard.tsx
import React, { useCallback, useRef } from 'react';
import { useThemeColors } from '@/context/ThemeContext';
import { PlayerCard } from '@/components/social/PlayerCard';
import { SwipeableRow, SwipeableRowRef } from '@/components/common/SwipeableRow';
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
 * FriendCard - Displays a friend card in a list with swipe-to-delete
 *
 * Built on top of PlayerCard, adds friend-specific functionality:
 * - Pending badge for pending friend requests
 * - Swipe left to reveal remove/cancel action
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
  const swipeableRef = useRef<SwipeableRowRef>(null);

  const handlePress = useCallback(() => {
    // If swipe is open, close it instead of navigating
    if (swipeableRef.current?.isOpen()) {
      swipeableRef.current.close();
      return;
    }
    onPress();
  }, [onPress]);

  const handleRemove = useCallback(() => {
    onRemove();
  }, [onRemove]);

  // Build badge config for pending status
  const badge = isPending
    ? {
        label: 'Pending',
        backgroundColor: colors.warningLight,
        textColor: colors.warningDark,
      }
    : undefined;

  const removeLabel = isPending ? 'Cancel' : 'Remove';
  const removeAccessibilityLabel = isPending
    ? `Cancel request to ${friend.name}`
    : `Remove ${friend.name} from friends`;

  return (
    <SwipeableRow
      ref={swipeableRef}
      onDelete={handleRemove}
      deleteLabel={removeLabel}
      deleteAccessibilityLabel={removeAccessibilityLabel}
      testID={testID ? `${testID}-swipeable` : undefined}
    >
      <PlayerCard
        player={{
          id: friend.id,
          name: friend.name,
          email: friend.email,
          handicap: friend.handicap,
          photo_url: friend.photo_url,
        }}
        onPress={handlePress}
        badge={badge}
        handicapColor={colors.primary}
        testID={testID}
      />
    </SwipeableRow>
  );
});

export default FriendCard;
