/**
 * UnevenTeamWarning - Warning banner shown when cross-team pairing has uneven teams
 *
 * Explains how the uneven team sizes were handled (wrap vs partial strategy)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  layout,
  type ColorPalette,
} from '@/constants/theme';
import type { UnevenTeamMetadata } from '@/utils/scoringPairs';
import type { Player } from '@/types/database.types';

interface UnevenTeamWarningProps {
  metadata: UnevenTeamMetadata;
  colors: ColorPalette;
  players: Player[];
}

export const UnevenTeamWarning = React.memo(function UnevenTeamWarning({
  metadata,
  colors,
  players,
}: UnevenTeamWarningProps) {
  const {
    team1Size,
    team2Size,
    strategyUsed,
    reusedPlayerIds,
    unassignedPlayerIds,
    extraPairingsCount,
  } = metadata;

  const smallerTeamSize = Math.min(team1Size, team2Size);
  const sizeDifference = Math.max(team1Size, team2Size) - smallerTeamSize;

  // Get player names for display
  const getPlayerNames = (ids: string[]): string => {
    return ids
      .map((id) => {
        const player = players.find((p) => p.id === id);
        return player?.name.split(' ')[0] || 'Unknown';
      })
      .join(', ');
  };

  const reusedPlayerNames = reusedPlayerIds.length > 0 ? getPlayerNames(reusedPlayerIds) : '';
  const unassignedPlayerNames =
    unassignedPlayerIds.length > 0 ? getPlayerNames(unassignedPlayerIds) : '';

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <IconAlertCircle size={18} color={colors.warning} />
        </View>
        <Text style={styles.title}>Uneven Teams Detected</Text>
      </View>

      {/* Team sizes */}
      <View style={styles.sizeRow}>
        <Text style={styles.sizeLabel}>
          Team 1: {team1Size} player{team1Size !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.sizeSeparator}>vs</Text>
        <Text style={styles.sizeLabel}>
          Team 2: {team2Size} player{team2Size !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Explanation based on strategy */}
      <View style={styles.explanationContainer}>
        <IconInfoCircle size={14} color={colors.textTertiary} />
        <Text style={styles.explanationText}>
          {strategyUsed === 'wrap' ? (
            <>
              <Text style={{ fontWeight: '600' }}>Wrap strategy applied: </Text>
              {sizeDifference === 1
                ? `${reusedPlayerNames} from the smaller team will score ${extraPairingsCount} additional player.`
                : `${reusedPlayerNames} from the smaller team will score ${extraPairingsCount} additional players.`}
              {' This ensures all players from the larger team are paired.'}
            </>
          ) : (
            <>
              <Text style={{ fontWeight: '600' }}>Partial strategy applied: </Text>
              {unassignedPlayerIds.length === 1
                ? `${unassignedPlayerNames} was left unassigned.`
                : `${unassignedPlayerNames} were left unassigned.`}
              {' Only players up to the smaller team size are paired.'}
            </>
          )}
        </Text>
      </View>
    </View>
  );
});

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      marginHorizontal: layout.screenPadding,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: `${colors.warning}10`,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: `${colors.warning}30`,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    iconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${colors.warning}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.smallBold,
      color: colors.warning,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
    },
    sizeLabel: {
      ...typography.small,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    sizeSeparator: {
      ...typography.small,
      color: colors.textTertiary,
    },
    explanationContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: `${colors.warning}20`,
    },
    explanationText: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
  });

export default UnevenTeamWarning;
