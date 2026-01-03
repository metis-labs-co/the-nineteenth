// src/components/common/SwipeableRow.tsx
import React, {
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
import { IconTrash } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { SWIPE_GESTURE } from '@/constants/gestures';

/**
 * Props for the SwipeableRow component
 */
export interface SwipeableRowProps {
  /**
   * Content to be rendered inside the swipeable row
   */
  children: React.ReactNode;
  /**
   * Callback when the delete action is triggered
   */
  onDelete: () => void;
  /**
   * Label for the delete button (default: "Delete")
   */
  deleteLabel?: string;
  /**
   * Accessibility label for the delete button
   */
  deleteAccessibilityLabel?: string;
  /**
   * Whether swipe functionality is enabled (default: true)
   */
  enabled?: boolean;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Ref handle for SwipeableRow
 */
export interface SwipeableRowRef {
  /** Close the swipe menu programmatically */
  close: () => void;
  /** Check if the swipe menu is currently open */
  isOpen: () => boolean;
}

/**
 * SwipeableRow - A wrapper component that provides swipe-to-delete functionality
 *
 * Uses react-native-gesture-handler's Swipeable component which provides:
 * - Native gesture coordination with ScrollView/FlatList (no conflicts with pull-to-refresh)
 * - Smooth, performant animations running on the UI thread
 * - Proper gesture priority handling
 *
 * @example
 * ```tsx
 * const swipeableRef = useRef<SwipeableRowRef>(null);
 *
 * <SwipeableRow
 *   ref={swipeableRef}
 *   onDelete={() => handleDelete(item.id)}
 *   deleteLabel="Remove"
 *   deleteAccessibilityLabel={`Remove ${item.name}`}
 * >
 *   <MyCard item={item} />
 * </SwipeableRow>
 * ```
 */
export const SwipeableRow = forwardRef<SwipeableRowRef, SwipeableRowProps>(
  function SwipeableRow(
    {
      children,
      onDelete,
      deleteLabel = 'Delete',
      deleteAccessibilityLabel,
      enabled = true,
      testID,
    },
    ref
  ) {
    const colors = useThemeColors();
    const swipeableRef = useRef<Swipeable>(null);
    const isOpenRef = useRef(false);

    // Expose close method and isOpen check to parent via ref
    useImperativeHandle(ref, () => ({
      close: () => {
        swipeableRef.current?.close();
      },
      isOpen: () => isOpenRef.current,
    }));

    const handleDelete = useCallback(() => {
      swipeableRef.current?.close();
      onDelete();
    }, [onDelete]);

    const handleSwipeableOpen = useCallback(() => {
      isOpenRef.current = true;
    }, []);

    const handleSwipeableClose = useCallback(() => {
      isOpenRef.current = false;
    }, []);

    /**
     * Renders the delete action button revealed when swiping left
     * Uses Animated to create a smooth reveal animation
     */
    const renderRightActions = useCallback(
      (
        progress: Animated.AnimatedInterpolation<number>,
        _dragX: Animated.AnimatedInterpolation<number>
      ) => {
        // Animate the button opacity and scale based on swipe progress
        const opacity = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View style={[styles.rightAction, { opacity }]}>
            <RectButton
              style={[
                styles.deleteButton,
                { backgroundColor: colors.error },
              ]}
              onPress={handleDelete}
              testID={testID ? `${testID}-delete-button` : undefined}
            >
              <View
                style={styles.deleteButtonContent}
                accessible
                accessibilityRole="button"
                accessibilityLabel={deleteAccessibilityLabel || deleteLabel}
              >
                <IconTrash size={24} color={colors.white} />
                <Text style={[styles.deleteButtonText, { color: colors.white }]}>
                  {deleteLabel}
                </Text>
              </View>
            </RectButton>
          </Animated.View>
        );
      },
      [colors, handleDelete, deleteLabel, deleteAccessibilityLabel, testID]
    );

    // If not enabled, just render children without swipe wrapper
    if (!enabled) {
      return <>{children}</>;
    }

    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={SWIPE_GESTURE.SWIPE_THRESHOLD}
        friction={2}
        overshootRight={false}
        overshootFriction={8}
        onSwipeableOpen={handleSwipeableOpen}
        onSwipeableClose={handleSwipeableClose}
        containerStyle={styles.swipeableContainer}
        childrenContainerStyle={styles.childrenContainer}
        testID={testID}
      >
        {children}
      </Swipeable>
    );
  }
);

const styles = StyleSheet.create({
  swipeableContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  childrenContainer: {
    // Ensure children fill the container
    flex: 1,
  },
  rightAction: {
    width: SWIPE_GESTURE.DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default SwipeableRow;
