// src/components/common/ScopeChips.tsx
import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';

export interface ScopeChipItem<T extends string = string> {
  /** Unique identifier for the chip */
  key: T;
  /** Small uppercase eyebrow line (e.g. "ROUND 1") */
  eyebrow: string;
  /** Main label line (e.g. "Team Stbf") */
  label: string;
}

export interface ScopeChipsProps<T extends string = string> {
  chips: ScopeChipItem<T>[];
  selected: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Horizontally scrollable two-line chip switcher, used as the round-scope
 * selector on the Standings tab (Overall / Round 1 / Round 2 / ...).
 */
export const ScopeChips = React.memo(function ScopeChips<
  T extends string = string,
>({ chips, selected, onChange, style, testID }: ScopeChipsProps<T>) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, style]}
      contentContainerStyle={styles.scrollContent}
      testID={testID}
    >
      {chips.map((chip) => {
        const isSelected = chip.key === selected;
        return (
          <TouchableOpacity
            key={chip.key}
            onPress={() => onChange(chip.key)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? colors.primaryBackground
                  : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${chip.eyebrow} ${chip.label}`}
          >
            <Text
              style={[
                styles.eyebrow,
                { color: isSelected ? colors.primary : colors.textTertiary },
              ]}
              numberOfLines={1}
            >
              {chip.eyebrow}
            </Text>
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? colors.textPrimary : colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}) as <T extends string = string>(props: ScopeChipsProps<T>) => React.ReactElement;

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: 2,
  },
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    minWidth: 74,
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
});

export default ScopeChips;
