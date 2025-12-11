// src/components/rounds/RoundListCard.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { IconChevronRight, IconMapPin, IconUsers } from '@tabler/icons-react-native';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { StatusBadge, ProgressBar, DateTimeDisplay, Pill } from '@/components/common';
import type { StatusVariant } from '@/components/common';

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
   * Label for the action (defaults to status-based label)
   */
  actionLabel?: string;
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
>({ round, onPress, actionLabel, testID }: RoundListCardProps<T>) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  // Light mode: white background, Dark mode: gray100 to match Tabs component
  const cardBackground = isDark ? colors.gray100 : colors.white;

  const handlePress = () => {
    onPress(round);
  };

  const getAccessibilityLabel = () => {
    const status = round.status === 'in-progress' ? 'Score' : 'View';
    const location = round.course.venueName || round.course.name;
    return `${actionLabel || status} round at ${location}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: cardBackground, borderColor: colors.border },
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
              {round.players.map(p => p.name.split(' ')[0]).join(', ')}
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
});

const styles = StyleSheet.create({
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
