// src/components/social/FriendCard.tsx
import React, { useCallback } from 'react';
import { StyleSheet, View, Animated, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { IconTrash } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { PlayerCard } from '@/components/social/PlayerCard';
import { useSwipeToDelete, SWIPE_GESTURE } from '@/components/common/hooks';
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

  // Use shared swipe-to-delete hook
  const { translateX, panResponder, isSwipeOpen, closeSwipe } = useSwipeToDelete({
    enabled: true,
  });

  const handlePress = useCallback(() => {
    // If swipe is open, close it instead of navigating
    if (isSwipeOpen.current) {
      closeSwipe();
      return;
    }
    onPress();
  }, [closeSwipe, onPress]);

  const handleRemove = useCallback(() => {
    closeSwipe();
    onRemove();
  }, [closeSwipe, onRemove]);

  // Build badge config for pending status
  const badge = isPending
    ? {
        label: 'Pending',
        backgroundColor: colors.warningLight,
        textColor: colors.warningDark,
      }
    : undefined;

  const removeLabel = isPending ? 'Cancel' : 'Remove';

  return (
    <View style={styles.swipeContainer}>
      {/* Delete button (positioned behind the card) */}
      <View style={[styles.deleteButtonContainer, { backgroundColor: colors.error }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleRemove}
          accessibilityRole="button"
          accessibilityLabel={
            isPending
              ? `Cancel request to ${friend.name}`
              : `Remove ${friend.name} from friends`
          }
        >
          <IconTrash size={24} color={colors.white} />
          <Text style={[styles.deleteButtonText, { color: colors.white }]}>
            {removeLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Animated card */}
      <Animated.View
        style={[{ transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
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
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_GESTURE.DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: spacing.xs,
  },
  deleteButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default FriendCard;
