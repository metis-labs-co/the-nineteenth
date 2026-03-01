/**
 * CoursesSection - Displays courses used in the competition
 *
 * Shows:
 * - Section header with course count
 * - List of unique courses from rounds
 * - Empty state when no courses
 * - Tappable course cards (if onViewCourse provided)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { SectionHeader } from '@/components/common';
import { CourseCard } from '@/components/courses/CourseCard';
import type { CoursesSectionProps } from './types';

export function CoursesSection({ courses, onViewCourse }: CoursesSectionProps) {
  const colors = useThemeColors();

  if (courses.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Courses" />
        <View style={styles.emptyCoursesCard}>
          <Text style={[styles.emptyCoursesText, { color: colors.textSecondary }]}>
            No courses have been added to this competition yet.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={`Courses (${courses.length})`} />
      <View style={styles.coursesContainer}>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={{ ...course, is_favorite: false }}
            onPress={onViewCourse ? () => onViewCourse(course) : undefined}
            showFavoriteButton={false}
            showChevron={!!onViewCourse}
            venueName={course.clubs?.name}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
  },
  coursesContainer: {
    gap: spacing.md,
  },
  emptyCoursesCard: {
    padding: spacing.lg,
  },
  emptyCoursesText: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default CoursesSection;
