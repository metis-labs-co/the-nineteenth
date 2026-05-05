/**
 * CourseStatisticsScreen - Player statistics for a specific course
 *
 * Three-tab layout:
 * - Overview: Score trend, stats, distribution, averages, par types, recent rounds
 * - Holes: Scrollable hole selector with per-hole breakdown
 * - Game Stats: Advanced stats (driving, approach, short game, putting, bunkers, hazards)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStatistics } from '@/hooks/playerStatistics';
import { useSandSaveStats } from '@/hooks/queries/useSandSaveStats';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState, ErrorState } from '@/components/common';
import {
  CourseStatisticsTabBar,
  type CourseStatisticsTab,
  CourseOverviewTab,
  CourseHolesTab,
  CourseGameStatsTab,
} from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseStatistics'>;

export default function CourseStatisticsScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<CourseStatisticsTab>('overview');

  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCourseStatistics(user?.id, courseId);

  // Sand Save % is sourced from view-backed counts (v_sand_saves /
  // v_sand_save_attempts) rather than per-hole shot data, so we merge it
  // into bunkerStats before passing to the Game Stats tab. courseId
  // scopes the counts to this course only.
  const sandSaveQuery = useSandSaveStats(user?.id, courseId);

  // Merge view-backed sand-save aggregates into bunkerStats. Memoize so
  // the GameStatsTab receives a stable reference when neither dependency
  // changes.
  const gameStatsTabStats = useMemo(() => {
    if (!stats) return null;
    return {
      ...stats,
      bunkerStats: {
        ...stats.bunkerStats,
        sandSaves: sandSaveQuery.data?.sandSaves ?? 0,
        sandSaveAttempts: sandSaveQuery.data?.sandSaveAttempts ?? 0,
        sandSavePercentage: sandSaveQuery.data?.sandSavePercentage ?? null,
      },
    };
  }, [stats, sandSaveQuery.data]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title={courseName} showBack onBack={handleGoBack} />
        <View style={styles.centeredContainer}>
          <LoadingSpinner size="lg" message="Loading course statistics..." />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title={courseName} showBack onBack={handleGoBack} />
        <View style={styles.centeredContainer}>
          <ErrorState
            error={error instanceof Error ? error.message : 'An error occurred'}
            onRetry={handleRefresh}
            title="Unable to load statistics"
          />
        </View>
      </View>
    );
  }

  if (!stats || stats.timesPlayed === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title={courseName} showBack onBack={handleGoBack} />
        <View style={styles.centeredContainer}>
          <EmptyState
            title="No rounds at this course"
            message="Complete a round at this course to see your statistics here."
            icon="chart-bar"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={courseName}
        showBack
        onBack={handleGoBack}
        rightActions={[
          { icon: 'refresh', onPress: handleRefresh, accessibilityLabel: 'Refresh statistics' },
        ]}
      />

      <CourseStatisticsTabBar selectedTab={activeTab} onTabChange={setActiveTab} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        {activeTab === 'overview' && <CourseOverviewTab stats={stats} />}
        {activeTab === 'holes' && <CourseHolesTab stats={stats} />}
        {activeTab === 'gameStats' && (
          <CourseGameStatsTab stats={gameStatsTabStats ?? stats} />
        )}

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.massive },
  footer: { height: spacing.xxxl },
});
