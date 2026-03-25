/**
 * DifficultyLevelSelector - 4 selectable target difficulty cards
 *
 * Shows Easy/Standard/Challenge/Heroic with calculated target scores.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { DifficultyLevel } from '@/types/database';
import type { TargetLevel } from '@/utils/partnershipTarget';

interface DifficultyLevelSelectorProps {
  levels: TargetLevel[];
  selectedLevel: DifficultyLevel;
  onSelectLevel: (level: DifficultyLevel) => void;
}

const LEVEL_ICONS: Record<DifficultyLevel, string> = {
  easy: 'emoticon-happy-outline',
  standard: 'target',
  challenge: 'fire',
  heroic: 'lightning-bolt',
};

export const DifficultyLevelSelector = React.memo(function DifficultyLevelSelector({
  levels,
  selectedLevel,
  onSelectLevel,
}: DifficultyLevelSelectorProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {levels.map((level) => {
        const isSelected = selectedLevel === level.level;

        return (
          <TouchableOpacity
            key={level.level}
            onPress={() => onSelectLevel(level.level)}
            style={[
              styles.card,
              {
                backgroundColor: isSelected ? colors.surface : colors.surface,
                borderColor: isSelected ? level.color : colors.border,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
            activeOpacity={0.7}
            accessibilityLabel={`${level.label} difficulty, target ${level.target}`}
            accessibilityState={{ selected: isSelected }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: level.color + '20' }]}>
                <Icon source={LEVEL_ICONS[level.level]} size={20} color={level.color} />
              </View>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {level.label}
              </Text>
              {isSelected && (
                <Icon source="check-circle" size={18} color={level.color} />
              )}
            </View>

            <Text style={[styles.target, { color: level.color }]}>
              {level.target}
            </Text>

            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {level.buffer > 0 ? `+${level.buffer}` : level.buffer === 0 ? 'Even' : level.buffer} strokes
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.smallBold,
    flex: 1,
  },
  target: {
    ...typography.h2,
    marginTop: spacing.xs,
  },
  description: {
    ...typography.small,
  },
});

export default DifficultyLevelSelector;
