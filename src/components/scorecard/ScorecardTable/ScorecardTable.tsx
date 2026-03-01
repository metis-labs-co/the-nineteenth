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
  SoloStatsHeaderCells,
  SoloStatsHoleCells,
  SoloStatsSubtotalCells,
  SoloStatsTotalCells,
  SoloStatsNetEmptyCells,
  SoloStatsStablefordEmptyCells,
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
  showPutts = false,
  showFIR = false,
  showGIR = false,
  selectedTeeData,
  gameType,
}: ScorecardTableProps) {
  const colors = useThemeColors();
  const [showHandicapInfo, setShowHandicapInfo] = useState(false);

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
    () => (Array.isArray(holes) ? holes : []).reduce((sum, hole) => sum + hole.par, 0),
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
              <FixedStablefordCells gameType={gameType} />
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
                <ScrollableHeaderCells players={players} playerCellWidth={playerCellWidth} onPlayerPress={onPlayerPress} onHandicapInfoPress={() => setShowHandicapInfo(true)} selectedTeeData={selectedTeeData} coursePar={coursePar} />
                {showSoloStats && (
                  <SoloStatsHeaderCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                )}
              </View>
              {/* Front 9 */}
              {front9.map((hole) => (
                <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} gameType={gameType} />
                  {showSoloStats && soloPlayer && (
                    <SoloStatsHoleCells hole={hole} player={soloPlayer} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                  )}
                </View>
              ))}
              {/* OUT */}
              <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableSubtotalCells playerStats={playerStats} isBack9={false} playerCellWidth={playerCellWidth} gameType={gameType} />
                {showSoloStats && soloPlayer && (
                  <SoloStatsSubtotalCells player={soloPlayer} holes={front9} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                )}
              </View>
              {/* Back 9 */}
              {back9.map((hole) => (
                <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} gameType={gameType} />
                  {showSoloStats && soloPlayer && (
                    <SoloStatsHoleCells hole={hole} player={soloPlayer} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                  )}
                </View>
              ))}
              {/* IN */}
              <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
                <ScrollableSubtotalCells playerStats={playerStats} isBack9={true} playerCellWidth={playerCellWidth} gameType={gameType} />
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
                <ScrollableStablefordCells playerStats={playerStats} playerCellWidth={playerCellWidth} gameType={gameType} />
                {showSoloStats && (
                  <SoloStatsStablefordEmptyCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
                )}
              </View>
            </View>
          </ScrollView>
        </View>
        <HandicapInfoSheet visible={showHandicapInfo} onClose={() => setShowHandicapInfo(false)} />
      </View>
    );
  }

  // No scroll needed - render table directly
  return (
    <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
        <FixedHeaderCells />
        <ScrollableHeaderCells players={players} playerCellWidth={playerCellWidth} onPlayerPress={onPlayerPress} onHandicapInfoPress={() => setShowHandicapInfo(true)} selectedTeeData={selectedTeeData} coursePar={coursePar} />
        {showSoloStats && (
          <SoloStatsHeaderCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
        )}
      </View>

      {/* Front 9 */}
      {front9.map((hole) => (
        <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
          <FixedHoleCells hole={hole} onHolePress={onHolePress} />
          <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} gameType={gameType} />
          {showSoloStats && soloPlayer && (
            <SoloStatsHoleCells hole={hole} player={soloPlayer} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
          )}
        </View>
      ))}

      {/* OUT subtotal */}
      <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedSubtotalCells label="OUT" par={parTotals.front9} />
        <ScrollableSubtotalCells playerStats={playerStats} isBack9={false} playerCellWidth={playerCellWidth} gameType={gameType} />
        {showSoloStats && soloPlayer && (
          <SoloStatsSubtotalCells player={soloPlayer} holes={front9} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
        )}
      </View>

      {/* Back 9 */}
      {back9.map((hole) => (
        <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
          <FixedHoleCells hole={hole} onHolePress={onHolePress} />
          <ScrollableHoleCells hole={hole} players={players} playerCellWidth={playerCellWidth} gameType={gameType} />
          {showSoloStats && soloPlayer && (
            <SoloStatsHoleCells hole={hole} player={soloPlayer} showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
          )}
        </View>
      ))}

      {/* IN subtotal */}
      <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <FixedSubtotalCells label="IN" par={parTotals.back9} />
        <ScrollableSubtotalCells playerStats={playerStats} isBack9={true} playerCellWidth={playerCellWidth} gameType={gameType} />
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
        <FixedStablefordCells gameType={gameType} />
        <ScrollableStablefordCells playerStats={playerStats} playerCellWidth={playerCellWidth} gameType={gameType} />
        {showSoloStats && (
          <SoloStatsStablefordEmptyCells showPutts={showPutts} showFIR={showFIR} showGIR={showGIR} />
        )}
      </View>

      <HandicapInfoSheet visible={showHandicapInfo} onClose={() => setShowHandicapInfo(false)} />
    </View>
  );
});

export default ScorecardTable;
