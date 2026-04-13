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

import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Portal } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import {
  calculatePlayerStats,
  calculateParTotals,
  splitHolesByNine,
} from '@/utils/scorecardCalculations';
import {
  calculateScorecardLayout,
  FIXED_COLUMNS_WIDTH,
} from '@/utils/scorecardLayout';
import { HandicapInfoSheet } from '@/components/common';
import { styles } from './styles';
import type { ScorecardTableProps } from './types';

// Cell sub-components
import {
  FixedHeaderCells,
  FixedHoleCells,
  FixedSubtotalCells,
  FixedGrossCells,
  FixedNetCells,
  FixedStablefordCells,
  ScrollableHeaderCells,
  ScrollableHoleCells,
  ScrollableSubtotalCells,
  ScrollableGrossCells,
  ScrollableNetCells,
  ScrollableStablefordCells,
  SoloStablefordHeaderCell,
  SoloStablefordHoleCell,
  SoloStablefordSubtotalCell,
  SoloStablefordTotalCell,
  SoloStablefordEmptyCell,
} from './cells';

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ScorecardTable = React.memo(function ScorecardTable({
  players,
  holes,
  screenWidth,
  onPlayerPress,
  onHolePress,
  selectedTeeData,
  gameType,
  handicapSource,
  scoreDisplayMode,
}: ScorecardTableProps) {
  const colors = useThemeColors();
  const [showHandicapInfo, setShowHandicapInfo] = useState(false);

  const isSoloRound = players.length === 1;
  const showSoloStableford = isSoloRound && (!gameType || gameType === 'stableford') && scoreDisplayMode !== 'points';
  const soloPlayer = isSoloRound ? players[0] : null;
  // Stableford Pts row is meaningless for stroke play — hide it entirely.
  const showStablefordRow = gameType !== 'stroke';

  // Calculate how many extra columns are shown (for layout width reservation)
  const statsColumnCount = showSoloStableford ? 1 : 0;

  // Calculate layout
  const layout = useMemo(
    () => calculateScorecardLayout(screenWidth, players.length, statsColumnCount),
    [screenWidth, players.length, statsColumnCount]
  );

  // Calculate player statistics (with daily handicap if tee data available)
  const playerStats = useMemo(
    () => calculatePlayerStats(players, holes, selectedTeeData, handicapSource),
    [players, holes, selectedTeeData, handicapSource]
  );

  // Calculate par totals
  const parTotals = useMemo(() => calculateParTotals(holes), [holes]);

  // Calculate course par for daily handicap
  const coursePar = useMemo(
    () => (Array.isArray(holes) ? holes : []).reduce((sum, hole) => sum + hole.par, 0),
    [holes]
  );

  // Split holes
  const { front9, back9 } = useMemo(() => splitHolesByNine(holes), [holes]);

  const { playerCellWidth, needsHorizontalScroll } = layout;

  // For solo rounds with stats in non-scroll path, use flex layout (0 signals flex:1)
  const flexPlayerWidth = (!needsHorizontalScroll && statsColumnCount > 0) ? 0 : playerCellWidth;

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
            {showStablefordRow && (
              <View style={[styles.tableRow, styles.stablefordRow, { borderBottomColor: colors.border }]}>
                <FixedStablefordCells gameType={gameType} />
              </View>
            )}
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
                <ScrollableHeaderCells players={players} playerCellWidth={playerCellWidth} onPlayerPress={onPlayerPress} onHandicapInfoPress={() => setShowHandicapInfo(true)} selectedTeeData={selectedTeeData} coursePar={coursePar} handicapSource={handicapSource} />
                {showSoloStableford && <SoloStablefordHeaderCell />}
              </View>
              {/* Front 9 */}
              {front9.map((hole) => (
                <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <ScrollableHoleCells hole={hole} players={players} playerStats={playerStats} playerCellWidth={playerCellWidth} gameType={gameType} scoreDisplayMode={scoreDisplayMode} />
                  {showSoloStableford && soloPlayer && (
                    <SoloStablefordHoleCell hole={hole} player={soloPlayer} playerStats={playerStats[0]} />
                  )}
                </View>
              ))}
              {/* OUT */}
              <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableSubtotalCells playerStats={playerStats} isBack9={false} playerCellWidth={playerCellWidth} gameType={gameType} scoreDisplayMode={scoreDisplayMode} />
                {showSoloStableford && playerStats[0] && (
                  <SoloStablefordSubtotalCell playerStats={playerStats[0]} isBack9={false} />
                )}
              </View>
              {/* Back 9 */}
              {back9.map((hole) => (
                <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <ScrollableHoleCells hole={hole} players={players} playerStats={playerStats} playerCellWidth={playerCellWidth} gameType={gameType} scoreDisplayMode={scoreDisplayMode} />
                  {showSoloStableford && soloPlayer && (
                    <SoloStablefordHoleCell hole={hole} player={soloPlayer} playerStats={playerStats[0]} />
                  )}
                </View>
              ))}
              {/* IN */}
              <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableSubtotalCells playerStats={playerStats} isBack9={true} playerCellWidth={playerCellWidth} gameType={gameType} scoreDisplayMode={scoreDisplayMode} />
                {showSoloStableford && playerStats[0] && (
                  <SoloStablefordSubtotalCell playerStats={playerStats[0]} isBack9={true} />
                )}
              </View>
              {/* Gross */}
              <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableGrossCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} gameType={gameType} />
                {showSoloStableford && playerStats[0] && (
                  <SoloStablefordTotalCell playerStats={playerStats[0]} />
                )}
              </View>
              {/* Net */}
              <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableNetCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={playerCellWidth} />
                {showSoloStableford && <SoloStablefordEmptyCell />}
              </View>
              {/* Pts */}
              {showStablefordRow && (
                <View style={[styles.tableRow, styles.stablefordRow, { borderBottomColor: colors.border }]}>
                  <ScrollableStablefordCells playerStats={playerStats} playerCellWidth={playerCellWidth} gameType={gameType} hideTotals={showSoloStableford} />
                  {showSoloStableford && playerStats[0] && (
                    <SoloStablefordTotalCell playerStats={playerStats[0]} />
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
        <Portal>
          <HandicapInfoSheet visible={showHandicapInfo} onClose={() => setShowHandicapInfo(false)} />
        </Portal>
      </View>
    );
  }

  // No scroll needed - render table directly
  return (
    <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
        <FixedHeaderCells />
        <ScrollableHeaderCells players={players} playerCellWidth={flexPlayerWidth} onPlayerPress={onPlayerPress} onHandicapInfoPress={() => setShowHandicapInfo(true)} selectedTeeData={selectedTeeData} coursePar={coursePar} handicapSource={handicapSource} />
        {showSoloStableford && <SoloStablefordHeaderCell />}
      </View>

      {/* Front 9 */}
      {front9.map((hole) => (
        <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
          <FixedHoleCells hole={hole} onHolePress={onHolePress} />
          <ScrollableHoleCells hole={hole} players={players} playerStats={playerStats} playerCellWidth={flexPlayerWidth} gameType={gameType} scoreDisplayMode={scoreDisplayMode} />
          {showSoloStableford && soloPlayer && (
            <SoloStablefordHoleCell hole={hole} player={soloPlayer} playerStats={playerStats[0]} />
          )}
        </View>
      ))}

      {/* OUT subtotal */}
      <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedSubtotalCells label="OUT" par={parTotals.front9} />
        <ScrollableSubtotalCells playerStats={playerStats} isBack9={false} playerCellWidth={flexPlayerWidth} gameType={gameType} scoreDisplayMode={scoreDisplayMode} />
        {showSoloStableford && playerStats[0] && (
          <SoloStablefordSubtotalCell playerStats={playerStats[0]} isBack9={false} />
        )}
      </View>

      {/* Back 9 */}
      {back9.map((hole) => (
        <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
          <FixedHoleCells hole={hole} onHolePress={onHolePress} />
          <ScrollableHoleCells hole={hole} players={players} playerStats={playerStats} playerCellWidth={flexPlayerWidth} gameType={gameType} scoreDisplayMode={scoreDisplayMode} />
          {showSoloStableford && soloPlayer && (
            <SoloStablefordHoleCell hole={hole} player={soloPlayer} playerStats={playerStats[0]} />
          )}
        </View>
      ))}

      {/* IN subtotal */}
      <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedSubtotalCells label="IN" par={parTotals.back9} />
        <ScrollableSubtotalCells playerStats={playerStats} isBack9={true} playerCellWidth={flexPlayerWidth} gameType={gameType} scoreDisplayMode={scoreDisplayMode} />
        {showSoloStableford && playerStats[0] && (
          <SoloStablefordSubtotalCell playerStats={playerStats[0]} isBack9={true} />
        )}
      </View>

      {/* Gross row */}
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedGrossCells parTotal={parTotals.total} />
        <ScrollableGrossCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={flexPlayerWidth} gameType={gameType} />
        {showSoloStableford && playerStats[0] && (
          <SoloStablefordTotalCell playerStats={playerStats[0]} />
        )}
      </View>

      {/* Net row */}
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedNetCells />
        <ScrollableNetCells playerStats={playerStats} parTotals={parTotals} playerCellWidth={flexPlayerWidth} />
        {showSoloStableford && <SoloStablefordEmptyCell />}
      </View>

      {/* Stableford row */}
      {showStablefordRow && (
        <View style={[styles.tableRow, styles.stablefordRow, { borderBottomColor: colors.border }]}>
          <FixedStablefordCells gameType={gameType} />
          <ScrollableStablefordCells playerStats={playerStats} playerCellWidth={flexPlayerWidth} gameType={gameType} hideTotals={showSoloStableford} />
          {showSoloStableford && playerStats[0] && (
            <SoloStablefordTotalCell playerStats={playerStats[0]} />
          )}
        </View>
      )}

      <Portal>
        <HandicapInfoSheet visible={showHandicapInfo} onClose={() => setShowHandicapInfo(false)} />
      </Portal>
    </View>
  );
});

export default ScorecardTable;
