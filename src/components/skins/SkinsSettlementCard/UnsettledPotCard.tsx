/**
 * UnsettledPotCard - Displays unsettled carryover amount when hole 18 was tied
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, skinsColor } from '@/constants/theme';
import { formatCurrency } from '@/utils/skins';

// ============================================================================
// TYPES
// ============================================================================

export interface UnsettledPotCardProps {
  /** Total unsettled carryover amount */
  unsettledCarryover: number;
  /** Amount per participant when split evenly */
  perParticipantSplit: number;
  /** Whether this is a team skins game */
  isTeamSkins: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const UnsettledPotCard = React.memo(function UnsettledPotCard({
  unsettledCarryover,
  perParticipantSplit,
  isTeamSkins,
}: UnsettledPotCardProps) {
  const colors = useThemeColors();

  if (unsettledCarryover <= 0) {
    return null;
  }

  return (
    <>
      <Divider style={{ backgroundColor: colors.border }} />
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          UNSETTLED POT
        </Text>
        <View style={[styles.unsettledCard, { backgroundColor: `${skinsColor}15`, borderColor: skinsColor }]}>
          <View style={styles.unsettledHeader}>
            <Icon source="alert-circle" size={20} color={skinsColor} />
            <Text style={[styles.unsettledAmount, { color: skinsColor }]}>
              {formatCurrency(unsettledCarryover)}
            </Text>
          </View>
          <Text style={[styles.unsettledSuggestion, { color: colors.textSecondary }]}>
            Hole 18 was tied. Suggestion: split evenly ({formatCurrency(perParticipantSplit)} {isTeamSkins ? 'per team' : 'each'})
          </Text>
        </View>
      </View>
    </>
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
  unsettledCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  unsettledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  unsettledAmount: {
    ...typography.h4,
  },
  unsettledSuggestion: {
    ...typography.small,
    fontStyle: 'italic',
    marginLeft: 28, // Align with text after icon
  },
});
