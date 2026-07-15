/**
 * UpcomingRoundsSection - compact rows for scheduled rounds.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';
import { formatTime } from '@/utils/formatting';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface UpcomingRoundsSectionProps {
  rounds: RoundItem[];
  /** Whether to show "View all rounds" link */
  showViewAll: boolean;
}

const MAX_VISIBLE = 3;

function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  // DD MMM (Australian style)
  const day = d.getDate();
  const month = d.toLocaleString('en-AU', { month: 'short' });
  return `${day} ${month}`;
}

export const UpcomingRoundsSection = React.memo(
  function UpcomingRoundsSection({
    rounds,
    showViewAll,
  }: UpcomingRoundsSectionProps) {
    const colors = useThemeColors();
    const navigation = useNavigation<Nav>();

    if (rounds.length === 0) return null;

    const visible = rounds.slice(0, MAX_VISIBLE);

    return (
      <View style={styles.container}>
        <SectionHeader
          title="Coming up"
          actionLabel={showViewAll ? 'View all' : undefined}
          onActionPress={
            showViewAll ? () => navigation.navigate('AllRounds') : undefined
          }
        />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {visible.map((round, idx) => {
            const teeLabel = formatTime(round.teeTime ?? null);
            const subLabel = [teeLabel, round.competition?.name]
              .filter(Boolean)
              .join(' · ');
            return (
            <TouchableOpacity
              key={round.id}
              onPress={() =>
                navigation.navigate('ViewRound', {
                  roundId: round.id,
                  competitionId: round.competition?.id,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Upcoming round at ${round.course.name}, ${formatShortDate(round.date)}${teeLabel ? `, ${teeLabel}` : ''}`}
              style={[
                styles.row,
                idx < visible.length - 1 && {
                  borderBottomColor: colors.borderLight,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View
                style={[
                  styles.dateBadge,
                  { backgroundColor: colors.surfaceVariant },
                ]}
              >
                <Text
                  style={[styles.dateText, { color: colors.textPrimary }]}
                >
                  {formatShortDate(round.date) || 'TBC'}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text
                  style={[styles.courseName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {round.course.name}
                </Text>
                {subLabel ? (
                  <Text
                    style={[
                      styles.subLabel,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {subLabel}
                  </Text>
                ) : null}
              </View>
              <Icon
                source="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  dateBadge: {
    minWidth: 56,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dateText: {
    ...typography.small,
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
  },
  courseName: {
    ...typography.body,
    fontWeight: '600',
  },
  subLabel: {
    ...typography.caption,
    marginTop: 2,
  },
});
