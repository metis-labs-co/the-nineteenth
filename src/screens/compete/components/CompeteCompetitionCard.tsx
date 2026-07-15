/**
 * CompeteCompetitionCard - Polished competition card for the Compete hub
 *
 * Restyled per the app-wide polish design (COMPETE, L431-478): dot status
 * pill, 16/800 name, icon tile, divider meta line (players · rounds) with a
 * chevron, and a role pill + date bottom row. All behaviour (press, swipe
 * delete, mini leaderboard / first-round line / winner row) matches the
 * CompetitionListCard it replaces; strings and accessibility are unchanged.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import {
  IconUsers,
  IconTrophy,
  IconCurrencyDollar,
  IconChevronRight,
} from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, skinsColor } from '@/constants/theme';
import { DateTimeDisplay, CardContainer, WinnerRow } from '@/components/common';
import {
  CompetitionMiniLeaderboard,
  CompetitionFirstRoundLine,
} from '@/components/competitions';
import type { CompetitionListCardData } from '@/components/competitions';
import { CompeteStatusPill, CompeteRolePill } from './CompeteCardBits';

export interface CompeteCompetitionCardProps<
  T extends CompetitionListCardData = CompetitionListCardData,
> {
  competition: T;
  onPress: (competition: T) => void;
  onDelete?: (competition: T) => void;
  swipeEnabled?: boolean;
  testID?: string;
}

/** Formats a prize pool amount for display, e.g. "$400". */
const formatPrizePoolAmount = (amount: number): string => {
  if (Number.isInteger(amount)) {
    return `$${amount.toLocaleString()}`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const CompeteCompetitionCard = React.memo(function CompeteCompetitionCard<
  T extends CompetitionListCardData = CompetitionListCardData,
>({
  competition,
  onPress,
  onDelete,
  swipeEnabled = false,
  testID,
}: CompeteCompetitionCardProps<T>) {
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
  // Fixed-team comps show team standings on the card; per-round/none stay individual.
  const isFixedTeam = competition.teamMode === 'fixed';

  const hasPool =
    !!competition.hasPrizePool &&
    competition.prizePoolAmount != null &&
    competition.prizePoolAmount > 0;

  const getAccessibilityLabel = () => {
    const role = competition.isOrganizer ? 'Organiser' : 'Player';
    const deleteHint = swipeEnabled ? ', swipe left to delete' : '';
    const prizePoolHint = hasPool
      ? `, ${formatPrizePoolAmount(competition.prizePoolAmount!)} prize pool`
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
        {/* Top: status pill + name, trophy icon tile at right */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <CompeteStatusPill status={competition.status} />
            <Text
              style={[styles.competitionName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {competition.name}
            </Text>
          </View>
          <View
            style={[
              styles.iconTile,
              {
                backgroundColor: isCompleted ? colors.surfaceVariant : colors.primaryBackground,
              },
            ]}
          >
            <IconTrophy
              size={22}
              color={isCompleted ? colors.textTertiary : colors.primary}
            />
          </View>
        </View>

        {/* Meta line: players · rounds (· pool) + chevron */}
        <View style={[styles.metaRow, { borderTopColor: colors.borderLight }]}>
          <View style={styles.metaItem}>
            <IconUsers size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {competition.players} player{competition.players !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <IconTrophy size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {competition.rounds} round{competition.rounds !== 1 ? 's' : ''}
            </Text>
          </View>
          {hasPool && (
            <View style={styles.metaItem}>
              <IconCurrencyDollar size={14} color={skinsColor} />
              <Text style={[styles.metaText, { color: skinsColor }]}>
                {formatPrizePoolAmount(competition.prizePoolAmount!)} pool
              </Text>
            </View>
          )}
          <View style={styles.chevron}>
            <IconChevronRight size={16} color={colors.primary} />
          </View>
        </View>

        {/* Bottom row: role pill + date (upcoming shows the first-round line
            below instead, which already includes the date/time). */}
        <View style={styles.bottomRow}>
          <CompeteRolePill isOrganizer={competition.isOrganizer} />
          {!isUpcoming && <DateTimeDisplay date={competition.startDate} size="md" />}
        </View>

        {/* Mini leaderboard for in-progress competitions */}
        {isInProgress && (
          <CompetitionMiniLeaderboard
            competitionId={competition.id}
            isTeamComp={isFixedTeam}
          />
        )}

        {/* First-round venue + date/time for upcoming competitions */}
        {isUpcoming && <CompetitionFirstRoundLine competitionId={competition.id} />}

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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  topLeft: {
    flex: 1,
    minWidth: 0,
  },
  competitionName: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md + 2,
    paddingTop: spacing.md + 1,
    borderTopWidth: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 'auto',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm + 3,
  },
  winnerContainer: {
    marginTop: spacing.sm,
  },
});
