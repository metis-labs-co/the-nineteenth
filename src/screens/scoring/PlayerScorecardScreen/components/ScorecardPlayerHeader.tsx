/**
 * ScorecardPlayerHeader Component
 *
 * Custom header for the PlayerScorecardScreen with back button,
 * player name, handicap display, and view mode toggle.
 *
 * Round-summary redesign: the player name / handicap (and, in single-ball
 * mode, the round result totals) are presented on a dark HeroCard beneath
 * the navigation row.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/context/ThemeContext';
import { HeroCard, heroPalette } from '@/components/common';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export type ScorecardViewMode = 'standard' | 'compact';

/** Round result totals shown on the hero card (single-ball mode only). */
export interface ScorecardHeroTotals {
  stableford: number;
  gross: number;
  par: number;
}

interface ScorecardPlayerHeaderProps {
  playerName: string;
  handicap: number;
  onGoBack: () => void;
  viewMode?: ScorecardViewMode;
  onViewModeChange?: (mode: ScorecardViewMode) => void;
  showViewToggle?: boolean;
  /** When provided, the hero card shows the big points / gross result. */
  totals?: ScorecardHeroTotals;
}

export function ScorecardPlayerHeader({
  playerName,
  handicap,
  onGoBack,
  viewMode = 'standard',
  onViewModeChange,
  showViewToggle = false,
  totals,
}: ScorecardPlayerHeaderProps) {
  const colors = useThemeColors();

  // Mirrors the to-par display already rendered in the table's TOTAL row.
  const grossDiff = totals ? totals.gross - totals.par : 0;
  const grossDiffDisplay =
    grossDiff > 0 ? `+${grossDiff}` : grossDiff === 0 ? 'E' : grossDiff.toString();

  return (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onGoBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={colors.textPrimary}
          />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            Back
          </Text>
        </TouchableOpacity>
        {showViewToggle && onViewModeChange ? (
          <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceVariant }]}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'standard' && [
                  styles.toggleButtonActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
              onPress={() => onViewModeChange('standard')}
              activeOpacity={0.7}
              accessibilityLabel="Standard view"
            >
              <MaterialCommunityIcons
                name="table"
                size={18}
                color={viewMode === 'standard' ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'compact' && [
                  styles.toggleButtonActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
              onPress={() => onViewModeChange('compact')}
              activeOpacity={0.7}
              accessibilityLabel="Compact view"
            >
              <MaterialCommunityIcons
                name="view-compact"
                size={18}
                color={viewMode === 'compact' ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Hero result card — fixed dark surface in both themes (heroPalette) */}
      <HeroCard variant="green" glow="green" style={styles.heroCard}>
        <Text style={styles.heroEyebrow} numberOfLines={1}>
          {playerName}
        </Text>
        {totals && (
          <View style={styles.heroValueRow}>
            <View>
              <Text style={styles.heroBigValue}>{totals.stableford}</Text>
              <Text style={styles.heroValueLabel}>STABLEFORD PTS</Text>
            </View>
            <View style={styles.heroSecondary}>
              <Text style={styles.heroSecondaryValue}>
                {totals.gross > 0 ? totals.gross : '-'}
              </Text>
              <Text style={styles.heroValueLabel}>
                {totals.gross > 0 ? `GROSS (${grossDiffDisplay})` : 'GROSS'}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.heroPill}>
          <Text style={styles.heroPillText}>HC: {handicap}</Text>
        </View>
      </HeroCard>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  headerSpacer: {
    minWidth: 80,
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
  toggleButtonActive: {
    ...shadows.sm,
  },
  // Hero card (fixed light-on-dark colors — see heroPalette)
  heroCard: {
    marginHorizontal: spacing.md,
  },
  heroEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: heroPalette.eyebrowGreen,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  heroBigValue: {
    fontSize: 48,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -1,
    color: heroPalette.text,
  },
  heroSecondary: {
    paddingBottom: spacing.xxs,
  },
  heroSecondaryValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    color: '#e7efdf',
  },
  heroValueLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: heroPalette.mutedGreen,
    marginTop: spacing.xs,
  },
  heroPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(139,194,110,0.18)',
    marginTop: spacing.lg,
  },
  heroPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#b6d99a',
  },
});
