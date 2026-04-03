/**
 * StatisticsTabBar - Tab bar for My Statistics screen
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { spacing } from '@/constants/theme';

export type StatisticsTab = 'overview' | 'scoring' | 'gameStats';

const TABS: TabItem<StatisticsTab>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'gameStats', label: 'Game Stats' },
];

interface StatisticsTabBarProps {
  selectedTab: StatisticsTab;
  onTabChange: (tab: StatisticsTab) => void;
}

export const StatisticsTabBar = React.memo(function StatisticsTabBar({
  selectedTab,
  onTabChange,
}: StatisticsTabBarProps) {
  return (
    <Tabs
      tabs={TABS}
      selectedTab={selectedTab}
      onTabChange={onTabChange}
      size="medium"
      style={styles.tabs}
    />
  );
});

const styles = StyleSheet.create({
  tabs: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
