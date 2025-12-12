// src/components/rounds/RoundListCard.tsx
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
  IconMapPin,
  IconUsers,
  IconTrash,
} from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { StatusBadge, ProgressBar, DateTimeDisplay, Pill } from '@/components/common';
import type { StatusVariant } from '@/components/common';

const DELETE_BUTTON_WIDTH = 80;
const SWIPE_THRESHOLD = 40;

/**
 * Player information for the round
 */
interface RoundPlayerInfo {
  id: string;
  name: string;
}

/**
 * Course information for the round
 */
interface RoundCourse {
  id: string;
  name: string;
  /** Venue/club name where the course is located */
  venueName?: string;
  /** City where the course is located */
  city?: string;
  /** State where the course is located */
  state?: string;
}

/**
 * Competition information (if round is part of a competition)
 */
interface RoundCompetition {
  id: string;
  name: string;
}

/**
 * Round data structure
 */
export interface RoundListCardData {
  /** Unique round identifier */
  id: string;
  /** Course information */
  course: RoundCourse;
  /** Competition information (optional for standalone rounds) */
  competition?: RoundCompetition | null;
  /** Round status (scheduled, in-progress, completed) */
  status: string;
  /** Date of the round (ISO string or Date) */
  date?: string | Date | null;
  /** Tee time (e.g., "10:30 AM") */
  teeTime?: string | null;
  /** Type of game (stableford, stroke, etc.) */
  gameType: string;
  /** Whether this is a standalone practice round */
  isStandalone?: boolean;
  /** Round number within competition */
  roundNumber: number;
  /** Total rounds in competition */
  totalRounds: number;
  /** Number of holes completed (for in-progress rounds) */
  holesCompleted: number;
  /** Total holes in the round */
  totalHoles: number;
  /** Players in the round (for standalone/social rounds) */
  players?: RoundPlayerInfo[];
}

export interface RoundListCardProps<T extends RoundListCardData = RoundListCardData> {
  /**
   * Round data to display
   */
  round: T;
  /**
   * Callback when the card is pressed
   */
  onPress: (round: T) => void;
  /**
   * Callback when delete is pressed (only called if swipeEnabled is true)
   */
  onDelete?: (round: T) => void;
  /**
   * Whether swipe-to-delete gesture is enabled (default: false)
   */
  swipeEnabled?: boolean;
  /**
   * Label for the action (defaults to status-based label)
   */
  actionLabel?: string;
  /**
   * Current user ID - used to display "You" instead of the user's name
   */
  currentUserId?: string;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Formats game type to human-readable string
 */
const formatGameType = (gameType: string): string => {
  switch (gameType) {
    case 'stableford':
      return 'Stableford';
    case 'stroke':
      return 'Stroke Play';
    case 'match_play':
      return 'Match Play';
    case 'ambrose':
      return 'Ambrose';
    case 'fourball_bestball':
      return 'Best Ball';
    default:
      // Capitalize first letter of unknown game types
      return gameType.charAt(0).toUpperCase() + gameType.slice(1).replace(/_/g, ' ');
  }
};

/**
 * Maps round status to StatusBadge variant
 */
const getStatusVariant = (status: string): StatusVariant => {
  switch (status) {
    case 'in-progress':
      return 'in-progress';
    case 'completed':
      return 'completed';
    case 'scheduled':
    default:
      return 'upcoming';
  }
};

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
>({ round, onPress, onDelete, swipeEnabled = false, actionLabel, currentUserId, testID }: RoundListCardProps<T>) {
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
    onPress(round);
  };

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
        {/* Top Row: Status Badge + Round Pill */}
        <View style={styles.topRow}>
          <StatusBadge status={getStatusVariant(round.status)} />

          {/* Round Pill - only show for competition rounds */}
          {!round.isStandalone && round.totalRounds > 1 && (
            <Pill label={`Round ${round.roundNumber} of ${round.totalRounds}`} size="md" />
          )}
        </View>

        {/* Competition Name or Practice Round */}
        <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
          {round.isStandalone
            ? 'Practice Round'
            : round.competition?.name || 'Competition'}
        </Text>

        {/* Playing Partners (for standalone rounds with players) */}
        {round.isStandalone && round.players && round.players.length > 1 && (
          <View style={styles.playersRow}>
            <IconUsers size={14} color={colors.textSecondary} />
            <Text style={[styles.playersText, { color: colors.textSecondary }]}>
              {round.players.map(p =>
                p.id === currentUserId ? 'You' : p.name.split(' ')[0]
              ).join(', ')}
            </Text>
          </View>
        )}

        {/* Course Info */}
        <View style={styles.courseRow}>
          <IconMapPin size={16} color={colors.textSecondary} />
          <Text style={[styles.courseName, { color: colors.textSecondary }]}>
            {round.course.venueName
              ? round.course.venueName !== round.course.name
                ? `${round.course.venueName} (${round.course.name})`
                : round.course.venueName
              : round.course.name}
          </Text>
        </View>

        {/* Date and Game Type */}
        <View style={styles.detailsRow}>
          {round.date && (
            <DateTimeDisplay
              date={round.date}
              time={round.teeTime}
              size="md"
            />
          )}
          <StatusBadge
            status="completed"
            label={formatGameType(round.gameType)}
            size="sm"
          />
        </View>

        {/* Progress (if in progress) */}
        {round.status === 'in-progress' && (
          <ProgressBar
            value={round.holesCompleted}
            max={round.totalHoles}
            label={`${round.holesCompleted}/${round.totalHoles} holes`}
            style={styles.progressRow}
          />
        )}
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
          accessibilityLabel={`Delete round at ${round.course.name}`}
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
          accessibilityActions={[{ name: 'delete', label: 'Delete round' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'delete') {
              handleDelete();
            }
          }}
          testID={testID}
        >
          <View style={styles.content}>
            {/* Top Row: Status Badge + Round Pill */}
            <View style={styles.topRow}>
              <StatusBadge status={getStatusVariant(round.status)} />

              {/* Round Pill - only show for competition rounds */}
              {!round.isStandalone && round.totalRounds > 1 && (
                <Pill label={`Round ${round.roundNumber} of ${round.totalRounds}`} size="md" />
              )}
            </View>

            {/* Competition Name or Practice Round */}
            <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
              {round.isStandalone
                ? 'Practice Round'
                : round.competition?.name || 'Competition'}
            </Text>

            {/* Playing Partners (for standalone rounds with players) */}
            {round.isStandalone && round.players && round.players.length > 1 && (
              <View style={styles.playersRow}>
                <IconUsers size={14} color={colors.textSecondary} />
                <Text style={[styles.playersText, { color: colors.textSecondary }]}>
                  {round.players.map(p =>
                    p.id === currentUserId ? 'You' : p.name.split(' ')[0]
                  ).join(', ')}
                </Text>
              </View>
            )}

            {/* Course Info */}
            <View style={styles.courseRow}>
              <IconMapPin size={16} color={colors.textSecondary} />
              <Text style={[styles.courseName, { color: colors.textSecondary }]}>
                {round.course.venueName
                  ? round.course.venueName !== round.course.name
                    ? `${round.course.venueName} (${round.course.name})`
                    : round.course.venueName
                  : round.course.name}
              </Text>
            </View>

            {/* Date and Game Type */}
            <View style={styles.detailsRow}>
              {round.date && (
                <DateTimeDisplay
                  date={round.date}
                  time={round.teeTime}
                  size="md"
                />
              )}
              <StatusBadge
                status="completed"
                label={formatGameType(round.gameType)}
                size="sm"
              />
            </View>

            {/* Progress (if in progress) */}
            {round.status === 'in-progress' && (
              <ProgressBar
                value={round.holesCompleted}
                max={round.totalHoles}
                label={`${round.holesCompleted}/${round.totalHoles} holes`}
                style={styles.progressRow}
              />
            )}
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
    marginBottom: spacing.xs,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  playersText: {
    ...typography.small,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  courseName: {
    ...typography.small,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressRow: {
    marginTop: spacing.sm,
  },
});
