/**
 * CourseStatsCard - Card displaying stats for a favourite or specific course
 *
 * Shows course name with rounds played, average score, and best score.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// =====================================================
// TYPES
// =====================================================

export interface CourseStatsCardProps {
  /** Course name */
  courseName: string;
  /** Number of times played */
  timesPlayed: number;
  /** Average score at this course */
  averageScore: number;
  /** Best score at this course */
  bestScore: number;
}

// =====================================================
// COMPONENT
// =====================================================

export const CourseStatsCard = React.memo(function CourseStatsCard({
  courseName,
  timesPlayed,
  averageScore,
  bestScore,
}: CourseStatsCardProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
      <View style={styles.header}>
        <Icon source="golf" size={24} color={colors.primary} />
        <Text style={[styles.courseName, { color: colors.textPrimary }]}>{courseName}</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{timesPlayed}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rounds</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{averageScore}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Score</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{bestScore}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Best</Text>
        </View>
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  courseName: {
    ...typography.h4,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.h2,
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
  },
});

export default CourseStatsCard;
