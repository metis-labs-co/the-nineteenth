/**
 * PlayerBreakdownCard Component
 *
 * Renders a table of individual player scores for Shamble format.
 * Shows handicap, gross, net, and to-par for each player.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { PlayerScoreSummary } from './useContributionData';
import { formatRelativeToPar } from '@/utils/formatting';

interface PlayerBreakdownCardProps {
  players: PlayerScoreSummary[];
  totalHoles: number;
}

export const PlayerBreakdownCard = React.memo(function PlayerBreakdownCard({
  players,
  totalHoles,
}: PlayerBreakdownCardProps) {
  const colors = useThemeColors();

  const getToParColor = useCallback(
    (value: number): string => {
      if (value < 0) return colors.success;
      if (value > 0) return colors.error;
      return colors.textSecondary;
    },
    [colors]
  );

  if (players.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <Icon source="account-multiple" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Player Scores</Text>
      </View>

      {/* Header Row */}
      <View style={styles.playerBreakdownHeader}>
        <Text style={[styles.playerBreakdownHeaderText, styles.playerNameCol, { color: colors.textSecondary }]}>
          Player
        </Text>
        <Text style={[styles.playerBreakdownHeaderText, styles.handicapCol, { color: colors.textSecondary }]}>
          Hcp
        </Text>
        <Text style={[styles.playerBreakdownHeaderText, styles.scoreCol, { color: colors.textSecondary }]}>
          Gross
        </Text>
        <Text style={[styles.playerBreakdownHeaderText, styles.scoreCol, { color: colors.textSecondary }]}>
          Net
        </Text>
        <Text style={[styles.playerBreakdownHeaderText, styles.toParCol, { color: colors.textSecondary }]}>
          To Par
        </Text>
      </View>

      {/* Player Rows */}
      {players.map((player, index) => (
        <View
          key={player.playerId}
          style={[
            styles.playerBreakdownRow,
            index === 0 && { backgroundColor: colors.success + '10' },
          ]}
        >
          <View style={styles.playerNameCol}>
            <Text style={[styles.playerBreakdownName, { color: colors.textPrimary }]} numberOfLines={1}>
              {player.playerName}
            </Text>
            {player.holesPlayed < totalHoles && (
              <Text style={[styles.playerHolesPlayed, { color: colors.textTertiary }]}>
                {player.holesPlayed} holes
              </Text>
            )}
          </View>
          <Text style={[styles.playerBreakdownScore, styles.handicapCol, { color: colors.textSecondary }]}>
            {player.handicap}
          </Text>
          <Text style={[styles.playerBreakdownScore, styles.scoreCol, { color: colors.textPrimary }]}>
            {player.gross}
          </Text>
          <Text style={[styles.playerBreakdownScore, styles.scoreCol, { color: colors.textPrimary }]}>
            {player.net}
          </Text>
          <Text style={[styles.playerBreakdownToPar, styles.toParCol, { color: getToParColor(player.toPar) }]}>
            {formatRelativeToPar(player.toPar)}
          </Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.bodyBold,
  },
  playerBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: spacing.xs,
  },
  playerBreakdownHeaderText: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  playerBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
  },
  playerNameCol: {
    flex: 1,
  },
  handicapCol: {
    width: 36,
    textAlign: 'center',
  },
  scoreCol: {
    width: 44,
    textAlign: 'center',
  },
  toParCol: {
    width: 44,
    textAlign: 'right',
  },
  playerBreakdownName: {
    ...typography.body,
  },
  playerHolesPlayed: {
    ...typography.caption,
  },
  playerBreakdownScore: {
    ...typography.body,
  },
  playerBreakdownToPar: {
    ...typography.bodyBold,
  },
});
