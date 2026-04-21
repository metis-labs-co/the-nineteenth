/**
 * SubMatchesTab - Per-sub-match view for split team rounds.
 *
 * Shows each head-to-head sub-match with its tee time, sides, live status,
 * and final result. Available only when `round.round_format === 'split'`.
 *
 * The Ryder-Cup-style team aggregate ("Team A 2.5 – 0.5 Team B") is rendered
 * on the MatchTab; this tab is the per-sub-match detail view.
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { EmptyState } from '@/components/common/EmptyState';
import { GolfBallLoader } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useSubMatches } from '@/hooks/rounds';
import { useRoundPlayers } from '@/hooks/useRoundDetails';
import { formatTeeTimeForDisplay } from '@/utils/pairingAlgorithm';
import type { SubMatch, SubMatchResult } from '@/types';

interface SubMatchesTabProps {
  roundId: string;
}

interface PlayerLookupEntry {
  name: string;
  handicap: number | null;
}

export function SubMatchesTab({ roundId }: SubMatchesTabProps) {
  const colors = useThemeColors();
  const { data: subMatches, isLoading: isSubMatchesLoading } = useSubMatches(roundId);
  const { data: players, isLoading: isPlayersLoading } = useRoundPlayers(roundId);

  const playerLookup = useMemo(() => {
    const map = new Map<string, PlayerLookupEntry>();
    (players || []).forEach((p) => {
      map.set(p.id, { name: p.name, handicap: p.handicap ?? null });
    });
    return map;
  }, [players]);

  const isLoading = isSubMatchesLoading || isPlayersLoading;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <GolfBallLoader size="md" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading sub-matches…
        </Text>
      </View>
    );
  }

  if (!subMatches || subMatches.length === 0) {
    return (
      <EmptyState
        icon="golf"
        title="No Sub-Matches"
        message="Sub-matches will appear here once the organiser splits the round."
        compact
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {subMatches.map((sm, i) => (
        <SubMatchCard
          key={sm.id}
          index={i}
          subMatch={sm}
          playerLookup={playerLookup}
        />
      ))}
    </ScrollView>
  );
}

interface SubMatchCardProps {
  index: number;
  subMatch: SubMatch;
  playerLookup: Map<string, PlayerLookupEntry>;
}

function SubMatchCard({ index, subMatch, playerLookup }: SubMatchCardProps) {
  const colors = useThemeColors();

  const teamAPlayers = subMatch.team_a_player_ids.map(
    (id) => playerLookup.get(id) ?? { name: 'Unknown', handicap: null }
  );
  const teamBPlayers = subMatch.team_b_player_ids.map(
    (id) => playerLookup.get(id) ?? { name: 'Unknown', handicap: null }
  );

  const statusText = formatStatus(subMatch);
  const resultText = formatResult(subMatch);
  const statusColor = resultToColor(subMatch.result, colors);

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.cardHeaderLeft}>
          <Icon source="trophy-outline" size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Sub-Match {index + 1}
          </Text>
        </View>
        {subMatch.tee_time && (
          <View style={[styles.teeTimePill, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="clock-outline" size={14} color={colors.primary} />
            <Text style={[styles.teeTimeText, { color: colors.primary }]}>
              {formatTeeTimeForDisplay(subMatch.tee_time.substring(0, 5))}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sidesContainer}>
        <Side label="Team A" dotColor={colors.success} players={teamAPlayers} />
        <View style={styles.vsDivider}>
          <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
          <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
        </View>
        <Side label="Team B" dotColor={colors.error} players={teamBPlayers} />
      </View>

      <View style={[styles.statusRow, { backgroundColor: colors.surfaceVariant }]}>
        <Icon source="flag-checkered" size={16} color={statusColor} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {resultText ?? statusText}
        </Text>
      </View>
    </View>
  );
}

interface SideProps {
  label: string;
  dotColor: string;
  players: PlayerLookupEntry[];
}

function Side({ label, dotColor, players }: SideProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.side}>
      <View style={styles.sideHeader}>
        <View style={[styles.sideDot, { backgroundColor: dotColor }]} />
        <Text style={[styles.sideLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      {players.map((p, i) => (
        <View key={i} style={styles.playerRow}>
          <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {p.name}
          </Text>
          {p.handicap !== null && (
            <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
              HC {p.handicap}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function formatStatus(sm: SubMatch): string {
  switch (sm.status) {
    case 'upcoming':
      return 'Upcoming';
    case 'in-progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'forfeited':
      return 'Forfeited';
    default:
      return sm.status;
  }
}

function formatResult(sm: SubMatch): string | null {
  if (sm.status === 'forfeited') {
    if (sm.result === 'forfeit-a') return 'Team B wins by forfeit';
    if (sm.result === 'forfeit-b') return 'Team A wins by forfeit';
    return 'Forfeited';
  }

  if (sm.status !== 'completed' || !sm.result) return null;

  const diff = sm.final_differential;
  const diffText = diff != null && diff > 0 ? ` · +${diff}` : '';

  switch (sm.result) {
    case 'a-wins':
      return `Team A won${diffText}`;
    case 'b-wins':
      return `Team B won${diffText}`;
    case 'halved':
      return 'Halved';
    default:
      return null;
  }
}

function resultToColor(result: SubMatchResult | null, colors: ReturnType<typeof useThemeColors>): string {
  if (!result) return colors.textSecondary;
  if (result === 'halved') return colors.warning ?? colors.textSecondary;
  if (result === 'a-wins' || result === 'forfeit-b') return colors.success;
  if (result === 'b-wins' || result === 'forfeit-a') return colors.error;
  return colors.textSecondary;
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyBold,
  },
  teeTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  teeTimeText: {
    ...typography.captionBold,
  },
  sidesContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  side: {
    gap: spacing.xs,
  },
  sideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sideDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  sideLabel: {
    ...typography.captionBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  playerName: {
    ...typography.body,
    flex: 1,
  },
  playerHandicap: {
    ...typography.caption,
  },
  vsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  vsLine: {
    flex: 1,
    height: 1,
  },
  vsText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statusText: {
    ...typography.bodyBold,
  },
});

export default SubMatchesTab;
