/**
 * AdvancedAnalytics - Premium analytics section (Premium tier feature)
 *
 * Displays:
 * - Performance trend chart
 * - Best performances (best gross, best Stableford, birdie rate)
 * - Favourite course stats
 * - Courses played breakdown
 *
 * All sections are gated behind Premium tier via FeatureLock.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows, borderRadius } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { PerformanceChart, PerformanceRow, CourseStatsCard } from '@/components/statistics';
import { FeatureLock } from '@/components/subscription';
import { formatDateAustralian } from '@/utils/formatting';
import type { PlayerStatistics } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

interface AdvancedAnalyticsProps {
  stats: PlayerStatistics;
  onUpgradePress: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const AdvancedAnalytics = React.memo(function AdvancedAnalytics({
  stats,
  onUpgradePress,
}: AdvancedAnalyticsProps) {
  const colors = useThemeColors();
  const cardBg = colors.surface;

  return (
    <>
      {/* Performance Trend Chart */}
      {stats.recentRounds.length > 0 && (
        <>
          <View style={styles.sectionGap} />
          <SectionHeader title="Performance Trend" icon="trending-up" />
          <FeatureLock
            feature="advanced_stats"
            onUpgradePress={onUpgradePress}
            lockedMessage="Unlock performance insights"
          >
            <PerformanceChart rounds={stats.recentRounds} />
          </FeatureLock>
        </>
      )}

      {/* Best Performances */}
      <View style={styles.sectionGap} />
      <SectionHeader title="Best Performances" icon="medal" />
      <FeatureLock
        feature="advanced_stats"
        onUpgradePress={onUpgradePress}
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
          <View style={styles.sectionGap} />
          <SectionHeader title="Favourite Course" icon="heart" />
          <FeatureLock
            feature="advanced_stats"
            onUpgradePress={onUpgradePress}
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
          <View style={styles.sectionGap} />
          <SectionHeader title="Courses Played" icon="map-marker-multiple" />
          <FeatureLock
            feature="advanced_stats"
            onUpgradePress={onUpgradePress}
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
    </>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  sectionGap: {
    marginTop: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  listCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
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
});

export default AdvancedAnalytics;
