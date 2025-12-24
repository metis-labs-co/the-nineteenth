// src/components/competitions/CompetitionListCard.tsx
import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Text } from 'react-native-paper';
import {
  IconChevronRight,
  IconUsers,
  IconTrophy,
  IconTrash,
} from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { StatusBadge, DateTimeDisplay, Pill } from '@/components/common';
import type { StatusVariant } from '@/components/common';

const DELETE_BUTTON_WIDTH = 80;
const SWIPE_THRESHOLD = 40;

/**
 * Competition data structure for the list card
 */
export interface CompetitionListCardData {
  /** Unique competition identifier */
  id: string;
  /** Competition name */
  name: string;
  /** Competition status (draft, upcoming, active, in-progress, completed, cancelled) */
  status: string;
  /** Number of rounds in the competition */
  rounds: number;
  /** Number of players in the competition */
  players: number;
  /** Whether the current user is the organizer */
  isOrganizer: boolean;
  /** Competition start date (ISO string) */
  startDate: string | null;
}

export interface CompetitionListCardProps<T extends CompetitionListCardData = CompetitionListCardData> {
  /**
   * Competition data to display
   */
  competition: T;
  /**
   * Callback when the card is pressed
   */
  onPress: (competition: T) => void;
  /**
   * Callback when delete is pressed (only called if swipeEnabled is true)
   */
  onDelete?: (competition: T) => void;
  /**
   * Whether swipe-to-delete gesture is enabled (default: false)
   */
  swipeEnabled?: boolean;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Maps competition status to StatusBadge variant
 */
const getStatusVariant = (status: string): StatusVariant => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'in-progress':
      return 'active';
    case 'completed':
      return 'completed';
    case 'upcoming':
      return 'upcoming';
    case 'cancelled':
      return 'cancelled';
    case 'draft':
    default:
      return 'draft';
  }
};

/**
 * CompetitionListCard - Displays a competition card in a list
 *
 * Shows competition information including:
 * - Status badge (draft, upcoming, active, completed, cancelled)
 * - Competition name
 * - Round and player counts
 * - Start date
 * - Organizer/Player role indicator
 *
 * @example
 * ```tsx
 * <CompetitionListCard
 *   competition={{
 *     id: '1',
 *     name: 'Summer Series 2025',
 *     status: 'active',
 *     rounds: 4,
 *     players: 12,
 *     isOrganizer: true,
 *     startDate: '2025-01-15',
 *   }}
 *   onPress={(competition) => console.log('Pressed:', competition.id)}
 * />
 * ```
 */
export const CompetitionListCard = React.memo(function CompetitionListCard<
  T extends CompetitionListCardData = CompetitionListCardData,
>({ competition, onPress, onDelete, swipeEnabled = false, testID }: CompetitionListCardProps<T>) {
  const colors = useThemeColors();

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
        if (!swipeEnabled) return false;
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

  const handlePress = () => {
    // If swipe is open, close it instead of navigating
    if (isSwipeOpen.current) {
      closeSwipe();
      return;
    }
    onPress(competition);
  };

  const handleDelete = useCallback(() => {
    if (onDelete) {
      closeSwipe();
      onDelete(competition);
    }
  }, [onDelete, competition, closeSwipe]);

  const getAccessibilityLabel = () => {
    const role = competition.isOrganizer ? 'Organiser' : 'Player';
    const deleteHint = swipeEnabled ? ', swipe left to delete' : '';
    return `View ${competition.name}, ${role}, ${competition.rounds} rounds, ${competition.players} players${deleteHint}`;
  };

  // If swipe is not enabled, render simple card without animation wrapper
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
        <View style={styles.content}>
          {/* Top Row: Status Badge + Role */}
          <View style={styles.topRow}>
            <StatusBadge status={getStatusVariant(competition.status)} />
            <Pill
              label={competition.isOrganizer ? 'Organiser' : 'Player'}
              variant={'default'}
              size="md"
            />
          </View>

          {/* Competition Name */}
          <Text
            style={[styles.competitionName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {competition.name}
          </Text>

          {/* Meta Info: Rounds + Players */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <IconTrophy size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {competition.rounds} round{competition.rounds !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <IconUsers size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {competition.players} player{competition.players !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Date Row */}
          <DateTimeDisplay
            date={competition.startDate}
            size="md"
            style={styles.dateRow}
          />
        </View>

        {/* Arrow */}
        <View style={styles.arrow}>
          <IconChevronRight size={20} color={colors.gray400} />
        </View>
      </TouchableOpacity>
    );
  }

  // Swipe-enabled card with delete button
  return (
    <View style={styles.swipeContainer}>
      {/* Delete button (positioned behind the card) */}
      <View style={[styles.deleteButtonContainer, { backgroundColor: colors.error }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${competition.name}`}
        >
          <IconTrash size={24} color={colors.white} />
          <Text style={[styles.deleteButtonText, { color: colors.white }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>

      {/* Animated card */}
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
          accessibilityActions={[{ name: 'delete', label: 'Delete competition' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'delete') {
              handleDelete();
            }
          }}
          testID={testID}
        >
          <View style={styles.content}>
            {/* Top Row: Status Badge + Role */}
            <View style={styles.topRow}>
              <StatusBadge status={getStatusVariant(competition.status)} />
              <Pill
                label={competition.isOrganizer ? 'Organiser' : 'Player'}
                variant={'default'}
                size="md"
              />
            </View>

            {/* Competition Name */}
            <Text
              style={[styles.competitionName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {competition.name}
            </Text>

            {/* Meta Info: Rounds + Players */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <IconTrophy size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {competition.rounds} round{competition.rounds !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <IconUsers size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {competition.players} player{competition.players !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Date Row */}
            <DateTimeDisplay
              date={competition.startDate}
              size="md"
              style={styles.dateRow}
            />
          </View>

          {/* Arrow */}
          <View style={styles.arrow}>
            <IconChevronRight size={20} color={colors.gray400} />
          </View>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  competitionName: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.small,
  },
  dateRow: {
    marginTop: spacing.xs,
  },
});
