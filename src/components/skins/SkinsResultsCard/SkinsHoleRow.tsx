/**
 * SkinsHoleRow Component
 *
 * Renders a single hole row in the skins results table, showing
 * hole number, par, winner, value, and notes (carryover / winning score).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, skinsColor } from '@/constants/theme';
import { formatCurrency } from '@/utils/skinsCalculations';
import type {
  SkinsResultWithWinner,
  SkinsResult,
  SkinsScoringType,
  SkinsTeamParticipant,
} from '@/types/database';

interface SkinsHoleRowProps {
  result: SkinsResultWithWinner;
  index: number;
  parValues?: Record<number, number>;
  scoringType: SkinsScoringType;
  isTeamSkins: boolean;
  teams?: SkinsTeamParticipant[];
  perHoleValue: number;
}

export const SkinsHoleRow = React.memo(function SkinsHoleRow({
  result,
  index,
  parValues,
  scoringType,
  isTeamSkins,
  teams,
  perHoleValue,
}: SkinsHoleRowProps) {
  const colors = useThemeColors();

  const isPlayed = result.calculated_at !== '';
  const isCarryover = result.is_carryover;
  const par = parValues?.[result.hole_number];

  // Check for winner (individual or team)
  const skinsResult = result as SkinsResult;
  const hasIndividualWinner = result.winner !== null;
  const hasTeamWinner = isTeamSkins && skinsResult.team_winner_id !== null;
  const hasWinner = hasIndividualWinner || hasTeamWinner;

  // Determine winner display text
  let winnerText = '--';
  if (isPlayed) {
    if (hasTeamWinner) {
      // Team skins - try multiple sources for team name
      // 1. Check team_winner object from useSkinsResults
      const resultWithTeamWinner = result as SkinsResult & { team_winner?: { id: string; name: string } | null };
      if (resultWithTeamWinner.team_winner?.name) {
        winnerText = resultWithTeamWinner.team_winner.name;
      } else if (teams) {
        // 2. Fallback to looking up in teams prop
        const winningTeam = teams.find((t) => t.id === skinsResult.team_winner_id);
        winnerText = winningTeam?.name ?? 'Unknown Team';
      } else {
        winnerText = 'Unknown Team';
      }
    } else if (hasIndividualWinner && result.winner) {
      // Individual skins
      winnerText = result.winner.name;
    } else if (isCarryover) {
      winnerText = '--';
    }
  }

  // Determine notes text
  let notesText = '';
  if (isPlayed) {
    if (isCarryover) {
      const carryoverAmount = result.carryover_to_next;
      notesText = `Tied, +${formatCurrency(carryoverAmount)} carried`;
    } else if (hasWinner) {
      // Show winning score if available
      // For team skins, hole_scores are keyed by team ID with { team_score, member_scores }
      // For individual skins, hole_scores are keyed by player ID with { gross, net }
      const winnerId = hasTeamWinner ? skinsResult.team_winner_id : result.winner_id;
      if (winnerId) {
        const holeScores = result.hole_scores as Record<string, unknown>;
        const winnerScoreData = holeScores[winnerId];

        let scoreValue: number | undefined;
        if (winnerScoreData != null) {
          if (typeof winnerScoreData === 'number') {
            // Simple number format
            scoreValue = winnerScoreData;
          } else if (typeof winnerScoreData === 'object') {
            const scoreObj = winnerScoreData as { team_score?: number; gross?: number; net?: number };
            if ('team_score' in scoreObj && scoreObj.team_score !== undefined) {
              // Team skins format: { team_score, member_scores }
              scoreValue = scoreObj.team_score;
            } else if ('gross' in scoreObj || 'net' in scoreObj) {
              // Individual skins format: { gross, net }
              scoreValue = scoringType === 'gross' ? scoreObj.gross : scoreObj.net;
            }
          }
        }

        if (scoreValue !== undefined) {
          notesText = `Won with ${scoreValue}`;
        }
      }
    }
  }

  return (
    <View
      style={[
        styles.holeRow,
        {
          backgroundColor: isCarryover
            ? `${skinsColor}08`
            : index % 2 === 0
              ? colors.surface
              : colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Hole Number */}
      <Text
        style={[
          styles.holeCell,
          styles.holeColumn,
          { color: colors.textPrimary },
          isCarryover && styles.carryoverText,
        ]}
      >
        {result.hole_number}
      </Text>

      {/* Par (if available) */}
      {parValues && (
        <Text
          style={[
            styles.holeCell,
            styles.parColumn,
            { color: colors.textSecondary },
          ]}
        >
          {par ?? '-'}
        </Text>
      )}

      {/* Winner */}
      <Text
        style={[
          styles.holeCell,
          styles.winnerColumn,
          {
            color: hasWinner
              ? colors.success
              : isCarryover
                ? colors.textSecondary
                : colors.textTertiary,
          },
          isCarryover && styles.carryoverText,
        ]}
        numberOfLines={1}
      >
        {winnerText}
      </Text>

      {/* Value */}
      <Text
        style={[
          styles.holeCell,
          styles.valueColumn,
          {
            color: hasWinner
              ? colors.success
              : isCarryover
                ? skinsColor
                : colors.textSecondary,
          },
          hasWinner && styles.winnerValue,
        ]}
      >
        {isPlayed
          ? hasWinner
            ? formatCurrency(result.payout_amount)
            : formatCurrency(result.hole_pot_value)
          : formatCurrency(perHoleValue)}
      </Text>

      {/* Notes */}
      <Text
        style={[
          styles.holeCell,
          styles.notesColumn,
          { color: isCarryover ? skinsColor : colors.textSecondary },
          isCarryover && styles.carryoverText,
        ]}
        numberOfLines={1}
      >
        {notesText}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  // Hole row
  holeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  holeCell: {
    ...typography.small,
  },

  // Column widths
  holeColumn: {
    width: 40,
    textAlign: 'center',
  },
  parColumn: {
    width: 36,
    textAlign: 'center',
  },
  winnerColumn: {
    flex: 1,
    marginRight: spacing.sm,
  },
  valueColumn: {
    width: 60,
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  notesColumn: {
    flex: 1.2,
  },

  // Carryover styling
  carryoverText: {
    fontStyle: 'italic',
  },

  // Winner styling
  winnerValue: {
    fontWeight: '600',
  },
});
