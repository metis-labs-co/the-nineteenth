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
import { Text } from 'react-native-paper';
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
import { ScoreIndicator } from '../ScoreIndicator';
import { styles } from './styles';
import type { ScorecardTableProps, ScorecardTablePlayer } from './types';
import { isSingleBallScore, type Hole } from '@/types/database.types';
import type { PlayerStats, ParTotals } from '@/utils/scorecardCalculations';

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface FixedHeaderCellsProps {}

const FixedHeaderCells = React.memo(function FixedHeaderCells(_props: FixedHeaderCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Hole</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>SI</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Par</Text>
      </View>
    </>
  );
});

interface ScrollableHeaderCellsProps {
  players: ScorecardTablePlayer[];
  playerCellWidth: number;
  onPlayerPress?: (playerId: string) => void;
}

const ScrollableHeaderCells = React.memo(function ScrollableHeaderCells({
  players,
  playerCellWidth,
  onPlayerPress,
}: ScrollableHeaderCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      {players.map((playerData) => {
        const content = (
          <>
            <Text style={[styles.headerText, { color: colors.textInverse }]} numberOfLines={1}>
              {getFirstName(playerData.player?.name)}
            </Text>
            <Text style={[styles.handicapText, { color: colors.gray400 }]}>
              HC: {playerData.player?.handicap || 0}
            </Text>
          </>
        );

        if (onPlayerPress) {
          return (
            <TouchableOpacity
              key={playerData.id}
              style={[styles.tableCell, styles.headerCell, { width: playerCellWidth, backgroundColor: colors.gray800 }]}
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
            style={[styles.tableCell, styles.headerCell, { width: playerCellWidth, backgroundColor: colors.gray800 }]}
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
}

const FixedHoleCells = React.memo(function FixedHoleCells({ hole }: FixedHoleCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.gray100 }]}>
        <Text style={[styles.holeCellText, { color: colors.textPrimary }]}>{hole.number}</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, { backgroundColor: colors.gray50 }]}>
        <Text style={[styles.indexCellText, { color: colors.textSecondary }]}>{hole.strokeIndex}</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, { backgroundColor: colors.gray50 }]}>
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
            <ScoreIndicator strokes={strokes} par={hole.par} />
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
      <View style={[styles.tableCell, styles.holeCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
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
            style={[styles.tableCell, styles.subtotalCell, { width: playerCellWidth, backgroundColor: colors.gray200 }]}
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
      <View style={[styles.tableCell, styles.holeCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.totalLabelText, { color: colors.textInverse }]}>Gross</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>{parTotal}</Text>
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
          style={[styles.tableCell, styles.totalCell, { width: playerCellWidth, backgroundColor: colors.gray800 }]}
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
      <View style={[styles.tableCell, styles.holeCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.totalLabelText, { color: colors.textInverse }]}>Net</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>-</Text>
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
          style={[styles.tableCell, styles.totalCell, { width: playerCellWidth, backgroundColor: colors.gray800 }]}
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
        <Text style={[styles.stablefordLabelText, { color: colors.textInverse }]}>Pts</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stablefordText, { color: colors.textInverse }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stablefordText, { color: colors.textInverse }]}>-</Text>
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
          <Text style={[styles.stablefordText, { color: colors.textInverse }]}>
            {stats.totalStableford}
          </Text>
        </View>
      ))}
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
}: ScorecardTableProps) {
  const colors = useThemeColors();

  // Calculate layout
  const layout = useMemo(
    () => calculateScorecardLayout(screenWidth, players.length),
    [screenWidth, players.length]
  );

  // Calculate player statistics
  const playerStats = useMemo(
    () => calculatePlayerStats(players, holes),
    [players, holes]
  );

  // Calculate par totals
  const parTotals = useMemo(() => calculateParTotals(holes), [holes]);

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
                <FixedHoleCells hole={hole} />
              </View>
            ))}
            {/* OUT */}
            <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
              <FixedSubtotalCells label="OUT" par={parTotals.front9} />
            </View>
            {/* Back 9 */}
            {back9.map((hole) => (
              <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <FixedHoleCells hole={hole} />
              </View>
            ))}
            {/* IN */}
            <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
              <FixedSubtotalCells label="IN" par={parTotals.back9} />
            </View>
            {/* Gross */}
            <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.gray800, borderBottomColor: colors.border }]}>
              <FixedGrossCells parTotal={parTotals.total} />
            </View>
            {/* Net */}
            <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.gray800, borderBottomColor: colors.border }]}>
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
                <ScrollableHeaderCells players={players} playerCellWidth={playerCellWidth} onPlayerPress={onPlayerPress} />
              </View>
              {/* Front 9 */}
              {front9.map((hole) => (
                <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} />
                </View>
              ))}
              {/* OUT */}
              <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
                <ScrollableSubtotalCells playerStats={playerStats} isBack9={false} playerCellWidth={playerCellWidth} />
              </View>
              {/* Back 9 */}
              {back9.map((hole) => (
                <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} />
                </View>
              ))}
              {/* IN */}
              <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
                <ScrollableSubtotalCells playerStats={playerStats} isBack9={true} playerCellWidth={playerCellWidth} />
              </View>
              {/* Gross */}
              <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.gray800, borderBottomColor: colors.border }]}>
                <ScrollableGrossCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} />
              </View>
              {/* Net */}
              <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.gray800, borderBottomColor: colors.border }]}>
                <ScrollableNetCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} />
              </View>
              {/* Pts */}
              <View style={[styles.tableRow, styles.stablefordRow, { borderBottomColor: colors.border }]}>
                <ScrollableStablefordCells playerStats={playerStats} playerCellWidth={playerCellWidth} />
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
        <ScrollableHeaderCells players={players} playerCellWidth={playerCellWidth} onPlayerPress={onPlayerPress} />
      </View>

      {/* Front 9 */}
      {front9.map((hole) => (
        <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
          <FixedHoleCells hole={hole} />
          <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} />
        </View>
      ))}

      {/* OUT subtotal */}
      <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
        <FixedSubtotalCells label="OUT" par={parTotals.front9} />
        <ScrollableSubtotalCells playerStats={playerStats} isBack9={false} playerCellWidth={playerCellWidth} />
      </View>

      {/* Back 9 */}
      {back9.map((hole) => (
        <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
          <FixedHoleCells hole={hole} />
          <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} />
        </View>
      ))}

      {/* IN subtotal */}
      <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
        <FixedSubtotalCells label="IN" par={parTotals.back9} />
        <ScrollableSubtotalCells playerStats={playerStats} isBack9={true} playerCellWidth={playerCellWidth} />
      </View>

      {/* Gross row */}
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.gray800, borderBottomColor: colors.border }]}>
        <FixedGrossCells parTotal={parTotals.total} />
        <ScrollableGrossCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} />
      </View>

      {/* Net row */}
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.gray800, borderBottomColor: colors.border }]}>
        <FixedNetCells />
        <ScrollableNetCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} />
      </View>

      {/* Stableford row */}
      <View style={[styles.tableRow, styles.stablefordRow, { borderBottomColor: colors.border }]}>
        <FixedStablefordCells />
        <ScrollableStablefordCells playerStats={playerStats} playerCellWidth={playerCellWidth} />
      </View>
    </View>
  );
});

export default ScorecardTable;
