/**
 * RoundCardBits - Presentational sub-pieces for CompetitionRoundCard
 *
 * Pure display components for the redesigned round card (design L171-188):
 * status pill, points badge, skins badges, "Round N" chip, and the
 * organiser scoring-pairs row. No data logic lives here.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { IconDice } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, skinsColor } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';
import type { SkinsConfig } from '@/types';

/** Amber/gold color for skins indicators */
const SKINS_COLOR = skinsColor;

/** Format skins pot value for display */
export const formatSkinsPot = (config: SkinsConfig): string => {
  if (config.pot_type === 'per_hole') {
    return `$${config.pot_value}/hole`;
  }
  return `$${config.pot_value} total`;
};

/** Status pill palette per design: upcoming=blue tint, live=green tint, completed=muted. */
const getStatusStyle = (status: string, colors: ColorPalette) => {
  switch (status) {
    case 'in-progress':
      return {
        label: 'Live',
        bg: colors.primaryBackground,
        dot: colors.primary,
        text: colors.primaryDark,
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: colors.surfaceVariant,
        dot: colors.textTertiary,
        text: colors.textSecondary,
      };
    case 'upcoming':
    default:
      return {
        label: 'Upcoming',
        bg: colors.infoLight,
        dot: colors.info,
        text: colors.infoDark,
      };
  }
};

/** Dot + uppercase label status pill (design L174). */
export function RoundStatusPill({ status, colors }: { status: string; colors: ColorPalette }) {
  const s = getStatusStyle(status, colors);
  return (
    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
      <Text style={[styles.statusPillText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

/** "N pts" badge — white text on the on-green token (design L174). */
export function RoundPointsBadge({ points, colors }: { points: number; colors: ColorPalette }) {
  return (
    <View
      style={[styles.pointsBadge, { backgroundColor: colors.primaryDark }]}
      accessibilityLabel={`${points} points available in this round`}
    >
      <Text style={[styles.pointsBadgeText, { color: colors.white }]}>{points} pts</Text>
    </View>
  );
}

/** Muted "Round N" chip on the tint surface (design L175). */
export function RoundNumberChip({
  roundNumber,
  colors,
}: {
  roundNumber: number;
  colors: ColorPalette;
}) {
  return (
    <View style={[styles.roundChip, { backgroundColor: colors.surfaceVariant }]}>
      <Text style={[styles.roundChipText, { color: colors.textSecondary }]}>
        Round {roundNumber}
      </Text>
    </View>
  );
}

/** Small amber "Skins" indicator chip for the badge row. */
export function SkinsIndicatorBadge({ config }: { config: SkinsConfig | null }) {
  return (
    <View
      style={[styles.skinsBadge, { backgroundColor: `${SKINS_COLOR}20` }]}
      accessibilityLabel={`Skins game enabled${config ? `: ${formatSkinsPot(config)}` : ''}`}
    >
      <IconDice size={14} color={SKINS_COLOR} />
      <Text style={[styles.skinsBadgeText, { color: SKINS_COLOR }]}>Skins</Text>
    </View>
  );
}

/** Pot + gross/net detail line for rounds with a skins game. */
export function SkinsInfoRow({ config }: { config: SkinsConfig }) {
  return (
    <View style={styles.skinsInfoRow}>
      <IconDice size={14} color={SKINS_COLOR} />
      <Text style={[styles.skinsInfoText, { color: SKINS_COLOR }]}>
        Skins: {formatSkinsPot(config)} • {config.scoring_type === 'gross' ? 'Gross' : 'Net'}
      </Text>
    </View>
  );
}

export interface ScoringPairsRowProps {
  configured: boolean;
  roundNumber: number;
  onPress: () => void;
  colors: ColorPalette;
}

/**
 * Organiser scoring-pairs row (design L180): configured = quiet surface with
 * green status; unconfigured = amber-tinted card with "Set pairings".
 */
export function ScoringPairsRow({ configured, roundNumber, onPress, colors }: ScoringPairsRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.scoringPairsRow,
        configured
          ? { borderColor: colors.border, backgroundColor: 'transparent' }
          : { borderColor: colors.warningLight, backgroundColor: colors.warningBackground },
      ]}
      onPress={onPress}
      accessibilityLabel={`Manage scoring pairs for round ${roundNumber}`}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <Icon
        source="account-switch"
        size={18}
        color={configured ? colors.primary : colors.warning}
      />
      <Text style={[styles.scoringPairsLabel, { color: colors.textPrimary }]}>Scoring Pairs</Text>
      <Text
        style={[
          styles.scoringPairsStatusText,
          { color: configured ? colors.success : colors.warning },
        ]}
      >
        {configured ? 'Configured' : 'Set pairings'}
      </Text>
      <Icon source="chevron-right" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pointsBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm + 2,
  },
  pointsBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  roundChip: {
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 3,
    borderRadius: borderRadius.md,
  },
  roundChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  skinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm + 2,
  },
  skinsBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  skinsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  skinsInfoText: {
    ...typography.small,
    fontWeight: '500',
  },
  scoringPairsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 1,
    marginTop: spacing.sm + 3,
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.md - 4,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 44,
  },
  scoringPairsLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  scoringPairsStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
