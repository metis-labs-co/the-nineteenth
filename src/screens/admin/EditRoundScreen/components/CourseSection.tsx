/**
 * CourseSection - Read-only course information display
 * Uses InfoCard component for consistent styling
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { InfoCard } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { typography, spacing } from '@/constants/theme';

interface CourseSectionProps {
  courseName: string;
}

export function CourseSection({ courseName }: CourseSectionProps) {
  const colors = useThemeColors();

  return (
    <InfoCard
      title="Course"
      icon="golf"
      style={styles.container}
      testID="course-section"
    >
      <Text style={[styles.name, { color: colors.textPrimary }]}>
        {courseName}
      </Text>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.bodyBold,
  },
});
