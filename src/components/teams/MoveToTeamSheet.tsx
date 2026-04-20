/**
 * MoveToTeamSheet
 *
 * Bottom sheet opened from the Teams tab when an organizer taps a player
 * chip. Lets them move that player into a different team.
 *
 * Writes go through `useUpdateTeam`, which replaces the entire member list of
 * a team. We move a player by (1) removing them from their current team and
 * (2) adding them to the destination team — done as two sequential mutations
 * so query invalidation fires once per write.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { PlayerAvatar } from '@/components/common';
import { useUpdateTeam } from '@/hooks/rounds/teams';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { TeamWithMembers, Player } from '@/types/database.types';

export interface MoveToTeamSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The player the user is moving. Required when `visible` is true. */
  player: Player | null;
  /** The id of the team the player currently belongs to. */
  currentTeamId: string | null;
  /** All teams in the competition (including the current one). */
  teams: TeamWithMembers[];
  /** Competition id — used for query invalidation in the mutation. */
  competitionId: string;
  /** Called after the move completes successfully. */
  onMoved?: () => void;
}

export function MoveToTeamSheet({
  visible,
  onClose,
  player,
  currentTeamId,
  teams,
  competitionId,
  onMoved,
}: MoveToTeamSheetProps) {
  const colors = useThemeColors();
  const { mutateAsync: updateTeam } = useUpdateTeam();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const destinations = useMemo(
    () => teams.filter((t) => t.id !== currentTeamId),
    [teams, currentTeamId]
  );

  const currentTeam = useMemo(
    () => teams.find((t) => t.id === currentTeamId) ?? null,
    [teams, currentTeamId]
  );

  const handleMove = useCallback(
    async (destination: TeamWithMembers) => {
      if (!player || !currentTeam) return;
      setBusy(true);
      setErrorMessage(null);
      try {
        // Remove from current team
        const remainingIds = currentTeam.members
          .map((m) => m.player_id)
          .filter((id) => id !== player.id);

        if (remainingIds.length === 0) {
          // Our mutation requires at least 1 member. Block move — organizer
          // must rebalance via Regenerate instead (or move someone else in
          // first). This is a rare edge case.
          setErrorMessage(
            'Cannot empty a team. Move a different player first, or regenerate.'
          );
          setBusy(false);
          return;
        }

        await updateTeam({
          teamId: currentTeam.id,
          competitionId,
          memberIds: remainingIds,
        });

        // Add to destination
        const newIds = [...destination.members.map((m) => m.player_id), player.id];
        await updateTeam({
          teamId: destination.id,
          competitionId,
          memberIds: newIds,
        });

        onMoved?.();
        onClose();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to move player';
        setErrorMessage(msg);
      } finally {
        setBusy(false);
      }
    },
    [player, currentTeam, competitionId, updateTeam, onMoved, onClose]
  );

  const handleClose = useCallback(() => {
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={player ? `Move ${player.name}` : 'Move player'}
      height={0.55}
      useModal
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {player && (
          <View
            style={[
              styles.playerRow,
              { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg },
            ]}
          >
            <PlayerAvatar photoUrl={player.photo_url} name={player.name} size={40} />
            <View style={styles.playerInfo}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                {player.name}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                HCP {player.handicap ?? 'N/A'}
                {currentTeam ? `  •  currently in ${currentTeam.name}` : ''}
              </Text>
            </View>
          </View>
        )}

        <Text
          style={[
            typography.captionBold,
            styles.sectionLabel,
            { color: colors.textSecondary },
          ]}
        >
          MOVE TO
        </Text>

        {destinations.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
            No other teams available.
          </Text>
        ) : (
          destinations.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.destinationRow,
                shadows.sm,
                { backgroundColor: colors.surface, borderRadius: borderRadius.lg },
                busy && { opacity: 0.5 },
              ]}
              onPress={() => handleMove(team)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Move to ${team.name}`}
            >
              <View style={styles.destinationInfo}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                  {team.name}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {team.members.length}{' '}
                  {team.members.length === 1 ? 'player' : 'players'}
                </Text>
              </View>
              <Text style={[typography.smallBold, { color: colors.primary }]}>
                Move →
              </Text>
            </TouchableOpacity>
          ))
        )}

        {errorMessage && (
          <Text
            style={[
              typography.caption,
              styles.errorText,
              { color: colors.error },
            ]}
          >
            {errorMessage}
          </Text>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  playerInfo: {
    flex: 1,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  destinationInfo: {
    flex: 1,
  },
  errorText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default MoveToTeamSheet;
