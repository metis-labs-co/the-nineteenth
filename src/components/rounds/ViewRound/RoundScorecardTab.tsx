/**
 * RoundScorecardTab - Read-only scorecard grid for ViewRoundScreen
 *
 * Displays a comprehensive scorecard view with a 3-way view toggle:
 * - Strip view: per-player horizontal strip of tinted hole cells
 * - Split view: per-player FRONT NINE / BACK NINE cards
 * - Table view: full multi-player table (ScorecardTable)
 * - Score indicators: tinted cell + ring per score category
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useWindowDimensions } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { EmptyState } from '@/components/common/EmptyState';
import { getScoreColor, getScoreCategory } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';
import {
  ScorecardTable,
  type ScorecardTablePlayer,
} from '@/components/scorecard';
import {
  calculatePlayerStats,
  splitHolesByNine,
  generateDefaultHoles,
  type PlayerStats,
} from '@/utils/scorecardCalculations';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import type { ScorecardWithPlayer, CourseWithClub, RoundPlayer } from '@/hooks/useRoundDetails';
import { isSingleBallScore, type Hole, type Player, type TeeBox } from '@/types/database.types';
import type { GameType, HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';

// =====================================================
// TYPES
// =====================================================

type ViewMode = 'strip' | 'split' | 'table';

interface RoundScorecardTabProps {
  scorecards: ScorecardWithPlayer[];
  roundPlayers: RoundPlayer[];
  holes: CourseWithClub['holes'] | null;
  /** Callback when a player name is pressed in the table view */
  onPlayerPress?: (playerId: string) => void;
  /** Selected tee data with slope/course ratings for daily handicap calculation */
  selectedTeeData?: TeeBox | null;
  /** Game type for the round (affects score display) */
  gameType?: GameType;
  /** Handicap source for daily HC calculation */
  handicapSource?: HandicapSource;
  /** Which holes the round is being played over. Filters the displayed
   *  hole columns and OUT/IN subtotal rows. Defaults to 'full'. */
  nineType?: NineType;
  /** Display offset for combo / cross-nine courses (default 1). */
  startHole?: number;
}

// =====================================================
// SCORE CELL PRESENTATION
// =====================================================

type ThemePalette = ReturnType<typeof useThemeColors>;

interface StripCellStyle {
  text: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

/**
 * Presentational mapping from a gross hole score to the tinted cell + ring
 * treatment from the redesign. Category and color come from the EXISTING
 * scoring helpers (getScoreCategory / getScoreColor) — no scoring math here.
 */
function getStripCellStyle(
  strokes: number | undefined,
  par: number,
  colors: ThemePalette
): StripCellStyle {
  if (!strokes || strokes <= 0) {
    return {
      text: '',
      backgroundColor: 'transparent',
      borderColor: colors.border,
      textColor: colors.textTertiary,
    };
  }
  // Pickup: red "P" (matches ScoreIndicator's pickup treatment)
  if (strokes >= PICKUP_SCORE) {
    return {
      text: 'P',
      backgroundColor: colors.doubleBogeyBackground,
      borderColor: colors.error,
      textColor: colors.error,
    };
  }

  const category = getScoreCategory(strokes, par);
  const scoreColor = getScoreColor(strokes, par, colors);
  const backgrounds: Record<string, string> = {
    albatross: colors.eagleBackground,
    eagle: colors.eagleBackground,
    birdie: colors.birdieBackground,
    par: colors.parBackground,
    bogey: colors.bogeyBackground,
    'double-bogey': colors.doubleBogeyBackground,
    'triple-plus': colors.doubleBogeyBackground,
  };

  return {
    text: String(strokes),
    backgroundColor: (category && backgrounds[category]) || colors.parBackground,
    // Par cells get a subtle ring; every other category rings in its score color
    borderColor: category === 'par' ? colors.border : scoreColor,
    textColor: scoreColor,
  };
}

/** Single hole cell: hole number above, tinted score cell, par below. */
function HoleCell({
  hole,
  strokes,
  fill,
}: {
  hole: Hole;
  strokes: number | undefined;
  fill?: boolean;
}) {
  const colors = useThemeColors();
  const cell = getStripCellStyle(strokes, hole.par, colors);

  return (
    <View style={fill ? cellStyles.cellColumnFill : cellStyles.cellColumn}>
      <Text style={[cellStyles.holeNumber, { color: colors.textTertiary }]}>{hole.number}</Text>
      <View
        style={[
          cellStyles.scoreCell,
          { backgroundColor: cell.backgroundColor, borderColor: cell.borderColor },
        ]}
      >
        <Text style={[cellStyles.scoreText, { color: cell.textColor }]}>{cell.text}</Text>
      </View>
      <Text style={[cellStyles.parText, { color: colors.textTertiary }]}>{hole.par}</Text>
    </View>
  );
}

const cellStyles = StyleSheet.create({
  cellColumn: {
    width: 33,
  },
  cellColumnFill: {
    flex: 1,
    minWidth: 0,
  },
  holeNumber: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 3,
  },
  scoreCell: {
    height: 33,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
  },
  parText: {
    fontSize: 8.5,
    textAlign: 'center',
    marginTop: 3,
  },
});

// =====================================================
// PER-PLAYER HEADER (strip + split views)
// =====================================================

function PlayerSummaryHeader({
  player,
  stats,
  showStableford,
}: {
  player: Player | null;
  stats: PlayerStats;
  showStableford: boolean;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.playerSummaryRow}>
      <Text style={[styles.playerSummaryName, { color: colors.textPrimary }]} numberOfLines={1}>
        {player?.name || 'Unknown'}
      </Text>
      <Text style={[styles.playerSummaryMeta, { color: colors.textSecondary }]}>
        {stats.totalGross || '–'} gross
        {showStableford && (
          <Text style={[styles.playerSummaryMeta, { color: colors.primary }]}>
            {' '}· {stats.totalStableford} pts
          </Text>
        )}
      </Text>
    </View>
  );
}

// =====================================================
// STRIP VIEW — single horizontal strip per player
// =====================================================

function StripScorecardView({
  displayPlayers,
  holes,
  playerStats,
  showStableford,
}: {
  displayPlayers: ScorecardTablePlayer[];
  holes: Hole[];
  playerStats: PlayerStats[];
  showStableford: boolean;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.viewStack}>
      {displayPlayers.map((displayPlayer, index) => (
        <View
          key={displayPlayer.id}
          style={[
            styles.stripCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <PlayerSummaryHeader
            player={displayPlayer.player as Player | null}
            stats={playerStats[index]}
            showStableford={showStableford}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.stripRow}>
              {holes.map((hole) => {
                const score = displayPlayer.scores?.[String(hole.number)];
                const strokes =
                  score && isSingleBallScore(score) ? score.strokes : undefined;
                return <HoleCell key={hole.number} hole={hole} strokes={strokes} />;
              })}
            </View>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

// =====================================================
// SPLIT VIEW — FRONT NINE / BACK NINE cards per player
// =====================================================

function SplitScorecardView({
  displayPlayers,
  holes,
  playerStats,
  showStableford,
}: {
  displayPlayers: ScorecardTablePlayer[];
  holes: Hole[];
  playerStats: PlayerStats[];
  showStableford: boolean;
}) {
  const colors = useThemeColors();
  const { front9, back9 } = useMemo(() => splitHolesByNine(holes), [holes]);

  const renderNineCard = (
    displayPlayer: ScorecardTablePlayer,
    nineHoles: Hole[],
    label: string,
    total: string
  ) => (
    <View
      style={[
        styles.nineCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.nineCardHeader}>
        <Text style={[styles.nineCardLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.nineCardTotal, { color: colors.textSecondary }]}>{total}</Text>
      </View>
      <View style={styles.nineCellsRow}>
        {nineHoles.map((hole) => {
          const score = displayPlayer.scores?.[String(hole.number)];
          const strokes = score && isSingleBallScore(score) ? score.strokes : undefined;
          return <HoleCell key={hole.number} hole={hole} strokes={strokes} fill />;
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.viewStack}>
      {displayPlayers.map((displayPlayer, index) => {
        const stats = playerStats[index];
        return (
          <View key={displayPlayer.id} style={styles.splitPlayerSection}>
            <PlayerSummaryHeader
              player={displayPlayer.player as Player | null}
              stats={stats}
              showStableford={showStableford}
            />
            {front9.length > 0 &&
              renderNineCard(
                displayPlayer,
                front9,
                'FRONT NINE',
                `Out ${stats.front9Gross || '–'}`
              )}
            {back9.length > 0 &&
              renderNineCard(
                displayPlayer,
                back9,
                'BACK NINE',
                `In ${stats.back9Gross || '–'}`
              )}
          </View>
        );
      })}
    </View>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const RoundScorecardTab = React.memo(function RoundScorecardTab({
  scorecards,
  roundPlayers,
  holes,
  onPlayerPress,
  selectedTeeData,
  gameType,
  handicapSource,
  nineType = 'full',
  startHole = 1,
}: RoundScorecardTabProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const showStableford = gameType !== 'stroke';

  // Default to standard 18 holes if no course data, then narrow to the
  // round's `nine_type` so 9-hole rounds don't render empty back/front
  // sections.
  const courseHoles = useMemo(() => {
    const base =
      Array.isArray(holes) && holes.length > 0 ? holes : generateDefaultHoles();
    return filterHolesByNineType(base, nineType);
  }, [holes, nineType]);

  // Merge scorecards with all players from pairings
  const displayPlayers: ScorecardTablePlayer[] = useMemo(() => {
    const scorecardMap = new Map<string, ScorecardWithPlayer>();
    scorecards.forEach((sc) => {
      if (sc.player_id) {
        scorecardMap.set(sc.player_id, sc);
      }
    });

    if (roundPlayers.length > 0) {
      return roundPlayers.map((player) => {
        const scorecard = scorecardMap.get(player.id);
        return {
          id: scorecard?.id || `player-${player.id}`,
          playerId: player.id,
          player: player as Player,
          scores: scorecard?.scores || null,
          hasScorecard: !!scorecard,
          storedGaHandicap: scorecard?.ga_handicap_used ?? null,
          storedDailyHandicap: scorecard?.daily_handicap_used ?? null,
          storedTotalPoints: scorecard?.total_points ?? null,
        };
      });
    }

    return scorecards.map((scorecard) => ({
      id: scorecard.id,
      playerId: scorecard.player_id,
      player: scorecard.player,
      scores: scorecard.scores,
      hasScorecard: true,
      storedGaHandicap: scorecard.ga_handicap_used ?? null,
      storedDailyHandicap: scorecard.daily_handicap_used ?? null,
      storedTotalPoints: scorecard.total_points ?? null,
    }));
  }, [scorecards, roundPlayers]);

  // Shared totals for the strip/split player headers and the totals trio.
  const playerStats = useMemo(
    () => calculatePlayerStats(displayPlayers, courseHoles, selectedTeeData),
    [displayPlayers, courseHoles, selectedTeeData]
  );

  // Totals trio (single-player rounds only — multi-player rounds carry
  // per-player totals in each card header instead). TO PAR compares the
  // existing gross total against par over the holes actually scored.
  const singleStats = displayPlayers.length === 1 ? playerStats[0] : null;
  const singleToPar = useMemo(() => {
    if (displayPlayers.length !== 1) return null;
    const scores = displayPlayers[0].scores;
    let playedPar = 0;
    courseHoles.forEach((hole) => {
      const score = scores?.[String(hole.number)];
      if (score && isSingleBallScore(score) && score.strokes > 0) {
        playedPar += hole.par;
      }
    });
    if (playedPar === 0) return null;
    const diff = playerStats[0].totalGross - playedPar;
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
  }, [displayPlayers, courseHoles, playerStats]);

  if (displayPlayers.length === 0) {
    return (
      <EmptyState
        icon="card-text-outline"
        title="No players yet"
        message="Players will appear here once they are added to the round."
        compact
      />
    );
  }

  const renderToggleButton = (
    mode: ViewMode,
    icon: string,
    accessibilityLabel: string
  ) => {
    const isActive = viewMode === mode;
    return (
      <TouchableOpacity
        style={[
          styles.toggleButton,
          isActive && { backgroundColor: colors.surface },
          isActive && shadows.sm,
        ]}
        onPress={() => setViewMode(mode)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isActive }}
      >
        <Icon
          source={icon}
          size={18}
          color={isActive ? colors.primary : colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with title and 3-way view toggle (strip / split / list) */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Scorecard</Text>
        <View
          style={[
            styles.toggleContainer,
            { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
          ]}
        >
          {renderToggleButton('strip', 'view-column-outline', 'Strip view')}
          {renderToggleButton('split', 'view-agenda-outline', 'Front and back nine view')}
          {renderToggleButton('table', 'table', 'Full scorecard view')}
        </View>
      </View>

      {/* Conditional view rendering */}
      {viewMode === 'table' ? (
        <ScorecardTable
          players={displayPlayers}
          holes={courseHoles}
          screenWidth={screenWidth}
          onPlayerPress={onPlayerPress}
          selectedTeeData={selectedTeeData}
          gameType={gameType}
          handicapSource={handicapSource}
          startHole={startHole}
        />
      ) : viewMode === 'strip' ? (
        <StripScorecardView
          displayPlayers={displayPlayers}
          holes={courseHoles}
          playerStats={playerStats}
          showStableford={showStableford}
        />
      ) : (
        <SplitScorecardView
          displayPlayers={displayPlayers}
          holes={courseHoles}
          playerStats={playerStats}
          showStableford={showStableford}
        />
      )}

      {/* Legend - unified compact style for all views */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              { backgroundColor: colors.eagleBackground, borderColor: colors.eagle },
            ]}
          >
            <Text style={[styles.legendColorText, { color: colors.eagle }]}>2</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Eagle</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              { backgroundColor: colors.birdieBackground, borderColor: colors.birdie },
            ]}
          >
            <Text style={[styles.legendColorText, { color: colors.birdie }]}>3</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Birdie</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              { backgroundColor: colors.parBackground, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.legendColorText, { color: colors.par }]}>4</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Par</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              { backgroundColor: colors.bogeyBackground, borderColor: colors.bogey },
            ]}
          >
            <Text style={[styles.legendColorText, { color: colors.bogey }]}>5</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Bogey</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              {
                backgroundColor: colors.doubleBogeyBackground,
                borderColor: colors.doubleBogey,
              },
            ]}
          >
            <Text style={[styles.legendColorText, { color: colors.doubleBogey }]}>6+</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>2+</Text>
        </View>
      </View>

      {/* GROSS / TO PAR / POINTS totals trio (single-player rounds) */}
      {singleStats && singleStats.hasScores && (
        <View style={styles.totalsRow}>
          <View
            style={[
              styles.totalsTile,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.totalsValue, { color: colors.textPrimary }]}>
              {singleStats.totalGross || '–'}
            </Text>
            <Text style={[styles.totalsLabel, { color: colors.textTertiary }]}>GROSS</Text>
          </View>
          <View
            style={[
              styles.totalsTile,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.totalsValue, { color: colors.textPrimary }]}>
              {singleToPar ?? '–'}
            </Text>
            <Text style={[styles.totalsLabel, { color: colors.textTertiary }]}>TO PAR</Text>
          </View>
          {showStableford && (
            <View
              style={[
                styles.totalsTile,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.totalsValue, { color: colors.primary }]}>
                {singleStats.totalStableford}
              </Text>
              <Text style={[styles.totalsLabel, { color: colors.textTertiary }]}>POINTS</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h4,
  },
  toggleContainer: {
    flexDirection: 'row',
    // Design: 38x30 segmented icons on a bordered surfaceVariant track
    borderRadius: 11,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  toggleButton: {
    width: 38,
    height: 30,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Strip / split shared
  viewStack: {
    gap: spacing.md,
  },
  playerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  playerSummaryName: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  playerSummaryMeta: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Strip view
  stripCard: {
    // Design: rounded card housing the horizontal strip
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  stripRow: {
    flexDirection: 'row',
    gap: 5,
  },

  // Split view
  splitPlayerSection: {
    gap: spacing.sm + 3,
  },
  nineCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md + 1,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  nineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 1,
    paddingHorizontal: 2,
  },
  nineCardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  nineCardTotal: {
    fontSize: 11,
    fontWeight: '700',
  },
  nineCellsRow: {
    flexDirection: 'row',
    gap: 4,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendText: {
    ...typography.caption,
  },
  legendColorBox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendColorText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Totals trio
  totalsRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  totalsTile: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md + 1,
    alignItems: 'center',
  },
  totalsValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  totalsLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 3,
  },
});

export default RoundScorecardTab;
