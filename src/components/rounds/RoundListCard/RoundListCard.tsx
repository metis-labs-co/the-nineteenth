// src/components/rounds/RoundListCard/RoundListCard.tsx

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { IconChevronRight } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { RoundListCardData, RoundListCardProps } from './types';
import { useSwipeGesture } from './useSwipeGesture';
import { RoundCardHeader } from './RoundCardHeader';
import { RoundCardMeta } from './RoundCardMeta';
import { RoundCardActions } from './RoundCardActions';

/**
 * RoundListCard - Displays a round card in a list
 *
 * Shows round information including:
 * - Status badge (upcoming, in-progress, completed)
 * - Round number (for competition rounds)
 * - Competition/Practice label
 * - Course name and location
 * - Date and tee time
 * - Game type
 * - Progress bar (for in-progress rounds)
 *
 * @example
 * ```tsx
 * <RoundListCard
 *   round={{
 *     id: '1',
 *     course: { id: 'c1', name: 'Royal Melbourne' },
 *     competition: { id: 'comp1', name: 'Summer Series' },
 *     status: 'in-progress',
 *     date: '2025-01-15',
 *     teeTime: '10:30 AM',
 *     gameType: 'stableford',
 *     roundNumber: 2,
 *     totalRounds: 4,
 *     holesCompleted: 9,
 *     totalHoles: 18,
 *   }}
 *   onPress={(round) => console.log('Pressed:', round.id)}
 * />
 * ```
 */
export const RoundListCard = React.memo(function RoundListCard<
  T extends RoundListCardData = RoundListCardData,
>({
  round,
  onPress,
  onDelete,
  swipeEnabled = false,
  actionLabel,
  currentUserId,
  testID,
}: RoundListCardProps<T>) {
  const colors = useThemeColors();
  const { translateX, panResponder, isSwipeOpen, closeSwipe } =
    useSwipeGesture(swipeEnabled);

  const handlePress = useCallback(() => {
    if (isSwipeOpen.current) {
      closeSwipe();
      return;
    }
    onPress(round);
  }, [isSwipeOpen, closeSwipe, onPress, round]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      closeSwipe();
      onDelete(round);
    }
  }, [onDelete, round, closeSwipe]);

  const getAccessibilityLabel = () => {
    const status = round.status === 'in-progress' ? 'Score' : 'View';
    const location = round.course.venueName || round.course.name;
    const deleteHint = swipeEnabled ? ', swipe left to delete' : '';
    return `${actionLabel || status} round at ${location}${deleteHint}`;
  };

  const cardContent = (
    <>
      <View style={styles.content}>
        <RoundCardHeader round={round} />
        <RoundCardMeta round={round} currentUserId={currentUserId} />
      </View>
      <View style={styles.arrow}>
        <IconChevronRight size={20} color={colors.gray400} />
      </View>
    </>
  );

  // Simple card without swipe
  if (!swipeEnabled) {
    return (
      <TouchableOpacity
        style={[
          styles.container,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={getAccessibilityLabel()}
        testID={testID}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  // Swipe-enabled card with delete button
  return (
    <View style={styles.swipeContainer}>
      <RoundCardActions
        courseName={round.course.name}
        onDelete={handleDelete}
      />

      <Animated.View
        style={[{ transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[
            styles.container,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={handlePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityActions={[{ name: 'delete', label: 'Delete round' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'delete') {
              handleDelete();
            }
          }}
          testID={testID}
        >
          {cardContent}
        </TouchableOpacity>
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.sm,
  },
  content: {
    flex: 1,
  },
  arrow: {
    marginLeft: spacing.md,
  },
});
