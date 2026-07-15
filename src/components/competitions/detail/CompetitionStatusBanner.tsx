/**
 * CompetitionStatusBanner - status-aware banner card at the top of the
 * Details tab (Competition Details redesign).
 *
 * - upcoming    → surface card with calendar icon, "Starts in Nd" countdown
 *                 and a right-hand "Nd" chip.
 * - in-progress → primary-tinted card with flag icon and the current live
 *                 round ("Round N · Format in progress").
 * - completed   → amber card with trophy icon and the winner (when a winner
 *                 name is derivable from the mini-leaderboard data).
 *
 * Purely presentational — everything is derived from props the Details tab
 * already receives.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { formatDateAustralian } from '@/utils/formatting';
import { inferPresetIdFromRound, ROUND_PRESETS } from '@/constants/roundPresets';
import type { Competition } from '@/types/database.types';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';
import { GAME_TYPE_LABELS, type RoundWithCourse } from './types';

export interface CompetitionStatusBannerProps {
  competition: Competition;
  rounds: RoundWithCourse[];
  /** Mini-leaderboard windows — used to derive a winner name when completed. */
  miniIndividual?: MiniLeaderboardData | null;
  miniTeam?: MiniLeaderboardData | null;
}

/**
 * Whole days from today (local) until a YYYY-MM-DD date string.
 * Returns null when the date can't be parsed.
 */
function daysUntil(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (!match) return null;
  const start = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}

/** Winner = whichever entry in the 3-row window holds position 1, if visible. */
function deriveWinnerName(mini: MiniLeaderboardData | null | undefined): string | null {
  if (!mini) return null;
  const winner = [mini.above, mini.you, mini.below].find((row) => row?.position === 1);
  return winner?.name ?? null;
}

/** Descriptive format label for a round (preset title, else game-type label). */
function roundFormatLabel(round: RoundWithCourse): string {
  const presetId = inferPresetIdFromRound({
    game_type: round.game_type,
    is_team_round: round.is_team_round,
    team_format: round.team_format,
    round_format: round.round_format,
    sub_match_size: round.sub_match_size,
    rules_override: round.rules_override ?? null,
  });
  return (presetId && ROUND_PRESETS[presetId]?.title) || GAME_TYPE_LABELS[round.game_type];
}

export function CompetitionStatusBanner({
  competition,
  rounds,
  miniIndividual,
  miniTeam,
}: CompetitionStatusBannerProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  // "On green tint" accent — dark green on the pale tint in light mode,
  // brightened primary in dark mode (matches MiniLeaderboardSection).
  const onGreen = isDark ? colors.primaryLight : colors.primaryDark;

  const status = competition.status;
  const roundsLabel = `${rounds.length} ${rounds.length === 1 ? 'round' : 'rounds'}`;

  if (status === 'upcoming') {
    const days = daysUntil(competition.start_date);
    const headline =
      days === null
        ? 'Upcoming'
        : days > 1
          ? `Starts in ${days} days`
          : days === 1
            ? 'Starts tomorrow'
            : days === 0
              ? 'Starts today'
              : 'Ready to start';
    const chip = days !== null && days > 0 ? `${days}d` : days === 0 ? 'Today' : null;
    const subParts = [
      competition.start_date ? formatDateAustralian(competition.start_date) : null,
      roundsLabel,
    ].filter(Boolean);

    return (
      <View
        testID="competition-status-banner"
        accessibilityRole="text"
        style={[
          styles.card,
          styles.surfaceCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[styles.iconSquare, { backgroundColor: colors.primaryBackground }]}>
          <Icon source="calendar-month-outline" size={22} color={onGreen} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.headline, { color: colors.textPrimary }]} numberOfLines={1}>
            {headline}
          </Text>
          <Text style={[styles.subline, { color: colors.textSecondary }]} numberOfLines={1}>
            {subParts.join(' · ')}
          </Text>
        </View>
        {chip && (
          <View style={[styles.chip, { backgroundColor: colors.primaryBackground }]}>
            <Text style={[styles.chipLabel, { color: onGreen }]}>{chip}</Text>
          </View>
        )}
      </View>
    );
  }

  if (status === 'in-progress') {
    const liveIndex = rounds.findIndex((r) => r.status === 'in-progress');
    const liveRound = liveIndex >= 0 ? rounds[liveIndex] : null;
    const headline = liveRound
      ? `Round ${liveIndex + 1} · ${liveRound.name?.trim() || roundFormatLabel(liveRound)} in progress`
      : 'Competition in progress';
    const completedCount = rounds.filter((r) => r.status === 'completed').length;
    const subParts = liveRound
      ? [liveRound.course?.name, liveRound.date ? formatDateAustralian(liveRound.date) : null]
      : [`${completedCount} of ${roundsLabel} complete`];
    const sub = subParts.filter(Boolean).join(' · ');

    return (
      <View
        testID="competition-status-banner"
        accessibilityRole="text"
        style={[styles.card, { backgroundColor: colors.primaryBackground }]}
      >
        <View style={[styles.iconSquare, { backgroundColor: `${colors.primary}26` }]}>
          <Icon source="flag-outline" size={22} color={onGreen} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.headline, { color: onGreen }]} numberOfLines={2}>
            {headline}
          </Text>
          {!!sub && (
            <Text style={[styles.subline, { color: onGreen }]} numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (status === 'completed') {
    // Team standings decide team competitions; fall back to individual.
    const winnerName = deriveWinnerName(miniTeam) ?? deriveWinnerName(miniIndividual);
    const headline = winnerName ? `${winnerName} wins` : 'Competition complete';

    return (
      <View
        testID="competition-status-banner"
        accessibilityRole="text"
        style={[styles.card, { backgroundColor: colors.warningBackground }]}
      >
        <View style={[styles.iconSquare, { backgroundColor: `${colors.warning}26` }]}>
          <Icon source="trophy-outline" size={22} color={colors.warningDark} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.headline, { color: colors.warningDark }]} numberOfLines={2}>
            {headline}
          </Text>
          <Text style={[styles.subline, { color: colors.warning }]} numberOfLines={1}>
            Final
          </Text>
        </View>
      </View>
    );
  }

  // Cancelled (or unknown) competitions don't get a banner.
  return null;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 1,
    borderRadius: borderRadius.xl + 2,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  surfaceCard: {
    borderWidth: 1,
    ...shadows.sm,
  },
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg + 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  headline: {
    fontSize: 15,
    fontWeight: '800',
  },
  subline: {
    fontSize: 12.5,
    marginTop: spacing.xxs,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 9,
    flexShrink: 0,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default CompetitionStatusBanner;
