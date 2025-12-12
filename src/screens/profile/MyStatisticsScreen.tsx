/**
 * MyStatisticsScreen - Display comprehensive player statistics
 *
 * Shows tier-appropriate stats:
 * - BasicStats: Always visible (rounds played, total points, competitions)
 * - ScoreDistribution: Locked for Free tier (Social+ required)
 * - AdvancedAnalytics: Locked for Free/Social (Premium required)
 *
 * Each locked section shows a FeatureLock overlay with upgrade prompt.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { IconAlertTriangle, IconChartBar } from '@tabler/icons-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerStatistics } from '@/hooks/usePlayerStatistics';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useStatsVisibility } from '@/store/settingsStore';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionHeader } from '@/components/social';
import { FeatureLock, UpgradePrompt } from '@/components/subscription';
import type { UpgradePromptConfig } from '@/components/subscription';
import {
  StatCard,
  ScoreDistributionBar,
  PerformanceRow,
  CourseStatsCard,
  RecentRoundRow,
  PerformanceChart,
} from '@/components/statistics';
import { formatDateAustralian } from '@/utils/formatting';

type Props = NativeStackScreenProps<RootStackParamList, 'MyStatistics'>;

export default function MyStatisticsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const { checkFeature } = useSubscriptionContext();
  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = usePlayerStatistics(user?.id);

  // Get stats visibility settings
  const { showPutts, showFairwayHit, showGreenInRegulation } = useStatsVisibility();

  // Upgrade prompt state
  const [upgradePromptConfig, setUpgradePromptConfig] = useState<UpgradePromptConfig | null>(null);

  // Check feature access (used to determine which sections to lock)
  checkFeature('score_distribution');
  checkFeature('advanced_stats');

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Navigate to subscription screen
  const handleNavigateToSubscription = useCallback(() => {
    setUpgradePromptConfig(null);
    navigation.navigate('Subscription');
  }, [navigation]);

  // Show upgrade prompt for score distribution
  const handleScoreDistributionUpgrade = useCallback(() => {
    setUpgradePromptConfig({
      feature: 'score_distribution',
      title: 'Unlock Score Distribution',
      message: 'See how your scores break down across eagles, birdies, pars, and more.',
      targetTier: 'social',
      benefits: [
        'Score breakdown by type',
        'Visual distribution charts',
        'Track your improvement over time',
      ],
    });
  }, []);

  // Show upgrade prompt for advanced stats
  const handleAdvancedStatsUpgrade = useCallback(() => {
    setUpgradePromptConfig({
      feature: 'advanced_stats',
      title: 'Unlock Advanced Analytics',
      message: 'Get deeper insights into your game with premium statistics.',
      targetTier: 'premium',
      benefits: [
        'Performance trends and charts',
        'Best/worst round analysis',
        'Course-by-course breakdown',
        'Detailed scoring metrics',
      ],
    });
  }, []);

  // Card background
  const cardBg = colors.surface;

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="My Statistics" showBack onBack={handleGoBack} />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" message="Loading your statistics..." />
        </View>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="My Statistics" showBack onBack={handleGoBack} />
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconContainer, { backgroundColor: colors.errorLight }]}>
            <IconAlertTriangle size={48} color={colors.error} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Unable to load statistics
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error instanceof Error ? error.message : 'An error occurred'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading statistics"
          >
            <Text style={[styles.retryButtonText, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render empty state
  if (!stats || stats.roundsPlayed === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="My Statistics" showBack onBack={handleGoBack} />
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray200 }]}>
            <IconChartBar size={48} color={colors.gray400} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No statistics yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Complete some rounds to see your statistics here. Your performance data will be tracked
            automatically.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="My Statistics"
        showBack
        onBack={handleGoBack}
        rightActions={[
          {
            icon: 'refresh',
            onPress: handleRefresh,
            accessibilityLabel: 'Refresh statistics',
          },
        ]}
      />

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
        {/* ============================================== */}
        {/* SECTION 1: BASIC STATS - Always visible */}
        {/* ============================================== */}

        {/* Overview Stats */}
        <SectionHeader title="Overview" icon="golf" />
        <View style={styles.statsGrid}>
          <StatCard
            title="Rounds Played"
            value={stats.roundsPlayed}
            icon="flag-checkered"
            iconColor={colors.primary}
          />
          <StatCard
            title="Competitions"
            value={stats.competitionsEntered}
            icon="trophy-outline"
            iconColor={colors.warning}
          />
          <StatCard
            title="Wins"
            value={stats.competitionsWon}
            icon="trophy"
            iconColor={colors.success}
          />
          <StatCard
            title="Holes Played"
            value={stats.holesPlayed}
            icon="golf-tee"
            iconColor={colors.info}
          />
        </View>

        {/* Round Type Breakdown */}
        <SectionHeader title="Round Breakdown" icon="chart-pie" />
        <View style={styles.statsGrid}>
          <StatCard
            title="Competition"
            value={stats.competitionRoundsPlayed}
            subtitle="rounds"
            icon="trophy-outline"
            iconColor={colors.warning}
          />
          <StatCard
            title="Practice"
            value={stats.practiceRoundsPlayed}
            subtitle="rounds"
            icon="golf"
            iconColor={colors.info}
          />
        </View>

        {/* Averages */}
        <SectionHeader title="Averages" icon="chart-line" />
        <View style={styles.statsGrid}>
          <StatCard
            title="Avg Score"
            value={stats.averageGrossScore || '-'}
            subtitle="per round"
            icon="counter"
            iconColor={colors.primary}
          />
          <StatCard
            title="Avg Points"
            value={stats.averageStablefordPoints || '-'}
            subtitle="Stableford"
            icon="star"
            iconColor={colors.warning}
          />
          <StatCard
            title="Per Hole"
            value={stats.averageScorePerHole.toFixed(2) || '-'}
            subtitle="strokes"
            icon="target"
            iconColor={colors.info}
          />
          <StatCard
            title="Par or Better"
            value={`${stats.parOrBetterPercentage}%`}
            subtitle="of holes"
            icon="check-circle"
            iconColor={colors.success}
          />
        </View>

        {/* Putting, FIR, GIR Stats - Shown based on user settings */}
        {(showPutts || showFairwayHit || showGreenInRegulation) && (
          <>
            <SectionHeader title="Game Stats" icon="golf" />
            <View style={styles.statsGrid}>
              {/* Putting Stats */}
              {showPutts && stats.holesWithPuttsRecorded > 0 && (
                <>
                  <StatCard
                    title="Total Putts"
                    value={stats.totalPutts ?? '-'}
                    subtitle={`${stats.holesWithPuttsRecorded} holes`}
                    icon="golf"
                    iconColor={colors.primary}
                  />
                  <StatCard
                    title="Avg Putts"
                    value={stats.averagePuttsPerHole?.toFixed(2) ?? '-'}
                    subtitle="per hole"
                    icon="target"
                    iconColor={colors.info}
                  />
                </>
              )}

              {/* FIR Stats */}
              {showFairwayHit && stats.fairwayOpportunities > 0 && (
                <StatCard
                  title="Fairways Hit"
                  value={`${stats.fairwayPercentage ?? 0}%`}
                  subtitle={`${stats.fairwaysHit ?? 0}/${stats.fairwayOpportunities}`}
                  icon="arrow-right-bold"
                  iconColor={colors.success}
                />
              )}

              {/* GIR Stats */}
              {showGreenInRegulation && stats.girOpportunities > 0 && (
                <StatCard
                  title="Greens in Reg"
                  value={`${stats.girPercentage ?? 0}%`}
                  subtitle={`${stats.greensInRegulation ?? 0}/${stats.girOpportunities}`}
                  icon="flag-checkered"
                  iconColor={colors.birdie}
                />
              )}
            </View>

            {/* Show message if settings are enabled but no data recorded */}
            {showPutts && stats.holesWithPuttsRecorded === 0 && (
              <View style={[styles.noDataCard, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                  No putting data recorded yet. Start tracking putts during your rounds!
                </Text>
              </View>
            )}
            {showFairwayHit && stats.fairwayOpportunities === 0 && (
              <View style={[styles.noDataCard, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                  No fairway data recorded yet. Start tracking fairways hit during your rounds!
                </Text>
              </View>
            )}
            {showGreenInRegulation && stats.girOpportunities === 0 && (
              <View style={[styles.noDataCard, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                  No GIR data recorded yet. Start tracking greens in regulation during your rounds!
                </Text>
              </View>
            )}
          </>
        )}

        {/* Recent Rounds - Basic activity (always visible) */}
        {stats.recentRounds.length > 0 && (
          <>
            <SectionHeader title="Recent Activity" icon="history" />
            <View style={[styles.listCard, { backgroundColor: cardBg }, shadows.sm]}>
              {stats.recentRounds.map((round, index) => (
                <RecentRoundRow
                  key={round.roundId}
                  date={formatDateAustralian(round.date)}
                  courseName={round.courseName}
                  competitionName={round.competitionName}
                  totalGross={round.totalGross}
                  totalPoints={round.totalPoints}
                  isLast={index === stats.recentRounds.length - 1}
                  isPracticeRound={round.isPracticeRound}
                />
              ))}
            </View>
          </>
        )}

        {/* ============================================== */}
        {/* SECTION 2: SCORE DISTRIBUTION - Social+ tier */}
        {/* ============================================== */}

        <SectionHeader title="Score Distribution" icon="chart-bar" />
        <FeatureLock
          feature="score_distribution"
          onUpgradePress={handleScoreDistributionUpgrade}
          lockedMessage="Unlock to see your score breakdown"
        >
          <View style={[styles.card, { backgroundColor: cardBg }, shadows.sm]}>
            <ScoreDistributionBar
              label="Eagles"
              count={stats.scoreDistribution.eagles}
              total={stats.totalScoreDistribution}
              color={colors.eagle}
            />
            <ScoreDistributionBar
              label="Birdies"
              count={stats.scoreDistribution.birdies}
              total={stats.totalScoreDistribution}
              color={colors.birdie}
            />
            <ScoreDistributionBar
              label="Pars"
              count={stats.scoreDistribution.pars}
              total={stats.totalScoreDistribution}
              color={colors.par}
            />
            <ScoreDistributionBar
              label="Bogeys"
              count={stats.scoreDistribution.bogeys}
              total={stats.totalScoreDistribution}
              color={colors.bogey}
            />
            <ScoreDistributionBar
              label="Double Bogeys"
              count={stats.scoreDistribution.doubleBogeys}
              total={stats.totalScoreDistribution}
              color={colors.doubleBogey}
            />
            <ScoreDistributionBar
              label="Triple+"
              count={stats.scoreDistribution.triplePlus}
              total={stats.totalScoreDistribution}
              color={colors.error}
            />
          </View>
        </FeatureLock>

        {/* ============================================== */}
        {/* SECTION 3: ADVANCED ANALYTICS - Premium tier */}
        {/* ============================================== */}

        {/* Performance Trend Chart */}
        {stats.recentRounds.length > 0 && (
          <>
            <SectionHeader title="Performance Trend" icon="trending-up" />
            <FeatureLock
              feature="advanced_stats"
              onUpgradePress={handleAdvancedStatsUpgrade}
              lockedMessage="Unlock performance insights"
            >
              <PerformanceChart rounds={stats.recentRounds} />
            </FeatureLock>
          </>
        )}

        {/* Best Performances */}
        <SectionHeader title="Best Performances" icon="medal" />
        <FeatureLock
          feature="advanced_stats"
          onUpgradePress={handleAdvancedStatsUpgrade}
          lockedMessage="Unlock to see your best rounds"
        >
          <View style={[styles.card, { backgroundColor: cardBg }, shadows.sm]}>
            {stats.bestRound && (
              <PerformanceRow
                icon="trophy"
                iconColor={colors.success}
                label="Best Gross Score"
                value={`${stats.bestRound.totalGross} strokes`}
                subtitle={`${stats.bestRound.courseName} • ${formatDateAustralian(stats.bestRound.date)}`}
              />
            )}

            {stats.bestStablefordRound && (
              <PerformanceRow
                icon="star"
                iconColor={colors.warning}
                label="Best Stableford"
                value={`${stats.bestStablefordRound.totalPoints} points`}
                subtitle={`${stats.bestStablefordRound.courseName} • ${formatDateAustralian(stats.bestStablefordRound.date)}`}
              />
            )}

            {stats.birdieOrBetterPercentage > 0 && (
              <PerformanceRow
                icon="bird"
                iconColor={colors.birdie}
                label="Birdie Rate"
                value={`${stats.birdieOrBetterPercentage}%`}
                subtitle={`${stats.scoreDistribution.eagles + stats.scoreDistribution.birdies} birdies or better`}
              />
            )}
          </View>
        </FeatureLock>

        {/* Favourite Course */}
        {stats.favouriteCourse && (
          <>
            <SectionHeader title="Favourite Course" icon="heart" />
            <FeatureLock
              feature="advanced_stats"
              onUpgradePress={handleAdvancedStatsUpgrade}
              lockedMessage="Unlock course insights"
            >
              <CourseStatsCard
                courseName={stats.favouriteCourse.courseName}
                timesPlayed={stats.favouriteCourse.timesPlayed}
                averageScore={stats.favouriteCourse.averageScore}
                bestScore={stats.favouriteCourse.bestScore}
              />
            </FeatureLock>
          </>
        )}

        {/* Other Courses Played */}
        {stats.courseStats.length > 1 && (
          <>
            <SectionHeader title="Courses Played" icon="map-marker-multiple" />
            <FeatureLock
              feature="advanced_stats"
              onUpgradePress={handleAdvancedStatsUpgrade}
              lockedMessage="Unlock course breakdown"
            >
              <View style={[styles.listCard, { backgroundColor: cardBg }, shadows.sm]}>
                {stats.courseStats.slice(0, 5).map((course, index) => (
                  <View
                    key={course.courseId}
                    style={[
                      styles.coursesListRow,
                      { borderBottomColor: colors.borderLight },
                      index === Math.min(stats.courseStats.length, 5) - 1 && styles.coursesListRowLast,
                    ]}
                  >
                    <Text
                      style={[styles.coursesListName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {course.courseName}
                    </Text>
                    <View style={styles.coursesListStats}>
                      <Text style={[styles.coursesListPlayed, { color: colors.primary }]}>
                        {course.timesPlayed}x
                      </Text>
                      <Text style={[styles.coursesListAvg, { color: colors.textSecondary }]}>
                        Avg: {course.averageScore}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </FeatureLock>
          </>
        )}

        <View style={styles.footer} />
      </ScrollView>

      {/* Upgrade Prompt Modal */}
      {upgradePromptConfig && (
        <UpgradePrompt
          config={upgradePromptConfig}
          onUpgrade={handleNavigateToSubscription}
          onDismiss={() => setUpgradePromptConfig(null)}
          visible={!!upgradePromptConfig}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },

  // Generic card style
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },

  // List card style (no padding, contains rows)
  listCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  // Courses List
  coursesListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  coursesListRowLast: {
    borderBottomWidth: 0,
  },
  coursesListName: {
    ...typography.body,
    flex: 1,
    marginRight: spacing.md,
  },
  coursesListStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  coursesListPlayed: {
    ...typography.smallBold,
  },
  coursesListAvg: {
    ...typography.small,
  },

  // No Data Card (for empty stats)
  noDataCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noDataText: {
    ...typography.small,
    textAlign: 'center',
  },

  // Footer
  footer: {
    height: spacing.xxxl,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.lg,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    ...typography.bodyBold,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
});
