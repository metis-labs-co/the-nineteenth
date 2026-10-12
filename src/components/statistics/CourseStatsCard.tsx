/**
 * CourseStatsCard - Card displaying stats for a favourite or specific course
 *
 * Shows course name with rounds played, average score, and best score.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
  /** Optional tap handler. When provided, the card becomes a button. */
  onPress?: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const CourseStatsCard = React.memo(function CourseStatsCard({
  courseName,
  timesPlayed,
  averageScore,
  bestScore,
  onPress,
}: CourseStatsCardProps) {
  const colors = useThemeColors();

  const content = (
    <>
      <View style={styles.header}>
        <Icon source="golf" size={24} color={colors.primary} />
        <Text style={[styles.courseName, { color: colors.textPrimary }]}>{courseName}</Text>
        {onPress && <Icon source="chevron-right" size={20} color={colors.textTertiary} />}
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
    </>
  );

  const cardStyle = [styles.card, { backgroundColor: colors.surface }, shadows.sm];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${courseName}: ${timesPlayed} rounds, average ${averageScore}, best ${bestScore}`}
        accessibilityHint="Opens your statistics at this course"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
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
