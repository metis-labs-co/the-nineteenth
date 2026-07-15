/**
 * PlayersTab - List of players in a competition (Competition Details redesign)
 *
 * Team competitions group players into per-team cards (team colour dot header,
 * hairline-separated member rows with team-coloured initials avatars, YOU pill
 * and handicap). Non-team competitions render the same row language in a
 * single flat card.
 *
 * Organisers get a gradient "Add players" CTA (+ standings shortcut) and keep
 * the remove-player flow; non-organisers keep the tier-gated compare action.
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GolfBallLoader, EmptyState, PlayerAvatar, SectionLabel } from '@/components/common';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { FeatureLockButton } from '@/components/subscription/FeatureLockButton';
import { COMPARE_UPGRADE_CONFIG } from '@/components/social/ExpandablePlayerCard';
import { getTeamColorHex } from '@/utils/teamColor';
import { getInitials, formatHandicapIndex } from '@/utils/displayHelpers';
import type { ColorPalette } from '@/context/ThemeContext';
import type { TeamWithMembers } from '@/types/database.types';
import type { CompetitionPlayer } from './types';
import { InvitationStatusBadge } from './InvitationStatusBadge';

/** Design-spec gradient for the primary "Add players" CTA (documented in
 * docs/plans/competition-detail-redesign.md — matches HeroCard convention). */
const ADD_PLAYERS_GRADIENT = ['#7cbd57', '#5f9a3f'] as const;

export interface PlayersTabProps {
  players: CompetitionPlayer[];
  currentUserId?: string;
  isOrganizer: boolean;
  onAddPlayers: () => void;
  /** Called when organizer wants to remove a player */
  onRemovePlayer?: (playerId: string, playerName: string) => void;
  /** ID of player currently being removed (for loading state) */
  removingPlayerId?: string | null;
  colors: ColorPalette;
  /** Competition ID for filtered stats comparison */
  competitionId?: string;
  /** Competition name for filter label */
  competitionName?: string;
  /** Optional player slot capacity. When set, shown as "X of N Players". */
  maxPlayers?: number | null;
  /** When false, organizer is shown as a non-playing row above the player list. */
  organizerIsPlayer?: boolean;
  /** Invite code, used in the empty-state copy. */
  inviteCode?: string;
  /**
   * Teams for team competitions. When present (and non-empty), players are
   * grouped into per-team cards; players not on any team fall into a trailing
   * "Unassigned" group. Purely presentational — pass the same teams the
   * Teams tab renders.
   */
  teams?: TeamWithMembers[];
  /** Organiser shortcut to the standings tab (square trophy button). */
  onViewStandings?: () => void;
}

/** Row model shared by grouped and flat lists. */
interface PlayerRowData {
  key: string;
  player: {
    id: string;
    name: string;
    handicap: number | null;
    photo_url: string | null;
  };
  status?: string | null;
}

/** Prefix "Team" only when the stored name doesn't already carry it. */
function formatTeamTitle(name: string): string {
  return /^team\b/i.test(name.trim()) ? name : `Team ${name}`;
}

export const PlayersTab = React.memo(function PlayersTab({
  players,
  currentUserId,
  isOrganizer,
  onAddPlayers,
  onRemovePlayer,
  removingPlayerId,
  colors,
  competitionId,
  competitionName,
  maxPlayers,
  organizerIsPlayer = true,
  inviteCode,
  teams,
  onViewStandings,
}: PlayersTabProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleCompare = useCallback(
    (playerId: string) => {
      if (!currentUserId || !competitionId) return;
      navigation.navigate('CompareStats', {
        playerId1: currentUserId,
        playerId2: playerId,
        competitionId,
        filterLabel: competitionName,
      });
    },
    [navigation, currentUserId, competitionId, competitionName]
  );

  const handleOpenProfile = useCallback(
    (playerId: string) => {
      navigation.navigate('PlayerDetail', { id: playerId });
    },
    [navigation]
  );

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const playerCountLabel = maxPlayers && maxPlayers > 0
    ? `${players.length} of ${maxPlayers} ${maxPlayers === 1 ? 'Player' : 'Players'}`
    : `${players.length} ${players.length === 1 ? 'Player' : 'Players'}`;

  // Group players by team for team competitions. Members keep team order;
  // anyone not on a team (pending invites, unassigned) lands in a trailing
  // "Unassigned" group so invitation status and remove flows stay reachable.
  const grouped = useMemo(() => {
    if (!teams || teams.length === 0) return null;

    const byPlayerId = new Map(players.map((cp) => [cp.player_id, cp]));
    const assigned = new Set<string>();

    const teamGroups = teams.map((team, index) => {
      const rows: PlayerRowData[] = [];
      for (const member of team.members ?? []) {
        assigned.add(member.player_id);
        const cp = byPlayerId.get(member.player_id);
        const player = cp?.player ?? member.player ?? null;
        if (!player) continue;
        rows.push({
          key: member.player_id,
          player: {
            id: player.id,
            name: player.name,
            handicap: player.handicap ?? null,
            photo_url: player.photo_url ?? null,
          },
          status: cp?.status,
        });
      }
      return { team, index, rows };
    });

    const unassigned: PlayerRowData[] = players
      .filter((cp) => !assigned.has(cp.player_id) && cp.player)
      .map((cp) => ({
        key: cp.player_id,
        player: {
          id: cp.player!.id,
          name: cp.player!.name,
          handicap: cp.player!.handicap,
          photo_url: cp.player!.photo_url,
        },
        status: cp.status,
      }));

    return { teamGroups, unassigned };
  }, [teams, players]);

  const flatRows = useMemo<PlayerRowData[]>(
    () =>
      players
        .filter((cp) => cp.player)
        .map((cp) => ({
          key: cp.player_id,
          player: {
            id: cp.player!.id,
            name: cp.player!.name,
            handicap: cp.player!.handicap,
            photo_url: cp.player!.photo_url,
          },
          status: cp.status,
        })),
    [players]
  );

  const renderRow = (row: PlayerRowData, index: number, teamColor?: string) => {
    const isCurrentUser = row.player.id === currentUserId;
    const canRemove = isOrganizer && !isCurrentUser && !!onRemovePlayer;
    const isBeingRemoved = removingPlayerId === row.player.id;
    const canCompare = !isOrganizer && !isCurrentUser && !!competitionId && !!currentUserId;

    return (
      <PlayerRow
        key={row.key}
        row={row}
        isFirst={index === 0}
        isCurrentUser={isCurrentUser}
        teamColor={teamColor}
        colors={colors}
        onOpenProfile={handleOpenProfile}
        onRemove={canRemove ? onRemovePlayer : undefined}
        isBeingRemoved={isBeingRemoved}
        onCompare={canCompare ? handleCompare : undefined}
        onUpgradePress={handleUpgrade}
      />
    );
  };

  return (
    <View>
      {!organizerIsPlayer && (
        <View style={[styles.organizerNote, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Icon source="account-tie" size={18} color={colors.textSecondary} />
          <Text style={[styles.organizerNoteText, { color: colors.textSecondary }]}>
            The organiser is running this competition but not playing.
          </Text>
        </View>
      )}

      {/* Organiser header — gradient Add players CTA + standings shortcut */}
      {isOrganizer && (
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.addPlayersTouchable}
            onPress={onAddPlayers}
            accessibilityLabel="Add players"
            accessibilityRole="button"
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[...ADD_PLAYERS_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addPlayersGradient}
            >
              <Icon source="plus" size={18} color={colors.white} />
              <Text style={[styles.addPlayersText, { color: colors.white }]}>Add players</Text>
            </LinearGradient>
          </TouchableOpacity>
          {onViewStandings && (
            <TouchableOpacity
              style={[
                styles.standingsButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={onViewStandings}
              accessibilityLabel="View standings"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Icon source="trophy-outline" size={20} color={colors.primaryDark} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {players.length === 0 ? (
        <EmptyState
          title="No players yet"
          message={
            inviteCode
              ? `Share invite code ${inviteCode} to fill ${maxPlayers ? `the ${maxPlayers} slots` : 'spots'}.`
              : 'Share the invite code to get players to join.'
          }
          icon="account-group-outline"
          compact
        />
      ) : (
        <View>
          <SectionLabel>{playerCountLabel}</SectionLabel>

          {grouped ? (
            <View>
              {grouped.teamGroups.map(({ team, index, rows }) => (
                <View
                  key={team.id}
                  style={[
                    styles.groupCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.groupHeader}>
                    <View style={styles.groupTitleRow}>
                      <View
                        style={[
                          styles.teamDot,
                          { backgroundColor: getTeamColorHex(team.color, index, colors) },
                        ]}
                      />
                      <Text
                        style={[styles.groupTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {formatTeamTitle(team.name)}
                      </Text>
                    </View>
                    <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
                      {rows.length} {rows.length === 1 ? 'player' : 'players'}
                    </Text>
                  </View>
                  {rows.map((row, i) =>
                    renderRow(row, i, getTeamColorHex(team.color, index, colors))
                  )}
                  {rows.length === 0 && (
                    <Text style={[styles.emptyGroupText, { color: colors.textTertiary }]}>
                      No players on this team yet.
                    </Text>
                  )}
                </View>
              ))}

              {grouped.unassigned.length > 0 && (
                <View
                  style={[
                    styles.groupCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.groupHeader}>
                    <View style={styles.groupTitleRow}>
                      <View style={[styles.teamDot, { backgroundColor: colors.textTertiary }]} />
                      <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>
                        Unassigned
                      </Text>
                    </View>
                    <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
                      {grouped.unassigned.length}{' '}
                      {grouped.unassigned.length === 1 ? 'player' : 'players'}
                    </Text>
                  </View>
                  {grouped.unassigned.map((row, i) => renderRow(row, i))}
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.groupCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {flatRows.map((row, i) => renderRow(row, i))}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// PlayerRow — one hairline-separated member row (grouped and flat lists)
// ---------------------------------------------------------------------------

interface PlayerRowProps {
  row: PlayerRowData;
  isFirst: boolean;
  isCurrentUser: boolean;
  /** Team colour — when set the avatar is an initials circle on this colour. */
  teamColor?: string;
  colors: ColorPalette;
  onOpenProfile: (playerId: string) => void;
  onRemove?: (playerId: string, playerName: string) => void;
  isBeingRemoved: boolean;
  onCompare?: (playerId: string) => void;
  onUpgradePress: () => void;
}

function PlayerRow({
  row,
  isFirst,
  isCurrentUser,
  teamColor,
  colors,
  onOpenProfile,
  onRemove,
  isBeingRemoved,
  onCompare,
  onUpgradePress,
}: PlayerRowProps) {
  const { player } = row;
  const handicapLabel = formatHandicapIndex(player.handicap);

  return (
    <View
      style={[
        styles.playerRow,
        !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
      ]}
      testID={`player-row-${player.id}`}
    >
      <TouchableOpacity
        style={styles.playerRowMain}
        onPress={() => onOpenProfile(player.id)}
        accessibilityRole="button"
        accessibilityLabel={`View ${player.name}'s profile`}
        accessibilityHint="Opens the player's profile and stats"
        activeOpacity={0.7}
      >
        {teamColor ? (
          <View style={[styles.initialsAvatar, { backgroundColor: teamColor }]}>
            <Text style={[styles.initialsText, { color: colors.white }]}>
              {getInitials(player.name)}
            </Text>
          </View>
        ) : (
          <PlayerAvatar photoUrl={player.photo_url} name={player.name} size={30} />
        )}
        <Text
          style={[
            styles.playerName,
            { color: colors.textPrimary },
            isCurrentUser && styles.playerNameYou,
          ]}
          numberOfLines={1}
        >
          {player.name}
        </Text>
        {isCurrentUser && (
          <View style={[styles.youPill, { backgroundColor: colors.primary }]}>
            <Text style={[styles.youPillText, { color: colors.white }]}>YOU</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.playerRowTrailing}>
        <InvitationStatusBadge status={row.status} />
        <Text style={[styles.handicapText, { color: colors.textTertiary }]}>
          HC {handicapLabel}
        </Text>
        {onRemove && (
          <TouchableOpacity
            onPress={() => onRemove(player.id, player.name)}
            disabled={isBeingRemoved}
            style={[styles.trailingButton, { backgroundColor: colors.errorLight }]}
            accessibilityLabel={`Remove ${player.name} from competition`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isBeingRemoved ? (
              <GolfBallLoader size="sm" />
            ) : (
              <Icon source="account-remove" size={18} color={colors.error} />
            )}
          </TouchableOpacity>
        )}
        {onCompare && (
          <FeatureLockButton
            feature="compare_stats_filtered"
            onPress={() => onCompare(player.id)}
            onUpgradePress={onUpgradePress}
            upgradeConfig={COMPARE_UPGRADE_CONFIG}
            showLockBadge={false}
            accessibilityLabel={`Compare stats with ${player.name}`}
          >
            <View style={[styles.trailingButton, { backgroundColor: colors.surfaceVariant }]}>
              <Icon source="chart-bar" size={18} color={colors.primary} />
            </View>
          </FeatureLockButton>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm + 1,
    marginBottom: spacing.md + 2,
  },
  addPlayersTouchable: {
    flex: 1,
    borderRadius: borderRadius.lg + 1,
  },
  addPlayersGradient: {
    height: 46,
    borderRadius: borderRadius.lg + 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 3,
    ...shadows.md,
  },
  addPlayersText: {
    fontSize: 14,
    fontWeight: '700',
  },
  standingsButton: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.lg + 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  groupCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs + 1,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 1,
    flex: 1,
    marginRight: spacing.sm,
  },
  teamDot: {
    width: 11,
    height: 11,
    borderRadius: borderRadius.full,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  groupCount: {
    fontSize: 11.5,
  },
  emptyGroupText: {
    ...typography.small,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 1,
    minHeight: 48,
  },
  playerRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: 44,
  },
  initialsAvatar: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 11,
    fontWeight: '800',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  playerNameYou: {
    fontWeight: '800',
  },
  youPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  youPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  playerRowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  handicapText: {
    fontSize: 12.5,
  },
  trailingButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  organizerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  organizerNoteText: {
    ...typography.small,
    flex: 1,
  },
});

export default PlayersTab;
