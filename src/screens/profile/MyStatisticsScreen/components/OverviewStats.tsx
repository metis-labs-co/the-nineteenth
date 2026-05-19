/**
 * OverviewStats - Overview statistics section
 *
 * Displays:
 * - Overview grid (rounds played, competitions, wins, holes)
 * - Round breakdown (competition vs practice)
 * - Averages (score, points, per hole, par or better)
 * - Recent rounds activity list
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows, borderRadius } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { StatCard, RecentRoundRow } from '@/components/statistics';
import { formatDateLong } from '@/utils/formatting';
import { GAME_TYPE_LABELS } from '@/constants/statusConfig';
import { GAME_TYPE_DESCRIPTIONS } from '@/constants/gameTypeDescriptions';
import type { GameType } from '@/types/database/enums';
import type { PlayerStatistics } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

interface OverviewStatsProps {
  stats: PlayerStatistics;
}

// =====================================================
// COMPONENT
// =====================================================

export const OverviewStats = React.memo(function OverviewStats({ stats }: OverviewStatsProps) {
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
      <View style={styles.sectionGap} />
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
        <StatCard
          title="Match Play"
          value={stats.matchPlayRoundsPlayed}
          subtitle="rounds"
          icon="sword-cross"
          iconColor={colors.error}
        />
        <StatCard
          title="Handicap"
          value={stats.handicapRoundsPlayed}
          subtitle="rounds"
          icon="scale-balance"
          iconColor={colors.success}
        />
        {stats.nineHoleRoundsPlayed > 0 && (
          <StatCard
            title="9-Hole"
            value={stats.nineHoleRoundsPlayed}
            subtitle="rounds"
            icon="numeric-9-circle-outline"
            iconColor={colors.primary}
          />
        )}
      </View>

      {/* Game Type Breakdown */}
      {Object.keys(stats.gameTypeBreakdown).length > 0 && (
        <>
          <View style={styles.sectionGap} />
          <SectionHeader title="Game Type Breakdown" icon="format-list-bulleted" />
          <View style={styles.statsGrid}>
            {Object.entries(stats.gameTypeBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([gameType, count]) => (
                <StatCard
                  key={gameType}
                  title={GAME_TYPE_LABELS[gameType as GameType] ?? gameType}
                  value={count}
                  subtitle="rounds"
                  icon={GAME_TYPE_DESCRIPTIONS[gameType as GameType]?.icon ?? 'golf'}
                  iconColor={colors.primary}
                />
              ))}
          </View>
        </>
      )}

      {/* Averages */}
      <View style={styles.sectionGap} />
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

      {/* Recent Rounds */}
      {stats.recentRounds.length > 0 && (
        <>
          <View style={styles.sectionGap} />
          <SectionHeader title="Recent Activity" icon="history" />
          <View style={[styles.listCard, { backgroundColor: cardBg }, shadows.sm]}>
            {stats.recentRounds.map((round, index) => (
              <RecentRoundRow
                key={round.roundId}
                date={formatDateLong(round.date)}
                courseName={round.courseName}
                clubName={round.clubName}
                competitionName={round.competitionName}
                totalGross={round.totalGross}
                totalPoints={round.totalPoints}
                gameType={round.gameType}
                isLast={index === stats.recentRounds.length - 1}
                isPracticeRound={round.isPracticeRound}
                isHandicapRound={round.isHandicapRound}
                onPress={() => handleCoursePress(round.courseId, round.courseName)}
              />
            ))}
          </View>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  listCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

export default OverviewStats;
