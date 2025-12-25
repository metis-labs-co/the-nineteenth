// src/components/social/FriendCard.tsx
import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, Animated, PanResponder, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { IconTrash } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { PlayerCard } from '@/components/social/PlayerCard';
import type { Friend } from '@/types/database.types';

const DELETE_BUTTON_WIDTH = 80;
const SWIPE_THRESHOLD = 40;

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

  // Animation for swipe gesture
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipeOpen = useRef(false);

  // Close the swipe when needed
  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start(() => {
      isSwipeOpen.current = false;
    });
  }, [translateX]);

  // Open the swipe to reveal delete button
  const openSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: -DELETE_BUTTON_WIDTH,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start(() => {
      isSwipeOpen.current = true;
    });
  }, [translateX]);

  // PanResponder for swipe gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal left swipes
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMovedEnough = Math.abs(gestureState.dx) > 10;
        return isHorizontal && hasMovedEnough;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new position based on current open state
        const basePosition = isSwipeOpen.current ? -DELETE_BUTTON_WIDTH : 0;
        let newValue = basePosition + gestureState.dx;

        // Clamp between -DELETE_BUTTON_WIDTH and 0 (with slight overscroll resistance)
        if (newValue > 0) {
          newValue = newValue * 0.2; // Resistance when swiping right past 0
        } else if (newValue < -DELETE_BUTTON_WIDTH) {
          const overscroll = newValue + DELETE_BUTTON_WIDTH;
          newValue = -DELETE_BUTTON_WIDTH + overscroll * 0.2; // Resistance when overscrolling left
        }

        translateX.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const basePosition = isSwipeOpen.current ? -DELETE_BUTTON_WIDTH : 0;
        const finalPosition = basePosition + gestureState.dx;

        // Determine if we should open or close based on threshold and velocity
        const shouldOpen = finalPosition < -SWIPE_THRESHOLD || gestureState.vx < -0.3;
        const shouldClose = finalPosition > -SWIPE_THRESHOLD || gestureState.vx > 0.3;

        if (isSwipeOpen.current) {
          // Currently open - check if we should close
          if (shouldClose) {
            closeSwipe();
          } else {
            openSwipe();
          }
        } else {
          // Currently closed - check if we should open
          if (shouldOpen) {
            openSwipe();
          } else {
            closeSwipe();
          }
        }
      },
      onPanResponderTerminate: () => {
        // Reset to appropriate position
        if (isSwipeOpen.current) {
          openSwipe();
        } else {
          closeSwipe();
        }
      },
    })
  ).current;

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
    width: DELETE_BUTTON_WIDTH,
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
