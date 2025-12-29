/**
 * RoundListEmpty - Empty state when no rounds match filters
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconGolf } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RoundTab } from '../types';

interface RoundListEmptyProps {
  selectedTab: RoundTab;
}

export function RoundListEmpty({ selectedTab }: RoundListEmptyProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.gray100 }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
        <IconGolf size={48} color={colors.gray400} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {selectedTab === 'active' ? 'No Active Rounds' : 'No Completed Rounds'}
      </Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {selectedTab === 'active'
          ? 'Tap the button above to start scoring a round'
          : 'Your completed rounds will appear here'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  text: {
    ...typography.body,
    textAlign: 'center',
  },
});
