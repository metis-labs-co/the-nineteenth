/**
 * PlayersTab - List of players in a competition
 *
 * Supports expandable player cards with compare button for non-organizer view.
 * Organizers retain the remove player functionality.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { GolfBallLoader, EmptyState } from '@/components/common';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { PlayerCard } from '@/components/social/PlayerCard';
import { ExpandablePlayerCard } from '@/components/social/ExpandablePlayerCard';
import type { ColorPalette } from '@/context/ThemeContext';
import type { CompetitionPlayer } from './types';
import { InvitationStatusBadge } from './InvitationStatusBadge';

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

  return (
    <View>
      {players.length === 0 ? (
        <EmptyState
          title="No players yet"
          message="Share the invite code to get players to join."
          icon="account-group-outline"
          compact
        />
      ) : (
        <View>
          <Text style={[styles.playersSectionTitle, { color: colors.textSecondary }]}>
            {players.length} {players.length === 1 ? 'Player' : 'Players'}
          </Text>
          <View style={styles.playersContainer}>
            {players.map((cp) => {
              const player = cp.player;
              if (!player) return null;

              const isCurrentUser = player.id === currentUserId;

              // Build badge for current user
              const badge = isCurrentUser
                ? {
                    label: 'You',
                    backgroundColor: colors.primaryLighter,
                    textColor: colors.primaryDark,
                  }
                : undefined;

              // Can remove player if organizer and not the current user
              const canRemove = isOrganizer && !isCurrentUser && onRemovePlayer;
              const isBeingRemoved = removingPlayerId === player.id;

              // Invitation status indicator. Shown for everyone (including
              // current user if their invite is in a non-accepted state,
              // which can happen for organizers' own competitions on rare
              // data-migration paths).
              const statusBadge = (
                <InvitationStatusBadge status={cp.status} />
              );

              // Organizer view: keep existing remove button pattern
              if (isOrganizer) {
                const trailingAction = canRemove ? (
                  <TouchableOpacity
                    onPress={() => onRemovePlayer(player.id, player.name)}
                    disabled={isBeingRemoved}
                    style={[styles.removeButton, { backgroundColor: colors.errorLight }]}
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
                ) : (
                  <Icon source="chevron-right" size={20} color={colors.gray400} />
                );

                return (
                  <PlayerCard
                    key={cp.player_id}
                    player={{
                      id: player.id,
                      name: player.name,
                      email: player.email,
                      handicap: player.handicap,
                      photo_url: player.photo_url,
                    }}
                    badge={badge}
                    variant="card"
                    showEmail={false}
                    rightAction={
                      <View style={styles.rightActionRow}>
                        {statusBadge}
                        {trailingAction}
                      </View>
                    }
                    testID={`player-card-${player.id}`}
                  />
                );
              }

              // Non-organizer: expandable cards with compare
              return (
                <ExpandablePlayerCard
                  key={cp.player_id}
                  player={{
                    id: player.id,
                    name: player.name,
                    email: player.email,
                    handicap: player.handicap,
                    photo_url: player.photo_url,
                  }}
                  badge={badge}
                  isCurrentUser={isCurrentUser}
                  variant="card"
                  onCompare={competitionId ? () => handleCompare(player.id) : undefined}
                  statusIndicator={statusBadge}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Add Players Button */}
      {isOrganizer && (
        <TouchableOpacity
          style={[
            styles.addPlayersButton,
            { borderColor: colors.primary },
          ]}
          onPress={onAddPlayers}
          accessibilityLabel="Add players"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Icon source="account-plus" size={20} color={colors.primary} />
          <Text style={[styles.addPlayersButtonText, { color: colors.primary }]}>Add players</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  playersSectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  playersContainer: {
    gap: spacing.md,
  },
  addPlayersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  addPlayersButtonText: {
    ...typography.bodyBold,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export default PlayersTab;
