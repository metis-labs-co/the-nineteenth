import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

import { CardContainer, Pill, StatusBadge } from '@/components/common';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { CompetitionStatus } from '@/types/database/enums';

interface CompetitionHeroProps {
  status: CompetitionStatus;
  startDate: string;
  isOrganizer: boolean;
  teamName?: string;
  liveRoundName?: string;
  onPrimaryAction?: () => void;
}

function getCountdownLabel(startDate: string): string {
  const days = Math.max(
    0,
    differenceInCalendarDays(startOfDay(parseISO(startDate)), startOfDay(new Date()))
  );
  if (days === 0) return 'Today';
  return `${days}d`;
}

export const CompetitionHero = React.memo(function CompetitionHero({
  status,
  startDate,
  isOrganizer,
  teamName,
  liveRoundName,
  onPrimaryAction,
}: CompetitionHeroProps) {
  const colors = useThemeColors();
  const countdown = useMemo(() => getCountdownLabel(startDate), [startDate]);

  const content =
    status === 'completed'
      ? {
          icon: 'trophy-outline',
          eyebrow: 'Competition complete',
          title: 'Final results are ready',
          message: isOrganizer
            ? 'Review the final standings and payouts.'
            : 'See where you and your team finished.',
          action: 'View results',
        }
      : status === 'in-progress'
        ? {
            icon: 'progress-clock',
            eyebrow: 'Live now',
            title: liveRoundName ?? 'Scoring is in progress',
            message: isOrganizer
              ? 'Follow live scoring or jump back into the active round.'
              : 'Follow the standings as scores come in.',
            action: isOrganizer ? 'Open active round' : 'View standings',
          }
        : {
            icon: 'calendar-outline',
            eyebrow: 'Coming up',
            title: teamName ? `You’re playing for ${teamName}` : 'Competition starts soon',
            message: isOrganizer
              ? 'Everything is ready for the first tee.'
              : 'Check your rounds and playing group before the day.',
            action: undefined,
          };

  return (
    <CardContainer
      padding="lg"
      style={styles.card}
      elevated
      accessibilityLabel={`${content.eyebrow}. ${content.title}`}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryBackground },
          ]}
        >
          <Icon source={content.icon} size={24} color={colors.primary} />
        </View>
        <StatusBadge status={status} size="sm" />
        {status === 'upcoming' && (
          <Pill label={countdown} variant="primary" size="sm" filled />
        )}
      </View>

      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
        {content.eyebrow}
      </Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{content.title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {content.message}
      </Text>

      {content.action && onPrimaryAction && (
        <TouchableOpacity
          onPress={onPrimaryAction}
          style={[styles.action, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={content.action}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: colors.textOnColored }]}>
            {content.action}
          </Text>
          <Icon source="arrow-right" size={18} color={colors.textOnColored} />
        </TouchableOpacity>
      )}
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 'auto',
  },
  eyebrow: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.small,
  },
  action: {
    minHeight: 44,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionText: {
    ...typography.smallBold,
  },
});
