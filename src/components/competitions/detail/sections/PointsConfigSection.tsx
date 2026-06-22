// src/components/competitions/detail/sections/PointsConfigSection.tsx
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Competition, Round, TeamWithMembers } from '@/types/database.types';
import { summarizeCompetition } from '@/utils/competitionPoints/roundPointsSummary';
import { useFeatureAccess } from '@/hooks/subscription';
import { EditRoundPointsSheet } from './sheets/EditRoundPointsSheet';

export interface PointsConfigSectionProps {
  competition: Competition;
  rounds: Round[];
  teams?: TeamWithMembers[];
  isOrganizer: boolean;
  /**
   * 'card' (default) = standalone card with margin/shadow/background + an
   * internal title. 'plain' = embedded in a sheet: no card chrome, no internal
   * title (the sheet provides it).
   */
  variant?: 'card' | 'plain';
}

export function PointsConfigSection({
  competition,
  rounds,
  teams,
  isOrganizer,
  variant = 'card',
}: PointsConfigSectionProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  // Custom badge: a darker, translucent-primary chip in dark mode (the brightened
  // `primaryLighter` reads too light there); the pale tint in light mode. Mirrors
  // the badge treatment in CompetitionInfoSection.
  const customChipBg = isDark ? `${colors.primary}33` : colors.primaryLighter;
  const customChipText = isDark ? colors.primary : colors.primaryDark;

  const { checkAccess, isSuperAdmin } = useFeatureAccess();
  const canEdit =
    isOrganizer && (isSuperAdmin || checkAccess('advanced_round_rules').allowed);

  const [editRoundId, setEditRoundId] = useState<string | null>(null);

  const membersPerTeam = useMemo(() => {
    const counts = (teams ?? []).map((t) => t.members.length).filter((n) => n > 0);
    return counts.length ? Math.max(...counts) : (competition.team_size ?? 1);
  }, [teams, competition.team_size]);

  const { perRound, total, toWin } = useMemo(
    () => summarizeCompetition(rounds, { membersPerTeam }),
    [rounds, membersPerTeam]
  );

  const isPlain = variant === 'plain';
  const containerStyle = isPlain
    ? styles.plain
    : [styles.card, shadows.sm, { backgroundColor: colors.surface }];

  if (competition.per_round_rules_enabled === false) {
    return (
      <View style={containerStyle}>
        {!isPlain && (
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Points & Rules</Text>
        )}
        <Text style={[typography.small, { color: colors.textSecondary }]}>
          Uses competition-wide points. Open Settings → General Rules to change.
        </Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {!isPlain && (
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Points & Rules</Text>
      )}
      <Text style={[styles.summary, { color: colors.textSecondary }]}>
        {total} points available · first to {toWin} wins
      </Text>

      {perRound.map((r, idx) => {
        const rowBody = (
          <View style={[styles.row, { borderTopColor: colors.border }]}>
            <View style={styles.rowMain}>
              <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
                {r.title?.trim() ? r.title : `Round ${idx + 1}`}
              </Text>
              <Text style={[typography.small, { color: colors.textSecondary }]}>{r.detail}</Text>
            </View>
            {r.isCustom && (
              <View style={[styles.chip, { backgroundColor: customChipBg }]}>
                <Text style={[typography.caption, { color: customChipText }]}>Custom</Text>
              </View>
            )}
            {canEdit && (
              <Icon source="chevron-right" size={22} color={colors.gray400} />
            )}
          </View>
        );
        return canEdit ? (
          <TouchableOpacity
            key={r.roundId}
            onPress={() => setEditRoundId(r.roundId)}
            accessibilityRole="button"
            accessibilityLabel={`Edit points for ${r.title || `round ${idx + 1}`}`}
          >
            {rowBody}
          </TouchableOpacity>
        ) : (
          <View key={r.roundId}>{rowBody}</View>
        );
      })}

      {editRoundId && (
        <EditRoundPointsSheet
          visible={!!editRoundId}
          onDismiss={() => setEditRoundId(null)}
          round={rounds.find((r) => r.id === editRoundId)!}
          competitionId={competition.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  plain: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cardTitle: { ...typography.h4, marginBottom: spacing.xs },
  summary: { ...typography.small, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  rowMain: { flex: 1 },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
});
