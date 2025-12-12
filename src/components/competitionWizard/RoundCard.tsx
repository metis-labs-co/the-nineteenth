// src/components/competition/RoundCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { IconGolf, IconCalendar, IconClock } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatDateAustralian, formatTime } from '@/utils/formatting';
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import type { RoundStatus, GameType } from '@/types/database.types';

/**
 * Game type display labels
 */
const GAME_TYPE_LABELS: Record<GameType, string> = {
  stroke: 'Stroke Play',
  stableford: 'Stableford',
  'match-play': 'Match Play',
  ambrose: 'Ambrose',
  'best-ball': 'Best Ball',
  scramble: 'Scramble',
};

export interface RoundCardProps {
  /**
   * Round ID (for navigation)
   */
  roundId: string;
  /**
   * Round number in the competition (e.g., 1, 2, 3)
   */
  roundNumber: number;
  /**
   * Course name where the round is played
   */
  courseName: string;
  /**
   * Date of the round in ISO format (YYYY-MM-DD)
   */
  date?: string | null;
  /**
   * Tee time in HH:MM:SS format (optional)
   */
  teeTime?: string | null;
  /**
   * Game type (Stableford, Stroke Play, etc.)
   */
  gameType: GameType;
  /**
   * Current status of the round
   */
  status: RoundStatus;
  /**
   * Callback when Start Round button is pressed
   */
  onStartRound?: (roundId: string) => void;
  /**
   * Callback when View Scorecard button is pressed (for completed rounds)
   */
  onViewScorecard?: (roundId: string) => void;
  /**
   * Callback when card is pressed (optional)
   */
  onPress?: () => void;
  /**
   * Whether the current user has started scoring this round
   */
  hasStartedScoring?: boolean;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * RoundCard - Display round details with action button
 *
 * @description
 * Shows round information including course, date, game type, and status.
 * Provides Start Round button for upcoming/in-progress rounds,
 * and View Scorecard button for completed rounds.
 *
 * @example
 * ```tsx
 * <RoundCard
 *   roundId="uuid-123"
 *   roundNumber={1}
 *   courseName="Royal Melbourne"
 *   date="2025-01-15"
 *   teeTime="09:30:00"
 *   gameType="stableford"
 *   status="upcoming"
 *   onStartRound={(id) => navigation.navigate('Scorecard', { roundId: id })}
 * />
 * ```
 */
export const RoundCard = React.memo(function RoundCard({
  roundId,
  roundNumber,
  courseName,
  date,
  teeTime,
  gameType,
  status,
  onStartRound,
  onViewScorecard,
  onPress,
  hasStartedScoring = false,
  testID,
}: RoundCardProps) {
  const colors = useThemeColors();
  const gameTypeLabel = GAME_TYPE_LABELS[gameType];

  // Map RoundStatus to StatusVariant
  const statusVariant: StatusVariant = status as StatusVariant;
  const statusLabel = status === 'in-progress' ? 'In Progress' : status === 'completed' ? 'Completed' : 'Upcoming';
  const dateDisplay = formatDateAustralian(date ?? null);
  const timeDisplay = formatTime(teeTime ?? null);

  // Determine button text and action
  const getButtonConfig = () => {
    if (status === 'completed') {
      return {
        label: 'View Scorecard',
        onPress: () => onViewScorecard?.(roundId),
        mode: 'outlined' as const,
        icon: 'clipboard-text-outline',
      };
    }
    if (status === 'in-progress' || hasStartedScoring) {
      return {
        label: 'Continue Round',
        onPress: () => onStartRound?.(roundId),
        mode: 'contained' as const,
        icon: 'golf',
      };
    }
    return {
      label: 'Start Round',
      onPress: () => onStartRound?.(roundId),
      mode: 'contained' as const,
      icon: 'golf-tee',
    };
  };

  const buttonConfig = getButtonConfig();
  const isActionable = status !== 'completed' ? !!onStartRound : !!onViewScorecard;

  return (
    <Card
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Round ${roundNumber}: ${courseName}. ${gameTypeLabel}. Status: ${statusLabel}. Date: ${dateDisplay}`}
      accessibilityHint={onPress ? 'Double tap to view round details' : undefined}
    >
      <Card.Content style={styles.content}>
        {/* Header Row: Round Number + Status Badge */}
        <View style={styles.headerRow}>
          <View style={styles.roundNumberContainer}>
            <Text style={[styles.roundLabel, { color: colors.textSecondary }]}>Round</Text>
            <Text style={[styles.roundNumber, { color: colors.primary }]}>{roundNumber}</Text>
          </View>
          <StatusBadge status={statusVariant} />
        </View>

        {/* Course Name */}
        <View style={styles.courseRow}>
          <IconGolf size={20} color={colors.primary} style={styles.courseIcon} />
          <Text
            style={[styles.courseName, { color: colors.textPrimary }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {courseName}
          </Text>
        </View>

        {/* Date and Time */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <IconCalendar size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>{dateDisplay}</Text>
          </View>
          {timeDisplay && (
            <View style={styles.detailItem}>
              <IconClock size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{timeDisplay}</Text>
            </View>
          )}
        </View>

        {/* Game Type */}
        <View style={styles.gameTypeRow}>
          <View style={[styles.gameTypeBadge, { backgroundColor: colors.primaryLighter }]}>
            <Text style={[styles.gameTypeText, { color: colors.primaryDark }]}>{gameTypeLabel}</Text>
          </View>
        </View>

        {/* Action Button */}
        {isActionable && (
          <View style={styles.buttonContainer}>
            <Button
              mode={buttonConfig.mode}
              onPress={buttonConfig.onPress}
              icon={buttonConfig.icon}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
              labelStyle={styles.actionButtonLabel}
              accessibilityLabel={buttonConfig.label}
              accessibilityRole="button"
              accessibilityHint={
                status === 'completed'
                  ? 'Opens your scorecard for this round'
                  : 'Starts scoring for this round'
              }
            >
              {buttonConfig.label}
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  content: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roundNumberContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  roundLabel: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roundNumber: {
    ...typography.h2,
    fontWeight: '700',
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  courseIcon: {
    marginTop: 2,
  },
  courseName: {
    ...typography.h4,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    ...typography.small,
  },
  gameTypeRow: {
    marginBottom: spacing.lg,
  },
  gameTypeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  gameTypeText: {
    ...typography.smallBold,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  actionButton: {
    borderRadius: borderRadius.md,
  },
  actionButtonContent: {
    height: 48,
    paddingHorizontal: spacing.md,
  },
  actionButtonLabel: {
    ...typography.bodyBold,
    letterSpacing: 0.25,
  },
});

export default RoundCard;
