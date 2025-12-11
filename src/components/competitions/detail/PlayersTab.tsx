/**
 * PlayersTab - List of players in a competition
 */

import React from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon, Surface } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { PlayerCard } from '@/components/social/PlayerCard';
import type { ColorPalette } from '@/context/ThemeContext';
import type { CompetitionPlayer } from './types';

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
}

export const PlayersTab = React.memo(function PlayersTab({
  players,
  currentUserId,
  isOrganizer,
  onAddPlayers,
  onRemovePlayer,
  removingPlayerId,
  colors,
}: PlayersTabProps) {
  return (
    <View>
      {players.length === 0 ? (
        <Surface style={[styles.card, { backgroundColor: colors.white }]} elevation={1}>
          <View style={styles.emptyState}>
            <Icon source="account-group-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No players yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Share the invite code to get players to join.
            </Text>
          </View>
        </Surface>
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

              // Can remove player if organizer and not the current user (organizer can't remove themselves)
              const canRemove = isOrganizer && !isCurrentUser && onRemovePlayer;
              const isBeingRemoved = removingPlayerId === player.id;

              // Build right action - remove button for organizer, chevron for others
              const rightAction = canRemove ? (
                <TouchableOpacity
                  onPress={() => onRemovePlayer(player.id, player.name)}
                  disabled={isBeingRemoved}
                  style={[styles.removeButton, { backgroundColor: colors.errorLight }]}
                  accessibilityLabel={`Remove ${player.name} from competition`}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isBeingRemoved ? (
                    <ActivityIndicator size="small" color={colors.error} />
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
                  rightAction={rightAction}
                  testID={`player-card-${player.id}`}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Add Players Button */}
      {isOrganizer && (
        <Pressable
          style={({ pressed }) => [
            styles.addPlayersButton,
            { borderColor: colors.primary },
            pressed && { opacity: 0.7 },
          ]}
          onPress={onAddPlayers}
          accessibilityLabel="Add players"
          accessibilityRole="button"
        >
          <Icon source="account-plus" size={20} color={colors.primary} />
          <Text style={[styles.addPlayersButtonText, { color: colors.primary }]}>Add players</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
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
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PlayersTab;
