/**
 * ScoringTab - Scoring tab content for My Statistics
 *
 * Displays:
 * - Score Distribution (Social+ tier)
 * - Par Type Stats (Social+ tier)
 * - Performance Trend chart (Premium tier)
 * - Best Performances (Premium tier)
 * - Favourite Course (Premium tier)
 * - Courses Played (Premium tier)
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows, borderRadius } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import {
  ScoreDistributionBar,
  ParTypeStatsSection,
  PerformanceChart,
  PerformanceRow,
  CourseStatsCard,
} from '@/components/statistics';
import { FeatureLock } from '@/components/subscription';
import { formatDateAustralian } from '@/utils/formatting';
import type { PlayerStatistics } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

interface ScoringTabProps {
  stats: PlayerStatistics;
  onUpgradePress: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const ScoringTab = React.memo(function ScoringTab({
  stats,
  onUpgradePress,
}: ScoringTabProps) {
  const colors = useThemeColors();
  const cardBg = colors.surface;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleCoursePress = useCallback(
    (courseId: string, courseName: string) => {
      navigation.navigate('CourseStatistics', { courseId, courseName });
    },
    [navigation]
  );

  return (
    <>
      {/* Score Distribution - Social+ tier */}
      <SectionHeader title="Score Distribution" icon="chart-bar" />
      <FeatureLock
        feature="score_distribution"
        onUpgradePress={onUpgradePress}
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

      {/* Par Type Stats - Social+ tier */}
      <View style={styles.sectionGap} />
      <FeatureLock feature="detailed_stats" onUpgradePress={onUpgradePress}>
        <ParTypeStatsSection
          par3Stats={stats.par3Stats}
          par4Stats={stats.par4Stats}
          par5Stats={stats.par5Stats}
        />
      </FeatureLock>

      {/* Performance Trend Chart - Premium tier */}
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

      {/* Best Performances - Premium tier */}
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

          {stats.bestNineHoleRound && (
            <PerformanceRow
              icon="numeric-9-circle-outline"
              iconColor={colors.primary}
              label="Best 9-Hole Round"
              value={`${stats.bestNineHoleRound.totalGross} strokes`}
              subtitle={`${stats.bestNineHoleRound.courseName} • ${formatDateAustralian(stats.bestNineHoleRound.date)}`}
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

      {/* Favourite Course - Premium tier */}
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

      {/* Courses Played - Premium tier */}
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
                <TouchableOpacity
                  key={course.courseId}
                  style={[
                    styles.coursesListRow,
                    { borderBottomColor: colors.borderLight },
                    index === Math.min(stats.courseStats.length, 5) - 1 && styles.coursesListRowLast,
                  ]}
                  onPress={() => handleCoursePress(course.courseId, course.courseName)}
                  activeOpacity={0.7}
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
                    <Icon source="chevron-right" size={16} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
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

export default ScoringTab;
