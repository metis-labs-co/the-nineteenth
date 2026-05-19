// src/components/competitions/CompetitionListCard.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconUsers, IconTrophy, IconCurrencyDollar } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, skinsColor } from '@/constants/theme';
import {
  StatusBadge,
  DateTimeDisplay,
  Pill,
  CardContainer,
  WinnerRow,
} from '@/components/common';
import type { StatusVariant } from '@/components/common';
import type { WinnerInfo } from '@/components/common/WinnerRow';
import { CompetitionMiniLeaderboard } from './CompetitionMiniLeaderboard';
import { CompetitionFirstRoundLine } from './CompetitionFirstRoundLine';

/**
 * Winner information for completed competitions
 * Re-exported for backwards compatibility
 */
export type CompetitionWinnerInfo = WinnerInfo;

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
  /** Winner information (only for completed competitions) */
  winner?: CompetitionWinnerInfo;
  /** Whether the competition has a prize pool configured */
  hasPrizePool?: boolean;
  /** Total prize pool amount (in competition currency) */
  prizePoolAmount?: number;
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
 * Formats a prize pool amount for display
 * @param amount - The amount in dollars
 * @returns Formatted string like "$400"
 */
const formatPrizePoolAmount = (amount: number): string => {
  // For whole numbers, don't show decimals
  if (Number.isInteger(amount)) {
    return `$${amount.toLocaleString()}`;
  }
  // For decimal amounts, show up to 2 decimal places
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

/**
 * Maps competition status to StatusBadge variant
 */
const getStatusVariant = (status: string): StatusVariant => {
  switch (status?.toLowerCase()) {
    case 'in-progress':
      return 'in-progress';
    case 'active':
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

  const handlePress = useCallback(() => {
    onPress(competition);
  }, [onPress, competition]);

  const handleDelete = useCallback(() => {
    onDelete?.(competition);
  }, [onDelete, competition]);

  const normalizedStatus = competition.status?.toLowerCase();
  const isInProgress =
    normalizedStatus === 'in-progress' ||
    normalizedStatus === 'in_progress' ||
    normalizedStatus === 'active';
  const isUpcoming = normalizedStatus === 'upcoming';
  const isCompleted = normalizedStatus === 'completed';

  const getAccessibilityLabel = () => {
    const role = competition.isOrganizer ? 'Organiser' : 'Player';
    const deleteHint = swipeEnabled ? ', swipe left to delete' : '';
    const prizePoolHint = competition.hasPrizePool && competition.prizePoolAmount && competition.prizePoolAmount > 0
      ? `, ${formatPrizePoolAmount(competition.prizePoolAmount)} prize pool`
      : '';
    return `View ${competition.name}, ${role}, ${competition.rounds} rounds, ${competition.players} players${prizePoolHint}${deleteHint}`;
  };

  return (
    <CardContainer
      onPress={handlePress}
      swipeable={swipeEnabled}
      onDelete={swipeEnabled ? handleDelete : undefined}
      accessibilityLabel={getAccessibilityLabel()}
      deleteAccessibilityName={competition.name}
      testID={testID}
      style={styles.cardStyle}
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

        {/* Meta Info: Rounds + Players + Prize Pool */}
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
          {competition.hasPrizePool && competition.prizePoolAmount != null && competition.prizePoolAmount > 0 && (
            <View style={styles.metaItem}>
              <IconCurrencyDollar size={14} color={skinsColor} />
              <Text style={[styles.metaText, { color: skinsColor }]}>
                {formatPrizePoolAmount(competition.prizePoolAmount)} pool
              </Text>
            </View>
          )}
        </View>

        {/* Date Row — hidden for upcoming since the first-round line
            below already includes the date/time. */}
        {!isUpcoming && (
          <DateTimeDisplay
            date={competition.startDate}
            size="md"
            style={styles.dateRow}
          />
        )}

        {/* Mini leaderboard for in-progress competitions */}
        {isInProgress && (
          <CompetitionMiniLeaderboard competitionId={competition.id} />
        )}

        {/* First-round venue + date/time for upcoming competitions */}
        {isUpcoming && (
          <CompetitionFirstRoundLine competitionId={competition.id} />
        )}

        {/* Winner Row - Only for completed competitions */}
        {isCompleted && competition.winner && (
          <View style={styles.winnerContainer}>
            <WinnerRow winner={competition.winner} />
          </View>
        )}
      </View>
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  cardStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
  winnerContainer: {
    marginTop: spacing.sm,
  },
  dateRow: {
    marginTop: spacing.xs,
  },
});
