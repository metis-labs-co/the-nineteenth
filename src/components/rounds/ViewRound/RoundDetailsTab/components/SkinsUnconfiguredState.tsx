/**
 * SkinsUnconfiguredState - Prompt to set up a skins game
 *
 * Displayed when a round has no skins game configured and the round is upcoming.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

export function SkinsUnconfiguredState() {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: colors.gray100 }]}>
        <Icon source="dice-multiple-outline" size={28} color={colors.gray400} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          No Skins Game
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Tap to add a skins side-bet to this round
        </Text>
      </View>
      <Icon source="chevron-right" size={24} color={colors.gray400} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
  },
  description: {
    ...typography.small,
    marginTop: 2,
  },
});
