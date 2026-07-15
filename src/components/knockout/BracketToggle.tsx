/**
 * BracketToggle - Toggle between Main and Consolation brackets
 *
 * Segmented track per the Competition Details redesign: surfaceVariant
 * track, active segment lifted on a surface background with a soft shadow.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows } from '@/constants/theme';
import type { BracketType } from '@/types/database';

export interface BracketToggleProps {
  value: BracketType;
  onValueChange: (value: BracketType) => void;
  hasConsolation: boolean;
  style?: StyleProp<ViewStyle>;
}

const SEGMENTS: { value: BracketType; label: string }[] = [
  { value: 'main', label: 'Main draw' },
  { value: 'consolation', label: 'Consolation' },
];

export const BracketToggle = React.memo(function BracketToggle({
  value,
  onValueChange,
  hasConsolation,
  style,
}: BracketToggleProps) {
  const colors = useThemeColors();

  if (!hasConsolation) return null;

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceVariant }, style]}>
      {SEGMENTS.map(segment => {
        const isActive = segment.value === value;

        return (
          <TouchableOpacity
            key={segment.value}
            onPress={() => onValueChange(segment.value)}
            activeOpacity={0.7}
            hitSlop={{ top: 5, bottom: 5 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${segment.label}${isActive ? ', selected' : ''}`}
            style={[
              styles.segment,
              isActive && [styles.segmentActive, { backgroundColor: colors.surface }],
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: isActive ? colors.textPrimary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {segment.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    ...shadows.sm,
  },
  segmentLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
