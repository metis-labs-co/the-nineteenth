/**
 * GameTypeSection - Game format selection
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { RoundGameTypeSelector } from '@/components/competitionWizard/create';
import type { GameType } from '@/types/database.types';

interface GameTypeSectionProps {
  value: GameType;
  onChange: (gameType: GameType) => void;
  disabled?: boolean;
  allowedGameTypes?: GameType[];
  onUpgradePress: () => void;
}

export function GameTypeSection({
  value,
  onChange,
  disabled,
  allowedGameTypes,
  onUpgradePress,
}: GameTypeSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Format *</Text>
      <RoundGameTypeSelector
        value={value}
        onChange={onChange}
        disabled={disabled}
        allowedGameTypes={allowedGameTypes}
        onUpgradePress={onUpgradePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
});
