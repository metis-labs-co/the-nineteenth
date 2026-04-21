/**
 * GroupsSection - Read-only tee-group view for the round details tab.
 *
 * Shows each pairing (tee group) as a card with tee time and player list.
 * When the round is a split team round, each card is labeled "Sub-Match N"
 * with team-colour indicators on each side.
 *
 * Organizer editing of pairings still happens on the admin-side
 * RoundGameSetupTab. This component is view-only for players.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { GolfBallLoader } from '@/components/common';
import { usePairings, useSubMatches } from '@/hooks/rounds';
import { useRoundPlayers } from '@/hooks/useRoundDetails';
import { formatTeeTimeForDisplay } from '@/utils/pairingAlgorithm';
import type { RoundFormat, SubMatch } from '@/types';

export interface GroupsSectionProps {
  roundId: string;
  roundFormat: RoundFormat;
  cardBackground: string;
}

interface GroupPlayer {
  id: string;
  name: string;
  handicap: number | null;
}

interface GroupViewModel {
  key: string;
  label: string;
  teeTime: string | null;
  /** For split rounds, the A/B split. Otherwise all players in one list. */
  teamA?: GroupPlayer[];
  teamB?: GroupPlayer[];
  players?: GroupPlayer[];
}

export function GroupsSection({ roundId, roundFormat, cardBackground }: GroupsSectionProps) {
  const colors = useThemeColors();
  const { data: pairings, isLoading: isPairingsLoading } = usePairings(roundId);
  const { data: subMatches, isLoading: isSubMatchesLoading } = useSubMatches(
    roundFormat === 'split' ? roundId : undefined
  );
  const { data: players, isLoading: isPlayersLoading } = useRoundPlayers(roundId);

  // Lookup for id → player details
  const playerLookup = useMemo(() => {
    const map = new Map<string, GroupPlayer>();
    (players || []).forEach((p) => {
      map.set(p.id, { id: p.id, name: p.name, handicap: p.handicap ?? null });
    });
    return map;
  }, [players]);

  const isLoading = isPairingsLoading || isPlayersLoading || (roundFormat === 'split' && isSubMatchesLoading);

  const groups: GroupViewModel[] = useMemo(() => {
    if (roundFormat === 'split' && subMatches && subMatches.length > 0) {
      return subMatches.map((sm: SubMatch, i) => ({
        key: sm.id,
        label: `Sub-Match ${i + 1}`,
        teeTime: sm.tee_time,
        teamA: sm.team_a_player_ids
          .map((id) => playerLookup.get(id))
          .filter((p): p is GroupPlayer => !!p),
        teamB: sm.team_b_player_ids
          .map((id) => playerLookup.get(id))
          .filter((p): p is GroupPlayer => !!p),
      }));
    }

    if (pairings && pairings.length > 0) {
      return pairings.map((p, i) => ({
        key: p.id,
        label: `Group ${i + 1}`,
        teeTime: p.teeTime,
        players: p.playerIds
          .map((id) => playerLookup.get(id))
          .filter((pl): pl is GroupPlayer => !!pl),
      }));
    }

    return [];
  }, [roundFormat, subMatches, pairings, playerLookup]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {roundFormat === 'split' ? 'Sub-Matches' : 'Groups'}
        </Text>
        {groups.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primaryLighter }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{groups.length}</Text>
          </View>
        )}
      </View>

      <View style={styles.groupsList}>
        {isLoading ? (
          <View
            style={[
              styles.card,
              styles.loadingContainer,
              { backgroundColor: cardBackground, borderColor: colors.border },
            ]}
          >
            <GolfBallLoader size="sm" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading groups...
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <View
            style={[
              styles.card,
              styles.emptyContainer,
              { backgroundColor: cardBackground, borderColor: colors.border },
            ]}
          >
            <Icon source="account-multiple-outline" size={32} color={colors.gray400} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {roundFormat === 'split'
                ? 'Sub-matches will appear here once the organiser sets up the round.'
                : 'Tee groups will appear here once the organiser creates pairings.'}
            </Text>
          </View>
        ) : (
          groups.map((g) => (
            <GroupCard
              key={g.key}
              group={g}
              cardBackground={cardBackground}
            />
          ))
        )}
      </View>
    </View>
  );
}

interface GroupCardProps {
  group: GroupViewModel;
  cardBackground: string;
}

function GroupCard({ group, cardBackground }: GroupCardProps) {
  const colors = useThemeColors();
  const isSplit = !!group.teamA && !!group.teamB;

  return (
    <View style={[styles.card, { backgroundColor: cardBackground, borderColor: colors.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.cardHeaderLeft}>
          <Icon source="account-group" size={18} color={colors.primary} />
          <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>{group.label}</Text>
        </View>
        {group.teeTime && (
          <View style={[styles.teeTimePill, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="clock-outline" size={14} color={colors.primary} />
            <Text style={[styles.teeTimeText, { color: colors.primary }]}>
              {formatTeeTimeForDisplay(group.teeTime.substring(0, 5))}
            </Text>
          </View>
        )}
      </View>

      {isSplit ? (
        <View style={styles.splitBody}>
          <TeamSide
            label="Team A"
            accent={colors.success}
            players={group.teamA || []}
          />
          <View style={styles.vsDivider}>
            <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
            <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
          </View>
          <TeamSide
            label="Team B"
            accent={colors.error}
            players={group.teamB || []}
          />
        </View>
      ) : (
        <View style={styles.playersBody}>
          {(group.players || []).map((p) => (
            <PlayerRow key={p.id} player={p} />
          ))}
        </View>
      )}
    </View>
  );
}

interface TeamSideProps {
  label: string;
  accent: string;
  players: GroupPlayer[];
}

function TeamSide({ label, accent, players }: TeamSideProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.teamSide}>
      <View style={styles.teamHeader}>
        <View style={[styles.teamDot, { backgroundColor: accent }]} />
        <Text style={[styles.teamLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      {players.map((p) => (
        <PlayerRow key={p.id} player={p} />
      ))}
    </View>
  );
}

function PlayerRow({ player }: { player: GroupPlayer }) {
  const colors = useThemeColors();
  return (
    <View style={styles.playerRow}>
      <View style={[styles.playerAvatar, { backgroundColor: colors.primaryLighter }]}>
        <Text style={[styles.playerInitial, { color: colors.primary }]}>
          {player.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text
        style={[styles.playerName, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {player.name}
      </Text>
      {player.handicap !== null && (
        <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
          HC {player.handicap}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  countText: {
    ...typography.captionBold,
  },
  groupsList: {
    gap: spacing.md,
  },

  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardLabel: {
    ...typography.bodyBold,
  },
  teeTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  teeTimeText: {
    ...typography.captionBold,
  },

  playersBody: {
    paddingVertical: spacing.xs,
  },

  splitBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  teamSide: {
    gap: spacing.xs,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  teamLabel: {
    ...typography.captionBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  vsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  vsLine: {
    flex: 1,
    height: 1,
  },
  vsText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
  },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInitial: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  playerName: {
    ...typography.body,
    flex: 1,
  },
  playerHandicap: {
    ...typography.caption,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default GroupsSection;
