/**
 * RoundHeaderCard — course name, date/time, format chip, nine-type label
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconCalendar, IconClock } from '@tabler/icons-react-native';
import { format, parseISO } from 'date-fns';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { Pill } from '@/components/common/Pill';
import { ROUND_PRESETS, type RoundPresetId } from '@/constants/roundPresets';
import type { NineType } from '@/types/database/enums';

interface RoundHeaderCardProps {
  courseName: string;
  /** YYYY-MM-DD */
  date: string | null;
  /** HH:MM:SS or null */
  teeTime: string | null;
  presetId: RoundPresetId;
  nineType: string | null;
}

function nineTypeLabel(nineType: string | null): string {
  switch (nineType as NineType | null) {
    case 'front9': return 'Front 9';
    case 'back9': return 'Back 9';
    case 'full':
    default:
      return 'Full 18';
  }
}

export function RoundHeaderCard({
  courseName,
  date,
  teeTime,
  presetId,
  nineType,
}: RoundHeaderCardProps) {
  const colors = useThemeColors();
  const preset = ROUND_PRESETS[presetId];

  const formattedDate = date
    ? format(parseISO(date), 'dd/MM/yyyy')
    : 'Date TBD';

  const formattedTime = teeTime
    ? teeTime.slice(0, 5) // HH:MM from HH:MM:SS
    : null;

  return (
    <View style={[styles.card, shadows.sm, { backgroundColor: colors.surface }]}>
      <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={2}>
        {courseName}
      </Text>

      <View style={styles.metaRow}>
        <IconCalendar size={16} color={colors.textSecondary} />
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {formattedDate}
        </Text>
        {formattedTime ? (
          <>
            <IconClock size={16} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formattedTime}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.pillRow}>
        <Pill label={preset.shortTitle} variant="info" size="sm" />
        <Pill label={nineTypeLabel(nineType)} size="sm" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  courseName: {
    ...typography.h3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  metaText: {
    ...typography.body,
    marginRight: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
