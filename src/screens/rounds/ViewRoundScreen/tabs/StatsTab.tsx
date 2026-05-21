/**
 * StatsTab - Detailed per-hole stats view (Putts, FIR, GIR, Bunkers, Hazards)
 *
 * For solo rounds: shows all stat columns directly in the table.
 * For multi-player rounds: player chip selector + stats for selected player.
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { FeatureLockCompact } from '@/components/subscription/FeatureLockCompact';
import { isSingleBallScore } from '@/types/database/base';
import { splitHolesByNine, generateDefaultHoles } from '@/utils/scorecardCalculations';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import { getScoreColor } from '@/utils/scoring';
import type { Hole, Player } from '@/types';
import type { ScorecardWithPlayer, RoundPlayer } from '@/hooks/useRoundDetails';
import type { CourseWithClub } from '@/hooks/useRoundDetails';
import type { ScorecardTablePlayer } from '@/components/scorecard/ScorecardTable/types';
import type { NineType } from '@/types/database/enums';

interface StatsVisibility {
  showPutts: boolean;
  showFairwayHit: boolean;
  showGreenInRegulation: boolean;
  showBunkerShots: boolean;
  showHazards: boolean;
}

interface StatsTabProps {
  /** Pre-built display players (skips merge logic). Used by ReviewScorecardScreen. */
  displayPlayers?: ScorecardTablePlayer[];
  /** Raw scorecards to merge with roundPlayers. Used by ViewRoundScreen. */
  scorecards?: ScorecardWithPlayer[];
  roundPlayers?: RoundPlayer[];
  holes: CourseWithClub['holes'] | null;
  statsVisibility: StatsVisibility;
  canEditStats?: boolean;
  onEditStats?: (holeNumber?: number) => void;
  onUpgradePress?: () => void;
  /** Which holes the round is being played over. Filters the rendered
   *  hole rows and OUT/IN subtotals. Defaults to 'full'. */
  nineType?: NineType;
}

export function StatsTab({ displayPlayers: displayPlayersProp, scorecards, roundPlayers, holes: rawHoles, statsVisibility, canEditStats, onEditStats, onUpgradePress, nineType = 'full' }: StatsTabProps) {
  const colors = useThemeColors();
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);

  const holes = useMemo(() => {
    const base =
      Array.isArray(rawHoles) && rawHoles.length > 0
        ? rawHoles
        : generateDefaultHoles();
    return filterHolesByNineType(base, nineType);
  }, [rawHoles, nineType]);

  // Merge scorecards with round players (same logic as RoundScorecardTab)
  // If displayPlayersProp is provided, skip the merge logic entirely
  const displayPlayers: ScorecardTablePlayer[] = useMemo(() => {
    if (displayPlayersProp && displayPlayersProp.length > 0) {
      return displayPlayersProp;
    }

    const scorecardMap = new Map<string, ScorecardWithPlayer>();
    (scorecards || []).forEach((sc) => {
      if (sc.player_id) scorecardMap.set(sc.player_id, sc);
    });

    if (roundPlayers && roundPlayers.length > 0) {
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

    return (scorecards || []).map((scorecard) => ({
      id: scorecard.id,
      playerId: scorecard.player_id,
      player: scorecard.player,
      scores: scorecard.scores,
      hasScorecard: true,
    }));
  }, [displayPlayersProp, scorecards, roundPlayers]);

  const isSoloRound = displayPlayers.length === 1;

  const { front9, back9 } = useMemo(() => splitHolesByNine(holes), [holes]);

  const enabledStats = useMemo(() => {
    const stats: { key: string; label: string }[] = [
      { key: 'score', label: 'Score' },
    ];
    if (statsVisibility.showPutts) stats.push({ key: 'putts', label: 'Putts' });
    if (statsVisibility.showFairwayHit) stats.push({ key: 'fir', label: 'FIR' });
    if (statsVisibility.showGreenInRegulation) stats.push({ key: 'gir', label: 'GIR' });
    if (statsVisibility.showBunkerShots) stats.push({ key: 'bunkers', label: 'Bkrs' });
    if (statsVisibility.showHazards) stats.push({ key: 'hazards', label: 'Hzds' });
    return stats;
  }, [statsVisibility]);

  const selectedPlayer = displayPlayers[selectedPlayerIndex] || displayPlayers[0];
  if (!selectedPlayer) return null;

  const scores = selectedPlayer.scores;

  const getStatValue = (hole: Hole, statKey: string): string => {
    const score = scores?.[String(hole.number)];
    if (!score || !isSingleBallScore(score)) return '-';

    switch (statKey) {
      case 'score':
        return score.strokes != null ? String(score.strokes) : '-';
      case 'putts':
        return score.putts != null ? String(score.putts) : '-';
      case 'fir':
        if (hole.par < 4) return '-';
        if (score.fairwayHit === true) return '\u2713';
        if (score.fairwayHit === false) return '\u2717';
        return '-';
      case 'gir':
        if (score.greenInRegulation === true) return '\u2713';
        if (score.greenInRegulation === false) return '\u2717';
        return '-';
      case 'bunkers':
        return score.bunkerShots != null ? String(score.bunkerShots) : '-';
      case 'hazards':
        return score.hazards && score.hazards.length > 0 ? String(score.hazards.length) : '-';
      default:
        return '-';
    }
  };

  const getStatColor = (value: string, statKey: string, hole?: Hole): string => {
    if (value === '-') return colors.textDisabled;
    if (statKey === 'score' && hole) {
      return getScoreColor(Number(value), hole.par, colors);
    }
    if (statKey === 'fir' || statKey === 'gir') {
      return value === '\u2713' ? colors.success : colors.error;
    }
    if (statKey === 'bunkers' || statKey === 'hazards') {
      return Number(value) > 0 ? colors.error : colors.textDisabled;
    }
    return colors.textPrimary;
  };

  const getNineTotal = (holeList: Hole[], statKey: string): string => {
    switch (statKey) {
      case 'score': {
        let total = 0;
        let hasAny = false;
        holeList.forEach((hole) => {
          const score = scores?.[String(hole.number)];
          if (score && isSingleBallScore(score) && score.strokes != null) {
            total += score.strokes;
            hasAny = true;
          }
        });
        return hasAny ? String(total) : '-';
      }
      case 'putts': {
        let total = 0;
        let hasAny = false;
        holeList.forEach((hole) => {
          const score = scores?.[String(hole.number)];
          if (score && isSingleBallScore(score) && score.putts != null) {
            total += score.putts;
            hasAny = true;
          }
        });
        return hasAny ? String(total) : '-';
      }
      case 'fir': {
        const firHoles = holeList.filter((h) => h.par >= 4);
        if (firHoles.length === 0) return '-';
        let hit = 0;
        firHoles.forEach((hole) => {
          const score = scores?.[String(hole.number)];
          if (score && isSingleBallScore(score) && score.fairwayHit === true) hit++;
        });
        return `${hit}/${firHoles.length}`;
      }
      case 'gir': {
        let hit = 0;
        holeList.forEach((hole) => {
          const score = scores?.[String(hole.number)];
          if (score && isSingleBallScore(score) && score.greenInRegulation === true) hit++;
        });
        return `${hit}/${holeList.length}`;
      }
      case 'bunkers': {
        let total = 0;
        let hasAny = false;
        holeList.forEach((hole) => {
          const score = scores?.[String(hole.number)];
          if (score && isSingleBallScore(score) && score.bunkerShots != null) {
            total += score.bunkerShots;
            hasAny = true;
          }
        });
        return hasAny ? String(total) : '-';
      }
      case 'hazards': {
        let total = 0;
        let hasAny = false;
        holeList.forEach((hole) => {
          const score = scores?.[String(hole.number)];
          if (score && isSingleBallScore(score) && score.hazards && score.hazards.length > 0) {
            total += score.hazards.length;
            hasAny = true;
          }
        });
        return hasAny ? String(total) : '-';
      }
      default:
        return '-';
    }
  };

  const getTotal = (statKey: string): string => {
    return getNineTotal(holes, statKey);
  };

  const renderNineSection = (holeList: Hole[], label: string) => (
    <View>
      {/* Hole rows */}
      {holeList.map((hole, idx) => (
        <View
          key={hole.number}
          style={[
            styles.row,
            { borderBottomColor: colors.border },
            idx % 2 === 1 && { backgroundColor: colors.surfaceVariant + '40' },
          ]}
        >
          <TouchableOpacity
            style={styles.holeCell}
            onPress={canEditStats && onEditStats ? () => onEditStats(hole.number) : undefined}
            disabled={!canEditStats || !onEditStats}
            activeOpacity={0.6}
          >
            <Text style={[styles.holeCellText, { color: canEditStats && onEditStats ? colors.primary : colors.textPrimary }]}>{hole.number}</Text>
          </TouchableOpacity>
          <View style={styles.parCell}>
            <Text style={[styles.cellText, { color: colors.textSecondary }]}>{hole.par}</Text>
          </View>
          {enabledStats.map((stat) => {
            const value = getStatValue(hole, stat.key);
            return (
              <View key={stat.key} style={styles.statCell}>
                <Text style={[styles.cellText, { color: getStatColor(value, stat.key, hole) }]}>
                  {value}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      {/* Subtotal row */}
      <View style={[styles.row, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
        <View style={styles.holeCell}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        <View style={styles.parCell}>
          <Text style={[styles.subtotalText, { color: colors.textSecondary }]}>
            {holeList.reduce((sum, h) => sum + h.par, 0)}
          </Text>
        </View>
        {enabledStats.map((stat) => (
          <View key={stat.key} style={styles.statCell}>
            <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
              {getNineTotal(holeList, stat.key)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Player chip selector (multi-player only) */}
      {!isSoloRound && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
          {displayPlayers.map((player, index) => {
            const isSelected = index === selectedPlayerIndex;
            return (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                  isSelected && shadows.sm,
                ]}
                onPress={() => setSelectedPlayerIndex(index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? colors.white : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {player.player?.name || 'Player'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Edit Stats button */}
      {canEditStats && onEditStats && (
        <FeatureLockCompact
          feature="detailed_stats"
          onUpgradePress={onUpgradePress}
        >
          <TouchableOpacity
            style={[styles.editStatsButton, { borderColor: colors.primary }]}
            onPress={() => onEditStats()}
            activeOpacity={0.8}
            accessibilityLabel="Edit detailed stats"
            accessibilityRole="button"
          >
            <Icon source="chart-bar" size={20} color={colors.primary} />
            <Text style={[styles.editStatsButtonText, { color: colors.primary }]}>Edit Stats</Text>
          </TouchableOpacity>
        </FeatureLockCompact>
      )}

      {/* Stats table */}
      <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={[styles.row, styles.headerRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
          <View style={styles.holeCell}>
            <Text style={[styles.headerText, { color: colors.textPrimary }]}>Hole</Text>
          </View>
          <View style={styles.parCell}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Par</Text>
          </View>
          {enabledStats.map((stat) => (
            <View key={stat.key} style={styles.statCell}>
              <Text style={[styles.headerText, { color: colors.textPrimary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Front 9 — hidden for Back 9 only rounds */}
        {front9.length > 0 && renderNineSection(front9, 'OUT')}

        {/* Back 9 — hidden for Front 9 only rounds */}
        {back9.length > 0 && renderNineSection(back9, 'IN')}

        {/* Total row */}
        <View style={[styles.row, styles.totalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
          <View style={styles.holeCell}>
            <Text style={[styles.totalText, { color: colors.textPrimary }]}>TOT</Text>
          </View>
          <View style={styles.parCell}>
            <Text style={[styles.totalText, { color: colors.textSecondary }]}>
              {holes.reduce((sum, h) => sum + h.par, 0)}
            </Text>
          </View>
          {enabledStats.map((stat) => (
            <View key={stat.key} style={styles.statCell}>
              <Text style={[styles.totalText, { color: colors.textPrimary }]}>
                {getTotal(stat.key)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Icon source="check" size={14} color={colors.success} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Hit</Text>
        </View>
        <View style={styles.legendItem}>
          <Icon source="close" size={14} color={colors.error} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Miss</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    ...typography.smallBold,
  },
  editStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  editStatsButtonText: {
    ...typography.smallBold,
  },
  tableContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    minHeight: 40,
  },
  subtotalRow: {
    minHeight: 36,
  },
  totalRow: {
    minHeight: 40,
  },
  holeCell: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    ...typography.small,
    textAlign: 'center',
  },
  holeCellText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  headerText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  subtotalText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  totalText: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendText: {
    ...typography.caption,
  },
});
