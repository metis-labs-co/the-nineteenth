/**
 * BracketStageIndicator - Dot indicators showing current stage
 *
 * Shows stage name labels with active dot indicator for current stage.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

export interface BracketStageIndicatorProps {
  stages: { stage: number; stageName: string }[];
  activeStage: number;
  onStagePress: (stage: number) => void;
}

export const BracketStageIndicator = React.memo(function BracketStageIndicator({
  stages,
  activeStage,
  onStagePress,
}: BracketStageIndicatorProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {stages.map((s) => {
        const isActive = s.stage === activeStage;

        return (
          <TouchableOpacity
            key={s.stage}
            onPress={() => onStagePress(s.stage)}
            activeOpacity={0.7}
            style={[
              styles.indicator,
              {
                backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={s.stageName}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.white : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {s.stageName}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  indicator: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  label: {
    ...typography.small,
  },
});
