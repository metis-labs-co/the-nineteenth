/**
 * RoundListSections - List header rendering the In Progress section,
 * Recent Rounds title, and round type filter pills
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import { SectionHeader, FilterPill } from '@/components/common';
import { LimitIndicator } from '@/components/subscription';
import { RoundListCard } from '@/components/rounds';
import { InProgressRoundSection } from '@/components/competitions/detail/sections';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
import type { GameType } from '@/types/database.types';
import type { RoundTypeFilter, RoundItem } from '../types';

const ROUND_TYPE_FILTERS: { key: RoundTypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'practice', label: 'Practice' },
  { key: 'match', label: 'Match' },
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
  // 1-based display number per round (the contract InProgressRoundSection
  // expects from CompetitionDetail).
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
          <InProgressRoundSection
            rounds={inProgressRounds}
            onScoreRound={onResumeRound}
            onViewRound={onViewRound}
            onDeleteRound={onDeleteInProgressRound}
            roundDisplayNumbers={roundDisplayNumbers}
          />
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
      <View style={styles.filterRow}>
        {ROUND_TYPE_FILTERS.map(({ key, label }) => (
          <FilterPill
            key={key}
            label={label}
            selected={roundTypeFilter === key}
            onPress={() => onRoundTypeFilterChange(key)}
            accessibilityLabel={`Show ${label.toLowerCase()} rounds`}
          />
        ))}
      </View>
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
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
