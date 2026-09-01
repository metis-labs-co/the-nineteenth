/**
 * RoundListSections - List header rendering the scope filter, the In Progress
 * section, the Recent Rounds title, and the round type filter pills.
 *
 * The scope filter (All / Social / Comps) sits at the very top because it
 * scopes every section below it, unlike the type pills which only narrow the
 * Recent Rounds list.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import { SectionHeader, FilterPill, SegmentedButton } from '@/components/common';
import type { SegmentOption } from '@/components/common';
import { LimitIndicator } from '@/components/subscription';
import { RoundListCard } from '@/components/rounds';
import { InProgressRoundSection } from '@/components/competitions/detail/sections';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
import type { GameType } from '@/types/database.types';
import type { RoundScopeFilter, RoundTypeFilter, RoundItem } from '../types';

const ROUND_SCOPES: SegmentOption<RoundScopeFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'social', label: 'Social' },
  { value: 'comps', label: 'Comps' },
];

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
  roundScope: RoundScopeFilter;
  onRoundScopeChange: (scope: RoundScopeFilter) => void;
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
  roundScope,
  onRoundScopeChange,
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
      <SegmentedButton
        value={roundScope}
        onValueChange={onRoundScopeChange}
        buttons={ROUND_SCOPES}
        size="small"
        style={styles.scopeRow}
      />

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
                onDelete={round.isStandalone === false ? undefined : onDeleteRound}
                swipeEnabled={round.isStandalone !== false}
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
          // The allowance only covers social rounds, so it would misread
          // alongside a competition-only list.
          !hasUnlimitedRounds && roundScope !== 'comps' ? (
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
  scopeRow: {
    marginBottom: spacing.md,
  },
  inProgressSection: {
    marginBottom: spacing.sm,
  },
  activeCard: {
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
