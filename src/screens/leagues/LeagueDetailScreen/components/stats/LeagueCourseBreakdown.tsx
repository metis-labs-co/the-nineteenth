/**
 * LeagueCourseBreakdown - Section E: Top 5 courses by times played
 *
 * Reuses CourseStatsCard component.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SectionHeader } from '@/components/common/SectionHeader';
import { CourseStatsCard } from '@/components/statistics';
import { spacing } from '@/constants/theme';

interface CourseStatData {
  course_name: string;
  times_played: number;
  avg_gross: number;
  best_gross: number;
}

interface LeagueCourseBreakdownProps {
  courseStats: CourseStatData[];
}

export const LeagueCourseBreakdown = React.memo(function LeagueCourseBreakdown({
  courseStats,
}: LeagueCourseBreakdownProps) {
  if (!courseStats || courseStats.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Course Breakdown" icon="map-marker-multiple" />
      <View style={styles.list}>
        {courseStats.map((course) => (
          <View key={course.course_name} style={styles.cardWrapper}>
            <CourseStatsCard
              courseName={course.course_name}
              timesPlayed={course.times_played}
              averageScore={course.avg_gross}
              bestScore={course.best_gross}
            />
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  cardWrapper: {
    // CourseStatsCard handles its own styling
  },
});

export default LeagueCourseBreakdown;
