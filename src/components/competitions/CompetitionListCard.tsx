// src/components/competitions/CompetitionListCard.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconChevronRight, IconUsers, IconTrophy } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import {
  StatusBadge,
  DateTimeDisplay,
  Pill,
  CardContainer,
  WinnerRow,
} from '@/components/common';
import type { StatusVariant } from '@/components/common';
import type { WinnerInfo } from '@/components/common/WinnerRow';

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

  const handlePress = useCallback(() => {
    onPress(competition);
  }, [onPress, competition]);

  const handleDelete = useCallback(() => {
    onDelete?.(competition);
  }, [onDelete, competition]);

  const getAccessibilityLabel = () => {
    const role = competition.isOrganizer ? 'Organiser' : 'Player';
    const deleteHint = swipeEnabled ? ', swipe left to delete' : '';
    return `View ${competition.name}, ${role}, ${competition.rounds} rounds, ${competition.players} players${deleteHint}`;
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
      <View style={styles.contentWrapper}>
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

          {/* Winner Row - Only for completed competitions */}
          {competition.status?.toLowerCase() === 'completed' && competition.winner && (
            <View style={styles.winnerContainer}>
              <WinnerRow winner={competition.winner} />
            </View>
          )}

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
      </View>
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  cardStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  winnerContainer: {
    marginTop: spacing.sm,
  },
  dateRow: {
    marginTop: spacing.xs,
  },
});
