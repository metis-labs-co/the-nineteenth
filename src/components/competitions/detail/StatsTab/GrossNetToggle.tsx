/**
 * GrossNetToggle - pill segment control for switching scoring between
 * gross strokes and handicap-adjusted net strokes.
 *
 * Only affects categories in the Scoring group. Rendered conditionally
 * by the parent StatsTab when the competition has a handicap-based format.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { ScoringMode } from '@/hooks/competitionStatistics';

export interface GrossNetToggleProps {
  value: ScoringMode;
  onChange: (mode: ScoringMode) => void;
}

export const GrossNetToggle = React.memo(function GrossNetToggle({
  value,
  onChange,
}: GrossNetToggleProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceVariant },
      ]}
      accessibilityRole="tablist"
    >
      <Segment
        label="Gross"
        active={value === 'gross'}
        onPress={() => onChange('gross')}
      />
      <Segment
        label="Net"
        active={value === 'net'}
        onPress={() => onChange('net')}
      />
    </View>
  );
});

interface SegmentProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const Segment = React.memo(function Segment({
  label,
  active,
  onPress,
}: SegmentProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} scoring`}
      style={[
        styles.segment,
        active && { backgroundColor: colors.surface },
      ]}
    >
      <Text
        style={[
          styles.segmentLabel,
          {
            color: active ? colors.textPrimary : colors.textSecondary,
            fontWeight: active ? '600' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  segment: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    minWidth: 72,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    ...typography.small,
  },
});

export default GrossNetToggle;
