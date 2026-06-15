import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { ErrorState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useCompetitionContributions } from '@/hooks/competitions/useCompetitionContributions';
import type { RoundContribution, PlayerContribution } from '@/utils/contributions';

interface ContributionsBoardProps {
  competitionId: string;
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

function fmtValue(p: PlayerContribution, round: RoundContribution): string {
  if (round.format === 'scramble') {
    const b = p.shotBreakdown;
    return b ? `🏌 ${b.drives}  ⛳ ${b.putts}` : '';
  }
  if (round.format === 'aggregate') return `${p.value} pts`;
  const holes = Number.isInteger(p.value) ? `${p.value}` : p.value.toFixed(1);
  return `${holes} holes`;
}

function labelForFormat(format: RoundContribution['format']): string {
  switch (format) {
    case 'best-ball':
      return 'Best Ball';
    case 'scramble':
      return 'Scramble';
    case 'shamble':
      return 'Shamble';
    case 'aggregate':
      return 'Aggregate';
  }
}

export function ContributionsBoard({ competitionId }: ContributionsBoardProps) {
  const colors = useThemeColors();
  const { board, isLoading, error, refetch } = useCompetitionContributions(competitionId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <ErrorState
        error={error instanceof Error ? error : new Error('An error occurred')}
        title="Unable to load contributions"
        onRetry={refetch}
      />
    );
  }
  if (!board || board.isEmpty) {
    return (
      <View style={styles.centered}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          No team-format contributions yet. Play a best ball, scramble, shamble, or aggregate
          round to see who carried the team.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.rollup,
          { backgroundColor: colors.primary + '22', borderColor: colors.primary },
        ]}
      >
        <Text style={[typography.small, styles.rollupLabel, { color: colors.primary }]}>
          ★ COMPETITION MVP
        </Text>
        {board.rollup.map((r) => (
          <View key={r.playerId} style={styles.rollupRow}>
            <Text style={{ width: 22 }}>{r.isMvp ? '👑' : ''}</Text>
            <Text style={[typography.body, { flex: 1, color: colors.textPrimary }]}>
              {firstName(r.playerName)}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round(r.averageShare * 100)}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text style={[typography.bodyBold, { color: colors.primary, width: 48, textAlign: 'right' }]}>
              {pct(r.averageShare)}
            </Text>
          </View>
        ))}
      </View>

      {board.rounds.map((round) => {
        const isOpen = expanded[round.roundId] ?? false;
        return (
          <TouchableOpacity
            key={round.roundId}
            activeOpacity={round.dataMissing ? 1 : 0.7}
            onPress={() =>
              !round.dataMissing && setExpanded((e) => ({ ...e, [round.roundId]: !isOpen }))
            }
            style={[styles.roundCard, { backgroundColor: colors.surface }, shadows.sm]}
          >
            <View style={styles.roundHeader}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                {round.roundLabel} · {labelForFormat(round.format)}
              </Text>
              {!round.dataMissing && (
                <Icon source={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              )}
            </View>

            {round.dataMissing ? (
              <Text style={[typography.small, { color: colors.warning }]}>
                ⚠ Shot contributions weren't tracked for this round — excluded from MVP.
              </Text>
            ) : (
              round.teams.map((team) => (
                <View key={team.teamId} style={styles.teamBlock}>
                  <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    {team.teamName} · {round.metricLabel}
                    {round.drivesMissing ? ' (drives not tracked)' : ''}
                  </Text>
                  {(isOpen ? team.players : team.players.slice(0, 2)).map((p) => (
                    <View key={p.playerId} style={styles.playerRow}>
                      <Text style={[typography.body, { color: colors.textPrimary }]}>
                        {p.isMvp ? '👑 ' : ''}
                        {firstName(p.playerName)}
                      </Text>
                      <Text style={[typography.small, { color: colors.textSecondary }]}>
                        {fmtValue(p, round)} · {pct(p.share)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  centered: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  rollup: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  rollupLabel: { letterSpacing: 1, marginBottom: spacing.sm },
  rollupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  barTrack: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  roundCard: { borderRadius: borderRadius.lg, padding: spacing.md },
  roundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  teamBlock: { marginTop: spacing.xs },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
});
