/**
 * CompareTabBar - Tab bar for Compare Stats screen
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { spacing } from '@/constants/theme';

export type CompareTab = 'overview' | 'scoring' | 'gameStats';

const TABS: TabItem<CompareTab>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'gameStats', label: 'Game Stats' },
];

interface CompareTabBarProps {
  selectedTab: CompareTab;
  onTabChange: (tab: CompareTab) => void;
}

export const CompareTabBar = React.memo(function CompareTabBar({
  selectedTab,
  onTabChange,
}: CompareTabBarProps) {
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
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
