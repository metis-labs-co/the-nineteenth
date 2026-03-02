/**
 * LeagueRecordsSection - Section F: League records
 *
 * Best differential, lowest gross, most rounds, most improved.
 * Reuses PerformanceRow component.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SectionHeader } from '@/components/common/SectionHeader';
import { PerformanceRow } from '@/components/statistics';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface LeagueRecords {
  best_differential: { value: number; player_name: string; date: string } | null;
  lowest_gross: { value: number; player_name: string; date: string; course: string } | null;
  most_rounds: { count: number; player_name: string } | null;
  most_improved: { improvement: number; player_name: string } | null;
}

interface LeagueRecordsSectionProps {
  records: LeagueRecords;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export const LeagueRecordsSection = React.memo(function LeagueRecordsSection({
  records,
}: LeagueRecordsSectionProps) {
  const colors = useThemeColors();

  const hasAnyRecord =
    records.best_differential ||
    records.lowest_gross ||
    records.most_rounds ||
    records.most_improved;

  if (!hasAnyRecord) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="League Records" icon="trophy-outline" />
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        {records.best_differential && (
          <PerformanceRow
            icon="trophy"
            iconColor={colors.warning}
            label="BEST DIFFERENTIAL"
            value={records.best_differential.value.toFixed(1)}
            subtitle={`${records.best_differential.player_name} - ${formatDate(records.best_differential.date)}`}
          />
        )}
        {records.lowest_gross && (
          <PerformanceRow
            icon="arrow-down-bold"
            iconColor={colors.success}
            label="LOWEST GROSS SCORE"
            value={records.lowest_gross.value}
            subtitle={`${records.lowest_gross.player_name} @ ${records.lowest_gross.course}`}
          />
        )}
        {records.most_rounds && (
          <PerformanceRow
            icon="counter"
            iconColor={colors.primary}
            label="MOST ROUNDS PLAYED"
            value={records.most_rounds.count}
            subtitle={records.most_rounds.player_name}
          />
        )}
        {records.most_improved && (
          <PerformanceRow
            icon="trending-down"
            iconColor={colors.birdie}
            label="MOST IMPROVED"
            value={`-${records.most_improved.improvement.toFixed(1)}`}
            subtitle={records.most_improved.player_name}
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
});

export default LeagueRecordsSection;
