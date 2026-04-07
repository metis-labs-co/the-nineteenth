/**
 * CourseHolesTab - Holes tab with selector strip and per-hole detail
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { HoleSelectorStrip } from './HoleSelectorStrip';
import { HoleDetailView } from './HoleDetailView';
import type { CourseStatisticsData } from '@/hooks/playerStatistics';

interface CourseHolesTabProps {
  stats: CourseStatisticsData;
}

export const CourseHolesTab = React.memo(function CourseHolesTab({
  stats,
}: CourseHolesTabProps) {
  const colors = useThemeColors();
  const [selectedHole, setSelectedHole] = useState(
    stats.holeStats.length > 0 ? stats.holeStats[0].holeNumber : 1
  );

  const selectedHoleData = stats.holeStats.find((h) => h.holeNumber === selectedHole);

  if (stats.holeStats.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No hole data available yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      <HoleSelectorStrip
        holeStats={stats.holeStats}
        selectedHole={selectedHole}
        onSelectHole={setSelectedHole}
      />
      {selectedHoleData && <HoleDetailView hole={selectedHoleData} />}
    </>
  );
});

const styles = StyleSheet.create({
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },
});
