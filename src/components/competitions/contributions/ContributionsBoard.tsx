/**
 * ContributionsBoard - who fed each team total in the team-format rounds.
 *
 * Design (competition-details redesign, Breakdown tab · Contributions):
 * intro line, MVP rollup card, then one card per round with a format badge
 * chip + round title and per-player rows (team dot, fixed name column,
 * thin team-coloured progress bar, right-aligned bold value).
 *
 * Bar widths are proportional to the best value within the round —
 * a purely visual scale, not scoring math.
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator, type DimensionValue } from 'react-native';
import { Text } from 'react-native-paper';
import { ErrorState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows } from '@/constants/theme';
import { useCompetitionContributions } from '@/hooks/competitions/useCompetitionContributions';
import { getTeamColorHex } from '@/utils/teamColor';
import type { RoundContribution, PlayerContribution } from '@/utils/contributions';

interface ContributionsBoardProps {
  competitionId: string;
}

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

function fmtValue(p: PlayerContribution, round: RoundContribution): string {
  if (round.format === 'scramble' || round.format === 'alt-shot') {
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
    case 'alt-shot':
      return 'Alt Shot';
  }
}

/** Bar width as a share of the round's best value — visual scale only. */
function barWidth(value: number, max: number): DimensionValue {
  if (max <= 0 || value <= 0) return '0%';
  return `${Math.min(100, Math.round((value / max) * 100))}%`;
}

export function ContributionsBoard({ competitionId }: ContributionsBoardProps) {
  const colors = useThemeColors();
  const { board, isLoading, error, refetch } = useCompetitionContributions(competitionId);

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

  const topWeight = board.rollup[0]?.weightIndex ?? 0;

  return (
    <View style={styles.container}>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        Who fed each team total in the team-format rounds.
      </Text>

      <View
        style={[
          styles.rollup,
          shadows.sm,
          { backgroundColor: colors.primaryBackground, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.rollupLabel, { color: colors.primaryDark }]}>
          ★ COMPETITION MVP
        </Text>
        <Text style={[styles.rollupCaption, { color: colors.textSecondary }]}>
          1.0× = pulled their weight
        </Text>
        {board.rollup.map((r) => (
          <View key={r.playerId} style={styles.playerRow}>
            <Text style={styles.crown}>{r.isMvp ? '👑' : ''}</Text>
            <Text
              style={[styles.playerName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {firstName(r.playerName)}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: barWidth(r.weightIndex, topWeight),
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.rollupValue, { color: colors.primaryDark }]}>
              {r.weightIndex.toFixed(1)}×
            </Text>
          </View>
        ))}
      </View>

      {board.rounds.map((round) => {
        const roundMax = round.teams.reduce(
          (max, team) => team.players.reduce((m, p) => Math.max(m, p.value), max),
          0
        );

        return (
          <View
            key={round.roundId}
            style={[
              styles.roundCard,
              shadows.sm,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.roundHeader}>
              <View style={[styles.formatBadge, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.formatBadgeText, { color: colors.textSecondary }]}>
                  {labelForFormat(round.format)}
                </Text>
              </View>
              <Text style={[styles.roundTitle, { color: colors.textPrimary }]}>
                {round.roundLabel}
              </Text>
            </View>

            {round.dataMissing ? (
              <Text style={[typography.small, { color: colors.warning }]}>
                ⚠ Shot contributions weren&apos;t tracked for this round — excluded from MVP.
              </Text>
            ) : (
              round.teams.map((team, teamIndex) => {
                const teamColor = getTeamColorHex(team.color, teamIndex, colors);
                return (
                  <View key={team.teamId} style={styles.teamBlock}>
                    <Text style={[styles.teamLabel, { color: colors.textTertiary }]}>
                      {team.teamName} · {round.metricLabel}
                      {round.drivesMissing ? ' (drives not tracked)' : ''}
                    </Text>
                    {team.players.map((p) => (
                      <View
                        key={p.playerId}
                        style={styles.playerRow}
                        accessibilityLabel={`${p.playerName}, ${fmtValue(p, round)}`}
                      >
                        <View style={[styles.dot, { backgroundColor: teamColor }]} />
                        <Text
                          style={[styles.playerName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {p.playerName}
                        </Text>
                        <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: barWidth(p.value, roundMax),
                                backgroundColor: teamColor,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.playerValue, { color: colors.textSecondary }]}>
                          {fmtValue(p, round)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  centered: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  intro: {
    fontSize: 12.5,
    marginHorizontal: 2,
  },
  rollup: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  rollupLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  rollupCaption: {
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  crown: { width: 22, fontSize: 12 },
  rollupValue: {
    width: 48,
    textAlign: 'right',
    fontSize: 12.5,
    fontWeight: '700',
  },
  roundCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 11,
  },
  formatBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formatBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  roundTitle: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  teamBlock: {
    marginTop: spacing.xs,
  },
  teamLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playerName: {
    width: 96,
    fontSize: 13,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  playerValue: {
    minWidth: 52,
    textAlign: 'right',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
