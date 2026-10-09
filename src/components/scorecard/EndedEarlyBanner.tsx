/**
 * EndedEarlyBanner — "Ended after N of M" strip for a round ended early.
 *
 * Scoring screens pass onFinish (→ their finish screen) to show a "Finish"
 * action; the finish screens (Review, Match Play Scorecard — B7a) omit it.
 * Ending is final: there is no Resume.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { formatEndedEarlyLabel } from '@/utils/roundShape';
import type { NineType } from '@/types/database/enums';

export interface EndedEarlyBannerProps {
  holesPlayed: number;
  nineType: NineType;
  onFinish?: () => void;
}

export function EndedEarlyBanner({ holesPlayed, nineType, onFinish }: EndedEarlyBannerProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.infoLight, borderBottomColor: colors.border }]}
      testID="ended-early-banner"
    >
      <Icon source="flag-checkered" size={18} color={colors.info} />
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {formatEndedEarlyLabel(holesPlayed, nineType)}
      </Text>
      {onFinish ? (
        <TouchableOpacity
          onPress={onFinish}
          style={[styles.finishButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Finish"
          testID="ended-early-finish"
        >
          <Text style={[styles.finishLabel, { color: colors.white }]}>Finish</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  label: {
    ...typography.bodyBold,
    flex: 1,
  },
  finishButton: {
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishLabel: {
    ...typography.bodyBold,
  },
});

export default EndedEarlyBanner;
