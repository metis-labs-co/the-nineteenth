// src/components/rounds/RoundListCard/RoundCardHeader.tsx

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { IconDog } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, skinsColor, wolfColor } from '@/constants/theme';
import { Pill, StatusBadge } from '@/components/common';
import { getGameTypeLabel } from '@/constants/statusConfig';
import { getTeeSwatch } from '@/utils/teeColors';
import { RoundListCardData } from './types';

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

  // Completed rounds where the user never submitted a scorecard
  const notSubmitted = round.status === 'completed' && !round.userScore?.hasScorecard;

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
          {/* Stale indicator - in-progress rounds past their date */}
          {isStale && (
            <StatusBadge status="in-progress" label="Not Completed" size="sm" />
          )}

          <Pill label={getGameTypeLabel(round.gameType)} size="sm" />

          {/* Round Pill - only show for competition rounds */}
          {!round.isStandalone && round.totalRounds > 1 && (
            <Pill label={`Round ${round.roundNumber} of ${round.totalRounds}`} size="sm" />
          )}

          {/* Tee swatch - selected tee shown as its colour */}
          {round.isStandalone && round.selectedTeeName && (
            <View
              style={[
                styles.teeSwatch,
                {
                  backgroundColor: getTeeSwatch(round.selectedTeeName),
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel={`${round.selectedTeeName} tees`}
              testID="round-card-tee-swatch"
            />
          )}

          {/* 9-hole badge */}
          {round.nineType && round.nineType !== 'full' && (
            <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {round.nineType === 'front9' ? 'Front 9' : 'Back 9'}
              </Text>
            </View>
          )}

        </View>

        {/* Missing scorecard indicator - score itself renders prominently via RoundCardScore */}
        {notSubmitted && <Pill label="Not submitted" size="sm" variant="default" />}
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
          <View style={[styles.gameIndicator, { backgroundColor: `${wolfColor}15` }]}>
            <IconDog size={14} color={wolfColor} />
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
                    : round.handicapSource && round.handicapSource !== 'none'
                      ? 'Handicap Round'
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
  teeSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  competitionName: {
    ...typography.bodyBold,
  },
});
