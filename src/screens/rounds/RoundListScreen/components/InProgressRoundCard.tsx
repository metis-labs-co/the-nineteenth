/**
 * InProgressRoundCard - Design-spec card for an in-progress round on the
 * Rounds list: icon tile, course/progress lines, RESUME accent, and a
 * progress bar. Presentational restyle of the shared in-progress carousel
 * card — same data derivations, handlers, and accessibility contracts.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { IconClock, IconDice, IconDog } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { CardContainer, Pill, PlayerAvatar } from '@/components/common';
import { getTeeSwatch } from '@/utils/teeColors';
import type { GameType } from '@/types/database.types';
import { inferPresetIdFromRound, ROUND_PRESETS } from '@/constants/roundPresets';
import { formatRelativeToPar } from '@/utils/formatting';
import { GAME_TYPE_LABELS, type RoundWithCourse } from '@/components/competitions/detail/types';

/** Design-spec progress fill gradient (fixed greens in both themes). */
const PROGRESS_GRADIENT = ['#8bc26e', '#5f9a3f'] as const;
/** Most companion avatars shown before collapsing into the "with N" count. */
const MAX_AVATARS = 3;

export interface InProgressRoundCardProps {
  round: RoundWithCourse;
  /** 1-based display number, matching the shared carousel's contract. */
  number: number;
  onScoreRound: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  onViewRound: (roundId: string) => void;
  /** Enables swipe-to-delete on standalone rounds only. */
  onDeleteRound?: (round: RoundWithCourse) => void;
}

export function InProgressRoundCard({
  round,
  number,
  onScoreRound,
  onViewRound,
  onDeleteRound,
}: InProgressRoundCardProps) {
  const colors = useThemeColors();

  const courseName = round.course?.name ?? 'Course TBD';
  const clubName = round.course?.clubs?.name;
  const isStandalone = !round.competition_id;
  const standaloneRoundName =
    isStandalone && round.name?.trim() ? round.name.trim() : null;
  const players = isStandalone ? (round.players ?? []) : [];
  const hasSkins = round.has_skins ?? false;
  const hasWolf = round.has_wolf ?? false;
  const selectedTee = round.selected_tee;

  const presetId = inferPresetIdFromRound({
    game_type: round.game_type,
    is_team_round: round.is_team_round,
    team_format: round.team_format,
    round_format: round.round_format,
    sub_match_size: round.sub_match_size,
    rules_override: round.rules_override ?? null,
  });
  const formatLabel =
    (presetId && ROUND_PRESETS[presetId]?.title) ??
    GAME_TYPE_LABELS[round.game_type];

  // "Hole 7 · +2 · 21 pts" when scoring has started; otherwise fall back to
  // the round name / club so the line is never empty.
  const progress = round.user_progress;
  const progressParts: string[] = [];
  if (progress && progress.holesScored > 0) {
    progressParts.push(`Hole ${progress.currentHole}`);
    if (progress.toPar !== null) progressParts.push(formatRelativeToPar(progress.toPar));
    if (progress.points !== null) progressParts.push(`${progress.points} pts`);
  }
  const subtitle =
    progressParts.length > 0
      ? progressParts.join(' · ')
      : (standaloneRoundName ?? 'Ready to score');

  // Holes-scored fraction for the progress bar (9-hole rounds track to 9).
  const totalHoles = round.nine_type && round.nine_type !== 'full' ? 9 : 18;
  const holesScored = progress?.holesScored ?? 0;
  const progressPct = Math.min(100, Math.max(0, (holesScored / totalHoles) * 100));

  // Only standalone rounds can be deleted — competition rounds are managed
  // by the competition organiser.
  const canDelete = !!onDeleteRound && isStandalone;

  return (
    <CardContainer
      onPress={() => onViewRound(round.id)}
      swipeable={canDelete}
      onDelete={canDelete ? () => onDeleteRound?.(round) : undefined}
      deleteAccessibilityName={courseName}
      accessibilityLabel={`View round ${number} — ${formatLabel}, in progress at ${courseName}${
        progressParts.length > 0 ? `, ${progressParts.join(', ')}` : ''
      }`}
      activeOpacity={0.85}
      elevated={false}
      style={[styles.card, { borderColor: colors.borderLight }]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconTile, { backgroundColor: colors.primaryBackground }]}>
          <IconClock size={22} color={colors.primary} />
        </View>
        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {courseName}
          </Text>
          {clubName && (
            <Text
              style={[styles.clubName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {clubName}
            </Text>
          )}
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.resumeButton}
          onPress={() =>
            onScoreRound(round.id, round.game_type, round.is_team_round)
          }
          accessibilityRole="button"
          accessibilityLabel={`Resume scoring round ${number} at ${courseName}`}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.resumeLabel, { color: colors.primary }]}>
            Resume
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
        <LinearGradient
          colors={[...PROGRESS_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progressPct}%` }]}
        />
      </View>

      <View style={styles.chipsRow}>
        {/* Badge defaults to alignSelf flex-start; recenter it in the chips row */}
        <Pill label={formatLabel} size="sm" style={styles.formatPill} />
        {selectedTee && (
          <View
            style={[
              styles.teeSwatch,
              {
                backgroundColor: getTeeSwatch(
                  selectedTee.color ?? selectedTee.name
                ),
                borderColor: colors.border,
              },
            ]}
            accessibilityLabel={`${selectedTee.name} tees`}
            testID="round-card-tee-swatch"
          />
        )}
        {hasSkins && (
          <View
            style={[styles.chip, { borderColor: colors.border }]}
            accessibilityLabel="Skins game enabled"
          >
            <IconDice size={14} color={colors.textSecondary} />
            <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>
              Skins
            </Text>
          </View>
        )}
        {hasWolf && (
          <View
            style={[styles.chip, { borderColor: colors.border }]}
            accessibilityLabel="Wolf game enabled"
          >
            <IconDog size={14} color={colors.textSecondary} />
            <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>
              Wolf
            </Text>
          </View>
        )}
        {players.length > 0 && (
          <View
            style={styles.playersGroup}
            accessibilityLabel={`Playing with ${players.length}: ${players
              .map((p) => p.name)
              .join(', ')}`}
          >
            <View style={styles.avatarStack}>
              {players.slice(0, MAX_AVATARS).map((player, index) => (
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
              with {players.length}
            </Text>
          </View>
        )}
      </View>
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  // Border, padding, and surface background come from CardContainer.
  card: {
    gap: spacing.md,
    borderRadius: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  clubName: {
    ...typography.caption,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12.5,
  },
  resumeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
  },
  resumeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
