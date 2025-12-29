/**
 * CourseSection - Read-only course information display
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface CourseSectionProps {
  courseName: string;
}

export function CourseSection({ courseName }: CourseSectionProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primaryLighter }]}>
          <Icon source="golf" size={24} color={colors.primary} />
        </View>
        <View style={styles.details}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Course
          </Text>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {courseName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginLeft: spacing.md,
  },
  label: {
    ...typography.caption,
  },
  name: {
    ...typography.bodyBold,
    marginTop: 2,
  },
});
