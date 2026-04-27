/**
 * PlayerHeader Component
 *
 * Displays player name, handicap, shots received badge, and running totals.
 * Used as the header section of the StrokePlayScoreCard.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatRelativeToPar, formatParScoreDisplay } from './scoreCardHelpers';

interface PlayerHeaderProps {
  playerName: string;
  playerId: string;
  handicap: number;
  strokesReceived: number;
  runningGross: number;
  cumulativePar: number;
  displayMode: 'stroke' | 'par';
  runningParScore: number;
  teeDotColor?: string;
  onPlayerPress?: (playerId: string) => void;
  /** Rounded daily handicap value (null if not applied) */
  dailyHandicap?: number | null;
  /** Raw decimal base handicap value */
  baseHandicap?: number;
  /** Label for base value: 'HC' or 'SHC' */
  baseLabel?: string;
  /** Team name shown beneath the player's name on team rounds */
  teamName?: string;
}

export const PlayerHeader = React.memo(function PlayerHeader({
  playerName,
  playerId,
  handicap,
  strokesReceived,
  runningGross,
  cumulativePar,
  displayMode,
  runningParScore,
  teeDotColor,
  onPlayerPress,
  dailyHandicap,
  baseHandicap,
  baseLabel,
  teamName,
}: PlayerHeaderProps) {
  const colors = useThemeColors();

  const handlePlayerPress = () => {
    if (onPlayerPress) {
      onPlayerPress(playerId);
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[
          styles.playerInfo,
          onPlayerPress && styles.playerInfoTappable,
        ]}
        onPress={handlePlayerPress}
        disabled={!onPlayerPress}
        activeOpacity={0.7}
        accessibilityLabel={`View ${playerName}'s scorecard`}
        accessibilityRole="button"
      >
        <View style={styles.playerNameRow}>
          {teeDotColor && (
            <View style={[styles.teeDot, { backgroundColor: teeDotColor }]} />
          )}
          <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        {teamName && (
          <Text style={[styles.teamName, { color: colors.textSecondary }]} numberOfLines={1}>
            {teamName}
          </Text>
        )}
        <View style={styles.handicapRow}>
          <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>
            {dailyHandicap != null
              ? `DHC: ${dailyHandicap} / ${baseLabel ?? 'HC'}: ${baseHandicap ?? handicap}`
              : `HC: ${handicap}`}
          </Text>
          {strokesReceived > 0 && (
            <View style={[styles.shotsReceivedBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.shotsReceivedText, { color: colors.textOnColored }]}>
                +{strokesReceived} shot{strokesReceived > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Running Totals */}
      <View style={styles.statsContainer}>
        {displayMode === 'par' ? (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatParScoreDisplay(runningParScore)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SCORE</Text>
          </View>
        ) : (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {runningGross > 0 ? formatRelativeToPar(runningGross - cumulativePar) : '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GROSS</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  playerInfoTappable: {
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginLeft: -spacing.xs,
    marginTop: -spacing.xs,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  teeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  playerName: {
    ...typography.h3,
    flexShrink: 1,
  },
  teamName: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  handicapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  handicapLabel: {
    ...typography.body,
  },
  shotsReceivedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  shotsReceivedText: {
    ...typography.caption,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  statLabel: {
    ...typography.small,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
