/**
 * RoundListHeader - Header section with tabs and limit indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconPlus } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { PageHeader, FeatureButton, Tabs } from '@/components/common';
import { LimitIndicator } from '@/components/subscription';
import type { RoundTab, RoundItem } from '../types';

interface RoundListHeaderProps {
  selectedTab: RoundTab;
  onTabChange: (tab: RoundTab) => void;
  activeRounds: RoundItem[];
  historyRounds: RoundItem[];
  onOpenNewRound: () => void;
  hasUnlimitedRounds: boolean;
  roundsPlayedCount: number;
  maxRoundsPlayed: number;
  showInfoIcon?: boolean;
  onInfoPress?: () => void;
}

export function RoundListHeader({
  selectedTab,
  onTabChange,
  activeRounds,
  historyRounds,
  onOpenNewRound,
  hasUnlimitedRounds,
  roundsPlayedCount,
  maxRoundsPlayed,
  showInfoIcon,
  onInfoPress,
}: RoundListHeaderProps) {
  const colors = useThemeColors();

  return (
    <>
      <PageHeader
        title="Rounds"
        rightActions={showInfoIcon && onInfoPress ? [{ icon: 'information-outline', onPress: onInfoPress, accessibilityLabel: 'Rounds info' }] : []}
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
});
