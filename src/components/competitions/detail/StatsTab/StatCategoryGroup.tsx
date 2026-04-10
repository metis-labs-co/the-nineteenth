/**
 * StatCategoryGroup - visually grouped set of StatCategoryCards.
 *
 * Renders a SectionHeader followed by a rounded card containing each
 * category. Matches the visual pattern of LeagueRecordsSection.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SectionHeader } from '@/components/common/SectionHeader';
import { borderRadius, shadows, spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { CategoryGroup } from '@/hooks/competitionStatistics';
import { StatCategoryCard } from './StatCategoryCard';

export interface StatCategoryGroupProps {
  group: CategoryGroup;
}

export const StatCategoryGroup = React.memo(function StatCategoryGroup({
  group,
}: StatCategoryGroupProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <SectionHeader title={group.title} icon={group.icon} />
      <View
        style={[
          styles.card,
          shadows.sm,
          { backgroundColor: colors.surface },
        ]}
      >
        {group.categories.map((category, index) => (
          <StatCategoryCard
            key={category.key}
            category={category}
            isLast={index === group.categories.length - 1}
          />
        ))}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
});

export default StatCategoryGroup;
