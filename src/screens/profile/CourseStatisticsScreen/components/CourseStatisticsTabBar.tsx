/**
 * CourseStatisticsTabBar - Tab bar for course statistics screen
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { spacing } from '@/constants/theme';

export type CourseStatisticsTab = 'overview' | 'holes' | 'gameStats';

const TABS: TabItem<CourseStatisticsTab>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'holes', label: 'Holes' },
  { key: 'gameStats', label: 'Game Stats' },
];

interface CourseStatisticsTabBarProps {
  selectedTab: CourseStatisticsTab;
  onTabChange: (tab: CourseStatisticsTab) => void;
}

export const CourseStatisticsTabBar = React.memo(function CourseStatisticsTabBar({
  selectedTab,
  onTabChange,
}: CourseStatisticsTabBarProps) {
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
    marginBottom: spacing.sm,
  },
});
