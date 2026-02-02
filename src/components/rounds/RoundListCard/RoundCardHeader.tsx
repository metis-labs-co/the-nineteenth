// src/components/rounds/RoundListCard/RoundCardHeader.tsx

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { IconDog } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, skinsColor } from '@/constants/theme';
import { StatusBadge, Pill } from '@/components/common';
import { RoundListCardData, getStatusVariant, formatUserScore } from './types';

/** Gray color for wolf feature */
const WOLF_COLOR = '#6B7280';

interface RoundCardHeaderProps {
  round: RoundListCardData;
}

/**
 * RoundCardHeader - Status badge, round pill, user score (for completed), and title
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

  return (
    <>
      {/* Top Row: Status Badge + Round Pill + Score (for completed) */}
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <StatusBadge status={getStatusVariant(round.status)} />

          {/* Round Pill - only show for competition rounds */}
          {!round.isStandalone && round.totalRounds > 1 && (
            <Pill label={`Round ${round.roundNumber} of ${round.totalRounds}`} size="md" />
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
