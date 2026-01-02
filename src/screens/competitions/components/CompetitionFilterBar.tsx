// src/screens/competitions/components/CompetitionFilterBar.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FilterPill } from '@/components/common';
import { LimitIndicator } from '@/components/subscription';
import { spacing } from '@/constants/theme';
import type { StatusFilter, TabValue } from '../hooks/useCompetitionsList';

interface CompetitionFilterBarProps {
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  activeTab: TabValue;
  myCompetitionCount: number;
  maxCompetitions: number;
  hasUnlimitedCompetitions: boolean;
}

/**
 * Filter bar with status pills and limit indicator
 */
export const CompetitionFilterBar = React.memo(function CompetitionFilterBar({
  statusFilter,
  onFilterChange,
  activeTab,
  myCompetitionCount,
  maxCompetitions,
  hasUnlimitedCompetitions,
}: CompetitionFilterBarProps) {
  return (
    <View style={styles.filterRow}>
      <View style={styles.filterContainer}>
        <FilterPill
          label="Active"
          selected={statusFilter === 'active'}
          onPress={() => onFilterChange('active')}
          accessibilityLabel="Show active and upcoming competitions"
        />
        <FilterPill
          label="Completed"
          selected={statusFilter === 'completed'}
          onPress={() => onFilterChange('completed')}
          accessibilityLabel="Show completed competitions"
        />
      </View>

      {/* Limit Indicator - only show for "My Comps" tab */}
      {activeTab === 'my' && !hasUnlimitedCompetitions && (
        <View style={styles.limitIndicatorContainer}>
          <LimitIndicator
            current={myCompetitionCount}
            max={maxCompetitions}
            label="Competitions"
            showBar={false}
            testID="competition-limit-indicator"
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  limitIndicatorContainer: {
    flexShrink: 0,
  },
});
