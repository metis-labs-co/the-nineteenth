// src/screens/competitions/components/CompetitionTabBar.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs } from '@/components/common';
import { spacing } from '@/constants/theme';
import type { TabValue } from '../hooks/useCompetitionsList';

interface CompetitionTabBarProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  myCount: number;
  joinedCount: number;
}

/**
 * Tab bar for switching between "My Comps" and "Joined" competitions
 */
export const CompetitionTabBar = React.memo(function CompetitionTabBar({
  activeTab,
  onTabChange,
  myCount,
  joinedCount,
}: CompetitionTabBarProps) {
  return (
    <Tabs
      tabs={[
        { key: 'my' as const, label: 'My Comps', count: myCount },
        { key: 'joined' as const, label: 'Joined', count: joinedCount },
      ]}
      selectedTab={activeTab}
      onTabChange={onTabChange}
      style={styles.tabContainer}
    />
  );
});

const styles = StyleSheet.create({
  tabContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
});
