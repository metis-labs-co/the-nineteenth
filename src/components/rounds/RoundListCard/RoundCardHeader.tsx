// src/components/rounds/RoundListCard/RoundCardHeader.tsx

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { IconDog } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, skinsColor } from '@/constants/theme';
import { Pill, StatusBadge } from '@/components/common';
import { getGameTypeLabel } from '@/constants/statusConfig';
import { RoundListCardData, formatUserScore } from './types';

/** Gray color for wolf feature */
const WOLF_COLOR = '#6B7280';

interface RoundCardHeaderProps {
  round: RoundListCardData;
}

/**
 * RoundCardHeader - Game type pill, round pill, stale indicator, user score, and title
 */
export const RoundCardHeader = React.memo(function RoundCardHeader({
  round,
}: RoundCardHeaderProps) {
  const colors = useThemeColors();

  // Format user score for completed rounds
  const formattedScore = useMemo(() => {
    if (round.status !== 'completed') return null;
    return formatUserScore(round.gameType, round.userScore);
  }, [round.status, round.gameType, round.userScore]);

  // Detect stale rounds: in-progress but date has passed
  const isStale = useMemo(() => {
    if (round.status !== 'in-progress' || !round.date) return false;
    const roundDate = new Date(round.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    roundDate.setHours(0, 0, 0, 0);
    return roundDate < today;
  }, [round.status, round.date]);

  return (
    <>
      {/* Top Row: Game Type Pill + Round Pill + Stale Indicator + Score (for completed) */}
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <Pill label={getGameTypeLabel(round.gameType)} size="sm" />

          {/* Round Pill - only show for competition rounds */}
          {!round.isStandalone && round.totalRounds > 1 && (
            <Pill label={`Round ${round.roundNumber} of ${round.totalRounds}`} size="sm" />
          )}

          {/* Stale indicator - in-progress rounds past their date */}
          {isStale && (
            <StatusBadge status="in-progress" label="Not Completed" size="sm" />
          )}
        </View>

        {/* User Score - only show for completed rounds */}
        {formattedScore && (
          <Pill label={`You: ${formattedScore}`} size="sm" variant="default" />
        )}
      </View>

      {/* Title: Game type indicators + Name */}
      <View style={styles.titleRow}>
        {/* Skins indicator */}
        {round.hasSkins && (
          <View style={[styles.gameIndicator, { backgroundColor: `${skinsColor}15` }]}>
            <Icon source="dice-multiple" size={14} color={skinsColor} />
          </View>
        )}
        {/* Wolf indicator */}
        {round.hasWolf && (
          <View style={[styles.gameIndicator, { backgroundColor: `${WOLF_COLOR}15` }]}>
            <IconDog size={14} color={WOLF_COLOR} />
          </View>
        )}
        <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
          {round.hasSkins && round.hasWolf
            ? 'Skins & Wolf'
            : round.hasSkins
              ? 'Skins Match'
              : round.hasWolf
                ? 'Wolf Game'
                : round.isStandalone
                  ? round.players && round.players.length > 1
                    ? 'Match'
                    : 'Practice Round'
                  : round.competition?.name || 'Competition'}
        </Text>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  gameIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  competitionName: {
    ...typography.bodyBold,
  },
});
