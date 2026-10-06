import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, Text } from 'react-native-paper';
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

import { CardContainer, Pill, StatusBadge } from '@/components/common';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
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

  // Completed competitions get no hero: its only action switched to the
  // leaderboard/bracket tab that already sits directly beneath it.
  if (status === 'completed') return null;

  const content =
    status === 'in-progress'
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

  // Competitors get the mock's dark "your team" board; organisers keep the
  // light status card. Text/accents flip to read on the dark surface.
  const isDark = !isOrganizer;
  const titleColor = isDark ? colors.white : colors.textPrimary;
  const subColor = isDark ? colors.scoreboardLabel : colors.textSecondary;
  const iconBg = isDark ? colors.scoreboardTrack : colors.primaryBackground;

  const inner = (
    <>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Icon source={content.icon} size={24} color={colors.primary} />
        </View>
        {!isDark && <StatusBadge status={status} size="sm" />}
        {status === 'upcoming' && (
          <Pill label={countdown} variant="primary" size="sm" filled />
        )}
      </View>

      <Text style={[styles.eyebrow, { color: subColor }]}>{content.eyebrow}</Text>
      <Text style={[styles.title, { color: titleColor }]}>{content.title}</Text>
      <Text style={[styles.message, { color: subColor }]}>{content.message}</Text>

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
    </>
  );

  if (isDark) {
    return (
      <LinearGradient
        colors={[colors.scoreboardGradientStart, colors.scoreboardGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.darkCard]}
        accessible
        accessibilityLabel={`${content.eyebrow}. ${content.title}`}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <CardContainer
      padding="lg"
      style={styles.card}
      elevated
      accessibilityLabel={`${content.eyebrow}. ${content.title}`}
    >
      {inner}
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
  },
  darkCard: {
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
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
