/**
 * RoundSummary - Summary banner showing round configuration
 *
 * Displays course, tee selection, game type, and player count
 * at the top of the scoring setup step.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconGolf } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeeBox, GameType } from '@/types/database.types';
import type { SelectedCourse, PlayingPartner } from '../../types';
import { MATCH_TYPES } from '../../types';

interface RoundSummaryProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType;
  selectedPartners: PlayingPartner[];
}

export const RoundSummary = memo(function RoundSummary({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  selectedPartners,
}: RoundSummaryProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.selectedBanner, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
      <IconGolf size={20} color={colors.primary} />
      <View style={styles.selectedBannerText}>
        <Text style={[styles.selectedBannerName, { color: colors.textPrimary }]}>
          {selectedCourse?.courseName}
          {selectedTee && (
            <Text style={{ color: colors.primary }}> · {selectedTee.name}</Text>
          )}
        </Text>
        <Text style={[styles.selectedBannerLocation, { color: colors.textSecondary }]}>
          {MATCH_TYPES.find((m) => m.value === selectedMatchType)?.label}
          {' · '}
          {selectedPartners.length + 1} players
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  selectedBannerText: {
    flex: 1,
  },
  selectedBannerName: {
    ...typography.bodyBold,
  },
  selectedBannerLocation: {
    ...typography.caption,
  },
});
