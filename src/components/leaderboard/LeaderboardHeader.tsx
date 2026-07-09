/**
 * LeaderboardHeader - Round info header with game type badge and date
 *
 * Displays:
 * - Round number title
 * - Game type pill (Stableford, Stroke Play, Match Play, etc.)
 * - Team badge (if team round)
 * - Date and course name
 */

import React from 'react';
import { View } from 'react-native';
import { IconUsers } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { ScaledText } from '@/components/common/ScaledText';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { Pill } from '@/components/common/Pill';
import type { GameType, RoundFormat, TeamFormat } from '@/types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';
import { inferPresetIdFromRound, ROUND_PRESETS } from '@/constants/roundPresets';
import { getGameTypeLabel, getGameTypeVariant } from './leaderboardUtils';
import { styles } from './RoundLeaderboard.styles';

export interface LeaderboardHeaderProps {
  /** The game type for display */
  gameType: GameType;
  /** Whether this is a team round */
  isTeamRound: boolean;
  /** Round date (ISO string) */
  date?: string;
  /** Course name */
  courseName?: string;
  /** Round number */
  roundNumber: number;
  /** Optional user-defined round name; shown instead of "Round N" when set. */
  roundName?: string | null;
  /**
   * Optional fields used to derive the preset-accurate format label
   * (e.g. "Team Stableford (aggregate)" instead of just "Stableford"). When
   * any are missing the header falls back to the engine-level game type label.
   */
  teamFormat?: TeamFormat | null;
  roundFormat?: RoundFormat;
  subMatchSize?: number | null;
  rulesOverride?: RoundRulesOverride | null;
  /** Optional right-aligned points/status badge (e.g. "Dinner bet · 0 pts"). */
  pointsBadge?: string;
}

export const LeaderboardHeader = React.memo(function LeaderboardHeader({
  gameType,
  isTeamRound,
  date,
  courseName,
  roundNumber,
  roundName,
  teamFormat,
  roundFormat,
  subMatchSize,
  rulesOverride,
  pointsBadge,
}: LeaderboardHeaderProps) {
  const colors = useThemeColors();

  const title =
    roundName && roundName.trim().length > 0 ? roundName : `Round ${roundNumber}`;

  // Resolve the most specific format label available. The engine label
  // (e.g. "Stableford") is shared across many presets — when the parent has
  // the full round shape we can name the actual preset (e.g. "2v2 Pairs
  // Better Ball") so the leaderboard header matches the round picker.
  const formatLabel =
    roundFormat !== undefined
      ? (() => {
          const presetId = inferPresetIdFromRound({
            game_type: gameType,
            is_team_round: isTeamRound,
            team_format: teamFormat ?? null,
            round_format: roundFormat,
            sub_match_size: subMatchSize ?? null,
            rules_override: rulesOverride ?? null,
          });
          return (
            (presetId && ROUND_PRESETS[presetId]?.shortTitle) ??
            getGameTypeLabel(gameType)
          );
        })()
      : getGameTypeLabel(gameType);

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <ScaledText category="title" style={[styles.roundTitle, { color: colors.textPrimary }]}>
          {title}
        </ScaledText>
        <View style={styles.badgeRow}>
          <Pill
            label={formatLabel}
            variant={getGameTypeVariant(gameType)}
            size="sm"
          />
          {isTeamRound && (
            <View style={[styles.teamBadge, { backgroundColor: colors.gray200 }]}>
              <IconUsers size={12} color={colors.textSecondary} />
              <ScaledText category="caption" style={[styles.teamBadgeText, { color: colors.textSecondary }]}>
                Teams
              </ScaledText>
            </View>
          )}
          {pointsBadge && (
            <View style={[styles.pointsBadge, { backgroundColor: colors.primaryLighter }]}>
              <ScaledText category="caption" style={[styles.pointsBadgeText, { color: colors.primary }]}>
                {pointsBadge}
              </ScaledText>
            </View>
          )}
        </View>
      </View>
      <View style={styles.headerMeta}>
        {date && <DateTimeDisplay date={date} size="sm" />}
        {courseName && (
          <ScaledText
            category="caption"
            style={[styles.courseName, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {courseName}
          </ScaledText>
        )}
      </View>
    </View>
  );
});
