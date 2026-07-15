/**
 * BracketStageIndicator - Stage pager buttons
 *
 * Equal-width bordered buttons per the Competition Details redesign:
 * active = primary fill with white text, inactive = surface with border.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';

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
    <View style={styles.container}>
      {stages.map((s) => {
        const isActive = s.stage === activeStage;

        return (
          <TouchableOpacity
            key={s.stage}
            onPress={() => onStagePress(s.stage)}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[
              styles.stageButton,
              {
                backgroundColor: isActive ? colors.primary : colors.surface,
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  stageButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '800',
  },
});
