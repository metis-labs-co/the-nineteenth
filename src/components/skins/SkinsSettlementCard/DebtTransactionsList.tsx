/**
 * DebtTransactionsList - Displays who owes who with minimized transactions
 *
 * Supports both individual player debts and team debts.
 * Shows an "All even" message when no debts exist.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { formatCurrency, type PlayerNameMap, type TeamNameMap } from '@/utils/skins';
import type { DebtTransaction, TeamDebtTransaction } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface DebtTransactionsListProps {
  /** Whether this is a team skins game */
  isTeamSkins: boolean;
  /** Individual debt transactions */
  debtTransactions: DebtTransaction[];
  /** Team debt transactions */
  teamDebtTransactions: TeamDebtTransaction[];
  /** Formatted debt strings (used to determine if debts exist) */
  formattedDebts: string[];
  /** Name map for looking up player/team names */
  nameMap: PlayerNameMap | TeamNameMap;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DebtTransactionsList = React.memo(function DebtTransactionsList({
  isTeamSkins,
  debtTransactions,
  teamDebtTransactions,
  formattedDebts,
  nameMap,
}: DebtTransactionsListProps) {
  const colors = useThemeColors();

  // All even - no debts
  if (formattedDebts.length === 0) {
    return (
      <View style={styles.section}>
        <View style={[styles.evenCard, { backgroundColor: `${colors.success}15` }]}>
          <Icon source="check-circle" size={24} color={colors.success} />
          <Text style={[styles.evenText, { color: colors.success }]}>
            All even - no money owed!
          </Text>
        </View>
      </View>
    );
  }

  // Individual debts
  if (!isTeamSkins) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          WHO OWES WHO
        </Text>
        <View style={styles.debtList}>
          {debtTransactions.map((transaction, index) => {
            const fromName = (nameMap as PlayerNameMap)[transaction.from_player_id] || 'Unknown';
            const toName = (nameMap as PlayerNameMap)[transaction.to_player_id] || 'Unknown';

            return (
              <View
                key={`${transaction.from_player_id}-${transaction.to_player_id}-${index}`}
                style={[
                  styles.debtRow,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.debtParties}>
                  <Text style={[styles.debtFromName, { color: colors.error }]}>
                    {fromName}
                  </Text>
                  <Icon source="arrow-right" size={16} color={colors.textSecondary} />
                  <Text style={[styles.debtToName, { color: colors.success }]}>
                    {toName}
                  </Text>
                </View>
                <Text style={[styles.debtAmount, { color: colors.textPrimary }]}>
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Team debts
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        TEAM SETTLEMENTS
      </Text>
      <View style={styles.debtList}>
        {teamDebtTransactions.map((transaction, index) => {
          const fromName = (nameMap as TeamNameMap)[transaction.from_team_id] || 'Unknown';
          const toName = (nameMap as TeamNameMap)[transaction.to_team_id] || 'Unknown';

          return (
            <View
              key={`${transaction.from_team_id}-${transaction.to_team_id}-${index}`}
              style={[
                styles.debtRow,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.debtParties}>
                <Text style={[styles.debtFromName, { color: colors.error }]}>
                  {fromName}
                </Text>
                <Icon source="arrow-right" size={16} color={colors.textSecondary} />
                <Text style={[styles.debtToName, { color: colors.success }]}>
                  {toName}
                </Text>
              </View>
              <View style={styles.debtAmountContainer}>
                <Text style={[styles.debtAmount, { color: colors.textPrimary }]}>
                  {formatCurrency(transaction.amount)}
                </Text>
                <Text style={[styles.perMemberDebt, { color: colors.textTertiary }]}>
                  ({formatCurrency(transaction.per_member_amount)}/member)
                </Text>
              </View>
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
  debtList: {
    gap: spacing.sm,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  debtParties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  debtFromName: {
    ...typography.small,
    fontWeight: '600',
  },
  debtToName: {
    ...typography.small,
    fontWeight: '600',
  },
  debtAmount: {
    ...typography.bodyBold,
  },
  debtAmountContainer: {
    alignItems: 'flex-end',
  },
  perMemberDebt: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  evenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  evenText: {
    ...typography.bodyBold,
  },
});
