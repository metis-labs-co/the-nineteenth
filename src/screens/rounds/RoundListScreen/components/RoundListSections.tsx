/**
 * RoundListSections - List header rendering the In Progress section,
 * Recent Rounds title, and round type filter pills
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import { SectionHeader, FilterPill } from '@/components/common';
import { LimitIndicator } from '@/components/subscription';
import { RoundListCard } from '@/components/rounds';
import type { RoundTypeFilter, RoundItem } from '../types';

const ROUND_TYPE_FILTERS: { key: RoundTypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'practice', label: 'Practice' },
  { key: 'match', label: 'Match' },
  { key: 'skins', label: 'Skins' },
  { key: 'wolf', label: 'Wolf' },
];

interface RoundListSectionsProps {
  activeRounds: RoundItem[];
  roundTypeFilter: RoundTypeFilter;
  onRoundTypeFilterChange: (filter: RoundTypeFilter) => void;
  onScoreRound: (round: RoundItem) => void;
  onDeleteRound: (round: RoundItem) => void;
  hasUnlimitedRounds: boolean;
  roundsPlayedCount: number;
  maxRoundsPlayed: number;
  currentUserId?: string;
}

export function RoundListSections({
  activeRounds,
  roundTypeFilter,
  onRoundTypeFilterChange,
  onScoreRound,
  onDeleteRound,
  hasUnlimitedRounds,
  roundsPlayedCount,
  maxRoundsPlayed,
  currentUserId,
}: RoundListSectionsProps) {
  return (
    <>
      {activeRounds.length > 0 && (
        <View style={styles.inProgressSection}>
          <SectionHeader title="In Progress" />
          {activeRounds.map((round) => (
            <View key={round.id} style={styles.activeCard}>
              <RoundListCard
                round={round}
                onPress={() => onScoreRound(round)}
                onDelete={onDeleteRound}
                swipeEnabled={true}
                actionLabel="Score"
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
    marginBottom: spacing.lg,
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
