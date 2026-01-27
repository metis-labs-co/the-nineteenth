/**
 * ScorecardTable
 *
 * A reusable scorecard table component that displays hole-by-hole scores
 * for multiple players. Features:
 * - Fixed columns (Hole, SI, Par) on the left
 * - Scrollable player columns when needed
 * - Front 9 and Back 9 sections with subtotals
 * - Gross, Net, and Stableford total rows
 * - Score indicators (circles/squares) for visual feedback
 *
 * Used by ReviewScorecardScreen and RoundScorecardTab.
 */

import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { getScoreColor } from '@/utils/scoring';
import {
  calculatePlayerStats,
  calculateParTotals,
  splitHolesByNine,
} from '@/utils/scorecardCalculations';
import {
  calculateScorecardLayout,
  FIXED_COLUMNS_WIDTH,
} from '@/utils/scorecardLayout';
import { getFirstName } from '@/utils/displayHelpers';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { ScoreIndicator } from '../ScoreIndicator';
import { styles } from './styles';
import type { ScorecardTableProps, ScorecardTablePlayer } from './types';
import { isSingleBallScore, type Hole, type TeeBox } from '@/types/database.types';
import type { PlayerStats, ParTotals } from '@/utils/scorecardCalculations';

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface FixedHeaderCellsProps {}

const FixedHeaderCells = React.memo(function FixedHeaderCells(_props: FixedHeaderCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.headerCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Hole</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.headerCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>SI</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.headerCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Par</Text>
      </View>
    </>
  );
});

interface ScrollableHeaderCellsProps {
  players: ScorecardTablePlayer[];
  playerCellWidth: number;
  onPlayerPress?: (playerId: string) => void;
  selectedTeeData?: TeeBox | null;
  coursePar: number;
}

const ScrollableHeaderCells = React.memo(function ScrollableHeaderCells({
  players,
  playerCellWidth,
  onPlayerPress,
  selectedTeeData,
  coursePar,
}: ScrollableHeaderCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {players.map((playerData) => {
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
            <Text style={[styles.handicapText, { color: colors.textSecondary }]}>
              {handicapLabel}: {displayHandicap}
            </Text>
          </>
        );

        if (onPlayerPress) {
          return (
            <TouchableOpacity
              key={playerData.id}
              style={[styles.tableCell, styles.headerCell, { width: playerCellWidth, backgroundColor: colors.surfaceVariant }]}
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
            style={[styles.tableCell, styles.headerCell, { width: playerCellWidth, backgroundColor: colors.surfaceVariant }]}
          >
            {content}
          </View>
        );
      })}
    </>
  );
});

interface FixedHoleCellsProps {
  hole: Hole;
  onHolePress?: (holeNumber: number) => void;
}

const FixedHoleCells = React.memo(function FixedHoleCells({ hole, onHolePress }: FixedHoleCellsProps) {
  const colors = useThemeColors();

  const holeCellContent = (
    <Text style={[styles.holeCellText, { color: onHolePress ? colors.primary : colors.textPrimary }]}>
      {hole.number}
    </Text>
  );

  return (
    <>
      {onHolePress ? (
        <TouchableOpacity
          style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surface }]}
          onPress={() => onHolePress(hole.number)}
          activeOpacity={0.7}
        >
          {holeCellContent}
        </TouchableOpacity>
      ) : (
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surface }]}>
          {holeCellContent}
        </View>
      )}
      <View style={[styles.tableCell, styles.indexCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.indexCellText, { color: colors.textSecondary }]}>{hole.strokeIndex}</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.parCellText, { color: colors.textSecondary }]}>{hole.par}</Text>
      </View>
    </>
  );
});

interface ScrollableHoleCellsProps {
  hole: Hole;
  players: ScorecardTablePlayer[];
  playerCellWidth: number;
}

const ScrollableHoleCells = React.memo(function ScrollableHoleCells({
  hole,
  players,
  playerCellWidth,
}: ScrollableHoleCellsProps) {
  return (
    <>
      {players.map((playerData) => {
        const score = playerData.scores?.[String(hole.number)];
        const strokes = score && isSingleBallScore(score) ? score.strokes : undefined;

        return (
          <View key={playerData.id} style={[styles.tableCell, { width: playerCellWidth }]}>
            <ScoreIndicator strokes={strokes} par={hole.par} display="compact" />
          </View>
        );
      })}
    </>
  );
});

interface FixedSubtotalCellsProps {
  label: string;
  par: number;
}

const FixedSubtotalCells = React.memo(function FixedSubtotalCells({
  label,
  par,
}: FixedSubtotalCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.subtotalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.subtotalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.subtotalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{par}</Text>
      </View>
    </>
  );
});

interface ScrollableSubtotalCellsProps {
  playerStats: PlayerStats[];
  isBack9: boolean;
  playerCellWidth: number;
}

const ScrollableSubtotalCells = React.memo(function ScrollableSubtotalCells({
  playerStats,
  isBack9,
  playerCellWidth,
}: ScrollableSubtotalCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {playerStats.map((stats) => {
        const gross = isBack9 ? stats.back9Gross : stats.front9Gross;
        return (
          <View
            key={stats.playerId}
            style={[styles.tableCell, styles.subtotalCell, { width: playerCellWidth, backgroundColor: colors.surfaceVariant }]}
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

interface FixedGrossCellsProps {
  parTotal: number;
}

const FixedGrossCells = React.memo(function FixedGrossCells({ parTotal }: FixedGrossCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalLabelText, { color: colors.textPrimary }]}>Gross</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>{parTotal}</Text>
      </View>
    </>
  );
});

interface ScrollableGrossCellsProps {
  playerStats: PlayerStats[];
  parTotals: ParTotals;
  playerCellWidth: number;
}

const ScrollableGrossCells = React.memo(function ScrollableGrossCells({
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
          style={[styles.tableCell, styles.totalCell, { width: playerCellWidth, backgroundColor: colors.surfaceVariant }]}
        >
          <Text style={[styles.totalText, { color: getScoreColor(stats.totalGross, parTotals.total) }]}>
            {stats.totalGross || '-'}
          </Text>
        </View>
      ))}
    </>
  );
});

const FixedNetCells = React.memo(function FixedNetCells() {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalLabelText, { color: colors.textPrimary }]}>Net</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
      </View>
    </>
  );
});

interface ScrollableNetCellsProps {
  playerStats: PlayerStats[];
  parTotals: ParTotals;
  playerCellWidth: number;
}

const ScrollableNetCells = React.memo(function ScrollableNetCells({
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
          style={[styles.tableCell, styles.totalCell, { width: playerCellWidth, backgroundColor: colors.surfaceVariant }]}
        >
          <Text style={[styles.totalText, { color: getScoreColor(stats.totalNet, parTotals.total) }]}>
            {stats.totalNet ? Math.ceil(stats.totalNet) : '-'}
          </Text>
        </View>
      ))}
    </>
  );
});

const FixedStablefordCells = React.memo(function FixedStablefordCells() {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stablefordLabelText, { color: colors.textOnColored }]}>Pts</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>-</Text>
      </View>
    </>
  );
});

interface ScrollableStablefordCellsProps {
  playerStats: PlayerStats[];
  playerCellWidth: number;
}

const ScrollableStablefordCells = React.memo(function ScrollableStablefordCells({
  playerStats,
  playerCellWidth,
}: ScrollableStablefordCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {playerStats.map((stats) => (
        <View
          key={stats.playerId}
          style={[styles.tableCell, styles.stablefordCell, { width: playerCellWidth, backgroundColor: colors.primary }]}
        >
          <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>
            {stats.totalStableford}
          </Text>
        </View>
      ))}
    </>
  );
});

// =====================================================
// SOLO STATS CELLS (Putts, FIR, GIR)
// =====================================================

interface SoloStatsHeaderCellsProps {
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

const SoloStatsHeaderCells = React.memo(function SoloStatsHeaderCells({
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

interface SoloStatsHoleCellsProps {
  hole: Hole;
  player: ScorecardTablePlayer;
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

const SoloStatsHoleCells = React.memo(function SoloStatsHoleCells({
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

interface SoloStatsSubtotalCellsProps {
  player: ScorecardTablePlayer;
  holes: Hole[];
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

const SoloStatsSubtotalCells = React.memo(function SoloStatsSubtotalCells({
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

interface SoloStatsTotalCellsProps {
  player: ScorecardTablePlayer;
  holes: Hole[];
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

const SoloStatsTotalCells = React.memo(function SoloStatsTotalCells({
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

// Empty cells for Net row (stats don't apply)
interface SoloStatsNetEmptyCellsProps {
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

const SoloStatsNetEmptyCells = React.memo(function SoloStatsNetEmptyCells({
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

// Empty cells for Stableford row (stats don't apply)
interface SoloStatsStablefordEmptyCellsProps {
  showPutts: boolean;
  showFIR: boolean;
  showGIR: boolean;
}

const SoloStatsStablefordEmptyCells = React.memo(function SoloStatsStablefordEmptyCells({
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
// MAIN COMPONENT
// =====================================================

export const ScorecardTable = React.memo(function ScorecardTable({
  players,
  holes,
  screenWidth,
  onPlayerPress,
  onHolePress,
  showPutts = false,
  showFIR = false,
  showGIR = false,
  selectedTeeData,
}: ScorecardTableProps) {
  const colors = useThemeColors();

  // Only show stats columns for solo rounds (1 player)
  const isSoloRound = players.length === 1;
  const showSoloStats = isSoloRound && (showPutts || showFIR || showGIR);
  const soloPlayer = isSoloRound ? players[0] : null;

  // Calculate layout
  const layout = useMemo(
    () => calculateScorecardLayout(screenWidth, players.length),
    [screenWidth, players.length]
  );

  // Calculate player statistics (with daily handicap if tee data available)
  const playerStats = useMemo(
    () => calculatePlayerStats(players, holes, selectedTeeData),
    [players, holes, selectedTeeData]
  );

  // Calculate par totals
  const parTotals = useMemo(() => calculateParTotals(holes), [holes]);

  // Calculate course par for daily handicap
  const coursePar = useMemo(
    () => holes.reduce((sum, hole) => sum + hole.par, 0),
    [holes]
  );

  // Split holes
  const { front9, back9 } = useMemo(() => splitHolesByNine(holes), [holes]);

  const { playerCellWidth, needsHorizontalScroll } = layout;

  // Render with horizontal scroll for player columns
  if (needsHorizontalScroll) {
    return (
      <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.stickyTableWrapper}>
          {/* Fixed columns (Hole, SI, Par) - always visible */}
          <View style={[styles.fixedColumnsContainer, { width: FIXED_COLUMNS_WIDTH }]}>
            {/* Header */}
            <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <FixedHeaderCells />
            </View>
            {/* Front 9 */}
            {front9.map((hole) => (
              <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <FixedHoleCells hole={hole} onHolePress={onHolePress} />
              </View>
            ))}
            {/* OUT */}
            <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
              <FixedSubtotalCells label="OUT" par={parTotals.front9} />
            </View>
            {/* Back 9 */}
            {back9.map((hole) => (
              <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <FixedHoleCells hole={hole} onHolePress={onHolePress} />
              </View>
            ))}
            {/* IN */}
            <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
              <FixedSubtotalCells label="IN" par={parTotals.back9} />
            </View>
            {/* Gross */}
            <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
              <FixedGrossCells parTotal={parTotals.total} />
            </View>
            {/* Net */}
            <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
              <FixedNetCells />
            </View>
            {/* Pts */}
            <View style={[styles.tableRow, styles.stablefordRow, { borderBottomColor: colors.border }]}>
              <FixedStablefordCells />
            </View>
          </View>

          {/* Scrollable player columns */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={styles.scrollableColumnsContainer}
          >
            <View>
              {/* Header */}
              <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <ScrollableHeaderCells players={players} playerCellWidth={playerCellWidth} onPlayerPress={onPlayerPress} selectedTeeData={selectedTeeData} coursePar={coursePar} />
                {showSoloStats && (
                  <SoloStatsHeaderCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                )}
              </View>
              {/* Front 9 */}
              {front9.map((hole) => (
                <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} />
                  {showSoloStats && soloPlayer && (
                    <SoloStatsHoleCells hole={hole} player={soloPlayer} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                  )}
                </View>
              ))}
              {/* OUT */}
              <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableSubtotalCells playerStats={playerStats} isBack9={false} playerCellWidth={playerCellWidth} />
                {showSoloStats && soloPlayer && (
                  <SoloStatsSubtotalCells player={soloPlayer} holes={front9} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                )}
              </View>
              {/* Back 9 */}
              {back9.map((hole) => (
                <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} />
                  {showSoloStats && soloPlayer && (
                    <SoloStatsHoleCells hole={hole} player={soloPlayer} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                  )}
                </View>
              ))}
              {/* IN */}
              <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableSubtotalCells playerStats={playerStats} isBack9={true} playerCellWidth={playerCellWidth} />
                {showSoloStats && soloPlayer && (
                  <SoloStatsSubtotalCells player={soloPlayer} holes={back9} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                )}
              </View>
              {/* Gross */}
              <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableGrossCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} />
                {showSoloStats && soloPlayer && (
                  <SoloStatsTotalCells player={soloPlayer} holes={holes} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                )}
              </View>
              {/* Net */}
              <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableNetCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} />
                {showSoloStats && (
                  <SoloStatsNetEmptyCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                )}
              </View>
              {/* Pts */}
              <View style={[styles.tableRow, styles.stablefordRow, { borderBottomColor: colors.border }]}>
                <ScrollableStablefordCells playerStats={playerStats} playerCellWidth={playerCellWidth} />
                {showSoloStats && (
                  <SoloStatsStablefordEmptyCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // No scroll needed - render table directly
  return (
    <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
        <FixedHeaderCells />
        <ScrollableHeaderCells players={players} playerCellWidth={playerCellWidth} onPlayerPress={onPlayerPress} selectedTeeData={selectedTeeData} coursePar={coursePar} />
        {showSoloStats && (
          <SoloStatsHeaderCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
        )}
      </View>

      {/* Front 9 */}
      {front9.map((hole) => (
        <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
          <FixedHoleCells hole={hole} onHolePress={onHolePress} />
          <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} />
          {showSoloStats && soloPlayer && (
            <SoloStatsHoleCells hole={hole} player={soloPlayer} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
          )}
        </View>
      ))}

      {/* OUT subtotal */}
      <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedSubtotalCells label="OUT" par={parTotals.front9} />
        <ScrollableSubtotalCells playerStats={playerStats} isBack9={false} playerCellWidth={playerCellWidth} />
        {showSoloStats && soloPlayer && (
          <SoloStatsSubtotalCells player={soloPlayer} holes={front9} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
        )}
      </View>

      {/* Back 9 */}
      {back9.map((hole) => (
        <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
          <FixedHoleCells hole={hole} onHolePress={onHolePress} />
          <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} />
          {showSoloStats && soloPlayer && (
            <SoloStatsHoleCells hole={hole} player={soloPlayer} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
          )}
        </View>
      ))}

      {/* IN subtotal */}
      <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedSubtotalCells label="IN" par={parTotals.back9} />
        <ScrollableSubtotalCells playerStats={playerStats} isBack9={true} playerCellWidth={playerCellWidth} />
        {showSoloStats && soloPlayer && (
          <SoloStatsSubtotalCells player={soloPlayer} holes={back9} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
        )}
      </View>

      {/* Gross row */}
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedGrossCells parTotal={parTotals.total} />
        <ScrollableGrossCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} />
        {showSoloStats && soloPlayer && (
          <SoloStatsTotalCells player={soloPlayer} holes={holes} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
        )}
      </View>

      {/* Net row */}
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedNetCells />
        <ScrollableNetCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} />
        {showSoloStats && (
          <SoloStatsNetEmptyCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
        )}
      </View>

      {/* Stableford row */}
      <View style={[styles.tableRow, styles.stablefordRow, { borderBottomColor: colors.border }]}>
        <FixedStablefordCells />
        <ScrollableStablefordCells playerStats={playerStats} playerCellWidth={playerCellWidth} />
        {showSoloStats && (
          <SoloStatsStablefordEmptyCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
        )}
      </View>
    </View>
  );
});

export default ScorecardTable;
