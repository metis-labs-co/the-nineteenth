/**
 * SkinsResultsCard - Hole-by-hole skins breakdown table
 *
 * Displays a complete table of skins game results showing each hole's
 * winner or carryover status, with Front 9/Back 9 subtotals and a
 * grand total at the bottom.
 *
 * @example
 * ```tsx
 * <SkinsResultsCard
 *   results={skinsResults}
 *   potType="per_hole"
 *   potValue={5}
 *   scoringType="gross"
 * />
 * ```
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, skinsColor } from '@/constants/theme';
import {
  calculateHoleValue,
  calculateTotalPot,
  formatCurrency,
} from '@/utils/skinsCalculations';
import type {
  SkinsResultWithWinner,
  SkinsResult,
  SkinsPotType,
  SkinsScoringType,
  SkinsParticipant,
  SkinsTeamParticipant,
} from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

interface ParticipantTotal {
  id: string;
  name: string;
  holesWon: number;
  totalWinnings: number;
  /** For team skins: number of members for per-member calculation */
  memberCount?: number;
}

export interface SkinsResultsCardProps {
  /** Array of skins results with winner details */
  results: SkinsResultWithWinner[];
  /** How the pot is calculated */
  potType: SkinsPotType;
  /** Dollar value (per hole or total) */
  potValue: number;
  /** Scoring method (gross or net) */
  scoringType: SkinsScoringType;
  /** Optional par values for each hole (1-18 indexed) */
  parValues?: Record<number, number>;
  /** Optional list of all participants (to show players with zero skins) */
  participants?: SkinsParticipant[];
  /** Whether this is a team skins game */
  isTeamSkins?: boolean;
  /** Team participants (for team skins) */
  teams?: SkinsTeamParticipant[];
  /** Test ID for testing */
  testID?: string;
}

/** Row type for FlatList rendering */
type ResultRow =
  | { type: 'header' }
  | { type: 'hole'; result: SkinsResultWithWinner }
  | { type: 'subtotal'; label: string; value: number; holeRange: string }
  | { type: 'total'; value: number; unsettledCarryover: number }
  | { type: 'participantTotals'; totals: ParticipantTotal[]; isTeamSkins: boolean };

// ============================================================================
// COMPONENT
// ============================================================================

export const SkinsResultsCard = React.memo(function SkinsResultsCard({
  results,
  potType,
  potValue,
  scoringType,
  parValues,
  participants,
  isTeamSkins: isTeamSkinsProp = false,
  teams,
  testID,
}: SkinsResultsCardProps) {
  const colors = useThemeColors();

  // Auto-detect team skins from results if prop is not set but results have team_winner_id
  const isTeamSkins = useMemo(() => {
    if (isTeamSkinsProp) return true;
    // Check if any result has team_winner_id - indicates team skins
    return results.some((r) => (r as SkinsResult).team_winner_id);
  }, [isTeamSkinsProp, results]);

  // Calculate values
  const perHoleValue = useMemo(
    () => calculateHoleValue(potType, potValue),
    [potType, potValue]
  );
  const totalPot = useMemo(
    () => calculateTotalPot(potType, potValue),
    [potType, potValue]
  );

  // Create a map of hole number -> result for quick lookup
  const resultsMap = useMemo(() => {
    const map = new Map<number, SkinsResultWithWinner>();
    results.forEach((r) => map.set(r.hole_number, r));
    return map;
  }, [results]);

  // Calculate front 9 and back 9 totals
  const { front9Total, back9Total, unsettledCarryover } = useMemo(() => {
    let front = 0;
    let back = 0;
    let carryover = 0;

    // Sum up payouts by hole range
    results.forEach((r) => {
      if (r.hole_number <= 9) {
        front += r.payout_amount;
      } else {
        back += r.payout_amount;
      }
    });

    // Check for unsettled carryover (carryover remaining after hole 18)
    const hole18Result = resultsMap.get(18);
    if (hole18Result && hole18Result.is_carryover) {
      carryover = hole18Result.carryover_to_next;
    }

    return { front9Total: front, back9Total: back, unsettledCarryover: carryover };
  }, [results, resultsMap]);

  // Calculate participant totals (players or teams)
  const participantTotals = useMemo<ParticipantTotal[]>(() => {
    const totalsMap = new Map<string, ParticipantTotal>();

    if (isTeamSkins && teams) {
      // Team skins - initialize all teams
      teams.forEach((t) => {
        totalsMap.set(t.id, {
          id: t.id,
          name: t.name,
          holesWon: 0,
          totalWinnings: 0,
          memberCount: t.members?.length ?? 0,
        });
      });

      // Accumulate winnings from results using team_winner_id
      results.forEach((result) => {
        const skinsResult = result as SkinsResult;
        if (!skinsResult.is_carryover && skinsResult.team_winner_id && skinsResult.payout_amount > 0) {
          const existing = totalsMap.get(skinsResult.team_winner_id);
          if (existing) {
            existing.holesWon += 1;
            existing.totalWinnings += skinsResult.payout_amount;
          }
        }
      });
    } else {
      // Individual skins - initialize all players
      if (participants) {
        participants.forEach((p) => {
          totalsMap.set(p.id, {
            id: p.id,
            name: p.name,
            holesWon: 0,
            totalWinnings: 0,
          });
        });
      }

      // Accumulate winnings from results
      results.forEach((result) => {
        if (!result.is_carryover && result.winner_id && result.winner && result.payout_amount > 0) {
          const existing = totalsMap.get(result.winner_id);
          if (existing) {
            existing.holesWon += 1;
            existing.totalWinnings += result.payout_amount;
          } else {
            // Winner not in participants list (or no participants provided)
            totalsMap.set(result.winner_id, {
              id: result.winner_id,
              name: result.winner.name,
              holesWon: 1,
              totalWinnings: result.payout_amount,
            });
          }
        }
      });
    }

    // Convert to array and sort by total winnings descending
    return Array.from(totalsMap.values()).sort((a, b) => b.totalWinnings - a.totalWinnings);
  }, [results, participants, isTeamSkins, teams]);

  // Build row data for FlatList
  const rowData = useMemo<ResultRow[]>(() => {
    const rows: ResultRow[] = [];

    // Header row
    rows.push({ type: 'header' });

    // Holes 1-9
    for (let hole = 1; hole <= 9; hole++) {
      const result = resultsMap.get(hole);
      if (result) {
        rows.push({ type: 'hole', result });
      } else {
        // Create placeholder for holes not yet played
        rows.push({
          type: 'hole',
          result: {
            id: `placeholder-${hole}`,
            skins_game_id: '',
            hole_number: hole,
            winner_id: null,
            is_carryover: false,
            hole_scores: {},
            hole_pot_value: perHoleValue,
            carryover_to_next: 0,
            payout_amount: 0,
            calculated_at: '',
            winner: null,
          } as SkinsResultWithWinner,
        });
      }
    }

    // Front 9 subtotal
    rows.push({
      type: 'subtotal',
      label: 'FRONT 9',
      value: front9Total,
      holeRange: '1-9',
    });

    // Holes 10-18
    for (let hole = 10; hole <= 18; hole++) {
      const result = resultsMap.get(hole);
      if (result) {
        rows.push({ type: 'hole', result });
      } else {
        // Create placeholder for holes not yet played
        rows.push({
          type: 'hole',
          result: {
            id: `placeholder-${hole}`,
            skins_game_id: '',
            hole_number: hole,
            winner_id: null,
            is_carryover: false,
            hole_scores: {},
            hole_pot_value: perHoleValue,
            carryover_to_next: 0,
            payout_amount: 0,
            calculated_at: '',
            winner: null,
          } as SkinsResultWithWinner,
        });
      }
    }

    // Back 9 subtotal
    rows.push({
      type: 'subtotal',
      label: 'BACK 9',
      value: back9Total,
      holeRange: '10-18',
    });

    // Total row
    rows.push({
      type: 'total',
      value: front9Total + back9Total,
      unsettledCarryover,
    });

    // Participant totals row (players or teams)
    if (participantTotals.length > 0) {
      rows.push({
        type: 'participantTotals',
        totals: participantTotals,
        isTeamSkins,
      });
    }

    return rows;
  }, [resultsMap, perHoleValue, front9Total, back9Total, unsettledCarryover, participantTotals, isTeamSkins]);

  // Render a single row
  const renderRow: ListRenderItem<ResultRow> = ({ item, index }) => {
    switch (item.type) {
      case 'header':
        return (
          <View
            style={[styles.headerRow, { backgroundColor: colors.surfaceVariant }]}
          >
            <Text
              style={[styles.headerCell, styles.holeColumn, { color: colors.textSecondary }]}
            >
              Hole
            </Text>
            {parValues && (
              <Text
                style={[styles.headerCell, styles.parColumn, { color: colors.textSecondary }]}
              >
                Par
              </Text>
            )}
            <Text
              style={[styles.headerCell, styles.winnerColumn, { color: colors.textSecondary }]}
            >
              Winner
            </Text>
            <Text
              style={[
                styles.headerCell,
                styles.valueColumn,
                { color: colors.textSecondary },
              ]}
            >
              Value
            </Text>
            <Text
              style={[styles.headerCell, styles.notesColumn, { color: colors.textSecondary }]}
            >
              Notes
            </Text>
          </View>
        );

      case 'hole':
        return renderHoleRow(item.result, index);

      case 'subtotal':
        return (
          <View
            style={[
              styles.subtotalRow,
              { backgroundColor: colors.surfaceVariant, borderTopColor: colors.border },
            ]}
          >
            <Text style={[styles.subtotalLabel, { color: colors.textPrimary }]}>
              {item.label}
            </Text>
            <Text style={[styles.subtotalValue, { color: colors.textPrimary }]}>
              {formatCurrency(item.value)}
            </Text>
          </View>
        );

      case 'total':
        return (
          <View
            style={[
              styles.totalRow,
              { backgroundColor: `${skinsColor}15`, borderTopColor: colors.border },
            ]}
          >
            <View style={styles.totalLabelContainer}>
              <Icon source="sigma" size={20} color={skinsColor} />
              <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>
                TOTAL
              </Text>
            </View>
            <View style={styles.totalValueContainer}>
              <Text style={[styles.totalValue, { color: skinsColor }]}>
                {formatCurrency(item.value)}
              </Text>
              {item.unsettledCarryover > 0 && (
                <Text style={[styles.unsettledNote, { color: colors.textSecondary }]}>
                  + {formatCurrency(item.unsettledCarryover)} unsettled
                </Text>
              )}
            </View>
          </View>
        );

      case 'participantTotals':
        return (
          <View style={[styles.playerTotalsSection, { borderTopColor: colors.border }]}>
            <View style={styles.playerTotalsHeader}>
              <Icon
                source={item.isTeamSkins ? 'account-multiple' : 'account-group'}
                size={20}
                color={colors.textPrimary}
              />
              <Text style={[styles.playerTotalsTitle, { color: colors.textPrimary }]}>
                {item.isTeamSkins ? 'TEAM TOTALS' : 'PLAYER TOTALS'}
              </Text>
            </View>
            {item.totals.map((participant, idx) => (
              <View
                key={participant.id}
                style={[
                  styles.playerTotalRow,
                  {
                    backgroundColor: idx % 2 === 0 ? colors.surface : colors.background,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.playerTotalLeft}>
                  <Text
                    style={[styles.playerTotalName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {participant.name}
                  </Text>
                  <View style={styles.playerTotalMeta}>
                    <Text style={[styles.playerTotalSkins, { color: colors.textSecondary }]}>
                      {participant.holesWon} skin{participant.holesWon !== 1 ? 's' : ''} won
                    </Text>
                    {item.isTeamSkins && participant.memberCount && participant.totalWinnings > 0 && (
                      <Text style={[styles.perMemberSplit, { color: colors.textTertiary }]}>
                        ({formatCurrency(participant.totalWinnings / participant.memberCount)}/ea)
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.playerTotalAmount,
                    {
                      color: participant.totalWinnings > 0 ? colors.success : colors.textSecondary,
                    },
                  ]}
                >
                  {formatCurrency(participant.totalWinnings)}
                </Text>
              </View>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  // Render a hole row
  const renderHoleRow = (result: SkinsResultWithWinner, index: number) => {
    const isPlayed = result.calculated_at !== '';
    const isCarryover = result.is_carryover;
    const par = parValues?.[result.hole_number];

    // Check for winner (individual or team)
    const skinsResult = result as SkinsResult;
    const hasIndividualWinner = result.winner !== null;
    const hasTeamWinner = isTeamSkins && skinsResult.team_winner_id !== null;
    const hasWinner = hasIndividualWinner || hasTeamWinner;

    // Determine winner display text
    let winnerText = '--';
    if (isPlayed) {
      if (hasTeamWinner) {
        // Team skins - try multiple sources for team name
        // 1. Check team_winner object from useSkinsResults
        const resultWithTeamWinner = result as SkinsResult & { team_winner?: { id: string; name: string } | null };
        if (resultWithTeamWinner.team_winner?.name) {
          winnerText = resultWithTeamWinner.team_winner.name;
        } else if (teams) {
          // 2. Fallback to looking up in teams prop
          const winningTeam = teams.find((t) => t.id === skinsResult.team_winner_id);
          winnerText = winningTeam?.name ?? 'Unknown Team';
        } else {
          winnerText = 'Unknown Team';
        }
      } else if (hasIndividualWinner && result.winner) {
        // Individual skins
        winnerText = result.winner.name;
      } else if (isCarryover) {
        winnerText = '--';
      }
    }

    // Determine notes text
    let notesText = '';
    if (isPlayed) {
      if (isCarryover) {
        const carryoverAmount = result.carryover_to_next;
        notesText = `Tied, +${formatCurrency(carryoverAmount)} carried`;
      } else if (hasWinner) {
        // Show winning score if available
        // For team skins, hole_scores are keyed by team ID with { team_score, member_scores }
        // For individual skins, hole_scores are keyed by player ID with { gross, net }
        const winnerId = hasTeamWinner ? skinsResult.team_winner_id : result.winner_id;
        if (winnerId) {
          const holeScores = result.hole_scores as Record<string, unknown>;
          const winnerScoreData = holeScores[winnerId];

          let scoreValue: number | undefined;
          if (winnerScoreData != null) {
            if (typeof winnerScoreData === 'number') {
              // Simple number format
              scoreValue = winnerScoreData;
            } else if (typeof winnerScoreData === 'object') {
              const scoreObj = winnerScoreData as { team_score?: number; gross?: number; net?: number };
              if ('team_score' in scoreObj && scoreObj.team_score !== undefined) {
                // Team skins format: { team_score, member_scores }
                scoreValue = scoreObj.team_score;
              } else if ('gross' in scoreObj || 'net' in scoreObj) {
                // Individual skins format: { gross, net }
                scoreValue = scoringType === 'gross' ? scoreObj.gross : scoreObj.net;
              }
            }
          }

          if (scoreValue !== undefined) {
            notesText = `Won with ${scoreValue}`;
          }
        }
      }
    }

    return (
      <View
        style={[
          styles.holeRow,
          {
            backgroundColor: isCarryover
              ? `${skinsColor}08`
              : index % 2 === 0
                ? colors.surface
                : colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Hole Number */}
        <Text
          style={[
            styles.holeCell,
            styles.holeColumn,
            { color: colors.textPrimary },
            isCarryover && styles.carryoverText,
          ]}
        >
          {result.hole_number}
        </Text>

        {/* Par (if available) */}
        {parValues && (
          <Text
            style={[
              styles.holeCell,
              styles.parColumn,
              { color: colors.textSecondary },
            ]}
          >
            {par ?? '-'}
          </Text>
        )}

        {/* Winner */}
        <Text
          style={[
            styles.holeCell,
            styles.winnerColumn,
            {
              color: hasWinner
                ? colors.success
                : isCarryover
                  ? colors.textSecondary
                  : colors.textTertiary,
            },
            isCarryover && styles.carryoverText,
          ]}
          numberOfLines={1}
        >
          {winnerText}
        </Text>

        {/* Value */}
        <Text
          style={[
            styles.holeCell,
            styles.valueColumn,
            {
              color: hasWinner
                ? colors.success
                : isCarryover
                  ? skinsColor
                  : colors.textSecondary,
            },
            hasWinner && styles.winnerValue,
          ]}
        >
          {isPlayed
            ? hasWinner
              ? formatCurrency(result.payout_amount)
              : formatCurrency(result.hole_pot_value)
            : formatCurrency(perHoleValue)}
        </Text>

        {/* Notes */}
        <Text
          style={[
            styles.holeCell,
            styles.notesColumn,
            { color: isCarryover ? skinsColor : colors.textSecondary },
            isCarryover && styles.carryoverText,
          ]}
          numberOfLines={1}
        >
          {notesText}
        </Text>
      </View>
    );
  };

  // Key extractor
  const keyExtractor = (item: ResultRow, index: number): string => {
    switch (item.type) {
      case 'header':
        return 'header';
      case 'hole':
        return `hole-${item.result.hole_number}`;
      case 'subtotal':
        return `subtotal-${item.label}`;
      case 'total':
        return 'total';
      case 'participantTotals':
        return 'participantTotals';
      default:
        return `row-${index}`;
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
      testID={testID}
    >
      {/* Card Header */}
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.titleContainer}>
          <Icon source="dice-multiple" size={24} color={skinsColor} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            SKINS RESULTS
          </Text>
        </View>
        <Text style={[styles.configSummary, { color: colors.textSecondary }]}>
          {formatCurrency(perHoleValue)}/hole | {scoringType === 'gross' ? 'Gross' : 'Net'} | 18 holes
        </Text>
      </View>

      {/* Results Table */}
      <FlatList
        data={rowData}
        renderItem={renderRow}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.tableContent}
      />
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
  },
  configSummary: {
    ...typography.small,
    marginLeft: 32, // Align with title text (icon width + gap)
  },
  tableContent: {
    paddingBottom: spacing.xs,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },

  // Hole row
  holeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  holeCell: {
    ...typography.small,
  },

  // Column widths
  holeColumn: {
    width: 40,
    textAlign: 'center',
  },
  parColumn: {
    width: 36,
    textAlign: 'center',
  },
  winnerColumn: {
    flex: 1,
    marginRight: spacing.sm,
  },
  valueColumn: {
    width: 60,
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  notesColumn: {
    flex: 1.2,
  },

  // Carryover styling
  carryoverText: {
    fontStyle: 'italic',
  },

  // Winner styling
  winnerValue: {
    fontWeight: '600',
  },

  // Subtotal row
  subtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  subtotalLabel: {
    ...typography.smallBold,
    textTransform: 'uppercase',
  },
  subtotalValue: {
    ...typography.smallBold,
  },

  // Total row
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  totalLabel: {
    ...typography.bodyBold,
    textTransform: 'uppercase',
  },
  totalValueContainer: {
    alignItems: 'flex-end',
  },
  totalValue: {
    ...typography.h4,
  },
  unsettledNote: {
    ...typography.caption,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Player totals section
  playerTotalsSection: {
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  playerTotalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  playerTotalsTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
  },
  playerTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  playerTotalLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  playerTotalName: {
    ...typography.small,
  },
  playerTotalSkins: {
    ...typography.caption,
  },
  playerTotalAmount: {
    ...typography.bodyBold,
    minWidth: 70,
    textAlign: 'right',
  },
  playerTotalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  perMemberSplit: {
    ...typography.caption,
    fontStyle: 'italic',
  },
});

export default SkinsResultsCard;
