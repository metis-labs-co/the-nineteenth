/**
 * RoundListHeader - Header section with tabs and limit indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconPlus } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { PageHeader, FeatureButton, Tabs, FilterPill } from '@/components/common';
import { LimitIndicator } from '@/components/subscription';
import type { RoundTab, RoundTypeFilter, RoundItem } from '../types';

const ROUND_TYPE_FILTERS: { key: RoundTypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'practice', label: 'Practice' },
  { key: 'match', label: 'Match' },
  { key: 'skins', label: 'Skins' },
  { key: 'wolf', label: 'Wolf' },
];

interface RoundListHeaderProps {
  selectedTab: RoundTab;
  onTabChange: (tab: RoundTab) => void;
  roundTypeFilter: RoundTypeFilter;
  onRoundTypeFilterChange: (filter: RoundTypeFilter) => void;
  activeRounds: RoundItem[];
  historyRounds: RoundItem[];
  onOpenNewRound: () => void;
  hasUnlimitedRounds: boolean;
  roundsPlayedCount: number;
  maxRoundsPlayed: number;
  showInfoIcon?: boolean;
  onInfoPress?: () => void;
  onQuickScore?: () => void;
}

export function RoundListHeader({
  selectedTab,
  onTabChange,
  roundTypeFilter,
  onRoundTypeFilterChange,
  activeRounds,
  historyRounds,
  onOpenNewRound,
  hasUnlimitedRounds,
  roundsPlayedCount,
  maxRoundsPlayed,
  showInfoIcon,
  onInfoPress,
  onQuickScore,
}: RoundListHeaderProps) {
  const colors = useThemeColors();

  const rightActions = [];
  if (onQuickScore) {
    rightActions.push({ icon: 'flash', onPress: onQuickScore, accessibilityLabel: 'Quick score entry' });
  }
  if (showInfoIcon && onInfoPress) {
    rightActions.push({ icon: 'information-outline', onPress: onInfoPress, accessibilityLabel: 'Rounds info' });
  }

  return (
    <>
      <PageHeader
        title="Rounds"
        rightActions={rightActions}
      />

      <View style={styles.stickyHeader}>
        {/* Score New Round Button */}
        <FeatureButton
          title="Score Social Round"
          subtitle="Start scoring a round at any course"
          icon={<IconPlus size={24} color={colors.white} strokeWidth={2.5} />}
          onPress={onOpenNewRound}
          accessibilityLabel="Score new round"
        />

        {/* Toggle Tabs */}
        <View style={styles.tabSection}>
          <Tabs
            tabs={[
              { key: 'active', label: 'Active', count: activeRounds.length },
              { key: 'history', label: 'Completed', count: historyRounds.length },
            ]}
            selectedTab={selectedTab}
            onTabChange={onTabChange}
            style={styles.tabContainer}
          />

          <View style={styles.subtitleRow}>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {selectedTab === 'active'
                ? 'Rounds that need scoring'
                : 'Your completed rounds'}
            </Text>

            {/* Limit Indicator - only show for free tier users */}
            {!hasUnlimitedRounds && (
              <LimitIndicator
                current={roundsPlayedCount}
                max={maxRoundsPlayed}
                label="Social Rounds"
                showBar={false}
                testID="rounds-played-limit-indicator"
              />
            )}
          </View>

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
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    paddingTop: spacing.lg,
  },
  tabSection: {
    paddingHorizontal: spacing.lg,
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    ...typography.small,
    flex: 1,
  },
  tabContainer: {
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
