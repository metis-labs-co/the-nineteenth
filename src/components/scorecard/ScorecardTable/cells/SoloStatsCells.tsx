/**
 * SoloStatsCells
 *
 * Solo/statistics cell components for the scorecard table.
 * These render Putts, FIR (Fairways In Regulation), and GIR
 * (Greens In Regulation) columns, only shown for solo rounds
 * (single player).
 */

import React from 'react';
import { View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { getStrokesReceived, calculateStablefordPointsNet } from '@/utils/scoring';
import { styles } from '../styles';
import type { ScorecardTablePlayer } from '../types';
import type { PlayerStats } from '@/utils/scorecardCalculations';
import { isSingleBallScore, type Hole } from '@/types/database.types';

// =====================================================
// HEADER
// =====================================================

interface SoloStatsHeaderCellsProps {
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

export const SoloStatsHeaderCells = React.memo(function SoloStatsHeaderCells({
  showPutts,
  showFIR,
  showGIR,
}: SoloStatsHeaderCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {showPutts && (
        <View style={[styles.tableCell, styles.statCell, styles.headerCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>Putts</Text>
        </View>
      )}
      {showFIR && (
        <View style={[styles.tableCell, styles.statCell, styles.headerCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>FIR</Text>
        </View>
      )}
      {showGIR && (
        <View style={[styles.tableCell, styles.statCell, styles.headerCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>GIR</Text>
        </View>
      )}
    </>
  );
});

// =====================================================
// HOLE ROW
// =====================================================

interface SoloStatsHoleCellsProps {
  hole: Hole;
  player: ScorecardTablePlayer;
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

export const SoloStatsHoleCells = React.memo(function SoloStatsHoleCells({
  hole,
  player,
  showPutts,
  showFIR,
  showGIR,
}: SoloStatsHoleCellsProps) {
  const colors = useThemeColors();
  const score = player.scores?.[String(hole.number)];
  const putts = score && isSingleBallScore(score) ? score.putts : undefined;
  const fairwayHit = score && isSingleBallScore(score) ? score.fairwayHit : undefined;
  const greenInRegulation = score && isSingleBallScore(score) ? score.greenInRegulation : undefined;
  const isFIRApplicable = hole.par >= 4;

  return (
    <>
      {showPutts && (
        <View style={[styles.tableCell, styles.statCell, { backgroundColor: colors.surface }]}>
          <Text style={[styles.indexCellText, { color: colors.textSecondary }]}>
            {putts ?? '-'}
          </Text>
        </View>
      )}
      {showFIR && (
        <View style={[styles.tableCell, styles.statCell, { backgroundColor: colors.surface }]}>
          {!isFIRApplicable ? (
            <Text style={[styles.indexCellText, { color: colors.textDisabled }]}>-</Text>
          ) : fairwayHit === true ? (
            <Icon source="check" size={14} color={colors.success} />
          ) : fairwayHit === false ? (
            <Icon source="close" size={14} color={colors.error} />
          ) : (
            <Text style={[styles.indexCellText, { color: colors.textSecondary }]}>-</Text>
          )}
        </View>
      )}
      {showGIR && (
        <View style={[styles.tableCell, styles.statCell, { backgroundColor: colors.surface }]}>
          {greenInRegulation === true ? (
            <Icon source="check" size={14} color={colors.success} />
          ) : greenInRegulation === false ? (
            <Icon source="close" size={14} color={colors.error} />
          ) : (
            <Text style={[styles.indexCellText, { color: colors.textSecondary }]}>-</Text>
          )}
        </View>
      )}
    </>
  );
});

// =====================================================
// SUBTOTAL ROW (OUT / IN)
// =====================================================

interface SoloStatsSubtotalCellsProps {
  player: ScorecardTablePlayer;
  holes: Hole[];
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

export const SoloStatsSubtotalCells = React.memo(function SoloStatsSubtotalCells({
  player,
  holes,
  showPutts,
  showFIR,
  showGIR,
}: SoloStatsSubtotalCellsProps) {
  const colors = useThemeColors();

  // Calculate putts total for this nine
  const ninePutts = holes.reduce((sum, hole) => {
    const score = player.scores?.[String(hole.number)];
    const putts = score && isSingleBallScore(score) ? score.putts : undefined;
    return sum + (putts ?? 0);
  }, 0);

  // Calculate FIR for this nine (par 4+ holes only)
  const firHoles = holes.filter((h) => h.par >= 4);
  const firHit = firHoles.reduce((sum, hole) => {
    const score = player.scores?.[String(hole.number)];
    const fairwayHit = score && isSingleBallScore(score) ? score.fairwayHit : undefined;
    return sum + (fairwayHit === true ? 1 : 0);
  }, 0);
  const nineFIR = firHoles.length > 0 ? `${firHit}/${firHoles.length}` : '-';

  // Calculate GIR for this nine
  const girHit = holes.reduce((sum, hole) => {
    const score = player.scores?.[String(hole.number)];
    const greenInRegulation = score && isSingleBallScore(score) ? score.greenInRegulation : undefined;
    return sum + (greenInRegulation === true ? 1 : 0);
  }, 0);
  const nineGIR = `${girHit}/${holes.length}`;

  return (
    <>
      {showPutts && (
        <View style={[styles.tableCell, styles.statCell, styles.subtotalCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
            {ninePutts || '-'}
          </Text>
        </View>
      )}
      {showFIR && (
        <View style={[styles.tableCell, styles.statCell, styles.subtotalCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
            {nineFIR}
          </Text>
        </View>
      )}
      {showGIR && (
        <View style={[styles.tableCell, styles.statCell, styles.subtotalCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
            {nineGIR}
          </Text>
        </View>
      )}
    </>
  );
});

// =====================================================
// TOTAL ROW (Gross)
// =====================================================

interface SoloStatsTotalCellsProps {
  player: ScorecardTablePlayer;
  holes: Hole[];
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

export const SoloStatsTotalCells = React.memo(function SoloStatsTotalCells({
  player,
  holes,
  showPutts,
  showFIR,
  showGIR,
}: SoloStatsTotalCellsProps) {
  const colors = useThemeColors();

  // Calculate total putts
  const totalPutts = holes.reduce((sum, hole) => {
    const score = player.scores?.[String(hole.number)];
    const putts = score && isSingleBallScore(score) ? score.putts : undefined;
    return sum + (putts ?? 0);
  }, 0);

  // Calculate total FIR (par 4+ holes only)
  const firHoles = holes.filter((h) => h.par >= 4);
  const totalFirHit = firHoles.reduce((sum, hole) => {
    const score = player.scores?.[String(hole.number)];
    const fairwayHit = score && isSingleBallScore(score) ? score.fairwayHit : undefined;
    return sum + (fairwayHit === true ? 1 : 0);
  }, 0);
  const totalFIR = firHoles.length > 0 ? `${totalFirHit}/${firHoles.length}` : '-';

  // Calculate total GIR
  const totalGirHit = holes.reduce((sum, hole) => {
    const score = player.scores?.[String(hole.number)];
    const greenInRegulation = score && isSingleBallScore(score) ? score.greenInRegulation : undefined;
    return sum + (greenInRegulation === true ? 1 : 0);
  }, 0);
  const totalGIR = `${totalGirHit}/${holes.length}`;

  return (
    <>
      {showPutts && (
        <View style={[styles.tableCell, styles.statCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>
            {totalPutts || '-'}
          </Text>
        </View>
      )}
      {showFIR && (
        <View style={[styles.tableCell, styles.statCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
            {totalFIR}
          </Text>
        </View>
      )}
      {showGIR && (
        <View style={[styles.tableCell, styles.statCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
            {totalGIR}
          </Text>
        </View>
      )}
    </>
  );
});

// =====================================================
// NET ROW (Empty placeholders)
// =====================================================

interface SoloStatsNetEmptyCellsProps {
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

export const SoloStatsNetEmptyCells = React.memo(function SoloStatsNetEmptyCells({
  showPutts,
  showFIR,
  showGIR,
}: SoloStatsNetEmptyCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {showPutts && (
        <View style={[styles.tableCell, styles.statCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
        </View>
      )}
      {showFIR && (
        <View style={[styles.tableCell, styles.statCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
        </View>
      )}
      {showGIR && (
        <View style={[styles.tableCell, styles.statCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
        </View>
      )}
    </>
  );
});

// =====================================================
// STABLEFORD ROW (Empty placeholders)
// =====================================================

interface SoloStatsStablefordEmptyCellsProps {
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

export const SoloStatsStablefordEmptyCells = React.memo(function SoloStatsStablefordEmptyCells({
  showPutts,
  showFIR,
  showGIR,
}: SoloStatsStablefordEmptyCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {showPutts && (
        <View style={[styles.tableCell, styles.statCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
          <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>-</Text>
        </View>
      )}
      {showFIR && (
        <View style={[styles.tableCell, styles.statCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
          <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>-</Text>
        </View>
      )}
      {showGIR && (
        <View style={[styles.tableCell, styles.statCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
          <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>-</Text>
        </View>
      )}
    </>
  );
});

// =====================================================
// STABLEFORD PER-HOLE COLUMN
// =====================================================

export const SoloStablefordHeaderCell = React.memo(function SoloStablefordHeaderCell() {
  const colors = useThemeColors();

  return (
    <View style={[styles.tableCell, styles.statCell, styles.headerCell, { backgroundColor: colors.primary }]}>
      <Text style={[styles.headerText, { color: colors.textOnColored }]}>Pts</Text>
    </View>
  );
});

interface SoloStablefordHoleCellProps {
  hole: Hole;
  player: ScorecardTablePlayer;
  playerStats: PlayerStats;
}

export const SoloStablefordHoleCell = React.memo(function SoloStablefordHoleCell({
  hole,
  player,
  playerStats,
}: SoloStablefordHoleCellProps) {
  const colors = useThemeColors();
  const score = player.scores?.[String(hole.number)];
  const strokes = score && isSingleBallScore(score) ? score.strokes : 0;
  // Use the daily handicap from stats (which prefers the stored snapshot)
  // so per-hole points match the stored total_points.
  const strokesReceived = getStrokesReceived(playerStats.dailyHandicap, hole.strokeIndex);
  const points = strokes > 0 ? calculateStablefordPointsNet(strokes, hole.par, strokesReceived) : 0;

  return (
    <View style={[styles.tableCell, styles.statCell, { backgroundColor: colors.primary + '1A' }]}>
      <Text style={[styles.indexCellText, { color: colors.primary, fontWeight: '600' }]}>
        {strokes > 0 ? points : '-'}
      </Text>
    </View>
  );
});

interface SoloStablefordSubtotalCellProps {
  playerStats: PlayerStats;
  isBack9: boolean;
}

export const SoloStablefordSubtotalCell = React.memo(function SoloStablefordSubtotalCell({
  playerStats,
  isBack9,
}: SoloStablefordSubtotalCellProps) {
  const colors = useThemeColors();
  const stableford = isBack9 ? playerStats.back9Stableford : playerStats.front9Stableford;

  return (
    <View style={[styles.tableCell, styles.statCell, styles.subtotalCell, { backgroundColor: colors.primary + '33' }]}>
      <Text style={[styles.subtotalText, { color: colors.primary }]}>
        {stableford}
      </Text>
    </View>
  );
});

interface SoloStablefordTotalCellProps {
  playerStats: PlayerStats;
}

export const SoloStablefordTotalCell = React.memo(function SoloStablefordTotalCell({
  playerStats,
}: SoloStablefordTotalCellProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.tableCell, styles.statCell, styles.totalCell, { backgroundColor: colors.primary + '33' }]}>
      <Text style={[styles.totalText, { color: colors.primary }]}>
        {playerStats.totalStableford}
      </Text>
    </View>
  );
});

export const SoloStablefordEmptyCell = React.memo(function SoloStablefordEmptyCell() {
  const colors = useThemeColors();

  return (
    <View style={[styles.tableCell, styles.statCell, styles.totalCell, { backgroundColor: colors.primary + '33' }]}>
      <Text style={[styles.totalText, { color: colors.primary }]}>-</Text>
    </View>
  );
});
