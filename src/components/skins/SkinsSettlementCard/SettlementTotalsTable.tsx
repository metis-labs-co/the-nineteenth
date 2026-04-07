/**
 * SettlementTotalsTable - Displays the totals won table sorted by winnings
 *
 * Supports both individual player payouts and team payouts.
 */

import React from 'react';
import { View, StyleSheet, type TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { formatCurrency, formatNetResult } from '@/utils/skins';
import type { SkinsPayoutWithPlayer, SkinsPayoutWithTeam } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SettlementTotalsTableProps {
  /** Sorted payouts (individual or team) */
  sortedPayouts: SkinsPayoutWithPlayer[] | SkinsPayoutWithTeam[];
  /** Whether this is a team skins game */
  isTeamSkins: boolean;
  /** Function to get color for a net result value */
  getNetResultColor: (value: number) => string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SettlementTotalsTable = React.memo(function SettlementTotalsTable({
  sortedPayouts,
  isTeamSkins,
  getNetResultColor,
}: SettlementTotalsTableProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {isTeamSkins ? 'TEAM TOTALS' : 'TOTALS WON'}
      </Text>
      <View style={[styles.table, { borderColor: colors.border }]}>
        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.tableHeaderCell, styles.playerColumn, { color: colors.textSecondary }]}>
            {isTeamSkins ? 'Team' : 'Player'}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.holesColumn, { color: colors.textSecondary }]}>
            Holes
          </Text>
          <Text style={[styles.tableHeaderCell, styles.wonColumn, { color: colors.textSecondary }]}>
            Won
          </Text>
          <Text style={[styles.tableHeaderCell, styles.netColumn, { color: colors.textSecondary }]}>
            Net
          </Text>
        </View>

        {/* Table Rows - Individual */}
        {!isTeamSkins && (sortedPayouts as SkinsPayoutWithPlayer[]).map((payout, index) => (
          <View
            key={payout.player_id}
            style={[
              styles.tableRow,
              {
                backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
                borderBottomColor: colors.border,
              },
              index === sortedPayouts.length - 1 && styles.lastRow,
            ]}
          >
            <View style={[styles.tableCell, styles.playerColumn]}>
              <Text
                style={[styles.playerName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {payout.player?.name ?? 'Unknown'}
              </Text>
            </View>
            <Text style={[styles.tableCell, styles.holesColumn, { color: colors.textSecondary }]}>
              {payout.holes_won}
            </Text>
            <Text style={[styles.tableCell, styles.wonColumn, { color: colors.textPrimary }]}>
              {formatCurrency(payout.total_winnings)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.netColumn,
                styles.netValue,
                { color: getNetResultColor(payout.net_result) },
              ]}
            >
              {formatNetResult(payout.net_result)}
            </Text>
          </View>
        ))}

        {/* Table Rows - Team */}
        {isTeamSkins && (sortedPayouts as SkinsPayoutWithTeam[]).map((payout, index) => {
          const memberCount = payout.team.members?.length ?? 1;
          const perMemberNet = payout.net_result / memberCount;
          return (
            <View
              key={payout.team_id}
              style={[
                styles.tableRow,
                {
                  backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
                  borderBottomColor: colors.border,
                },
                index === sortedPayouts.length - 1 && styles.lastRow,
              ]}
            >
              <View style={[styles.tableCell, styles.playerColumn]}>
                <Text
                  style={[styles.playerName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {payout.team.name}
                </Text>
                {memberCount > 1 && (
                  <Text style={[styles.perMemberNote, { color: colors.textTertiary }]}>
                    {formatNetResult(perMemberNet)}/member
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.holesColumn, { color: colors.textSecondary }]}>
                {payout.holes_won}
              </Text>
              <Text style={[styles.tableCell, styles.wonColumn, { color: colors.textPrimary }]}>
                {formatCurrency(payout.total_winnings)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.netColumn,
                  styles.netValue,
                  { color: getNetResultColor(payout.net_result) },
                ]}
              >
                {formatNetResult(payout.net_result)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  table: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeader: {
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  tableHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  tableCell: {
    ...typography.small,
  } as TextStyle,
  playerColumn: {
    flex: 1,
  },
  holesColumn: {
    width: 50,
    textAlign: 'center',
  },
  wonColumn: {
    width: 70,
    textAlign: 'right',
  },
  netColumn: {
    width: 80,
    textAlign: 'right',
  },
  playerName: {
    ...typography.small,
  },
  netValue: {
    fontWeight: '600',
  },
  perMemberNote: {
    ...typography.caption,
    fontStyle: 'italic',
  },
});
