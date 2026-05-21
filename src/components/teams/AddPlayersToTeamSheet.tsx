/**
 * AddPlayersToTeamSheet
 *
 * Bottom sheet opened from the Teams tab when an organizer taps a team card.
 * Lets them assign competition players to that team via multi-select.
 *
 * A player can only belong to one team, so selecting a player who is already
 * on another team moves them here. On save we:
 *   1. Remove every newly-selected player from any other team they were on.
 *   2. Set the target team's members to the selected list.
 * Empty results clear the affected team rather than failing the
 * "at least one member" guard on `updateTeamMembers`.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { PlayerAvatar } from '@/components/common';
import { GolfBallLoader } from '@/components/common/GolfBallLoader';
import { useUpdateTeam, useClearTeamMembers } from '@/hooks/rounds/teams';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { TeamWithMembers } from '@/types/database.types';

/** Minimal player shape needed by the picker. */
export interface AssignablePlayer {
  id: string;
  name: string;
  handicap: number | null;
  photo_url: string | null;
}

export interface AddPlayersToTeamSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The team being edited. Required when `visible` is true. */
  team: TeamWithMembers | null;
  /** All teams in the competition (used to move players off other teams). */
  teams: TeamWithMembers[];
  /** Accepted competition players available to assign. */
  players: AssignablePlayer[];
  /** Competition id — used for query invalidation in the mutations. */
  competitionId: string;
  /** Called after the assignment completes successfully. */
  onSaved?: () => void;
}

export function AddPlayersToTeamSheet({
  visible,
  onClose,
  team,
  teams,
  players,
  competitionId,
  onSaved,
}: AddPlayersToTeamSheetProps) {
  const colors = useThemeColors();
  const { mutateAsync: updateTeam } = useUpdateTeam();
  const { mutateAsync: clearTeams } = useClearTeamMembers();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Seed the selection from the team's current members each time the sheet
  // opens (or the target team changes).
  useEffect(() => {
    if (visible && team) {
      setSelectedIds(new Set(team.members.map((m) => m.player_id)));
      setErrorMessage(null);
      setBusy(false);
    }
  }, [visible, team]);

  // Map each player to the OTHER team they currently belong to, so we can show
  // "in Team X" and warn the organizer the player will be moved.
  const otherTeamByPlayer = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams) {
      if (t.id === team?.id) continue;
      for (const m of t.members) {
        map.set(m.player_id, t.name);
      }
    }
    return map;
  }, [teams, team?.id]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  );

  const toggle = useCallback((playerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!team) return;
    setBusy(true);
    setErrorMessage(null);

    const selected = new Set(selectedIds);

    try {
      // 1. Remove every selected player from any other team that holds them.
      for (const t of teams) {
        if (t.id === team.id) continue;
        const remaining = t.members
          .map((m) => m.player_id)
          .filter((id) => !selected.has(id));
        if (remaining.length === t.members.length) continue; // unchanged

        if (remaining.length === 0) {
          await clearTeams({ competitionId, teamIds: [t.id] });
        } else {
          await updateTeam({ teamId: t.id, competitionId, memberIds: remaining });
        }
      }

      // 2. Set the target team's members to the selected list.
      const targetIds = Array.from(selected);
      if (targetIds.length === 0) {
        await clearTeams({ competitionId, teamIds: [team.id] });
      } else {
        await updateTeam({ teamId: team.id, competitionId, memberIds: targetIds });
      }

      onSaved?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update team';
      setErrorMessage(msg);
    } finally {
      setBusy(false);
    }
  }, [team, teams, selectedIds, competitionId, updateTeam, clearTeams, onSaved, onClose]);

  const selectedCount = selectedIds.size;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={team ? `Add to ${team.name}` : 'Add players'}
      height={0.75}
      useModal
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.caption, styles.helpText, { color: colors.textSecondary }]}>
            Select players for this team. Anyone already on another team will be
            moved here.
          </Text>

          {sortedPlayers.length === 0 ? (
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
              ]}
            >
              No players available to assign.
            </Text>
          ) : (
            sortedPlayers.map((player) => {
              const isSelected = selectedIds.has(player.id);
              const otherTeam = otherTeamByPlayer.get(player.id);
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.playerRow,
                    {
                      backgroundColor: isSelected ? colors.primaryLighter : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    busy && { opacity: 0.5 },
                  ]}
                  onPress={() => toggle(player.id)}
                  disabled={busy}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${player.name}, handicap ${player.handicap ?? 'N/A'}${
                    otherTeam ? `, currently in ${otherTeam}` : ''
                  }`}
                >
                  <PlayerAvatar photoUrl={player.photo_url} name={player.name} size={40} />
                  <View style={styles.playerInfo}>
                    <Text
                      style={[typography.bodyBold, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {player.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      HCP {player.handicap ?? 'N/A'}
                      {otherTeam ? `  •  in ${otherTeam}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {isSelected && <Icon source="check" size={16} color={colors.white} />}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {errorMessage && (
            <Text style={[typography.caption, styles.errorText, { color: colors.error }]}>
              {errorMessage}
            </Text>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Save team players"
          >
            {busy ? (
              <GolfBallLoader size="sm" />
            ) : (
              <Text style={[typography.bodyBold, { color: colors.white }]}>
                {selectedCount > 0
                  ? `Save ${selectedCount} player${selectedCount === 1 ? '' : 's'}`
                  : 'Save (empty team)'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  helpText: {
    marginBottom: spacing.md,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 56,
  },
  playerInfo: {
    flex: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
});

export default AddPlayersToTeamSheet;
