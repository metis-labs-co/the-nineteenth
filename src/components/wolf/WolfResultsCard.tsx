/**
 * WolfResultsCard - Hole-by-hole Wolf game breakdown table
 *
 * Displays a complete table of Wolf game results showing each hole's
 * Wolf player, their decision (partner/lone/blind), and the outcome.
 *
 * Columns: Hole | Wolf | Choice | Result | Points
 *
 * @example
 * ```tsx
 * <WolfResultsCard
 *   wolfGame={wolfGame}
 *   decisions={wolfDecisions}
 * />
 * ```
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, wolfColor } from '@/constants/theme';
import { determineWolfForHole, formatWolfCurrency } from '@/utils/wolfCalculations';
import type {
  WolfGameWithParticipants,
  WolfDecisionWithDetails,
  WolfHoleDecision,
} from '@/types/database/wolf.types';

// ============================================================================
// TYPES
// ============================================================================

export interface WolfResultsCardProps {
  /** Wolf game with participant details */
  wolfGame: WolfGameWithParticipants;
  /** Array of hole decisions with details */
  decisions: WolfDecisionWithDetails[];
  /** Test ID for testing */
  testID?: string;
}

/** Row type for FlatList rendering */
type ResultRow =
  | { type: 'header' }
  | { type: 'hole'; holeNumber: number; decision: WolfDecisionWithDetails | null }
  | { type: 'subtotal'; label: string; holeRange: string }
  | { type: 'legend' };

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the choice description for a decision
 */
function getChoiceText(decision: WolfHoleDecision | null): string {
  if (!decision?.decided_at) return '--';
  if (decision.is_blind_wolf) return 'Blind 🔥';
  if (!decision.partner_id) return 'Lone Wolf';
  return 'Partner';
}

/**
 * Get partner name from decision
 */
function getPartnerName(decision: WolfDecisionWithDetails | null): string | null {
  if (!decision?.partner_id || !decision.partner) return null;
  return decision.partner.name;
}

/**
 * Get result text for a decision
 */
function getResultText(decision: WolfHoleDecision | null): string {
  if (!decision?.calculated_at) return '--';
  if (decision.is_tie) return 'Tie';
  if (decision.wolf_team_won === true) return 'Wolf';
  if (decision.wolf_team_won === false) return 'Pack';
  return '--';
}

/**
 * Get abbreviated points display for a hole
 * Format: "J:2 S:2" for showing each player's points
 */
function getPointsAbbrev(
  decision: WolfHoleDecision | null,
  participants: Array<{ id: string; name: string }>
): string {
  if (!decision?.points_awarded || !decision.calculated_at) return '--';

  // If tie, no points awarded
  if (decision.is_tie) return '--';

  // Get first initial for each player and their points
  const pointParts: string[] = [];
  for (const participant of participants) {
    const points = decision.points_awarded[participant.id];
    if (points !== undefined && points > 0) {
      const initial = participant.name.charAt(0).toUpperCase();
      pointParts.push(`${initial}:${points}`);
    }
  }

  return pointParts.length > 0 ? pointParts.join(' ') : '--';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WolfResultsCard = React.memo(function WolfResultsCard({
  wolfGame,
  decisions,
  testID,
}: WolfResultsCardProps) {
  const colors = useThemeColors();

  // Create a map of hole number -> decision for quick lookup
  const decisionsMap = useMemo(() => {
    const map = new Map<number, WolfDecisionWithDetails>();
    decisions.forEach((d) => map.set(d.hole_number, d));
    return map;
  }, [decisions]);

  // Calculate totals
  const { holesPlayed, holesDecided, wolvesWon, packsWon, ties } = useMemo(() => {
    let played = 0;
    let decided = 0;
    let wolfWins = 0;
    let packWins = 0;
    let tieCount = 0;

    decisions.forEach((d) => {
      if (d.calculated_at) {
        played++;
        if (d.is_tie) {
          tieCount++;
        } else if (d.wolf_team_won === true) {
          wolfWins++;
        } else if (d.wolf_team_won === false) {
          packWins++;
        }
      }
      if (d.decided_at) {
        decided++;
      }
    });

    return {
      holesPlayed: played,
      holesDecided: decided,
      wolvesWon: wolfWins,
      packsWon: packWins,
      ties: tieCount,
    };
  }, [decisions]);

  // Build row data for FlatList
  const rowData = useMemo<ResultRow[]>(() => {
    const rows: ResultRow[] = [];

    // Header row
    rows.push({ type: 'header' });

    // Holes 1-9
    for (let hole = 1; hole <= 9; hole++) {
      const decision = decisionsMap.get(hole) ?? null;
      rows.push({ type: 'hole', holeNumber: hole, decision });
    }

    // Front 9 subtotal
    rows.push({ type: 'subtotal', label: 'FRONT 9', holeRange: '1-9' });

    // Holes 10-18
    for (let hole = 10; hole <= 18; hole++) {
      const decision = decisionsMap.get(hole) ?? null;
      rows.push({ type: 'hole', holeNumber: hole, decision });
    }

    // Back 9 subtotal
    rows.push({ type: 'subtotal', label: 'BACK 9', holeRange: '10-18' });

    // Legend
    rows.push({ type: 'legend' });

    return rows;
  }, [decisionsMap]);

  // Get Wolf player for a hole
  const getWolfForHole = (holeNumber: number): string => {
    if (!wolfGame.wolf_order) return '--';
    const wolfId = determineWolfForHole(wolfGame.wolf_order, holeNumber);
    const wolf = wolfGame.participants.find((p) => p.id === wolfId);
    return wolf?.name ?? '--';
  };

  // Render a single row
  const renderRow: ListRenderItem<ResultRow> = ({ item, index }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={[styles.headerRow, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.headerCell, styles.holeColumn, { color: colors.textSecondary }]}>
              Hole
            </Text>
            <Text style={[styles.headerCell, styles.wolfColumn, { color: colors.textSecondary }]}>
              Wolf
            </Text>
            <Text style={[styles.headerCell, styles.choiceColumn, { color: colors.textSecondary }]}>
              Choice
            </Text>
            <Text style={[styles.headerCell, styles.resultColumn, { color: colors.textSecondary }]}>
              Result
            </Text>
            <Text style={[styles.headerCell, styles.pointsColumn, { color: colors.textSecondary }]}>
              Points
            </Text>
          </View>
        );

      case 'hole':
        return renderHoleRow(item.holeNumber, item.decision, index);

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
          </View>
        );

      case 'legend':
        return (
          <View style={[styles.legendRow, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Wolf: {wolvesWon}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Pack: {packsWon}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.gray400 }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Tie: {ties}
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Render a hole row
  const renderHoleRow = (
    holeNumber: number,
    decision: WolfDecisionWithDetails | null,
    index: number
  ) => {
    const wolfName = getWolfForHole(holeNumber);
    const choiceText = getChoiceText(decision);
    const partnerName = getPartnerName(decision);
    const resultText = getResultText(decision);
    const pointsText = getPointsAbbrev(decision, wolfGame.participants);

    const isPlayed = !!decision?.calculated_at;
    const isTie = decision?.is_tie ?? false;
    const wolfWon = decision?.wolf_team_won === true;
    const packWon = decision?.wolf_team_won === false;
    const isBlindWolf = decision?.is_blind_wolf ?? false;
    const isLoneWolf = !decision?.partner_id && !isBlindWolf && !!decision?.decided_at;

    // Determine result color
    const getResultColor = () => {
      if (!isPlayed) return colors.textTertiary;
      if (isTie) return colors.gray500;
      if (wolfWon) return colors.success;
      if (packWon) return colors.error;
      return colors.textSecondary;
    };

    return (
      <View
        style={[
          styles.holeRow,
          {
            backgroundColor:
              isTie
                ? `${colors.gray400}10`
                : wolfWon
                  ? `${colors.success}08`
                  : packWon
                    ? `${colors.error}08`
                    : index % 2 === 0
                      ? colors.surface
                      : colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Hole Number */}
        <Text style={[styles.holeCell, styles.holeColumn, { color: colors.textPrimary }]}>
          {holeNumber}
        </Text>

        {/* Wolf Name */}
        <Text
          style={[styles.holeCell, styles.wolfColumn, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {wolfName}
        </Text>

        {/* Choice */}
        <View style={[styles.choiceColumn, styles.choiceContainer]}>
          {partnerName ? (
            <Text
              style={[styles.holeCell, { color: colors.primary }]}
              numberOfLines={1}
            >
              + {partnerName}
            </Text>
          ) : (
            <Text
              style={[
                styles.holeCell,
                {
                  color: isBlindWolf
                    ? colors.warning
                    : isLoneWolf
                      ? wolfColor
                      : colors.textTertiary,
                },
              ]}
            >
              {choiceText}
            </Text>
          )}
        </View>

        {/* Result */}
        <Text
          style={[
            styles.holeCell,
            styles.resultColumn,
            { color: getResultColor() },
            isPlayed && !isTie && styles.resultBold,
          ]}
        >
          {resultText}
        </Text>

        {/* Points */}
        <Text
          style={[
            styles.holeCell,
            styles.pointsColumn,
            { color: isPlayed && !isTie ? colors.textPrimary : colors.textTertiary },
          ]}
          numberOfLines={1}
        >
          {pointsText}
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
        return `hole-${item.holeNumber}`;
      case 'subtotal':
        return `subtotal-${item.label}`;
      case 'legend':
        return 'legend';
      default:
        return `row-${index}`;
    }
  };

  // Config summary text
  const configSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(wolfGame.scoring_type === 'gross' ? 'Gross' : 'Net');
    if (wolfGame.blind_wolf_enabled) parts.push('Blind Wolf');
    if (wolfGame.pot_enabled && wolfGame.pot_value_per_point) {
      parts.push(`${formatWolfCurrency(wolfGame.pot_value_per_point)}/pt`);
    }
    parts.push(`${wolfGame.participants.length} players`);
    return parts.join(' | ');
  }, [wolfGame]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
      testID={testID}
    >
      {/* Card Header */}
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.titleContainer}>
          <Icon source="dog-side" size={24} color={wolfColor} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            WOLF RESULTS
          </Text>
        </View>
        <Text style={[styles.configSummary, { color: colors.textSecondary }]}>
          {configSummary}
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
  wolfColumn: {
    width: 70,
    marginRight: spacing.xs,
  },
  choiceColumn: {
    flex: 1,
    marginRight: spacing.xs,
  },
  choiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultColumn: {
    width: 50,
    textAlign: 'center',
    marginRight: spacing.xs,
  },
  resultBold: {
    fontWeight: '600',
  },
  pointsColumn: {
    width: 70,
    textAlign: 'right',
  },

  // Subtotal row
  subtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  subtotalLabel: {
    ...typography.smallBold,
    textTransform: 'uppercase',
  },

  // Legend row
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.caption,
  },
});

export default WolfResultsCard;
