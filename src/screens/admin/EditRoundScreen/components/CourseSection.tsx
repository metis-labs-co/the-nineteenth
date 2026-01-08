/**
 * CourseSection - Course display and selection
 *
 * When a course is set, displays the course name.
 * When no course is set (blank round), shows a prompt to add a course.
 * Tapping opens the course selection modal.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '@/constants/theme';

interface CourseSectionProps {
  courseName: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function CourseSection({ courseName, onPress, disabled }: CourseSectionProps) {
  const colors = useThemeColors();
  const hasCourse = !!courseName;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      accessibilityLabel={hasCourse ? `Course: ${courseName}. Tap to change` : 'Tap to select a course'}
      accessibilityRole="button"
      testID="course-section"
    >
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: hasCourse ? colors.primaryLighter : colors.gray100 }]}>
          <Icon source="golf" size={24} color={hasCourse ? colors.primary : colors.gray400} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Course</Text>
          {hasCourse ? (
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {courseName}
            </Text>
          ) : (
            <Text style={[styles.placeholder, { color: colors.primary }]}>
              Tap to select a course
            </Text>
          )}
        </View>
        {onPress && (
          <Icon source="chevron-right" size={24} color={colors.gray400} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  label: {
    ...typography.caption,
    marginBottom: 2,
  },
  name: {
    ...typography.bodyBold,
  },
  placeholder: {
    ...typography.body,
  },
});
