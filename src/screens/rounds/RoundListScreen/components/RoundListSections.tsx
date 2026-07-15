/**
 * RoundListSections - List header rendering the In Progress section,
 * Recent Rounds title, and round type filter pills
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';
import { SectionHeader } from '@/components/common';
import { LimitIndicator } from '@/components/subscription';
import { RoundListCard } from '@/components/rounds';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
import type { GameType } from '@/types/database.types';
import { InProgressRoundCard } from './InProgressRoundCard';
import type { RoundTypeFilter, RoundItem } from '../types';

const ROUND_TYPE_FILTERS: { key: RoundTypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'practice', label: 'Practice' },
  { key: 'match', label: 'Match' },
  { key: 'matchplay', label: 'Match Play' },
  { key: 'handicap', label: 'Handicap' },
  { key: 'ninehole', label: '9-Hole' },
  { key: 'skins', label: 'Skins' },
  { key: 'wolf', label: 'Wolf' },
];

interface RoundListSectionsProps {
  inProgressRounds: RoundWithCourse[];
  upcomingRounds: RoundItem[];
  roundTypeFilter: RoundTypeFilter;
  onRoundTypeFilterChange: (filter: RoundTypeFilter) => void;
  onResumeRound: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  onViewRound: (roundId: string) => void;
  onDeleteInProgressRound: (round: RoundWithCourse) => void;
  onScoreRound: (round: RoundItem) => void;
  /** Called when the user taps an upcoming (scheduled) round card. Defaults to onScoreRound. */
  onUpcomingRoundPress?: (round: RoundItem) => void;
  onDeleteRound: (round: RoundItem) => void;
  hasUnlimitedRounds: boolean;
  roundsPlayedCount: number;
  maxRoundsPlayed: number;
  currentUserId?: string;
}

export function RoundListSections({
  inProgressRounds,
  upcomingRounds,
  roundTypeFilter,
  onRoundTypeFilterChange,
  onResumeRound,
  onViewRound,
  onDeleteInProgressRound,
  onScoreRound,
  onUpcomingRoundPress,
  onDeleteRound,
  hasUnlimitedRounds,
  roundsPlayedCount,
  maxRoundsPlayed,
  currentUserId,
}: RoundListSectionsProps) {
  const colors = useThemeColors();

  // 1-based display number per round (the contract InProgressRoundCard
  // inherits from the shared in-progress carousel).
  const roundDisplayNumbers = useMemo(() => {
    const map: Record<string, number> = {};
    inProgressRounds.forEach((r, idx) => {
      map[r.id] = idx + 1;
    });
    return map;
  }, [inProgressRounds]);

  return (
    <>
      {(inProgressRounds.length > 0 || upcomingRounds.length > 0) && (
        <View style={styles.inProgressSection}>
          <SectionHeader title="In Progress" />
          {inProgressRounds.map((round) => (
            <View key={round.id} style={styles.activeCard}>
              <InProgressRoundCard
                round={round}
                number={roundDisplayNumbers[round.id] ?? round.round_number ?? 0}
                onScoreRound={onResumeRound}
                onViewRound={onViewRound}
                onDeleteRound={onDeleteInProgressRound}
              />
            </View>
          ))}
          {upcomingRounds.map((round) => (
            <View key={round.id} style={styles.activeCard}>
              <RoundListCard
                round={round}
                onPress={() => (onUpcomingRoundPress ?? onScoreRound)(round)}
                onDelete={onDeleteRound}
                swipeEnabled={true}
                actionLabel="View"
                currentUserId={currentUserId}
              />
            </View>
          ))}
        </View>
      )}

      <SectionHeader
        title="Recent Rounds"
        rightContent={
          !hasUnlimitedRounds ? (
            <LimitIndicator
              current={roundsPlayedCount}
              max={maxRoundsPlayed}
              label="Social Rounds"
              showBar={false}
              testID="rounds-played-limit-indicator"
            />
          ) : undefined
        }
      />

      {/* Round Type Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {ROUND_TYPE_FILTERS.map(({ key, label }) => {
          const selected = roundTypeFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterPill,
                selected
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => onRoundTypeFilterChange(key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${label.toLowerCase()} rounds`}
            >
              <Text
                style={[
                  styles.filterPillLabel,
                  { color: selected ? colors.textOnColored : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  inProgressSection: {
    marginBottom: spacing.sm,
  },
  activeCard: {
    marginBottom: spacing.md,
  },
  // Bleed the pill row to the screen edges so it scrolls edge-to-edge
  // inside the list's padded content container.
  filterScroll: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  filterPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
