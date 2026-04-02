/**
 * RoundScorecardTab - Read-only scorecard grid for ViewRoundScreen
 *
 * Displays a comprehensive scorecard view showing:
 * - Table view: Columns for Hole | SI | Par | Player columns...
 * - Individual view: Compact cards for each player
 * - Toggle between views
 * - Score indicators: circle for birdie, square for bogey, etc.
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useWindowDimensions } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { EmptyState } from '@/components/common/EmptyState';
import { getScoreColor, getStrokesReceived, calculateStablefordPointsNet } from '@/utils/scoring';
import {
  ScorecardTable,
  ScoreIndicator,
  type ScorecardTablePlayer,
} from '@/components/scorecard';
import {
  calculatePlayerStats,
  calculateParTotals,
  splitHolesByNine,
  generateDefaultHoles,
} from '@/utils/scorecardCalculations';
import {
  INDIVIDUAL_LABEL_WIDTH,
  INDIVIDUAL_TOTAL_WIDTH,
} from '@/utils/scorecardLayout';
import type { ScorecardWithPlayer, CourseWithVenue, RoundPlayer } from '@/hooks/useRoundDetails';
import { isSingleBallScore, type Hole, type Player, type TeeBox } from '@/types/database.types';
import type { GameType, HandicapSource } from '@/types/database';

// =====================================================
// TYPES
// =====================================================

type ViewMode = 'table' | 'individual';

interface RoundScorecardTabProps {
  scorecards: ScorecardWithPlayer[];
  roundPlayers: RoundPlayer[];
  holes: CourseWithVenue['holes'] | null;
  /** Callback when a player name is pressed in the table view */
  onPlayerPress?: (playerId: string) => void;
  /** Selected tee data with slope/course ratings for daily handicap calculation */
  selectedTeeData?: TeeBox | null;
  /** Game type for the round (affects score display) */
  gameType?: GameType;
  /** Handicap source for daily HC calculation */
  handicapSource?: HandicapSource;
}

// =====================================================
// INDIVIDUAL SCORECARD VIEW
// =====================================================

interface IndividualScorecardViewProps {
  displayPlayers: ScorecardTablePlayer[];
  holes: Hole[];
  /** Whether to show putts row */
  showPutts?: boolean;
  /** Whether to show FIR row */
  showFIR?: boolean;
  /** Whether to show GIR row */
  showGIR?: boolean;
  /** Whether to show bunker shots row */
  showBunkerShots?: boolean;
  /** Whether to show hazards row */
  showHazards?: boolean;
  /** Selected tee data for daily handicap calculation */
  selectedTeeData?: TeeBox | null;
}

const IndividualScorecardView = React.memo(function IndividualScorecardView({
  displayPlayers,
  holes,
  showPutts = false,
  showFIR = false,
  showGIR = false,
  showBunkerShots = false,
  showHazards = false,
  selectedTeeData,
}: IndividualScorecardViewProps) {
  const colors = useThemeColors();

  const { front9, back9 } = useMemo(() => splitHolesByNine(holes), [holes]);
  const parTotals = useMemo(() => calculateParTotals(holes), [holes]);
  const playerStats = useMemo(
    () => calculatePlayerStats(displayPlayers, holes, selectedTeeData),
    [displayPlayers, holes, selectedTeeData]
  );

  const renderPlayerScorecard = (displayPlayer: ScorecardTablePlayer, index: number) => {
    const player = displayPlayer.player;
    const scores = displayPlayer.scores;
    const handicap = player?.handicap || 0;
    const stats = playerStats[index];

    const front9Par = front9.reduce((sum, h) => sum + h.par, 0);
    const back9Par = back9.reduce((sum, h) => sum + h.par, 0);

    const renderHoleRow = (holeList: Hole[], isBack9Section: boolean) => {
      const ninePar = isBack9Section ? back9Par : front9Par;
      const nineGross = isBack9Section ? stats.back9Gross : stats.front9Gross;
      const nineStableford = isBack9Section ? stats.back9Stableford : stats.front9Stableford;

      // Calculate putts total for this nine
      const ninePutts = holeList.reduce((sum, hole) => {
        const score = scores?.[String(hole.number)];
        const putts = score && isSingleBallScore(score) ? score.putts : undefined;
        return sum + (putts ?? 0);
      }, 0);

      // Calculate FIR for this nine (par 4+ holes only)
      const firHoles = holeList.filter((h) => h.par >= 4);
      const firHit = firHoles.reduce((sum, hole) => {
        const score = scores?.[String(hole.number)];
        const fairwayHit = score && isSingleBallScore(score) ? score.fairwayHit : undefined;
        return sum + (fairwayHit === true ? 1 : 0);
      }, 0);
      const nineFIR = firHoles.length > 0 ? `${firHit}/${firHoles.length}` : '-';

      // Calculate GIR for this nine
      const girHit = holeList.reduce((sum, hole) => {
        const score = scores?.[String(hole.number)];
        const greenInRegulation = score && isSingleBallScore(score) ? score.greenInRegulation : undefined;
        return sum + (greenInRegulation === true ? 1 : 0);
      }, 0);
      const nineGIR = `${girHit}/${holeList.length}`;

      // Calculate bunkers total for this nine
      const nineBunkers = holeList.reduce((sum, hole) => {
        const score = scores?.[String(hole.number)];
        const bunkers = score && isSingleBallScore(score) ? score.bunkerShots : undefined;
        return sum + (bunkers ?? 0);
      }, 0);

      // Calculate hazards total for this nine
      const nineHazards = holeList.reduce((sum, hole) => {
        const score = scores?.[String(hole.number)];
        const hazards = score && isSingleBallScore(score) ? score.hazards : undefined;
        return sum + (hazards ? hazards.length : 0);
      }, 0);

      return (
        <View style={individualStyles.nineSection}>
          {/* Header Row: Hole numbers */}
          <View style={[individualStyles.row, { backgroundColor: colors.surfaceVariant }]}>
            <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[individualStyles.labelText, { color: colors.textPrimary }]}>Hole</Text>
            </View>
            {holeList.map((hole) => (
              <View key={hole.number} style={individualStyles.cell}>
                <Text style={[individualStyles.headerText, { color: colors.textPrimary }]}>
                  {hole.number}
                </Text>
              </View>
            ))}
            <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[individualStyles.headerText, { color: colors.textPrimary }]}>
                {isBack9Section ? 'IN' : 'OUT'}
              </Text>
            </View>
          </View>

          {/* SI Row */}
          <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
            <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[individualStyles.labelText, { color: colors.textSecondary }]}>SI</Text>
            </View>
            {holeList.map((hole) => (
              <View key={hole.number} style={individualStyles.cell}>
                <Text style={[individualStyles.cellText, { color: colors.textSecondary }]}>
                  {hole.strokeIndex}
                </Text>
              </View>
            ))}
            <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[individualStyles.cellText, { color: colors.textSecondary }]}>-</Text>
            </View>
          </View>

          {/* Par Row */}
          <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
            <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[individualStyles.labelText, { color: colors.textSecondary }]}>Par</Text>
            </View>
            {holeList.map((hole) => (
              <View key={hole.number} style={individualStyles.cell}>
                <Text style={[individualStyles.cellText, { color: colors.textPrimary }]}>
                  {hole.par}
                </Text>
              </View>
            ))}
            <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[individualStyles.totalText, { color: colors.textPrimary }]}>
                {ninePar}
              </Text>
            </View>
          </View>

          {/* Score Row */}
          <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
            <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[individualStyles.labelText, { color: colors.textPrimary }]}>Score</Text>
            </View>
            {holeList.map((hole) => {
              const score = scores?.[String(hole.number)];
              const strokes = score && isSingleBallScore(score) ? score.strokes : undefined;
              return (
                <View key={hole.number} style={individualStyles.cell}>
                  <ScoreIndicator strokes={strokes} par={hole.par} display="compact" />
                </View>
              );
            })}
            <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[individualStyles.totalText, { color: colors.textPrimary }]}>
                {nineGross || '-'}
              </Text>
            </View>
          </View>

          {/* Stableford Row */}
          <View style={[individualStyles.row, { backgroundColor: colors.primary }]}>
            <View style={[individualStyles.labelCell, { backgroundColor: colors.primaryDark || colors.primary }]}>
              <Text style={[individualStyles.labelText, { color: colors.textOnColored }]}>Pts</Text>
            </View>
            {holeList.map((hole) => {
              const score = scores?.[String(hole.number)];
              const strokes = score && isSingleBallScore(score) ? score.strokes : 0;
              const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
              const points = strokes > 0 ? calculateStablefordPointsNet(strokes, hole.par, strokesReceived) : 0;
              return (
                <View key={hole.number} style={individualStyles.cell}>
                  <Text style={[individualStyles.cellText, { color: colors.textOnColored }]}>
                    {strokes > 0 ? points : '-'}
                  </Text>
                </View>
              );
            })}
            <View style={[individualStyles.totalCell, { backgroundColor: colors.primaryDark || colors.primary }]}>
              <Text style={[individualStyles.totalText, { color: colors.textOnColored }]}>
                {nineStableford}
              </Text>
            </View>
          </View>

          {/* Putts Row */}
          {showPutts && (
            <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
              <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.labelText, { color: colors.textSecondary }]}>Putts</Text>
              </View>
              {holeList.map((hole) => {
                const score = scores?.[String(hole.number)];
                const putts = score && isSingleBallScore(score) ? score.putts : undefined;
                return (
                  <View key={hole.number} style={individualStyles.cell}>
                    <Text style={[individualStyles.cellText, { color: colors.textSecondary }]}>
                      {putts ?? '-'}
                    </Text>
                  </View>
                );
              })}
              <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.totalText, { color: colors.textSecondary }]}>
                  {ninePutts || '-'}
                </Text>
              </View>
            </View>
          )}

          {/* FIR Row - only show for par 4+ holes */}
          {showFIR && (
            <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
              <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.labelText, { color: colors.textSecondary }]}>FIR</Text>
              </View>
              {holeList.map((hole) => {
                const score = scores?.[String(hole.number)];
                const fairwayHit = score && isSingleBallScore(score) ? score.fairwayHit : undefined;
                const isFIRApplicable = hole.par >= 4;
                return (
                  <View key={hole.number} style={individualStyles.cell}>
                    {!isFIRApplicable ? (
                      <Text style={[individualStyles.cellText, { color: colors.textDisabled }]}>-</Text>
                    ) : fairwayHit === true ? (
                      <Icon source="check" size={14} color={colors.success} />
                    ) : fairwayHit === false ? (
                      <View style={individualStyles.cellWithDir}>
                        <Icon source="close" size={14} color={colors.error} />
                        {score && isSingleBallScore(score) && score.fairwayMissDirection && (
                          <Text style={[individualStyles.dirText, { color: colors.textDisabled }]}>
                            {score.fairwayMissDirection === 'left' ? 'L' : 'R'}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={[individualStyles.cellText, { color: colors.textSecondary }]}>-</Text>
                    )}
                  </View>
                );
              })}
              <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.totalText, { color: colors.textSecondary }]}>
                  {nineFIR}
                </Text>
              </View>
            </View>
          )}

          {/* GIR Row */}
          {showGIR && (
            <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
              <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.labelText, { color: colors.textSecondary }]}>GIR</Text>
              </View>
              {holeList.map((hole) => {
                const score = scores?.[String(hole.number)];
                const greenInRegulation = score && isSingleBallScore(score) ? score.greenInRegulation : undefined;
                return (
                  <View key={hole.number} style={individualStyles.cell}>
                    {greenInRegulation === true ? (
                      <Icon source="check" size={14} color={colors.success} />
                    ) : greenInRegulation === false ? (
                      <View style={individualStyles.cellWithDir}>
                        <Icon source="close" size={14} color={colors.error} />
                        {score && isSingleBallScore(score) && score.greenMissDirection && (
                          <Text style={[individualStyles.dirText, { color: colors.textDisabled }]}>
                            {{ left: 'L', right: 'R', long: 'Lo', short: 'Sh' }[score.greenMissDirection]}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={[individualStyles.cellText, { color: colors.textSecondary }]}>-</Text>
                    )}
                  </View>
                );
              })}
              <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.totalText, { color: colors.textSecondary }]}>
                  {nineGIR}
                </Text>
              </View>
            </View>
          )}

          {/* Bunkers Row */}
          {showBunkerShots && (
            <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
              <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.labelText, { color: colors.textSecondary }]}>Bnk</Text>
              </View>
              {holeList.map((hole) => {
                const score = scores?.[String(hole.number)];
                const bunkers = score && isSingleBallScore(score) ? score.bunkerShots : undefined;
                return (
                  <View key={hole.number} style={individualStyles.cell}>
                    <Text style={[individualStyles.cellText, { color: bunkers && bunkers > 0 ? colors.warning : colors.textDisabled }]}>
                      {bunkers && bunkers > 0 ? bunkers : '-'}
                    </Text>
                  </View>
                );
              })}
              <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.totalText, { color: colors.textSecondary }]}>
                  {nineBunkers || '-'}
                </Text>
              </View>
            </View>
          )}

          {/* Hazards Row */}
          {showHazards && (
            <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
              <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.labelText, { color: colors.textSecondary }]}>Hzd</Text>
              </View>
              {holeList.map((hole) => {
                const score = scores?.[String(hole.number)];
                const hazards = score && isSingleBallScore(score) ? score.hazards : undefined;
                return (
                  <View key={hole.number} style={individualStyles.cell}>
                    <Text style={[individualStyles.cellText, { color: hazards && hazards.length > 0 ? colors.error : colors.textDisabled }]}>
                      {hazards && hazards.length > 0 ? hazards.length : '-'}
                    </Text>
                  </View>
                );
              })}
              <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.totalText, { color: colors.textSecondary }]}>
                  {nineHazards || '-'}
                </Text>
              </View>
            </View>
          )}
        </View>
      );
    };

    return (
      <View key={displayPlayer.id} style={[individualStyles.playerCard, { backgroundColor: colors.surface }]}>
        {/* Player Header */}
        <View style={[individualStyles.playerHeader, { backgroundColor: colors.surfaceVariant }]}>
          <View style={individualStyles.playerInfo}>
            <Text style={[individualStyles.playerName, { color: colors.textPrimary }]}>
              {player?.name || 'Unknown'}
            </Text>
            <Text style={[individualStyles.playerHandicap, { color: colors.textSecondary }]}>
              Handicap: {handicap}
            </Text>
          </View>
          <View style={individualStyles.playerTotals}>
            <View style={individualStyles.totalItem}>
              <Text style={[individualStyles.totalLabel, { color: colors.textSecondary }]}>Gross</Text>
              <Text style={[individualStyles.totalValue, { color: getScoreColor(stats.totalGross, parTotals.total, colors) }]}>
                {stats.totalGross || '-'}
              </Text>
            </View>
            <View style={individualStyles.totalItem}>
              <Text style={[individualStyles.totalLabel, { color: colors.textSecondary }]}>Net</Text>
              <Text style={[individualStyles.totalValue, { color: getScoreColor(stats.totalNet, parTotals.total, colors) }]}>
                {stats.totalNet ? Math.ceil(stats.totalNet) : '-'}
              </Text>
            </View>
            <View style={[individualStyles.totalItem, individualStyles.stablefordTotal, { backgroundColor: colors.primary }]}>
              <Text style={[individualStyles.totalLabel, { color: colors.textOnColored }]}>Pts</Text>
              <Text style={[individualStyles.stablefordValue, { color: colors.textOnColored }]}>
                {stats.totalStableford}
              </Text>
            </View>
          </View>
        </View>

        {/* Front 9 */}
        {renderHoleRow(front9, false)}

        {/* Back 9 */}
        {renderHoleRow(back9, true)}
      </View>
    );
  };

  return (
    <View style={individualStyles.container}>
      {displayPlayers.map((player, index) => renderPlayerScorecard(player, index))}
    </View>
  );
});

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
}: RoundScorecardTabProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Get stats visibility settings (Premium-gated for FIR/GIR and detailed stats)
  const { showPutts, showFairwayHit, showGreenInRegulation, showBunkerShots, showHazards } = useStatsVisibilityWithTier();

  // Default to standard 18 holes if no course data
  const courseHoles = useMemo(() => {
    if (Array.isArray(holes) && holes.length > 0) return holes;
    return generateDefaultHoles();
  }, [holes]);

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
        };
      });
    }

    return scorecards.map((scorecard) => ({
      id: scorecard.id,
      playerId: scorecard.player_id,
      player: scorecard.player,
      scores: scorecard.scores,
      hasScorecard: true,
    }));
  }, [scorecards, roundPlayers]);

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

  return (
    <View style={styles.container}>
      {/* Header with title and view toggle */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Scorecard</Text>
        <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'table' && { backgroundColor: colors.surface },
              viewMode === 'table' && shadows.sm,
            ]}
            onPress={() => setViewMode('table')}
            activeOpacity={0.7}
          >
            <Icon
              source="table"
              size={18}
              color={viewMode === 'table' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'individual' && { backgroundColor: colors.surface },
              viewMode === 'individual' && shadows.sm,
            ]}
            onPress={() => setViewMode('individual')}
            activeOpacity={0.7}
          >
            <Icon
              source="card-account-details-outline"
              size={18}
              color={viewMode === 'individual' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conditional view rendering */}
      {viewMode === 'table' ? (
        <ScorecardTable
          players={displayPlayers}
          holes={courseHoles}
          screenWidth={screenWidth}
          onPlayerPress={onPlayerPress}
          showPutts={showPutts}
          showFIR={showFairwayHit}
          showGIR={showGreenInRegulation}
          selectedTeeData={selectedTeeData}
          gameType={gameType}
          handicapSource={handicapSource}
        />
      ) : (
        <IndividualScorecardView
          displayPlayers={displayPlayers}
          holes={courseHoles}
          showPutts={showPutts}
          showFIR={showFairwayHit}
          showGIR={showGreenInRegulation}
          showBunkerShots={showBunkerShots}
          showHazards={showHazards}
          selectedTeeData={selectedTeeData}
        />
      )}

      {/* Legend - unified compact style for all views */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColorBox, { backgroundColor: colors.eagleBackground }]}>
            <Text style={[styles.legendColorText, { color: colors.eagle }]}>2</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Eagle</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColorBox, { backgroundColor: colors.birdieBackground }]}>
            <Text style={[styles.legendColorText, { color: colors.birdie }]}>3</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Birdie</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColorBox, { backgroundColor: colors.parBackground }]}>
            <Text style={[styles.legendColorText, { color: colors.par }]}>4</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Par</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColorBox, { backgroundColor: colors.bogeyBackground }]}>
            <Text style={[styles.legendColorText, { color: colors.bogey }]}>5</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Bogey</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColorBox, { backgroundColor: colors.doubleBogeyBackground }]}>
            <Text style={[styles.legendColorText, { color: colors.doubleBogey }]}>6+</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>2+</Text>
        </View>
      </View>
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
    borderRadius: borderRadius.md,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    width: 36,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendColorText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

// =====================================================
// INDIVIDUAL VIEW STYLES
// =====================================================

const individualStyles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  playerCard: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    ...typography.bodyBold,
  },
  playerHandicap: {
    ...typography.small,
    marginTop: 2,
  },
  playerTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  totalItem: {
    alignItems: 'center',
    minWidth: 44,
  },
  totalLabel: {
    ...typography.caption,
  },
  totalValue: {
    ...typography.bodyBold,
  },
  stablefordTotal: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  stablefordValue: {
    ...typography.bodyBold,
  },
  nineSection: {},
  row: {
    flexDirection: 'row',
  },
  labelCell: {
    width: INDIVIDUAL_LABEL_WIDTH,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    ...typography.caption,
    fontWeight: '600',
  },
  cell: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalCell: {
    width: INDIVIDUAL_TOTAL_WIDTH,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    ...typography.caption,
    fontWeight: '600',
  },
  cellText: {
    ...typography.small,
  },
  totalText: {
    ...typography.smallBold,
  },
  cellWithDir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  dirText: {
    fontSize: 8,
    fontWeight: '600',
  },
});

export default RoundScorecardTab;
