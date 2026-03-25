/**
 * ScrollableCells
 *
 * Scrollable player column cell components for the scorecard table.
 * These render the player-specific data that scrolls horizontally
 * when there are more players than can fit on screen.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet as RNStyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { getScoreColor, calculateParScore, getStrokesReceived } from '@/utils/scoring';
import { getFirstName } from '@/utils/displayHelpers';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { ScoreIndicator } from '../../ScoreIndicator';
import { spacing } from '@/constants/theme';
import { styles } from '../styles';
import type { ScorecardTablePlayer } from '../types';
import { isSingleBallScore, type Hole, type TeeBox } from '@/types/database.types';
import type { PlayerStats, ParTotals } from '@/utils/scorecardCalculations';

/** Returns width style or flex:1 when playerCellWidth is 0 (solo even layout) */
const cellSizeStyle = (w: number) => (w > 0 ? { width: w } : { flex: 1 as const });

// =====================================================
// HEADER
// =====================================================

interface ScrollableHeaderCellsProps {
  players: ScorecardTablePlayer[];
  playerCellWidth: number;
  onPlayerPress?: (playerId: string) => void;
  onHandicapInfoPress?: () => void;
  selectedTeeData?: TeeBox | null;
  coursePar: number;
}

export const ScrollableHeaderCells = React.memo(function ScrollableHeaderCells({
  players,
  playerCellWidth,
  onPlayerPress,
  onHandicapInfoPress,
  selectedTeeData,
  coursePar,
}: ScrollableHeaderCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {players.map((playerData, index) => {
        // Calculate daily handicap if tee data is available
        const rawHandicap = playerData.player?.handicap ?? 0;
        let displayHandicap = rawHandicap;
        let handicapLabel = 'HC';

        if (selectedTeeData?.slopeRating && selectedTeeData?.courseRating) {
          const result = calculateGADailyHandicap({
            gaHandicap: rawHandicap,
            slopeRating: selectedTeeData.slopeRating,
            courseRating: selectedTeeData.courseRating,
            par: coursePar,
            gender: playerData.player?.gender,
          });
          displayHandicap = result.dailyHandicap;
          handicapLabel = 'DHC';
        }

        const content = (
          <>
            <Text style={[styles.headerText, { color: colors.textPrimary }]} numberOfLines={1}>
              {getFirstName(playerData.player?.name)}
            </Text>
            <View style={headerLocalStyles.handicapRow}>
              <Text style={[styles.handicapText, { color: colors.textSecondary }]}>
                {handicapLabel}: {displayHandicap}
              </Text>
              {/* Show info icon only on first player to avoid clutter */}
              {index === 0 && onHandicapInfoPress && (
                <TouchableOpacity
                  onPress={onHandicapInfoPress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={headerLocalStyles.infoButton}
                >
                  <Icon source="information-outline" size={12} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </>
        );

        if (onPlayerPress) {
          return (
            <TouchableOpacity
              key={playerData.id}
              style={[styles.tableCell, styles.headerCell, { ...cellSizeStyle(playerCellWidth), backgroundColor: colors.surfaceVariant }]}
              onPress={() => onPlayerPress(playerData.playerId)}
              activeOpacity={0.7}
            >
              {content}
            </TouchableOpacity>
          );
        }

        return (
          <View
            key={playerData.id}
            style={[styles.tableCell, styles.headerCell, { ...cellSizeStyle(playerCellWidth), backgroundColor: colors.surfaceVariant }]}
          >
            {content}
          </View>
        );
      })}
    </>
  );
});

const headerLocalStyles = RNStyleSheet.create({
  handicapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoButton: {
    padding: 2,
  },
});

// =====================================================
// HOLE SCORE ROW
// =====================================================

interface ScrollableHoleCellsProps {
  hole: Hole;
  players: ScorecardTablePlayer[];
  playerCellWidth: number;
  gameType?: string;
}

export const ScrollableHoleCells = React.memo(function ScrollableHoleCells({
  hole,
  players,
  playerCellWidth,
  gameType,
}: ScrollableHoleCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {players.map((playerData) => {
        const score = playerData.scores?.[String(hole.number)];
        const strokes = score && isSingleBallScore(score) ? score.strokes : undefined;

        // For par game type, show +1/0/-1 instead of strokes
        if (gameType === 'par' && strokes !== undefined && strokes > 0) {
          const handicap = playerData.player?.handicap ?? 0;
          const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
          const parScore = calculateParScore(strokes, hole.par, strokesReceived);
          const parScoreText = parScore > 0 ? `+${parScore}` : parScore === 0 ? 'E' : `${parScore}`;
          const parScoreColor = parScore > 0 ? colors.success : parScore < 0 ? colors.error : colors.textSecondary;

          return (
            <View key={playerData.id} style={[styles.tableCell, cellSizeStyle(playerCellWidth)]}>
              <Text style={[styles.parScoreText, { color: parScoreColor }]}>{parScoreText}</Text>
            </View>
          );
        }

        return (
          <View key={playerData.id} style={[styles.tableCell, cellSizeStyle(playerCellWidth)]}>
            <ScoreIndicator strokes={strokes} par={hole.par} display="compact" />
          </View>
        );
      })}
    </>
  );
});

// =====================================================
// SUBTOTAL ROW (OUT / IN)
// =====================================================

interface ScrollableSubtotalCellsProps {
  playerStats: PlayerStats[];
  isBack9: boolean;
  playerCellWidth: number;
  gameType?: string;
}

export const ScrollableSubtotalCells = React.memo(function ScrollableSubtotalCells({
  playerStats,
  isBack9,
  playerCellWidth,
  gameType,
}: ScrollableSubtotalCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {playerStats.map((stats) => {
        // For par game type, show par score subtotal
        if (gameType === 'par') {
          const parScore = isBack9 ? stats.back9ParScore : stats.front9ParScore;
          const parScoreText = parScore > 0 ? `+${parScore}` : parScore === 0 ? 'E' : `${parScore}`;
          const parScoreColor = parScore > 0 ? colors.success : parScore < 0 ? colors.error : colors.textPrimary;
          return (
            <View
              key={stats.playerId}
              style={[styles.tableCell, styles.subtotalCell, { ...cellSizeStyle(playerCellWidth), backgroundColor: colors.surfaceVariant }]}
            >
              <Text style={[styles.subtotalText, { color: parScoreColor }]}>
                {stats.hasScores ? parScoreText : '-'}
              </Text>
            </View>
          );
        }

        const gross = isBack9 ? stats.back9Gross : stats.front9Gross;
        return (
          <View
            key={stats.playerId}
            style={[styles.tableCell, styles.subtotalCell, { ...cellSizeStyle(playerCellWidth), backgroundColor: colors.surfaceVariant }]}
          >
            <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
              {gross || '-'}
            </Text>
          </View>
        );
      })}
    </>
  );
});

// =====================================================
// GROSS ROW
// =====================================================

interface ScrollableGrossCellsProps {
  playerStats: PlayerStats[];
  parTotals: ParTotals;
  playerCellWidth: number;
}

export const ScrollableGrossCells = React.memo(function ScrollableGrossCells({
  playerStats,
  parTotals,
  playerCellWidth,
}: ScrollableGrossCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {playerStats.map((stats) => (
        <View
          key={stats.playerId}
          style={[styles.tableCell, styles.totalCell, { ...cellSizeStyle(playerCellWidth), backgroundColor: colors.surfaceVariant }]}
        >
          <Text style={[styles.totalText, { color: getScoreColor(stats.totalGross, parTotals.total, colors) }]}>
            {stats.totalGross || '-'}
          </Text>
        </View>
      ))}
    </>
  );
});

// =====================================================
// NET ROW
// =====================================================

interface ScrollableNetCellsProps {
  playerStats: PlayerStats[];
  parTotals: ParTotals;
  playerCellWidth: number;
}

export const ScrollableNetCells = React.memo(function ScrollableNetCells({
  playerStats,
  parTotals,
  playerCellWidth,
}: ScrollableNetCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {playerStats.map((stats) => (
        <View
          key={stats.playerId}
          style={[styles.tableCell, styles.totalCell, { ...cellSizeStyle(playerCellWidth), backgroundColor: colors.surfaceVariant }]}
        >
          <Text style={[styles.totalText, { color: getScoreColor(stats.totalNet, parTotals.total, colors) }]}>
            {stats.totalNet ? Math.ceil(stats.totalNet) : '-'}
          </Text>
        </View>
      ))}
    </>
  );
});

// =====================================================
// STABLEFORD / SCORE ROW
// =====================================================

interface ScrollableStablefordCellsProps {
  playerStats: PlayerStats[];
  playerCellWidth: number;
  gameType?: string;
}

export const ScrollableStablefordCells = React.memo(function ScrollableStablefordCells({
  playerStats,
  playerCellWidth,
  gameType,
}: ScrollableStablefordCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {playerStats.map((stats) => {
        // For par game type, show total par score in +3/-2/E format
        if (gameType === 'par') {
          const parScore = stats.totalParScore;
          const parScoreText = parScore > 0 ? `+${parScore}` : parScore === 0 ? 'E' : `${parScore}`;
          return (
            <View
              key={stats.playerId}
              style={[styles.tableCell, styles.stablefordCell, { ...cellSizeStyle(playerCellWidth), backgroundColor: colors.primary }]}
            >
              <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>
                {stats.hasScores ? parScoreText : '-'}
              </Text>
            </View>
          );
        }

        return (
          <View
            key={stats.playerId}
            style={[styles.tableCell, styles.stablefordCell, { ...cellSizeStyle(playerCellWidth), backgroundColor: colors.primary }]}
          >
            <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>
              {stats.totalStableford}
            </Text>
          </View>
        );
      })}
    </>
  );
});
