// src/components/rounds/RoundListCard/RoundListCard.tsx

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconDice, IconDog, IconTrophy } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { CardContainer, Pill, PlayerAvatar } from '@/components/common';
import { getGameTypeLabel } from '@/constants/statusConfig';
import { getTeeSwatch } from '@/utils/teeColors';
import { formatTime, parseLocalDateString } from '@/utils/formatting';
import { formatDisplayDate } from '@/utils/locale';
import { RoundListCardData, RoundListCardProps, getUserScoreDisplay } from './types';
import { RoundCardScore } from './RoundCardScore';

/** Most companion avatars shown before collapsing into the "with N" count. */
const MAX_AVATARS = 3;

/**
 * RoundListCard - Displays a round card in a list
 *
 * Mirrors the InProgressRoundSection card layout:
 * - Title block (course, club, result/type subtitle) with a large
 *   emboldened score on the right for completed rounds
 * - Divider
 * - Footer chips: game format, tee swatch, skins/wolf, companion avatars
 *
 * @example
 * ```tsx
 * <RoundListCard
 *   round={{
 *     id: '1',
 *     course: { id: 'c1', name: 'Royal Melbourne' },
 *     status: 'completed',
 *     gameType: 'stableford',
 *     roundNumber: 1,
 *     totalRounds: 1,
 *     holesCompleted: 18,
 *     totalHoles: 18,
 *     userScore: { hasScorecard: true, totalPoints: 34 },
 *   }}
 *   onPress={(round) => console.log('Pressed:', round.id)}
 * />
 * ```
 */
export const RoundListCard = React.memo(function RoundListCard<
  T extends RoundListCardData = RoundListCardData,
>({
  round,
  onPress,
  onDelete,
  onTagToLeague,
  swipeEnabled = false,
  actionLabel,
  currentUserId,
  testID,
}: RoundListCardProps<T>) {
  const colors = useThemeColors();

  const handlePress = useCallback(() => {
    onPress(round);
  }, [onPress, round]);

  const handleDelete = useCallback(() => {
    onDelete?.(round);
  }, [onDelete, round]);

  const handleTagToLeague = useCallback(() => {
    onTagToLeague?.(round);
  }, [onTagToLeague, round]);

  const courseName = round.course.name;
  const clubName =
    round.course.venueName && round.course.venueName !== round.course.name
      ? round.course.venueName
      : undefined;

  const isCompleted = round.status === 'completed';
  const notSubmitted = isCompleted && !round.userScore?.hasScorecard;
  const companions = (round.players ?? []).filter((p) => p.id !== currentUserId);

  const typeLabel = round.isStandalone
    ? round.players && round.players.length > 1
      ? 'Match'
      : round.handicapSource && round.handicapSource !== 'none'
        ? 'Handicap Round'
        : 'Practice Round'
    : round.competition?.name || 'Competition';

  // Result line: winner for completed group rounds, submission state, or the
  // round type so the line is never empty.
  let subtitle = typeLabel;
  if (isCompleted && round.winner && (round.players?.length ?? 0) > 1) {
    const detail =
      round.winner.margin ??
      (round.winner.points ? `${round.winner.points} ${getPointsLabel(round.gameType)}` : null);
    subtitle = detail ? `Winner: ${round.winner.name} · ${detail}` : `Winner: ${round.winner.name}`;
  } else if (notSubmitted) {
    subtitle =
      round.holesCompleted > 0
        ? `Not submitted · ${round.holesCompleted}/${round.totalHoles} holes`
        : 'Round not submitted';
  } else if (!isCompleted) {
    subtitle =
      (round.status === 'upcoming' &&
        formatScheduledLine(round.date, round.teeTime)) ||
      'Ready to score';
  }

  const scoreDisplay = isCompleted
    ? getUserScoreDisplay(round.gameType, round.userScore)
    : null;

  const getAccessibilityLabel = () => {
    const status = round.status === 'in-progress' ? 'Score' : 'View';
    const location = round.course.venueName || round.course.name;
    const result = scoreDisplay
      ? `, ${scoreDisplay.value}${scoreDisplay.label ? ` ${scoreDisplay.label}` : ''}`
      : '';
    const deleteHint = swipeEnabled ? ', swipe left to delete' : '';
    return `${actionLabel || status} round at ${location}${result}${deleteHint}`;
  };

  return (
    <CardContainer
      onPress={handlePress}
      swipeable={swipeEnabled && !!onDelete}
      onDelete={swipeEnabled && onDelete ? handleDelete : undefined}
      swipeSecondaryAction={
        swipeEnabled && onTagToLeague
          ? {
              label: 'Tag League',
              icon: <IconTrophy size={24} color={colors.white} />,
              onPress: handleTagToLeague,
              backgroundColor: colors.primary,
              accessibilityLabel: `Tag round at ${courseName} to a league`,
            }
          : undefined
      }
      deleteAccessibilityName={courseName}
      accessibilityLabel={getAccessibilityLabel()}
      activeOpacity={0.85}
      elevated={false}
      style={[styles.card, { borderColor: colors.borderLight }]}
      testID={testID}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {courseName}
          </Text>
          {clubName && (
            <Text style={[styles.clubName, { color: colors.textSecondary }]} numberOfLines={1}>
              {clubName}
            </Text>
          )}
          <Text
            style={[
              styles.subtitle,
              { color: notSubmitted ? colors.error : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
        <RoundCardScore round={round} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      <View style={styles.chipsRow}>
        {/* Badge defaults to alignSelf flex-start; recenter it in the chips row */}
        <Pill label={getGameTypeLabel(round.gameType)} size="sm" style={styles.formatPill} />
        {round.nineType && round.nineType !== 'full' && (
          <Pill
            label={round.nineType === 'front9' ? 'Front 9' : 'Back 9'}
            size="sm"
            style={styles.formatPill}
          />
        )}
        {round.isStandalone && round.selectedTeeName && (
          <View
            style={[
              styles.teeSwatch,
              {
                backgroundColor: getTeeSwatch(round.selectedTeeName),
                borderColor: colors.border,
              },
            ]}
            accessibilityLabel={`${round.selectedTeeName} tees`}
            testID="round-card-tee-swatch"
          />
        )}
        {round.hasSkins && (
          <View
            style={[styles.chip, { borderColor: colors.border }]}
            accessibilityLabel="Skins game enabled"
          >
            <IconDice size={14} color={colors.textSecondary} />
            <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>Skins</Text>
          </View>
        )}
        {round.hasWolf && (
          <View
            style={[styles.chip, { borderColor: colors.border }]}
            accessibilityLabel="Wolf game enabled"
          >
            <IconDog size={14} color={colors.textSecondary} />
            <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>Wolf</Text>
          </View>
        )}
        {companions.length > 0 && (
          <View
            style={styles.playersGroup}
            accessibilityLabel={`Playing with ${companions.length}: ${companions
              .map((p) => p.name)
              .join(', ')}`}
          >
            <View style={styles.avatarStack}>
              {companions.slice(0, MAX_AVATARS).map((player, index) => (
                <View
                  key={player.id}
                  style={[
                    styles.avatarRing,
                    { borderColor: colors.surface },
                    index > 0 && styles.avatarOverlap,
                  ]}
                >
                  <PlayerAvatar
                    photoUrl={player.photo_url ?? null}
                    name={player.name}
                    size={22}
                  />
                </View>
              ))}
            </View>
            <Text style={[styles.withLabel, { color: colors.textSecondary }]}>
              with {companions.length}
            </Text>
          </View>
        )}
      </View>
    </CardContainer>
  );
});

/**
 * Subtitle for a scheduled (upcoming) round: "Sat 14 Jun · 7:30 AM".
 * Returns null when neither a date nor a tee time is available so the
 * caller can fall back to the default subtitle.
 */
function formatScheduledLine(
  date: string | Date | null | undefined,
  teeTime: string | null | undefined
): string | null {
  let datePart: string | null = null;
  if (date) {
    const d =
      typeof date === 'string' ? parseLocalDateString(date.slice(0, 10)) : date;
    if (d && !Number.isNaN(d.getTime())) {
      datePart = formatDisplayDate(d, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }
  }
  const teePart = formatTime(teeTime ?? null);
  const parts = [datePart, teePart].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Get appropriate points label based on game type
 */
const getPointsLabel = (gameType: string): string => {
  switch (gameType) {
    case 'stroke':
    case 'scramble':
      return 'strokes';
    case 'match_play':
    case 'match-play':
      return '';
    default:
      return 'pts';
  }
};

const styles = StyleSheet.create({
  // Border, padding, and surface background come from CardContainer.
  card: {
    gap: spacing.md,
    borderRadius: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  clubName: {
    ...typography.caption,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12.5,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  formatPill: {
    alignSelf: 'center',
  },
  teeSwatch: {
    width: 15,
    height: 15,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 28,
    paddingHorizontal: spacing.md - 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    flexShrink: 1,
  },
  chipLabel: {
    ...typography.smallBold,
    fontSize: 11.5,
    flexShrink: 1,
  },
  playersGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  avatarOverlap: {
    marginLeft: -spacing.sm,
  },
  withLabel: {
    ...typography.smallBold,
  },
});
