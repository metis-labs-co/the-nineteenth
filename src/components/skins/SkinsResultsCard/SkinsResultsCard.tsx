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
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, skinsColor } from '@/constants/theme';
import {
  calculateHoleValue,
  formatCurrency,
} from '@/utils/skins';
import type { SkinsResult } from '@/types/database';

import { SkinsHoleRow } from './SkinsHoleRow';
import { useSkinsResultRows } from './hooks/useSkinsResultRows';
import type { SkinsResultsCardProps, ResultRow } from './types';

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

  const perHoleValueDisplay = useMemo(
    () => calculateHoleValue(potType, potValue),
    [potType, potValue]
  );

  const { rowData } = useSkinsResultRows({
    results,
    potType,
    potValue,
    participants,
    isTeamSkins,
    teams,
  });

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
        return (
          <SkinsHoleRow
            result={item.result}
            index={index}
            parValues={parValues}
            scoringType={scoringType}
            isTeamSkins={isTeamSkins}
            teams={teams}
            perHoleValue={perHoleValueDisplay}
          />
        );

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
          {formatCurrency(perHoleValueDisplay)}/hole | {scoringType === 'gross' ? 'Gross' : 'Net'} | 18 holes
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
