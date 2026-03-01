/**
 * MyCardTab - Eclectic league "My Card" showing composite scorecard
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { EmptyState } from '@/components/common/EmptyState';
import EclecticScorecardView from '@/components/leagues/EclecticScorecardView';
import type { EclecticBestScore, EclecticScoring } from '@/types/database';

interface CourseHole {
  hole_number: number;
  par: number;
  stroke_index?: number;
}

interface MyCardTabProps {
  bestScores: EclecticBestScore[];
  courseHoles: CourseHole[];
  courseName: string;
  scoring: EclecticScoring;
  isArchived: boolean;
  onTagRound: () => void;
}

export default function MyCardTab({
  bestScores,
  courseHoles,
  courseName,
  scoring,
  isArchived,
  onTagRound,
}: MyCardTabProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {!isArchived && (
        <TouchableOpacity
          onPress={onTagRound}
          style={[styles.tagButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
        >
          <Icon source="plus" size={20} color={colors.white} />
          <Text style={[styles.tagButtonText, { color: colors.white }]}>
            Tag a Round
          </Text>
        </TouchableOpacity>
      )}

      {courseHoles.length > 0 ? (
        <EclecticScorecardView
          bestScores={bestScores}
          courseHoles={courseHoles}
          scoring={scoring}
          courseName={courseName}
        />
      ) : (
        <EmptyState
          title="Loading Course Data"
          message="Course data is loading..."
          icon="golf"
          compact
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  tagButtonText: {
    ...typography.bodyBold,
  },
});
