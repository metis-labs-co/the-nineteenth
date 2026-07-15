/**
 * CompeteScreen - merged Competitions + Leagues screen
 *
 * A Comps/Leagues toggle switches between:
 * - Comps: create buttons + Active/Upcoming/Completed sections
 * - Leagues: create/join buttons + my leagues list
 */

import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderQuickActions } from '@/components/common/HeaderQuickActions';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { ScreenWelcomeModal } from '@/components/common/ScreenWelcomeModal';
import { useThemeColors } from '@/context/ThemeContext';
import { useScreenWelcome } from '@/hooks/useScreenWelcome';
import { leagueKeys } from '@/hooks/queryKeys';
import { spacing } from '@/constants/theme';
import { CompsContent, LeaguesContent } from './components';

type CompeteMode = 'comps' | 'leagues';

export default function CompeteScreen() {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CompeteMode>('comps');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Per-mode welcome modals (reuses existing competitions/leagues content)
  const compsWelcome = useScreenWelcome('competitions');
  const leaguesWelcome = useScreenWelcome('leagues');
  const welcome = mode === 'comps' ? compsWelcome : leaguesWelcome;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (mode === 'comps') {
        // Prefix-match against useCompetitionGroups' inline ['myCompetitions', userId] keys
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['myCompetitions'] }),
          queryClient.refetchQueries({ queryKey: ['joinedCompetitions'] }),
        ]);
      } else {
        await queryClient.refetchQueries({ queryKey: leagueKeys.all });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [mode, queryClient]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Compete"
        infoAction={
          !welcome.isFirstVisit
            ? {
                onPress: welcome.showModal,
                accessibilityLabel: mode === 'comps' ? 'Competitions info' : 'Leagues info',
              }
            : undefined
        }
        rightContent={<HeaderQuickActions />}
      />

      <View style={styles.toggleContainer}>
        <SegmentedButton<CompeteMode>
          value={mode}
          onValueChange={setMode}
          buttons={[
            { value: 'comps', label: 'Comps' },
            { value: 'leagues', label: 'Leagues' },
          ]}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        {mode === 'comps' ? <CompsContent /> : <LeaguesContent />}
      </ScrollView>

      <ScreenWelcomeModal
        visible={welcome.isModalVisible}
        content={welcome.content}
        onDismiss={welcome.dismissModal}
        testID="compete-welcome-modal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
});
