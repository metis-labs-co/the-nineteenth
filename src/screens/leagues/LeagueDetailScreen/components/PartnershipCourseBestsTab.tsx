/**
 * PartnershipCourseBestsTab - Best scores per course for each partnership
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { EmptyState } from '@/components/common';
import type { PartnershipCourseBest } from '@/types/database';

interface PartnershipCourseBestsTabProps {
  courseBests: PartnershipCourseBest[];
}

interface GroupedCourse {
  courseId: string | null;
  courseName: string;
  partnerships: PartnershipCourseBest[];
}

export default function PartnershipCourseBestsTab({
  courseBests,
}: PartnershipCourseBestsTabProps) {
  const colors = useThemeColors();

  // Group by course
  const grouped = useMemo((): GroupedCourse[] => {
    const map = new Map<string, GroupedCourse>();
    for (const cb of courseBests) {
      const key = cb.course_name;
      if (!map.has(key)) {
        map.set(key, { courseId: cb.course_id, courseName: cb.course_name, partnerships: [] });
      }
      map.get(key)!.partnerships.push(cb);
    }
    return Array.from(map.values());
  }, [courseBests]);

  if (!grouped.length) {
    return (
      <EmptyState
        icon="golf"
        title="No Course Data"
        message="Tag rounds to see per-course best scores."
      />
    );
  }

  return (
    <View style={styles.container}>
      {grouped.map((group) => (
        <View
          key={group.courseName}
          style={[styles.courseCard, { backgroundColor: colors.surface }, shadows.sm]}
        >
          <Text style={[styles.courseTitle, { color: colors.textPrimary }]}>
            {group.courseName}
          </Text>

          {/* Column headers */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerText, { color: colors.textSecondary, flex: 1 }]}>
              Partnership
            </Text>
            <Text style={[styles.headerText, { color: colors.textSecondary, width: 50, textAlign: 'right' }]}>
              Best
            </Text>
            <Text style={[styles.headerText, { color: colors.textSecondary, width: 50, textAlign: 'right' }]}>
              Diff
            </Text>
            <Text style={[styles.headerText, { color: colors.textSecondary, width: 40, textAlign: 'right' }]}>
              Rds
            </Text>
          </View>

          {group.partnerships.map((p) => {
            const isUnder = p.best_differential <= 0;
            return (
              <View key={p.partnership_id} style={[styles.row, { borderTopColor: colors.border }]}>
                <Text style={[styles.partnershipName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {p.partnership_name ?? 'Partnership'}
                </Text>
                <Text style={[styles.statValue, { color: colors.textPrimary, width: 50 }]}>
                  {p.best_combined_gross}
                </Text>
                <Text style={[styles.statValue, { color: isUnder ? colors.success : colors.error, width: 50 }]}>
                  {p.best_differential > 0 ? '+' : ''}{p.best_differential}
                </Text>
                <Text style={[styles.statValue, { color: colors.textSecondary, width: 40 }]}>
                  {p.times_played}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  courseCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  courseTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  headerText: {
    ...typography.small,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  partnershipName: {
    ...typography.small,
    flex: 1,
  },
  statValue: {
    ...typography.smallBold,
    textAlign: 'right',
  },
});
