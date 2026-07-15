/**
 * StatCategoryGroup - visually grouped set of StatCategoryCards.
 *
 * Design (competition-details redesign, Stats tab): an uppercase
 * SectionLabel heading followed by a column of individual stat cards.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SectionLabel } from '@/components/common';
import { spacing } from '@/constants/theme';
import type { CategoryGroup } from '@/hooks/competitionStatistics';
import { StatCategoryCard } from './StatCategoryCard';

export interface StatCategoryGroupProps {
  group: CategoryGroup;
}

export const StatCategoryGroup = React.memo(function StatCategoryGroup({
  group,
}: StatCategoryGroupProps) {
  return (
    <View style={styles.section}>
      <SectionLabel>{group.title}</SectionLabel>
      <View style={styles.cards}>
        {group.categories.map((category) => (
          <StatCategoryCard key={category.key} category={category} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg + 2,
  },
  cards: {
    gap: 10,
  },
});

export default StatCategoryGroup;
