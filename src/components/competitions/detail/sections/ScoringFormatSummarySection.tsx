/**
 * ScoringFormatSummarySection - Read-only "Scoring & format" glance on the
 * Details tab, mirroring the redesign mock. Shows the competition's format,
 * handicap system, and (for points-based competitions) the total points and
 * "first to N" target. Each row taps through to the full editor on the
 * Competition Settings screen.
 *
 * Presentational: values come from the same label maps as SettingsSection and
 * the canonical `summarizeCompetition` selector (consumed, not re-implemented).
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/common';
import { summarizeCompetition } from '@/utils/competitionPoints/roundPointsSummary';
import type { Competition } from '@/types/database.types';
import { handicapSystemLabels, teamModeLabels } from './types';
import type { RoundWithCourse } from '../types';

export interface ScoringFormatSummarySectionProps {
  competition: Competition;
  rounds: RoundWithCourse[];
  /** Tap handler for any row — opens the full editor (Competition Settings). */
  onPress?: () => void;
}

interface SummaryRow {
  key: string;
  icon: string;
  label: string;
  value: string;
}

export function ScoringFormatSummarySection({
  competition,
  rounds,
  onPress,
}: ScoringFormatSummarySectionProps) {
  const colors = useThemeColors();

  // Points total uses the team_size fallback for members-per-team (the accurate
  // teams-derived count lives on the Settings screen); returns 0 for non-points
  // competitions, in which case the points row is omitted.
  const pointsTotal = useMemo(
    () => summarizeCompetition(rounds, { membersPerTeam: competition.team_size ?? 1 }).total,
    [rounds, competition.team_size]
  );
  const toWin = Math.floor(pointsTotal / 2) + 1;

  const rows = useMemo<SummaryRow[]>(() => {
    const list: SummaryRow[] = [
      {
        key: 'format',
        icon: 'account-group-outline',
        label: 'Format',
        value: teamModeLabels[competition.team_mode],
      },
      {
        key: 'handicap',
        icon: 'golf',
        label: 'Handicap',
        value: handicapSystemLabels[competition.handicap_system],
      },
    ];
    if (pointsTotal > 0) {
      list.push({
        key: 'points',
        icon: 'medal-outline',
        label: 'Points available',
        value: `${pointsTotal} · first to ${toWin}`,
      });
    }
    return list;
  }, [competition.team_mode, competition.handicap_system, pointsTotal, toWin]);

  const showFootnote = competition.per_round_rules_enabled === true;

  return (
    <View style={styles.section}>
      <SectionHeader title="Scoring & format" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {rows.map((row, idx) => (
          <TouchableOpacity
            key={row.key}
            style={[
              styles.row,
              idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
            ]}
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? 'button' : undefined}
            accessibilityLabel={`${row.label}: ${row.value}`}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryBackground }]}>
              <Icon source={row.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
              {row.value}
            </Text>
            {onPress && <Icon source="chevron-right" size={20} color={colors.gray400} />}
          </TouchableOpacity>
        ))}
      </View>
      {showFootnote && (
        <Text style={[styles.footnote, { color: colors.textTertiary }]}>
          Each round carries its own format &amp; points — set them per round in the Rounds tab.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.body,
    flex: 1,
  },
  value: {
    ...typography.bodyBold,
    textAlign: 'right',
  },
  footnote: {
    ...typography.caption,
    paddingHorizontal: spacing.xs,
  },
});

export default ScoringFormatSummarySection;
